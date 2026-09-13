import copy,json,os,sqlite3,tempfile,unittest
from pathlib import Path
from bamboo_house import BambooHouse,HouseAccessError,HouseIntegrityError
KEY=b'k'*32
REC={'schema_version':'bamboo.asset/v1','record_id':'asset-demo-001','record_type':'real_property','owner':{'owner_ref':'bamboo','capacity':'individual'},'jurisdiction':{'country':'GH','region':None,'locality':None,'verification_status':'unverified'},'title':'Synthetic property fixture','asset':{'description':'synthetic only'},'ownership':{'status':'claimed_unverified','percentage':None,'acquired_at':None,'source_refs':['synthetic']},'valuation':{'amount_minor_units':None,'currency':'USD','as_of':None,'method':None,'status':'unknown'},'documents':[],'estate':{'beneficiary_status':'unknown','title_transfer_status':'not_reviewed','professional_review_status':'not_reviewed','notes':None},'risk_flags':['jurisdiction_review_needed'],'provenance':{'created_at':'2026-09-13T06:00:00Z','created_by':'pi-personal-agent','source_refs':['synthetic']}}
class HouseTests(unittest.TestCase):
 def setUp(self): self.t=tempfile.TemporaryDirectory(); self.p=str(Path(self.t.name)/'house.db'); self.h=BambooHouse(self.p,KEY,'pi-personal-agent')
 def tearDown(self):
  try:self.h.close()
  except:pass
  self.t.cleanup()
 def test_only_pi_can_open(self): self.assertRaises(HouseAccessError,BambooHouse,self.p,KEY,'hana')
 def test_bad_key_length(self): self.assertRaises(HouseAccessError,BambooHouse,self.p,b'x','pi-personal-agent')
 def test_delegate_forbidden(self): self.assertRaises(HouseAccessError,self.h.delegate,'hana')
 def test_encrypted_record_roundtrip(self): self.h.put(copy.deepcopy(REC)); self.assertEqual(self.h.get('asset-demo-001')['title'],REC['title'])
 def test_plaintext_absent(self): self.h.put(copy.deepcopy(REC)); self.assertNotIn(REC['title'].encode(),Path(self.p).read_bytes())
 def test_blob_roundtrip_and_plaintext_absent(self): self.h.put(copy.deepcopy(REC)); data=b'synthetic secret document'; self.h.add_blob('blob1','asset-demo-001',data); self.assertEqual(self.h.get_blob('blob1'),data); self.assertNotIn(data,Path(self.p).read_bytes())
 def test_wrong_key_fails(self): self.h.put(copy.deepcopy(REC)); self.h.close(); self.h=BambooHouse(self.p,b'z'*32,'pi-personal-agent'); self.assertRaises(HouseIntegrityError,self.h.get,'asset-demo-001')
 def test_tamper_fails(self): self.h.put(copy.deepcopy(REC)); self.h.db.execute("UPDATE encrypted_records SET ciphertext=? WHERE record_id=?",(b'bad','asset-demo-001')); self.h.db.commit(); self.assertRaises(HouseIntegrityError,self.h.get,'asset-demo-001')
 def test_audit_chain(self): self.h.put(copy.deepcopy(REC)); self.h.get('asset-demo-001'); self.assertTrue(self.h.verify_audit())
 def test_audit_update_blocked(self): self.assertRaises(sqlite3.IntegrityError,self.h.db.execute,"UPDATE audit_log SET outcome='x'")
 def test_audit_delete_blocked(self): self.assertRaises(sqlite3.IntegrityError,self.h.db.execute,'DELETE FROM audit_log')
 def test_access_is_audited(self): n=len(self.h.audit_entries()); self.h.list_records(); self.assertEqual(len(self.h.audit_entries()),n+1)
 def test_schema_required(self): x=copy.deepcopy(REC); del x['estate']; self.assertRaises(HouseIntegrityError,self.h.put,x)
 def test_unknown_record_audited(self): self.assertRaises(KeyError,self.h.get,'none'); self.assertEqual(self.h.audit_entries()[-1]['outcome'],'not_found')
 def test_version_increments(self): self.assertEqual(self.h.put(copy.deepcopy(REC))['version'],1); self.assertEqual(self.h.put(copy.deepcopy(REC))['version'],2)
if __name__=='__main__':unittest.main()
