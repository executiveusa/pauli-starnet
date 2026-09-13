'use strict';
const assert=require('assert'); const fs=require('fs');
const paths=['frontend/app/cityos.js','frontend/city/world/cityos.js','frontend/city/deploy/world/cityos.js','website/app/app/cityos.js','website/app/city/world/cityos.js','website/app/city/deploy/world/cityos.js'];
for(const path of paths){const s=fs.readFileSync(path,'utf8'); assert(s.includes("id: 'financial'"),path+' missing Financial District'); for(const label of ['REVENUE HALL','TREASURY + PAYMENTS','COST + TOKENOMICS','ACCOUNTING + CLOSE','TAX OFFICE','EXECUTIVE FINANCE']) assert(s.includes(label),path+' missing '+label); assert(!/bamboo[_ -]?house/i.test(s),path+' leaks private House');}
const role=JSON.parse(fs.readFileSync('departments/financial/accountant-role.json','utf8')); assert.equal(role.status,'unassigned'); assert.equal(role.default_deny,true); assert(role.never_implicit.includes('read_bamboo_house')); assert.equal(role.assignees.length,0);
const sql=fs.readFileSync('financial_district/schema.sql','utf8'); assert(sql.includes("CHECK(mode != 'live')"));
console.log('financial district port: PASS');
