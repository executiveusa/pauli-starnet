'use strict';
// Offline renderer of Nick's Stack config/SOUL template into five HELD room configs.
// Never copies auth.json, .env, tokens, chat sessions or a real person's likeness.
const fs=require('node:fs');
const path=require('node:path');
const manifest=require('./manifest.json');
function render(upstream, output) {
  const source=fs.readFileSync(path.join(upstream,'files/config.yaml'),'utf8');
  const soul=fs.readFileSync(path.join(upstream,'files/SOUL.md'),'utf8');
  if (!source.includes('  provider: nous') || !source.includes('  default: openai/gpt-5.5')) throw Error('Nick template model contract changed: inspect upstream first');
  fs.mkdirSync(output,{recursive:true});
  for(const agent of manifest.agents) {
    const room=path.join(output,agent.district); fs.mkdirSync(room,{recursive:true});
    const config=source.replace('  default: openai/gpt-5.5','  default: gpt-5.6-sol').replace('  provider: nous','  provider: openai-codex');
    fs.writeFileSync(path.join(room,'config.yaml'),config,{mode:0o600});
    fs.writeFileSync(path.join(room,'SOUL.md'),`# Offline draft room ${agent.id}\n# Identity and real-person rights not yet verified. No external effects.\n# Report to Jeremy's Hermes via reviewed, authenticated dispatch only.\n# Prepare drafts; do not message, bid, list, publish, spend or create accounts.\n\n${soul}`);
    fs.writeFileSync(path.join(room,'room.json'),JSON.stringify({...agent,externalEffects:'held',manager:'Hermes',postgresScope:agent.id},null,2)+'\n');
  }
  return manifest.agents.length;
}
if(require.main===module){
  if(process.argv.length!==4) throw Error('Usage: node build.js /path/to/nicks-stack /path/to/private/output');
  console.log(`Rendered ${render(process.argv[2],process.argv[3])} draft rooms (not deployed)`);
}
module.exports={render};
