// The HITS table: each year's ten biggest songs on the Billboard Hot 100.
//
//   node tools/hits.js            dry run: the ranking, and which songs still need a style
//   node tools/hits.js --write    rewrite HITS in src/data.js
//
// Fetches every weekly chart from github.com/mhollingshead/billboard-hot-100 (all.json,
// about 45 MB), scores each song 101 minus its position for every week it charted in a
// year, and keeps the ten highest. A song already in HITS keeps the style chosen for it;
// a new one is written with "" and listed, so placing it is a matter of filling that in
// by hand. Run it once a year or so; the current year is the year so far.
const fs=require("fs"), path=require("path"), https=require("https");
const SRC=path.join(__dirname,"..","src","data.js");
const URL="https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/all.json";
const write=process.argv.includes("--write");

function get(u){ return new Promise((ok,no)=>https.get(u,r=>{
  if(r.statusCode!==200){ no(new Error(u+" "+r.statusCode)); return; }
  const b=[]; r.on("data",c=>b.push(c)); r.on("end",()=>ok(Buffer.concat(b).toString("utf8"))); }).on("error",no)); }

(async()=>{
  const weeks=JSON.parse(await get(URL));
  const pts={};
  for(const w of weeks){ const y=+w.date.slice(0,4); if(y<1959) continue;
    const t=pts[y]||(pts[y]=new Map());
    for(const r of w.data){ const k=r.song+"\u0000"+r.artist; t.set(k,(t.get(k)||0)+101-r.this_week); } }
  const D=require(SRC), had={};
  for(const [y,rows] of Object.entries(D.HITS||{})) for(const [s,a,st] of rows) had[s+"\u0000"+a]=st;
  const need=[], lines=[];
  for(const y of Object.keys(pts).sort()){
    const top=[...pts[y]].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k])=>{ const [s,a]=k.split("\u0000");
      const st=had[k]; if(st===undefined) need.push(y+"  "+s+" / "+a); return [s,a,st||""]; });
    lines.push(JSON.stringify(String(y))+":"+JSON.stringify(top)+",");
  }
  console.log(lines.length+" years, "+weeks[0].date+" to "+weeks[weeks.length-1].date);
  console.log(need.length ? "needs a style:\n  "+need.join("\n  ") : "every song already has its style");
  if(!write) return;
  const raw=fs.readFileSync(SRC,"utf8"), re=/^const HITS = \{\n[\s\S]*?^\};\n/m;
  if(!re.test(raw)){ console.error("could not find const HITS = { ... }; in data.js"); process.exit(1); }
  fs.writeFileSync(SRC,raw.replace(re,"const HITS = {\n"+lines.join("\n")+"\n};\n"));
  console.log("wrote HITS; fill in the styles listed above, then node test/run.js data");
})().catch(e=>{ console.error(e.message); process.exit(1); });
