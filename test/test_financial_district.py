import copy, json, tempfile, unittest
from pathlib import Path
from financial_district import FinancialDistrict, FinancialError

FIX=json.loads(Path('departments/financial/examples/build-receipt.json').read_text())
class FinancialTests(unittest.TestCase):
 def setUp(self): self.f=FinancialDistrict(); self.f.add_tenant('pauli-place','USD','Demo LLC')
 def tearDown(self): self.f.close()
 def test_ingest_and_query(self): self.assertEqual(self.f.ingest_receipt(copy.deepcopy(FIX)),'inserted'); self.assertEqual(self.f.query('builds','pauli-place')[0]['model_calls'],1)
 def test_duplicate_idempotent(self): self.f.ingest_receipt(copy.deepcopy(FIX)); self.assertEqual(self.f.ingest_receipt(copy.deepcopy(FIX)),'duplicate')
 def test_collision_rejected(self): self.f.ingest_receipt(copy.deepcopy(FIX)); x=copy.deepcopy(FIX); x['duration_ms']=4; self.assertRaises(FinancialError,self.f.ingest_receipt,x)
 def test_unknown_tenant(self): x=copy.deepcopy(FIX); x['tenant_id']='other'; self.assertRaises(FinancialError,self.f.ingest_receipt,x)
 def test_negative_cost_rejected(self): x=copy.deepcopy(FIX); x['cost']['actual_billed_minor_units']=-1; self.assertRaises(FinancialError,self.f.ingest_receipt,x)
 def test_missing_cost_preserved(self): x=copy.deepcopy(FIX); x['cost']['actual_billed_minor_units']=None; x['cost']['reconciliation_status']='unknown'; self.f.ingest_receipt(x); self.assertEqual(self.f.executive_summary('pauli-place')['unknown_or_unreconciled_receipts'],1)
 def test_model_query(self): self.f.ingest_receipt(copy.deepcopy(FIX)); self.assertEqual(self.f.query('models','pauli-place')[0]['model'],'demo-model')
 def test_live_adapter_blocked(self): self.assertRaises(FinancialError,self.f.register_adapter,'pauli-place','stripe','card','live')
 def test_disabled_adapter(self): self.f.register_adapter('pauli-place','stripe','card'); self.assertEqual(self.f.executive_summary('pauli-place')['live_payment_adapters'],0)
 def event(self,state='draft',evidence=None): return {'tenant_id':'pauli-place','money_event_id':'m1','direction':'incoming','kind':'commission','state':state,'currency':'USD','gross_minor_units':1000,'fee_minor_units':50,'tax_minor_units':None,'net_minor_units':950,'source_system':'fixture','source_ref':'src','owner_evidence_ref':evidence,'occurred_at':'2026-09-13T03:00:00Z'}
 def test_draft_money_event(self): self.f.record_money_event(self.event()); self.assertEqual(self.f.query('money','pauli-place')[0]['net_minor_units'],950)
 def test_settled_requires_owner_evidence(self): self.assertRaises(FinancialError,self.f.record_money_event,self.event('settled'))
 def test_settled_with_evidence(self): self.f.record_money_event(self.event('settled','owner-msg')); self.assertEqual(self.f.executive_summary('pauli-place')['money_event_count'],1)
 def test_net_reconciliation(self): e=self.event(); e['net_minor_units']=999; self.assertRaises(FinancialError,self.f.record_money_event,e)
 def journal(self): return {'tenant_id':'pauli-place','journal_entry_id':'j1','occurred_at':'2026-09-13T03:00:00Z','description':'fixture','source_ref':'src','lines':[{'account_code':'1000','debit_minor_units':950,'credit_minor_units':0,'currency':'USD'},{'account_code':'4000','debit_minor_units':0,'credit_minor_units':950,'currency':'USD'}]}
 def test_balanced_journal(self): self.f.post_journal(self.journal()); self.assertEqual(len(self.f.query('trial-balance','pauli-place')),2)
 def test_unbalanced_journal(self): x=self.journal(); x['lines'][1]['credit_minor_units']=900; self.assertRaises(FinancialError,self.f.post_journal,x)
 def test_mixed_currency_journal(self): x=self.journal(); x['lines'][1]['currency']='EUR'; self.assertRaises(FinancialError,self.f.post_journal,x)
 def test_tax_item_unreviewed(self): self.f.record_tax_item({'tenant_id':'pauli-place','tax_record_id':'t1','jurisdiction':'WA','tax_type':'sales-tax-review','period_start':'2026-01-01','period_end':'2026-12-31','source_refs':['fixture']}); self.assertEqual(self.f.executive_summary('pauli-place')['unreviewed_tax_items'],1)
 def test_tax_export_not_filed(self): self.assertEqual(self.f.export_tax_package('pauli-place')['status'],'PREPARED_FOR_PROFESSIONAL_REVIEW_NOT_FILED')
 def test_query_allowlist(self): self.assertRaises(FinancialError,self.f.query,'drop table','pauli-place')
 def test_persistent_db(self):
  with tempfile.TemporaryDirectory() as d:
   p=str(Path(d)/'f.db'); x=FinancialDistrict(p); x.add_tenant('t'); x.close(); y=FinancialDistrict(p); self.assertEqual(y.executive_summary('t')['receipt_count'],0); y.close()
if __name__=='__main__': unittest.main()
