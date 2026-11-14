#!/usr/bin/env bash
# city-247 verification. Prints PASS / FAIL / SKIP per check. Never prints secret values.
# Run from anywhere; set:
#   REPO_DIR               the server checkout of pauli-starnet (default /opt/pauli-starnet)
#   SUPABASE_DB_CONTAINER  docker container of the Supabase Postgres (default: first name matching supabase.*db)
#   GW                     gateway base URL (default http://127.0.0.1:4001)
#   GATEWAY_BEARER_TOKEN   gateway bearer (from Infisical)
#   GITHUB_TOKEN           token that can read executiveusa/pauli-starnet
set -u
REPO_DIR=${REPO_DIR:-/opt/pauli-starnet}
GW=${GW:-http://127.0.0.1:4001}
GH_REPO=executiveusa/pauli-starnet
EXPECT_SHA=be5f77b3cb1a1e6d0d9bc4de58dc220c49325a20
pass=0; fail=0; skip=0
ok()   { echo "PASS  $1"; pass=$((pass+1)); }
bad()  { echo "FAIL  $1"; fail=$((fail+1)); }
skp()  { echo "SKIP  $1"; skip=$((skip+1)); }
json() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const o=JSON.parse(s);console.log(eval(process.argv[1]))}catch(e){console.log("")}})' "$1"; }

echo "== code"
if cd "$REPO_DIR" 2>/dev/null; then
  if git merge-base --is-ancestor "$EXPECT_SHA" HEAD 2>/dev/null; then ok "checkout contains $EXPECT_SHA (HEAD $(git rev-parse --short HEAD))"; else bad "checkout $REPO_DIR does not contain $EXPECT_SHA"; fi
  for t in knowledge district-foreman review-gate first-lanes; do
    if node "test/$t.test.js" >/tmp/city247-$t.log 2>&1; then ok "test $t ($(tail -1 /tmp/city247-$t.log))"; else bad "test $t (see /tmp/city247-$t.log)"; fi
  done
else bad "REPO_DIR $REPO_DIR not found"; fi

echo "== database"
DB=${SUPABASE_DB_CONTAINER:-$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E 'supabase.*db' | head -1)}
if [ -n "$DB" ]; then
  q() { docker exec -i "$DB" psql -U postgres -d postgres -Atc "$1" 2>/dev/null; }
  docs=$(q "select count(*) from kb_documents"); chunks=$(q "select count(*) from kb_chunks"); ins=$(q "select count(*) from kb_insights")
  if [ "${docs:-0}" -ge 436 ] 2>/dev/null; then ok "kb_documents=$docs kb_chunks=$chunks kb_insights=$ins"; else bad "kb_documents=${docs:-missing} (expect >= 436; run the migration + ingest)"; fi
  echo "      by source: $(q "select string_agg(source_id||'='||n, ' ') from (select source_id, count(*) n from kb_documents group by 1 order by 1) t")"
  for s in jasper-smart-sites manny-hormozi-315; do
    n=$(q "select count(*) from kb_documents where source_id='$s'")
    if [ "${n:-0}" -gt 0 ] 2>/dev/null; then ok "server-held source $s loaded ($n docs)"; else bad "server-held source $s not loaded"; fi
  done
  hits=$(q "select count(*) from kb_search('grant or donor', 'impact', 5)")
  if [ "${hits:-0}" -gt 0 ] 2>/dev/null; then ok "kb_search impact returns $hits rows"; else bad "kb_search impact returned ${hits:-error}"; fi
else skp "no Supabase db container found (set SUPABASE_DB_CONTAINER)"; fi

echo "== gateway"
if [ -n "${GATEWAY_BEARER_TOKEN:-}" ]; then
  H="Authorization: Bearer $GATEWAY_BEARER_TOKEN"
  ks=$(curl -s -m 20 -H "$H" "$GW/v1/knowledge/search?district=impact&q=grant%20or%20donor")
  be=$(echo "$ks" | json 'o.backend'); nres=$(echo "$ks" | json '(o.results||[]).length')
  if [ "$be" = supabase ] && [ "${nres:-0}" -gt 0 ]; then ok "knowledge search backend=supabase results=$nres"; else bad "knowledge search backend=${be:-none} results=${nres:-0} (set KB_SUPABASE_URL/KB_SUPABASE_SERVICE_KEY, restart)"; fi
  bd=$(curl -s -m 20 -H "$H" "$GW/v1/districts")
  nd=$(echo "$bd" | json '(o.districts||[]).length'); st=$(echo "$bd" | json 'String(o.stale)'); age=$(echo "$bd" | json 'o.age_seconds')
  if [ "$nd" = 12 ] && [ "$st" = false ]; then ok "/v1/districts: 12 districts, fresh (age ${age}s)"; else bad "/v1/districts: districts=${nd:-0} stale=${st:-?} ($(echo "$bd" | json 'o.error||""'))"; fi
  echo "$bd" | json '(o.districts||[]).filter(d=>d.active!==false).map(d=>"      "+d.district.padEnd(14)+d.action.padEnd(9)+(d.question||d.reason||d.mission_id||"")).join("\n")'
else skp "GATEWAY_BEARER_TOKEN not set"; fi

echo "== 24/7 tick"
if command -v systemctl >/dev/null; then
  if systemctl is-active --quiet starnet-foreman.timer; then ok "starnet-foreman.timer active ($(systemctl list-timers starnet-foreman.timer --no-legend | awk '{print $1, $2, $3}'))"; else bad "starnet-foreman.timer not active"; fi
  wd=$(systemctl show -p WorkingDirectory --value starnet-foreman.service 2>/dev/null)
  if [ -n "$wd" ] && [ -d "$wd/.git" ]; then ok "foreman WorkingDirectory=$wd is a checkout"; else bad "foreman WorkingDirectory=${wd:-unset} is not a checkout"; fi
  r=$(systemctl show -p Result --value starnet-foreman.service 2>/dev/null); [ "$r" = success ] && ok "last tick result=success" || bad "last tick result=${r:-none} (journalctl -u starnet-foreman -n 30)"
else skp "systemctl not available"; fi

echo "== GitHub"
if [ -n "${GITHUB_TOKEN:-}" ]; then
  api() { curl -s -m 20 -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/$1"; }
  hi=$(api "repos/$GH_REPO" | json 'String(o.has_issues)')
  [ "$hi" = true ] && ok "Issues enabled on $GH_REPO" || bad "Issues disabled on $GH_REPO (OWNER: enable, then run the seeder)"
  for d in production impact commerce; do
    n=$(api "repos/$GH_REPO/issues?labels=district:$d&state=all&per_page=100" | json 'Array.isArray(o)?o.length:0')
    [ "${n:-0}" -gt 0 ] 2>/dev/null && ok "district:$d has $n issues" || bad "district:$d has no issues (seed)"
  done
  ap=$(api "repos/$GH_REPO/issues?labels=approved&state=open&per_page=100" | json 'Array.isArray(o)?o.map(i=>"#"+i.number).join(" "):""')
  [ -n "$ap" ] && ok "approved items: $ap" || skp "no approved items yet (OWNER: add the approved label to start work)"
  rv=$(api "repos/$GH_REPO/actions/variables/REVIEW_GATE_REVIEWERS" | json 'o.value||""')
  if [ -n "$rv" ] && [ "$rv" != executiveusa ]; then ok "REVIEW_GATE_REVIEWERS set (not the builder)"; else bad "REVIEW_GATE_REVIEWERS unset or executiveusa (OWNER: separate reviewer identity)"; fi
  head=$(api "repos/$GH_REPO/pulls/62" | json 'o.head.sha')
  gs=$(api "repos/$GH_REPO/commits/$head/status" | json '(o.statuses||[]).filter(s=>s.context==="starnet/review-gate").map(s=>s.state+": "+s.description)[0]||"none"')
  case "$gs" in success*) ok "review-gate on PR #62 head: $gs";; *) skp "review-gate on PR #62 head: $gs (clears when the reviewer approves)";; esac
else skp "GITHUB_TOKEN not set"; fi

echo "== summary: $pass PASS, $fail FAIL, $skip SKIP"
[ "$fail" -eq 0 ]
