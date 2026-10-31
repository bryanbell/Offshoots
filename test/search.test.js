// Search returns three kinds of thing, and the point of the file is that they stay in
// one ranked list rather than three stacked buckets.
//
// A STYLE is the map's own content and wins on any decent match. A SOURCE is a Go deeper
// row: several hundred books, articles and films that, until they were indexed here,
// could only be reached by already knowing which style they sat on. A PAGE is a place,
// so that "podcasts" goes to Audio and "Pete" goes to his picks.
const {chromium}=require("playwright");
const skipWelcome=require("./_hello");
const {settle,until,arm}=require("./_wait");
const D=require("../src/data.js");
const URL="file://"+__dirname+"/../index.html";
const M={width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2};
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));
const drawn=q=>until(q,()=>!!document.querySelector("#chart .n"));
const ready=async q=>{ await arm(q); await drawn(q); await settle(q); };
const onPage=async(q,k)=>{ await until(q,k=>{
    const u=[...document.querySelectorAll(".ppage")].filter(x=>!x.hidden)[0];
    return !!u && u.dataset.p===k;},k); await settle(q); };

// type, then wait for the list to say something about this query rather than for a clock
async function ask(p,t){
  await p.$eval("#q",(e,v)=>{ e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); },t);
  await until(p,()=>{const r=document.getElementById("res");
    return !!r && (r.hidden || r.querySelectorAll("button").length>0);});
  await settle(p);
  return p.evaluate(()=>[...document.querySelectorAll("#res button")].map(x=>({
    kind:x.className.split(" ").find(c=>/^res-/.test(c)),
    name:(x.querySelector("span")||{}).textContent||"",
    line:(x.querySelector("small")||{}).textContent||"",
    go:x.dataset.go||x.dataset.pageGo||x.dataset.src||""})));
}

(async()=>{
  const b=await chromium.launch(); skipWelcome(b);
  const errs=[];
  const p=await b.newPage({viewport:M});
  p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL); await ready(p);
  await p.$eval("#mapSearch",e=>e.click()); await settle(p);

  say("the field says what it searches",
    /sources/i.test(await p.$eval("#q",e=>e.placeholder)));

  // --- a style still wins its own name
  const bb=await ask(p,"bebop");
  say("a style still comes first for its own name ("+(bb[0]||{}).name+")",
    bb[0] && bb[0].kind==="res-style" && /Bebop/i.test(bb[0].name));
  say("  with its sources under it",
    bb.slice(1).some(h=>h.kind==="res-src"));

  // --- a source by title, which was unreachable before
  const ob=await ask(p,"our band could");
  say("a source is findable by title ("+(ob[0]||{}).name+")",
    ob[0] && ob[0].kind==="res-src" && /Our Band/.test(ob[0].name));
  // the line has to say where it lives, or the result is a dead end: tapping it leaves
  // the app, so this is the only chance to say which style it belongs to
  say("  its line naming what it is, who made it and where it lives ("+(ob[0]||{}).line+")",
    /History/.test(ob[0].line) && /Azerrad/.test(ob[0].line) && /more|Pop|Rock|Punk/.test(ob[0].line));
  say("  and pointing at the source itself, not a style",
    ob[0].go.startsWith("http"));

  // --- a source by author
  const au=await ask(p,"heat-moon");
  say("findable by author too ("+(au[0]||{}).name+")",
    au[0] && au[0].kind==="res-src" && /Blue Highways/.test(au[0].name));

  // --- the pages
  const pod=await ask(p,"podcast");
  // nothing in the data is labelled "podcast"; the word has to reach the Audio page by
  // its description, or someone looking for one finds nothing at all
  say("a word nobody tagged still finds its page ("+(pod[0]||{}).name+")",
    pod[0] && pod[0].kind==="res-page" && pod[0].name==="Audio");
  const pt=await ask(p,"pete");
  say("the guest is findable by name ("+(pt[0]||{}).name+")",
    pt[0] && pt[0].kind==="res-page" && /Pete/.test(pt[0].name));
  say("  above the styles with a Pete in them, of which there are several",
    pt.filter(h=>h.kind==="res-style").length>0 &&
    pt.findIndex(h=>h.kind==="res-page")<pt.findIndex(h=>h.kind==="res-style"));

  // --- every medium page is reachable by its own name
  const names=["Articles","Books","Audio","Videos","Pictures"];
  const found=[];
  for(const n of names){ const r=await ask(p,n.toLowerCase());
    if(r[0] && r[0].kind==="res-page" && r[0].name===n) found.push(n); }
  say("every medium page answers to its own name ("+found.length+" of "+names.length+")",
    found.length===names.length);

  // --- opening a page result
  await ask(p,"pete");
  await p.click("#res button"); await onPage(p,"picks");
  say("a page result opens that page", true);
  say("  and the field is cleared behind it",
    (await p.$eval("#q",e=>e.value))==="");

  // --- a source result opens the source, and leaves the map alone
  await p.$eval("#mapSearch",e=>e.click()).catch(()=>{});
  await settle(p);
  const before=await p.evaluate(()=>location.hash);
  const bh=await ask(p,"blue highways");
  // the request, not the result: these hosts are unreachable from a test browser, and
  // waiting for the load would check Chrome's error page instead of where we sent it
  let asked="";
  p.context().once("request",r=>{ if(!asked && r.url()===bh[0].go) asked=r.url(); });
  const [pop]=await Promise.all([
    p.context().waitForEvent("page"),
    p.click("#res button")]);
  if(!asked) asked=pop.url();
  say("a source result opens the source in a new tab", asked===bh[0].go);
  await pop.close();
  say("  leaving the map where it was", (await p.evaluate(()=>location.hash))===before);

  // --- the list stays a list: eight at most, whatever matches
  const many=await ask(p,"the");
  say("never more than eight results ("+many.length+")", many.length<=8);

  // --- nothing matches, nothing shows
  await ask(p,"zzzzqqqq");
  say("no match, no list", await p.$eval("#res",e=>e.hidden));

  say("no page errors", errs.length===0 ? true : errs.filter(x=>!/Failed to load/.test(x)).join(" | ")||true);
  await b.close();
})();
