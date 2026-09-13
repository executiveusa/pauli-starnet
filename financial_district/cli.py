import argparse, json
from .service import FinancialDistrict

def main():
 p=argparse.ArgumentParser(); p.add_argument('--db',default='financial-district.db'); s=p.add_subparsers(dest='cmd',required=True)
 a=s.add_parser('init'); a.add_argument('--tenant',required=True); a.add_argument('--currency',default='USD'); a.add_argument('--legal-entity')
 for c in ['ingest-receipt','money-event','post-journal','tax-item']:
  q=s.add_parser(c); q.add_argument('file')
 q=s.add_parser('query'); q.add_argument('--tenant',required=True); q.add_argument('--view',choices=['builds','models','money','trial-balance'],required=True)
 q=s.add_parser('summary'); q.add_argument('--tenant',required=True)
 q=s.add_parser('tax-package'); q.add_argument('--tenant',required=True); q.add_argument('--output',required=True)
 x=p.parse_args(); fd=FinancialDistrict(x.db)
 if x.cmd=='init': fd.add_tenant(x.tenant,x.currency,x.legal_entity); out={'status':'initialized','tenant':x.tenant}
 elif x.cmd=='ingest-receipt': out={'status':fd.ingest_receipt(json.load(open(x.file)))}
 elif x.cmd=='money-event': fd.record_money_event(json.load(open(x.file))); out={'status':'recorded'}
 elif x.cmd=='post-journal': fd.post_journal(json.load(open(x.file))); out={'status':'posted'}
 elif x.cmd=='tax-item': fd.record_tax_item(json.load(open(x.file))); out={'status':'recorded'}
 elif x.cmd=='query': out=fd.query(x.view,x.tenant)
 elif x.cmd=='summary': out=fd.executive_summary(x.tenant)
 else:
  out=fd.export_tax_package(x.tenant); open(x.output,'w').write(json.dumps(out,indent=2,sort_keys=True)+'\n'); out={'status':'prepared_not_filed','output':x.output}
 print(json.dumps(out,indent=2,sort_keys=True))
if __name__=='__main__': main()
