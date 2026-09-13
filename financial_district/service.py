from __future__ import annotations
import hashlib, json, sqlite3
from datetime import datetime, timezone
from pathlib import Path

class FinancialError(ValueError): pass

def now(): return datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
def canonical(v): return json.dumps(v, sort_keys=True, separators=(',',':'))
def require(obj, fields):
    miss=[x for x in fields if x not in obj]
    if miss: raise FinancialError('missing: '+','.join(miss))

def nonnegative(value, field, nullable=True):
    if value is None and nullable: return
    if not isinstance(value,(int,float)) or isinstance(value,bool) or value < 0: raise FinancialError(field+' must be nonnegative')

class FinancialDistrict:
    def __init__(self, path=':memory:'):
        self.db=sqlite3.connect(path)
        self.db.row_factory=sqlite3.Row
        self.db.execute('PRAGMA foreign_keys=ON')
        schema=Path(__file__).with_name('schema.sql').read_text()
        self.db.executescript(schema)
    def close(self): self.db.close()
    def add_tenant(self, tenant_id, base_currency='USD', legal_entity=None):
        if len(base_currency)!=3: raise FinancialError('currency must be ISO-like 3 letters')
        self.db.execute('INSERT OR IGNORE INTO tenants VALUES (?,?,?,?)',(tenant_id,legal_entity,base_currency.upper(),now())); self.db.commit()
    def _tenant(self, tenant_id):
        if not self.db.execute('SELECT 1 FROM tenants WHERE tenant_id=?',(tenant_id,)).fetchone(): raise FinancialError('unknown tenant')
    def ingest_receipt(self, r):
        require(r,['schema_version','receipt_id','tenant_id','project_id','build_id','started_at','ended_at','duration_ms','status','models','tools','infrastructure','cost','outputs','provenance'])
        if r['schema_version']!='starnet.receipt/v1': raise FinancialError('unsupported schema')
        self._tenant(r['tenant_id']); nonnegative(r['duration_ms'],'duration_ms',False)
        c=r['cost']; require(c,['currency','estimated_minor_units','list_minor_units','credit_minor_units','actual_billed_minor_units','reconciliation_status'])
        if len(c['currency'])!=3: raise FinancialError('currency must be 3 letters')
        for f in ['estimated_minor_units','list_minor_units','credit_minor_units','actual_billed_minor_units']: nonnegative(c[f],f)
        raw=canonical(r); digest=hashlib.sha256(raw.encode()).hexdigest()
        existing=self.db.execute('SELECT body_sha256 FROM build_receipts WHERE tenant_id=? AND receipt_id=?',(r['tenant_id'],r['receipt_id'])).fetchone()
        if existing:
            if existing[0]==digest: return 'duplicate'
            raise FinancialError('receipt id collision; corrections must use a new id and supersedes_receipt_id')
        p=r['provenance']; require(p,['created_by','created_at','source_refs'])
        sup=p.get('supersedes_receipt_id')
        with self.db:
            self.db.execute('''INSERT INTO build_receipts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',(
              r['tenant_id'],r['receipt_id'],r['project_id'],r['build_id'],r.get('agent_id'),r.get('trace_id'),r['started_at'],r['ended_at'],r['duration_ms'],r['status'],c['currency'].upper(),c['estimated_minor_units'],c['list_minor_units'],c['credit_minor_units'],c['actual_billed_minor_units'],c['reconciliation_status'],r.get('budget_decision_ref'),raw,digest,sup,now()))
            for i,m in enumerate(r['models']):
                require(m,['provider','model','version','calls','input_units','output_units','cached_units','duration_ms'])
                for f in ['calls','input_units','output_units','cached_units','duration_ms']: nonnegative(m[f],f, f not in ['calls','duration_ms'])
                self.db.execute('INSERT INTO model_usage VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',(r['tenant_id'],r['receipt_id'],i,m['provider'],m['model'],m['version'],m['calls'],m['input_units'],m['output_units'],m['cached_units'],m.get('unit_name'),m['duration_ms']))
            for i,t in enumerate(r['tools']): self.db.execute('INSERT INTO tool_usage VALUES (?,?,?,?,?,?,?)',(r['tenant_id'],r['receipt_id'],i,t['name'],t['calls'],t['duration_ms'],t['outcome']))
            for i,x in enumerate(r['infrastructure']): self.db.execute('INSERT INTO infrastructure_usage VALUES (?,?,?,?,?,?,?,?)',(r['tenant_id'],r['receipt_id'],i,x['provider'],x['resource_type'],x['quantity'],x['unit'],x.get('region')))
        return 'inserted'
    def register_adapter(self, tenant_id, adapter_id, rail, mode='disabled'):
        self._tenant(tenant_id)
        if mode=='live': raise FinancialError('live payment adapters are prohibited')
        self.db.execute('INSERT OR REPLACE INTO payment_adapters VALUES (?,?,?,?,?,?)',(tenant_id,adapter_id,rail,mode,0,None)); self.db.commit()
    def record_money_event(self, e):
        require(e,['tenant_id','money_event_id','direction','kind','state','currency','gross_minor_units','fee_minor_units','tax_minor_units','net_minor_units','source_system','source_ref','occurred_at'])
        self._tenant(e['tenant_id'])
        for f in ['gross_minor_units','fee_minor_units','tax_minor_units']: nonnegative(e[f],f)
        if e['state'] in ('approved','authorized','settled','reversed') and not e.get('owner_evidence_ref'): raise FinancialError('owner evidence required for consequential money state')
        expected=e['gross_minor_units']-e['fee_minor_units']-(e['tax_minor_units'] or 0)
        if e['direction']=='incoming' and e['net_minor_units']!=expected: raise FinancialError('incoming net does not reconcile')
        raw=canonical(e)
        self.db.execute('INSERT INTO money_events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(e['tenant_id'],e['money_event_id'],e['direction'],e['kind'],e['state'],e['currency'].upper(),e['gross_minor_units'],e['fee_minor_units'],e['tax_minor_units'],e['net_minor_units'],e.get('counterparty_ref'),e['source_system'],e['source_ref'],e.get('owner_evidence_ref'),e['occurred_at'],now(),raw)); self.db.commit()
    def post_journal(self, entry):
        require(entry,['tenant_id','journal_entry_id','occurred_at','description','source_ref','lines']); self._tenant(entry['tenant_id'])
        if len(entry['lines'])<2: raise FinancialError('journal needs at least two lines')
        currencies={x['currency'].upper() for x in entry['lines']}
        if len(currencies)!=1: raise FinancialError('one currency per journal entry')
        deb=sum(x.get('debit_minor_units',0) for x in entry['lines']); cred=sum(x.get('credit_minor_units',0) for x in entry['lines'])
        if deb<=0 or deb!=cred: raise FinancialError('journal entry must balance')
        with self.db:
            self.db.execute('INSERT INTO journal_entries VALUES (?,?,?,?,?,?,?)',(entry['tenant_id'],entry['journal_entry_id'],entry['occurred_at'],entry['description'],entry['source_ref'],entry.get('reversal_of'),now()))
            for i,x in enumerate(entry['lines']): self.db.execute('INSERT INTO journal_lines VALUES (?,?,?,?,?,?,?,?)',(entry['tenant_id'],entry['journal_entry_id'],i,x['account_code'],x.get('debit_minor_units',0),x.get('credit_minor_units',0),x['currency'].upper(),x.get('memo')))
    def record_tax_item(self, item):
        require(item,['tenant_id','tax_record_id','jurisdiction','tax_type','period_start','period_end','source_refs']); self._tenant(item['tenant_id'])
        self.db.execute('INSERT INTO tax_records VALUES (?,?,?,?,?,?,?,?,?,?)',(item['tenant_id'],item['tax_record_id'],item['jurisdiction'],item['tax_type'],item['period_start'],item['period_end'],'unreviewed',canonical(item['source_refs']),item.get('notes'),now())); self.db.commit()
    def query(self, name, tenant_id):
        allowed={'builds':'v_build_tokenomics','models':'v_model_tokenomics','money':'v_money_summary','trial-balance':'v_trial_balance'}
        if name not in allowed: raise FinancialError('unknown query')
        return [dict(x) for x in self.db.execute(f'SELECT * FROM {allowed[name]} WHERE tenant_id=?',(tenant_id,))]
    def executive_summary(self, tenant_id):
        self._tenant(tenant_id)
        q=lambda s,p=(): self.db.execute(s,p).fetchone()[0]
        return {'tenant_id':tenant_id,'receipt_count':q('SELECT count(*) FROM build_receipts WHERE tenant_id=?',(tenant_id,)),'unknown_or_unreconciled_receipts':q("SELECT count(*) FROM build_receipts WHERE tenant_id=? AND (actual_billed_minor_units IS NULL OR reconciliation_status IN ('estimated','unknown'))",(tenant_id,)),'money_event_count':q('SELECT count(*) FROM money_events WHERE tenant_id=?',(tenant_id,)),'unreviewed_tax_items':q("SELECT count(*) FROM tax_records WHERE tenant_id=? AND classification_status='unreviewed'",(tenant_id,)),'live_payment_adapters':q("SELECT count(*) FROM payment_adapters WHERE tenant_id=? AND mode='live'",(tenant_id,))}
    def export_tax_package(self, tenant_id):
        self._tenant(tenant_id)
        return {'status':'PREPARED_FOR_PROFESSIONAL_REVIEW_NOT_FILED','tenant':dict(self.db.execute('SELECT * FROM tenants WHERE tenant_id=?',(tenant_id,)).fetchone()),'money_events':[dict(x) for x in self.db.execute('SELECT * FROM money_events WHERE tenant_id=?',(tenant_id,))],'trial_balance':self.query('trial-balance',tenant_id),'tax_records':[dict(x) for x in self.db.execute('SELECT * FROM tax_records WHERE tenant_id=?',(tenant_id,))]}
