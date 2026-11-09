// The map, published as data for a reader that cannot look at a picture.
//
// Two things have to hold. The file has to say the same thing the app says, which is why
// it is generated from src/data.js at build time rather than maintained beside it: a
// hand-kept copy drifts, and a drifted copy is worse than none, because nothing tells the
// person asking. And it has to be reachable from the app, or nobody finds it.
const fs=require("fs"), path=require("path");
const {chromium}=require("playwright");
const skipWelcome=require("./_hello");
const {settle,until,shown,arm}=require("./_wait");
const D=require(path.join(__dirname,"..","src","data.js"));
const FILE=path.join(__dirname,"..","musicatlas.json");
const URL="file://"+path.join(__dirname,"..","index.html");
// Anything that is not true is a failure. A check that answered with its detail instead
// of false used to print with no prefix at all, so the runner counted it as no check and
// the run came back clean: a failing assertion that reported what went wrong was the one
// kind that could not fail. Caught by a deliberately broken build printing a blank line.
const say=(k,v)=>console.log((v===true?"PASS ":"FAIL ")+k+(typeof v!=="boolean"?": "+v:""));
// A line that only records what happened, with no verdict in it. Keeping these out of
// say() is what lets say() treat anything that is not true as a failure.
const note=(k,v)=>console.log("     "+k+(v===undefined?"":": "+v));

(async()=>{
  if(!fs.existsSync(FILE)){
    say("musicatlas.json is written by the build", false);
    process.exitCode=1; return;
  }
  const raw=fs.readFileSync(FILE,"utf8");
  let J=null, err="";
  try{ J=JSON.parse(raw); }catch(e){ err=e.message; }
  const kb=Math.round(raw.length/1024);
  say("it parses as JSON ("+kb+" KB)", J?true:err);
  if(!J) { process.exitCode=1; return; }

  // ---- it says what the app says ----
  say("every style is in it ("+J.styles.length+")", J.styles.length===D.DATA.length);
  const byId=Object.fromEntries(J.styles.map(s=>[s.id,s]));
  const missing=D.DATA.filter(r=>!byId[r[0]]).map(r=>r[0]);
  say("  by the same ids", missing.length===0 ? true : missing.slice(0,5).join(", "));
  const wrongName=D.DATA.filter(r=>byId[r[0]] && byId[r[0]].name!==r[1]).map(r=>r[0]);
  say("  under the same names", wrongName.length===0 ? true : wrongName.slice(0,5).join(", "));
  const wrongYear=D.DATA.filter(r=>byId[r[0]] && byId[r[0]].year!==r[2]).map(r=>r[0]);
  say("  at the same years", wrongYear.length===0 ? true : wrongYear.slice(0,5).join(", "));

  // lineage both ways: a parent that does not list the child back is a map you cannot walk
  const badFrom=[];
  for(const r of D.DATA){
    const want=(r[4]?r[4].split(" "):[]).sort().join(",");
    const got=(byId[r[0]].grewOutOf||[]).slice().sort().join(",");
    if(want!==got) badFrom.push(r[0]+": "+got+" vs "+want);
  }
  say("  with the same parentage", badFrom.length===0 ? true : badFrom.slice(0,3).join(" | "));
  const oneWay=[];
  for(const s of J.styles) for(const c of (s.ledTo||[]))
    if((byId[c]||{grewOutOf:[]}).grewOutOf.indexOf(s.id)<0) oneWay.push(s.id+" -> "+c);
  say("  and ledTo agreeing with grewOutOf both ways",
    oneWay.length===0 ? true : oneWay.slice(0,3).join(", "));

  // playlists are the reason to point a model at this at all
  const want=D.DATA.filter(r=>D.PLAY[r[0]]||D.SPLAY[r[0]]).length;
  const got=J.styles.filter(s=>s.playlist).length;
  say("every playlist is carried ("+got+" of "+D.DATA.length+")", got===want);
  const badUrl=J.styles.filter(s=>s.playlist
    && !/^https:\/\/(music\.apple\.com|open\.spotify\.com)\//.test(
        s.playlist.appleMusic||s.playlist.spotify||"")).map(s=>s.id);
  say("  as absolute links someone else can follow",
    badUrl.length===0 ? true : badUrl.slice(0,4).join(", "));
  // Deliberately no artists and no songs: they were most of the bytes, they are in the
  // app behind each playlist, and a file too big for a reader to fetch is no use at all.
  const heavy=J.styles.filter(s=>s.songs||s.otherArtists||s.keyArtists).map(s=>s.id);
  say("  and no roster or song list weighing it down",
    heavy.length===0 ? true : heavy.slice(0,4).join(", "));
  say("  which the note to the reader says, and says where they are instead",
    /no artist lists and no song titles/i.test(J.readMe.notHere||"")
    && /playlist/i.test(J.readMe.notHere||""));
  say("crossings are in it ("+J.crossStylePlaylists.length+")",
    J.crossStylePlaylists.length===(D.XPLAY||[]).length);
  const badX=(J.crossStylePlaylists||[]).filter(x=>!x.playlist
    || !(x.spansStyles||[]).length).map(x=>x.id);
  say("  each with its playlist and the styles it spans",
    badX.length===0 ? true : badX.join(", "));

  // ---- every style links to its own panel ----
  // The point of handing this over is an answer that can point at what it names. A
  // recommendation with no link is a name the person then has to go and find.
  const noUrl=J.styles.filter(s=>!s.url).map(s=>s.id);
  say("every style carries the address of its own panel",
    noUrl.length===0 ? true : noUrl.slice(0,4).join(", "));
  const badHash=J.styles.filter(s=>s.url!==J.url+"/#"+s.id).map(s=>s.id);
  say("  built from its id, so it opens that style",
    badHash.length===0 ? true : badHash.slice(0,4).join(", "));
  // ids are the only way through the file, so every one of them has to resolve
  const dangling=[];
  for(const s2 of J.styles){
    for(const p2 of (s2.grewOutOf||[])) if(!byId[p2]) dangling.push(s2.id+" -> "+p2);
    for(const c2 of (s2.ledTo||[])) if(!byId[c2]) dangling.push(s2.id+" -> "+c2);
  }
  for(const x of (J.crossStylePlaylists||[]))
    for(const i of (x.spansStyles||[])) if(!byId[i]) dangling.push(x.id+" -> "+i);
  say("  and every id in it resolves to a style in the same file",
    dangling.length===0 ? true : dangling.slice(0,4).join(", "));

  // ---- it tells its reader what it is and what it is not ----
  // a model handed a file of lineage will state it as fact unless the file says otherwise
  const r=J.readMe||{};
  say("it carries a note to the reader",
    !!r.purpose && !!r.lineage && !!r.notHere && !!r.caution);
  say("  saying the lineage is a reading, not a fact",
    /reading|contested/i.test(r.lineage||""));
  say("  and that absence is not evidence", /absence/i.test(r.caution||""));

  // ---- and the wiki hands it over ----
  // The data link used to be a copy row on About. It is working detail, so it moved to the
  // wiki's "Map as data" page; About keeps one link to the wiki that names it.
  const wk=fs.readFileSync(path.join(__dirname,"..","wiki","data","index.html"),"utf8");
  say("the wiki's data page links the file by the site's address",
    /href="\/musicatlas\.json"/.test(wk) && /https:\/\/musicatlas\.us\/musicatlas\.json/.test(wk));
  const said=+(wk.match(/about (\d+) KB/)||[])[1];
  say("  and says its size honestly ("+said+" KB said, "+kb+" KB on disk)",
    !!said && Math.abs(said-kb)<=kb*0.2);
  say("  small enough to hand over whole (about "
    + Math.round(raw.length/4/1000)+"k tokens)", raw.length/4 < 60000);
  say("  and every wiki page can reach it", ["","catalog","handbook","art","covers","tiles"].every(d=>
    /href="\/wiki\/data\/"/.test(fs.readFileSync(path.join(__dirname,"..","wiki",d,"index.html"),"utf8"))));
  const b=await chromium.launch(); await skipWelcome(b);
  const p=await (await b.newContext({viewport:{width:430,height:930}})).newPage();
  await p.goto(URL+"#about"); await arm(p); await shown(p,"#chart .n"); await settle(p);
  await until(p,()=>!!document.querySelector('.ppage[data-p="about"]'));
  await settle(p);
  const ab=await p.evaluate(()=>{const pg=document.querySelector('.ppage[data-p="about"]');
    const w=pg.querySelector("a.wikilink");
    return {rows:pg.querySelectorAll(".dataline").length, wiki:w?w.href:"",
      names:/as data/i.test((w&&w.parentElement.textContent)||"")};});
  say("About no longer carries the data row", ab.rows===0);
  say("  it points at the wiki and says the data is there", /\/wiki\/$/.test(ab.wiki) && ab.names);

  await b.close();
})();
