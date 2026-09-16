import json,os,tempfile,unittest,zipfile
from pathlib import Path
from bamboo_house.second_brain.store import SecondBrainStore,SecondBrainAccessError
from bamboo_house.second_brain.ingest import ingest_zip
KEY=b's'*32
class SecondBrainTests(unittest.TestCase):
 def setUp(self):self.t=tempfile.TemporaryDirectory();self.db=Path(self.t.name)/'brain.db';self.s=SecondBrainStore(self.db,KEY,'pi-personal-agent')
 def tearDown(self):self.s.close();self.t.cleanup()
 def test_pi_only(self):self.assertRaises(SecondBrainAccessError,SecondBrainStore,self.db,KEY,'heisenberg')
 def test_no_delegation(self):self.assertRaises(SecondBrainAccessError,self.s.delegate,'researcher')
 def test_encrypted_and_searchable(self):
  p={'passage_id':'p1','source_file_id':'f1','conversation_id':'c1','title':'Watch Brain','role':'user','created_at':'1','text':'Teach me the core concepts every day','ordinal':1};self.s.put_passage(p);self.assertNotIn(b'Teach me',self.db.read_bytes());self.assertEqual(self.s.query('core concepts')[0]['passage_id'],'p1')
 def test_zip_ingest_and_provenance(self):
  z=Path(self.t.name)/'x.zip'; data=[{'id':'c1','title':'A choice','mapping':{'n':{'id':'n','message':{'author':{'role':'user'},'create_time':7,'content':{'parts':['Build the private connection']}}}}}]
  with zipfile.ZipFile(z,'w') as out:out.writestr('conversations.json',json.dumps(data))
  self.assertEqual(ingest_zip(z,'drive-file-1',self.s),1);r=self.s.query('private connection')[0];self.assertEqual(r['source_file_id'],'drive-file-1');self.assertEqual(r['conversation_id'],'c1')
 def test_repeated_ingest_idempotent(self):
  p={'passage_id':'p1','source_file_id':'f1','conversation_id':'c1','title':'x','role':'user','created_at':None,'text':'repeat safely','ordinal':1};self.s.put_passage(p);self.s.put_passage(p);self.assertEqual(self.s.stats()['passages'],1)
if __name__=='__main__':unittest.main()
