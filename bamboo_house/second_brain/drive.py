from __future__ import annotations
import json,urllib.parse,urllib.request
FOLDER_ID='16uo1fDUObkFNs241A_BVzac24ZyM4ddo'
EXPECTED_OWNER='executiveusa@gmail.com'
class ReadOnlyDrive:
 def __init__(self,access_token,folder_id=FOLDER_ID): self.token=access_token; self.folder_id=folder_id
 def _get(self,url):
  req=urllib.request.Request(url,headers={'Authorization':f'Bearer {self.token}'},method='GET')
  with urllib.request.urlopen(req) as r:return r.read()
 def verify_folder(self):
  fields='id,name,mimeType,owners(emailAddress),trashed'
  x=json.loads(self._get(f'https://www.googleapis.com/drive/v3/files/{self.folder_id}?fields={urllib.parse.quote(fields)}'))
  owners=[o.get('emailAddress','').lower() for o in x.get('owners',[])]
  if x.get('mimeType')!='application/vnd.google-apps.folder' or x.get('trashed') or EXPECTED_OWNER not in owners: raise PermissionError('pinned Second Brain folder identity failed')
  return x
 def list_files(self):
  q=urllib.parse.quote(f"'{self.folder_id}' in parents and trashed=false"); token=None
  while True:
   url='https://www.googleapis.com/drive/v3/files?'+urllib.parse.urlencode({'q':f"'{self.folder_id}' in parents and trashed=false",'pageSize':1000,'fields':'nextPageToken,files(id,name,size,mimeType,modifiedTime,owners(emailAddress))',**({'pageToken':token} if token else {})})
   x=json.loads(self._get(url)); yield from x.get('files',[]); token=x.get('nextPageToken')
   if not token:break
 def download(self,file_id,destination,chunk=8*1024*1024):
  req=urllib.request.Request(f'https://www.googleapis.com/drive/v3/files/{file_id}?alt=media',headers={'Authorization':f'Bearer {self.token}'},method='GET')
  with urllib.request.urlopen(req) as r,open(destination,'wb') as w:
   while True:
    b=r.read(chunk)
    if not b:break
    w.write(b)
