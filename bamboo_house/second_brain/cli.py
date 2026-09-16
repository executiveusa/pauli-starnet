from __future__ import annotations
import argparse,json,os
from .store import SecondBrainStore,PI_AGENT_ID

def main():
 p=argparse.ArgumentParser(prog='pi-second-brain'); p.add_argument('--db',required=True); sub=p.add_subparsers(dest='cmd',required=True); q=sub.add_parser('ask');q.add_argument('question');q.add_argument('--limit',type=int,default=8); sub.add_parser('stats'); a=p.parse_args()
 raw=os.environ.get('BAMBOO_HOUSE_KEY_HEX',''); key=bytes.fromhex(raw) if raw else b''; s=SecondBrainStore(a.db,key,PI_AGENT_ID)
 try: print(json.dumps(s.query(a.question,a.limit) if a.cmd=='ask' else s.stats(),indent=2))
 finally:s.close()
if __name__=='__main__':main()
