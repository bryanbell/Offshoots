// The HITS and POPULAR tables: each year's ten biggest songs on the Billboard Hot 100,
// and the styles that held the most of that year's chart.
//
//   node tools/hits.js            dry run: the ranking, and which songs still need a style
//   node tools/hits.js --write    rewrite HITS and POPULAR in src/data.js
//   node tools/hits.js --file all.json   use a copy of the archive already downloaded
//
// Fetches every weekly chart from github.com/mhollingshead/billboard-hot-100 (all.json,
// about 45 MB), scores each song 101 minus its position for every week it charted in a
// year, and keeps the ten highest. A song already in HITS keeps the style chosen for it;
// a new one is written with "" and listed, so placing it is a matter of filling that in
// by hand. Run it once a year or so; the current year is the year so far.
//
// POPULAR counts every song on the chart, not just the ten: its points go to the style it
// was given in HITS if it is one of those, otherwise to the styles whose artist lists name
// its lead artist (a key artist counting double a roster one, split when there are
// several). An artist the atlas does not name counts toward nothing, so a share is of the
// whole chart and reads low: about two fifths of each year's points find a style.
const fs=require("fs"), path=require("path"), https=require("https");
const SRC=path.join(__dirname,"..","src","data.js");
const URL="https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/all.json";
const write=process.argv.includes("--write");

function get(u){ return new Promise((ok,no)=>https.get(u,r=>{
  if(r.statusCode!==200){ no(new Error(u+" "+r.statusCode)); return; }
  const b=[]; r.on("data",c=>b.push(c)); r.on("end",()=>ok(Buffer.concat(b).toString("utf8"))); }).on("error",no)); }

(async()=>{
  const fi=process.argv.indexOf("--file");
  const weeks=JSON.parse(fi>0 ? fs.readFileSync(process.argv[fi+1],"utf8") : await get(URL));
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
  // POPULAR: every chart week's points, credited to styles
  const norm=v=>String(v).toLowerCase().replace(/^the /,"").replace(/[^a-z0-9]+/g," ").trim();
  const lead=a=>a.split(/ (?:Featuring|featuring|Feat\.|feat\.|With|with|&|And His|and His|And The|and The|x|X|Duet With|, )/)[0].trim();
  const who=new Map(), name=(n,id,w)=>{ const k=norm(n); if(!who.has(k)) who.set(k,new Map()); const m=who.get(k); m.set(id,Math.max(m.get(id)||0,w)); };
  for(const [id,l] of Object.entries(D.ART||{})) l.forEach(n=>name(n,id,2));
  for(const [id,l] of Object.entries(D.ROSTER||{})) l.forEach(n=>name(n,id,1));
  const by={}, all={};
  for(const w of weeks){ const y=+w.date.slice(0,4); if(y<1959) continue;
    const t=by[y]||(by[y]={});
    for(const r of w.data){ const p=101-r.this_week; all[y]=(all[y]||0)+p;
      const st=had[r.song+"\u0000"+r.artist];
      if(st){ t[st]=(t[st]||0)+p; continue; }
      const m=who.get(norm(lead(r.artist))); if(!m) continue;
      const tot=[...m.values()].reduce((a,b)=>a+b,0);
      for(const [id,wt] of m) t[id]=(t[id]||0)+p*wt/tot; } }
  const pop=Object.keys(by).sort().map(y=>JSON.stringify(String(y))+":"+JSON.stringify(
    Object.entries(by[y]).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id,v])=>[id,Math.round(1000*v/all[y])/10]))+",");
  if(!write) return;
  let raw=fs.readFileSync(SRC,"utf8");
  for(const [tbl,ls] of [["HITS",lines],["POPULAR",pop]]){
    const re=new RegExp("^const "+tbl+" = \\{\\n[\\s\\S]*?^\\};\\n","m");
    if(!re.test(raw)){ console.error("could not find const "+tbl+" = { ... }; in data.js"); process.exit(1); }
    raw=raw.replace(re,"const "+tbl+" = {\n"+ls.join("\n")+"\n};\n"); }
  fs.writeFileSync(SRC,raw);
  console.log("wrote HITS and POPULAR; fill in the styles listed above, then node test/run.js data");
})().catch(e=>{ console.error(e.message); process.exit(1); });
