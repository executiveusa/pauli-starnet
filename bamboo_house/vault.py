from __future__ import annotations
import hashlib,hmac,json,os,sqlite3
from datetime import datetime,timezone
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

PI_AGENT_ID='pi-personal-agent'
class HouseAccessError(PermissionError): pass
class HouseIntegrityError(ValueError): pass
def now(): return datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
def canon(v): return json.dumps(v,sort_keys=True,separators=(',',':'))
class BambooHouse:
 def __init__(self,path,key,actor_id):
  if actor_id!=PI_AGENT_ID: raise HouseAccessError('Bambú House is non-enumerable and accessible only to Pi')
  if not isinstance(key,bytes) or len(key)!=32: raise HouseAccessError('a 32-byte house key is required')
  self.actor_id=actor_id; self.key=key; self.aes=AESGCM(key); self.db=sqlite3.connect(path); self.db.row_factory=sqlite3.Row
  self.db.executescript(Path(__file__).with_name('schema.sql').read_text()); self.db.execute("INSERT OR IGNORE INTO house_meta VALUES('schema_version','bamboo.house/v1')"); self.db.commit(); self._audit('house.open','house','allowed',None)
 @classmethod
 def open(cls,path,key,actor_id): return cls(path,key,actor_id)
 def close(self): self._audit('house.close','house','allowed',None); self.db.close()
 def delegate(self,*args,**kwargs): self._audit('access.delegate','house','denied','delegation prohibited'); raise HouseAccessError('Pi cannot delegate Bambú House access')
 def list_records(self): self._audit('record.list','all','allowed',None); return [dict(x) for x in self.db.execute('SELECT record_id,record_type,version,created_at,updated_at FROM encrypted_records ORDER BY record_id')]
 def put(self,record):
  required={'schema_version','record_id','record_type','owner','jurisdiction','title','asset','ownership','valuation','documents','estate','provenance'}
  if required-set(record): self._audit('record.write',record.get('record_id','unknown'),'denied','schema missing'); raise HouseIntegrityError('asset record missing required fields')
  if record['schema_version']!='bamboo.asset/v1': raise HouseIntegrityError('unsupported asset schema')
  raw=canon(record).encode(); rid=record['record_id']; rtype=record['record_type']; aad=f'bamboo.house/v1|{rid}|{rtype}'.encode(); nonce=os.urandom(12); ct=self.aes.encrypt(nonce,raw,aad); t=now()
  old=self.db.execute('SELECT version,created_at FROM encrypted_records WHERE record_id=?',(rid,)).fetchone(); version=(old['version']+1 if old else 1); created=(old['created_at'] if old else t)
  self.db.execute('INSERT OR REPLACE INTO encrypted_records VALUES(?,?,?,?,?,?,?,?)',(rid,rtype,nonce,ct,hashlib.sha256(aad).hexdigest(),version,created,t)); self.db.commit(); self._audit('record.write',rid,'allowed',None); return {'record_id':rid,'version':version}
 def get(self,record_id):
  x=self.db.execute('SELECT * FROM encrypted_records WHERE record_id=?',(record_id,)).fetchone()
  if not x: self._audit('record.read',record_id,'not_found',None); raise KeyError(record_id)
  aad=f'bamboo.house/v1|{record_id}|{x["record_type"]}'.encode()
  try: out=json.loads(self.aes.decrypt(x['nonce'],x['ciphertext'],aad))
  except Exception as e: self._audit('record.read',record_id,'denied','integrity failure'); raise HouseIntegrityError('record failed authenticated decryption') from e
  self._audit('record.read',record_id,'allowed',None); return out
 def add_blob(self,blob_id,record_id,data):
  if not self.db.execute('SELECT 1 FROM encrypted_records WHERE record_id=?',(record_id,)).fetchone(): raise KeyError(record_id)
  aad=f'bamboo.house/blob/v1|{blob_id}|{record_id}'.encode(); nonce=os.urandom(12); ct=self.aes.encrypt(nonce,data,aad); digest=hashlib.sha256(data).hexdigest()
  self.db.execute('INSERT INTO encrypted_blobs VALUES(?,?,?,?,?,?,?)',(blob_id,record_id,nonce,ct,digest,len(data),now())); self.db.commit(); self._audit('blob.write',blob_id,'allowed',None); return {'blob_id':blob_id,'sha256':digest,'byte_size':len(data)}
 def get_blob(self,blob_id):
  x=self.db.execute('SELECT * FROM encrypted_blobs WHERE blob_id=?',(blob_id,)).fetchone()
  if not x: self._audit('blob.read',blob_id,'not_found',None); raise KeyError(blob_id)
  aad=f'bamboo.house/blob/v1|{blob_id}|{x["record_id"]}'.encode()
  try: out=self.aes.decrypt(x['nonce'],x['ciphertext'],aad)
  except Exception as e: self._audit('blob.read',blob_id,'denied','integrity failure'); raise HouseIntegrityError('blob failed authenticated decryption') from e
  if hashlib.sha256(out).hexdigest()!=x['plaintext_sha256']: raise HouseIntegrityError('blob digest mismatch')
  self._audit('blob.read',blob_id,'allowed',None); return out
 def audit_entries(self): return [dict(x) for x in self.db.execute('SELECT * FROM audit_log ORDER BY sequence')]
 def verify_audit(self):
  prev='0'*64
  for x in self.audit_entries():
   body='|'.join([x['occurred_at'],x['actor_id'],x['action'],x['target_hmac'],x['outcome'],x['reason'] or '',prev]); digest=hmac.new(self.key,body.encode(),hashlib.sha256).hexdigest()
   if x['previous_hash']!=prev or not hmac.compare_digest(x['entry_hash'],digest): return False
   prev=digest
  return True
 def _audit(self,action,target,outcome,reason):
  prev=self.db.execute('SELECT entry_hash FROM audit_log ORDER BY sequence DESC LIMIT 1').fetchone(); prev=prev[0] if prev else '0'*64; t=now(); target_hmac=hmac.new(self.key,target.encode(),hashlib.sha256).hexdigest(); body='|'.join([t,self.actor_id,action,target_hmac,outcome,reason or '',prev]); digest=hmac.new(self.key,body.encode(),hashlib.sha256).hexdigest(); self.db.execute('INSERT INTO audit_log(occurred_at,actor_id,action,target_hmac,outcome,reason,previous_hash,entry_hash) VALUES(?,?,?,?,?,?,?,?)',(t,self.actor_id,action,target_hmac,outcome,reason,prev,digest)); self.db.commit()
