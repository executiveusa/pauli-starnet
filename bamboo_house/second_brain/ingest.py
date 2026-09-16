from __future__ import annotations
import hashlib,json,zipfile

def _text(value):
 if isinstance(value,str):return value
 if isinstance(value,list):return '\n'.join(x for x in value if isinstance(x,str))
 if isinstance(value,dict):
  parts=value.get('parts'); return _text(parts) if parts is not None else ''
 return ''
def passages_from_conversations(source_file_id,conversations):
 for c in conversations:
  cid=str(c.get('id') or c.get('conversation_id') or hashlib.sha256(json.dumps(c,sort_keys=True).encode()).hexdigest()[:24]); title=c.get('title') or 'Untitled'
  nodes=c.get('mapping') or {}
  ordered=sorted(nodes.values(),key=lambda n: ((n.get('message') or {}).get('create_time') or 0,str(n.get('id',''))))
  ordinal=0
  for node in ordered:
   m=node.get('message') or {}; text=_text(m.get('content')).strip()
   if not text:continue
   role=((m.get('author') or {}).get('role') or 'unknown'); ordinal+=1
   pid=hashlib.sha256(f'{source_file_id}|{cid}|{node.get("id")}|{ordinal}'.encode()).hexdigest()
   yield {'passage_id':pid,'source_file_id':source_file_id,'conversation_id':cid,'title':title,'role':role,'created_at':str(m.get('create_time') or '') or None,'text':text,'ordinal':ordinal}
def ingest_zip(path,source_file_id,store):
 count=0
 with zipfile.ZipFile(path) as z:
  names=[n for n in z.namelist() if n.endswith('conversations.json')]
  for name in names:
   data=json.loads(z.read(name))
   for p in passages_from_conversations(source_file_id,data):store.put_passage(p);count+=1
 return count
