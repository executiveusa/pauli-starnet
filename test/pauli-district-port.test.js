'use strict';
const assert=require('assert'); const fs=require('fs');
const paths=['frontend/app/cityos.js','frontend/city/world/cityos.js','frontend/city/deploy/world/cityos.js','website/app/app/cityos.js','website/app/city/world/cityos.js','website/app/city/deploy/world/cityos.js'];
for(const path of paths){const s=fs.readFileSync(path,'utf8'); assert(s.includes("id: 'pauli'"),path+' missing Pauli district'); for(const label of ["PAULI'S PENTHOUSE","PAULI'S PLACE",'HALL OF CANON']) assert(s.includes(label),path+' missing '+label); assert(!/bamboo[_ -]?house/i.test(s),path+' leaks private House');}
console.log('pauli district port: PASS');
