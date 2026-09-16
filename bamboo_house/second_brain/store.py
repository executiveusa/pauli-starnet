from __future__ import annotations
import hashlib,hmac,json,os,re,sqlite3
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

PI_AGENT_ID='pi-personal-agent'
_WORD=re.compile(r"[a-z0-9][a-z0-9_'-]{1,}",re.I)
class SecondBrainAccessError(PermissionError): pass

def _tokens(text:str): return sorted(set(x.lower() for x in _WORD.findall(text)))
class SecondBrainStore:
    """Encrypted passage store with HMAC-token search. No plaintext corpus index."""
    def __init__(self,path,key:bytes,actor_id:str):
        if actor_id!=PI_AGENT_ID: raise SecondBrainAccessError('Second Brain is Pi-only and non-enumerable')
        if not isinstance(key,bytes) or len(key)!=32: raise SecondBrainAccessError('32-byte House key required')
        self.key=key; self.aes=AESGCM(key); self.db=sqlite3.connect(path); self.db.row_factory=sqlite3.Row
        self.db.executescript(Path(__file__).with_name('schema.sql').read_text()); self.db.commit()
    def close(self): self.db.close()
    def delegate(self,*a,**k): raise SecondBrainAccessError('Pi cannot delegate Second Brain access')
    def _term(self,t): return hmac.new(self.key,b'term:'+t.encode(),hashlib.sha256).hexdigest()
    def put_passage(self,p:dict):
        raw=json.dumps(p,sort_keys=True,separators=(',',':')).encode(); pid=p['passage_id']; nonce=os.urandom(12); aad=('second-brain/v1|'+pid).encode(); ct=self.aes.encrypt(nonce,raw,aad)
        self.db.execute('INSERT OR REPLACE INTO passages VALUES(?,?,?,?,?,?,?)',(pid,p['source_file_id'],nonce,ct,hashlib.sha256(raw).hexdigest(),p.get('created_at'),p.get('ordinal',0)))
        self.db.execute('DELETE FROM token_index WHERE passage_id=?',(pid,))
        for token in _tokens(' '.join([p.get('title',''),p.get('text','')])): self.db.execute('INSERT OR IGNORE INTO token_index VALUES(?,?)',(self._term(token),pid))
        self.db.commit()
    def get(self,pid):
        x=self.db.execute('SELECT * FROM passages WHERE passage_id=?',(pid,)).fetchone()
        if not x: raise KeyError(pid)
        raw=self.aes.decrypt(x['nonce'],x['ciphertext'],('second-brain/v1|'+pid).encode())
        if hashlib.sha256(raw).hexdigest()!=x['plaintext_sha256']: raise ValueError('passage digest mismatch')
        return json.loads(raw)
    def query(self,text,limit=8):
        terms=_tokens(text)
        if not terms:return []
        marks=','.join('?'*len(terms)); hs=[self._term(t) for t in terms]
        rows=self.db.execute(f'SELECT passage_id,count(*) score FROM token_index WHERE token_hmac IN ({marks}) GROUP BY passage_id ORDER BY score DESC, passage_id LIMIT ?',(*hs,limit)).fetchall()
        return [dict(self.get(x['passage_id']),score=x['score']) for x in rows]
    def stats(self):
        x=self.db.execute('SELECT count(*) n,count(DISTINCT source_file_id) sources FROM passages').fetchone(); return {'passages':x['n'],'sources':x['sources']}
