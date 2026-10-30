// The welcome.
//
// A map of 461 dots joined by lines does not explain itself, and the playlists, which are
// the reason to stay, are two taps down. So a new visitor gets one card: what the thing
// is, that it can be heard, and one way in.
//
// The rules it has to keep: once per browser and never again; never over a shared link,
// because somebody following one came for a style rather than an explanation; the numbers
// read off the map rather than typed into the copy; and every way out works, since a
// modal that traps you is worse than no modal.
//
// This suite is the one that does NOT mark it seen first.
const {chromium}=require("playwright");
const {settle,until,gone,shown,arm}=require("./_wait");
const URL="file://"+__dirname+"/../index.html";
const M={viewport:{width:393,height:852,isMobile:true,hasTouch:true},deviceScaleFactor:2};
const D={viewport:{width:1280,height:900}};
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));
const up=p=>p.evaluate(()=>!document.getElementById("hello").hidden);
// boot runs once the fonts are ready and opens the card 260ms after that, so the card is
// either up by the time this returns or it was never coming. The checks here are as often
// about the card NOT appearing as about it appearing, and both need the same window to
// have passed.
const booted=q=>until(q,()=>{
  if(document.fonts.status!=="loaded") return false;
  if(!window.__fontsAt) window.__fontsAt=performance.now();
  const w=document.getElementById("hello");
  return !!w && (!w.hidden || performance.now()-window.__fontsAt>400);});
// one name for "the page has loaded, boot has had its say, and nothing is moving"
const ready=async q=>{ await arm(q); await shown(q,"#chart .n"); await booted(q); await settle(q); };
// the picker writes the app's own setting, and marks the button it wrote
const picked=(q,svc)=>until(q,s=>{const b=document.querySelector('#hello [data-svc="'+s+'"]');
  return !!b && b.getAttribute("aria-pressed")==="true";},svc);

(async()=>{
  const b=await chromium.launch();

  // ---------- a new visitor ----------
  let ctx=await b.newContext(M); let p=await ctx.newPage();
  const errs=[]; p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL); await ready(p);
  say("a new visitor gets the card", await up(p));

  const card=await p.evaluate(()=>{
    const c=document.getElementById("hellocard");
    const r=c.getBoundingClientRect(), body=document.body.getBoundingClientRect();
    return {title:(document.getElementById("hellottl")||{}).textContent,
      styles:(document.getElementById("hellon")||{}).textContent,
      lists:(document.getElementById("hellop")||{}).textContent,
      points:document.querySelectorAll(".hellolist li").length,
      icons:document.querySelectorAll(".hellolist .helloi svg").length,
      appicon:!!(document.getElementById("helloicon")||{}).getAttribute("src"),
      modal:c.getAttribute("role")==="dialog" && c.getAttribute("aria-modal")==="true"
        && !!c.getAttribute("aria-labelledby"),
      fits:r.height<=body.height && r.top>=-1,
      scrolls:document.documentElement.scrollWidth<=innerWidth+1};});
  say("  titled "+JSON.stringify(card.title), (card.title||"").length>6);
  say("  with "+card.points+" points, each with a mark", card.points===3 && card.icons===3);
  say("  and the app's own icon on it", card.appicon);
  say("  announced as a dialog", card.modal);
  say("  fitting the screen without pushing it sideways", card.fits && card.scrolls);

  // the numbers are the map's, not a sentence somebody has to remember to update
  const real=await p.evaluate(()=>({n:String(DATA.length),
    play:String(DATA.filter(r=>PLAY[r[0]]||SPLAY[r[0]]).length)}));
  say("  "+card.styles+" styles, read off the map", card.styles===real.n);
  say("  "+card.lists+" playlists, counted not claimed", card.lists===real.play);

  // ---------- where you listen ----------
  // Asked once, here, because the answer changes every playlist link in the app and the
  // alternative is finding the menu on a style panel after the first wrong link opens.
  // It sets the app's own `svc`, not a second setting of its own, and it does not dismiss
  // the card: choosing where you listen is not choosing to start.
  const svc=await p.evaluate(()=>({
    opts:[...document.querySelectorAll("#hello [data-svc]")].map(b=>b.dataset.svc),
    labels:[...document.querySelectorAll("#hello [data-svc]")].map(b=>b.textContent.trim()),
    on:[...document.querySelectorAll("#hello [data-svc]")]
        .filter(b=>b.getAttribute("aria-pressed")==="true").map(b=>b.dataset.svc),
    group:!!document.querySelector("#hello [role=radiogroup][aria-labelledby]"),
    tall:[...document.querySelectorAll("#hello [data-svc]")]
        .every(b=>b.getBoundingClientRect().height>=44)}));
  say("the card asks where you listen ("+svc.labels.join(", ")+")", svc.opts.length===3);
  say("  with the one already stored marked, not a blank set of three",
    svc.on.length===1 && svc.on[0]==="apple");
  say("  as a labelled group of real tap targets", svc.group && svc.tall);

  await p.click('#hello [data-svc="spotify"]'); await picked(p,"spotify"); await settle(p);
  const after=await p.evaluate(()=>({
    on:[...document.querySelectorAll("#hello [data-svc]")]
        .filter(b=>b.getAttribute("aria-pressed")==="true").map(b=>b.dataset.svc),
    stored:(()=>{try{return localStorage.getItem("svc")}catch(e){return null}})(),
    up:!document.getElementById("hello").hidden}));
  say("picking one marks it and stores it as the app's own setting",
    after.on.join()==="spotify" && after.stored==="spotify");
  say("  and leaves the card open", after.up);
  // put it back, so the rest of this suite sees the state it was written against
  await p.click('#hello [data-svc="apple"]'); await picked(p,"apple"); await settle(p);

  // ---------- it goes away, and stays away ----------
  await p.click("#hellook"); await gone(p,"#hello"); await settle(p);
  say("Look around dismisses it", (await up(p))===false);
  say("  and the map is usable underneath",
    (await p.$$eval("#chart .n",e=>e.length))>400);
  await p.reload(); await ready(p);
  say("  and it does not come back", (await up(p))===false);
  say("no page errors", errs.filter(x=>!/Failed to load/.test(x)).join(" | ")||true);
  await ctx.close();

  // ---------- the other ways out ----------
  for(const [name,act] of [
      ["Escape", async q=>q.keyboard.press("Escape")],
      ["a tap outside", async q=>q.click("#hellobd",{position:{x:10,y:10}})]]){
    const c2=await b.newContext(M); const q=await c2.newPage();
    await q.goto(URL); await ready(q);
    await act(q); await gone(q,"#hello"); await settle(q);
    say(name+" dismisses it too", (await up(q))===false);
    say("  and that counts as seen", await q.evaluate(()=>{
      try{ return localStorage.getItem("offshoots.seen")==="1"; }catch(e){ return true; }}));
    await c2.close();
  }

  // ---------- the way in it offers ----------
  { const c3=await b.newContext(M); const q=await c3.newPage();
    await q.goto(URL); await ready(q);
    // the card closes, the sheet opens, and the modes page is pushed 120ms later
    await q.click("#hellomood");
    await until(q,()=>{const u=[...document.querySelectorAll(".ppage")].filter(x=>!x.hidden)[0];
      return !!u && u.dataset.p==="modes" && document.body.classList.contains("open");});
    await settle(q);
    const where=await q.evaluate(()=>{
      const u=[...document.querySelectorAll(".ppage")].filter(x=>!x.hidden)[0];
      return {page:u?u.dataset.p:null, rows:u?u.querySelectorAll(".listrow").length:0,
        open:document.body.classList.contains("open"), gone:document.getElementById("hello").hidden};});
    say("Browse by mood opens the ways in ("+where.rows+" of them)",
      where.page==="modes" && where.rows>20);
    say("  with the sheet up and the card gone", where.open && where.gone);
    await c3.close(); }

  // ---------- somebody arriving on a shared link ----------
  { const c4=await b.newContext(M); const q=await c4.newPage();
    await q.goto(URL+"#dub"); await ready(q);
    say("a shared style link skips it", (await up(q))===false);
    say("  and lands on the style", (await q.evaluate(()=>location.hash))==="#dub");
    // skipping is not the same as seeing: the explanation is still owed
    await q.goto(URL); await ready(q);
    say("  so the map itself still explains itself later", await up(q));
    await c4.close(); }

  // the point of asking is that every link in the app changes, so check one that is two
  // taps away rather than only the button that was pressed
  { const c6=await b.newContext(M); const q=await c6.newPage();
    await q.goto(URL); await ready(q);
    await q.click('#hello [data-svc="spotify"]'); await picked(q,"spotify");
    await q.click("#hellook"); await gone(q,"#hello"); await settle(q);
    // tap a style on the map rather than reloading on a hash: it keeps the check on the
    // running page, where the choice was just made, instead of on whether file:// held
    // onto localStorage across a navigation — which it does not reliably do
    await q.evaluate(()=>{ const n=[...document.querySelectorAll("#chart .n")]
      .find(x=>x.dataset.id==="dub") || document.querySelector("#chart .n");
      n.dispatchEvent(new MouseEvent("click",{bubbles:true})); });
    // the panel is built from the selection, so the style has to be current
    await until(q,()=>!!document.querySelector("#chart .n.cur")); await settle(q);
    await q.click("#grab").catch(()=>{});
    await until(q,()=>document.body.classList.contains("open"));
    // the glide leaves an inline height on the panel while the sheet is still moving
    await until(q,()=>!document.getElementById("panel").style.height); await settle(q);
    const reach=await q.evaluate(()=>{
      const sv=document.querySelector(".svctx");
      const links=[...document.querySelectorAll("#panel a[href]")].map(a=>a.href)
        .filter(h=>/spotify|music\.apple|qobuz/.test(h));
      return {picker:sv?sv.textContent.trim():"none", n:links.length,
        allSpotify:links.length>0 && links.every(h=>/open\.spotify\.com/.test(h))};});
    say("the choice reaches a style panel: it reads "+reach.picker
      +" and all "+reach.n+" of its links are Spotify",
      reach.picker==="Spotify" && reach.allSpotify);
    await c6.close(); }

  // ---------- desktop ----------
  { const c5=await b.newContext(D); const q=await c5.newPage();
    await q.goto(URL); await ready(q);
    say("the card is there on a desktop too", await up(q));
    const fit=await q.evaluate(()=>{const r=document.getElementById("hellocard").getBoundingClientRect();
      return {w:Math.round(r.width), centred:Math.abs((r.left+r.right)/2-innerWidth/2)<=2,
        inside:r.top>=-1 && r.bottom<=innerHeight+1};});
    say("  centred at "+fit.w+"px and fully on screen", fit.centred && fit.inside && fit.w<=420);
    await c5.close(); }

  await b.close();
})();
