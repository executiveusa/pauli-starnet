#!/usr/bin/env node
'use strict';
const path=require('node:path'); const {generateFindingIndex}=require('../../sidecar/pauli-icm-architect'); const root=process.argv[2]||path.join(process.cwd(),'districts/pauli/icm-architect/findings'); const rows=generateFindingIndex(root); console.log(`generated ${rows.length} finding index rows`);
