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
const URL="file://"+__dirname+"/../index.html";
const M={viewport:{width:393,height:852,isMobile:true,hasTouch:true},deviceScaleFactor:2};
const D={viewport:{width:1280,height:900}};
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));
const up=p=>p.evaluate(()=>!document.getElementById("hello").hidden);

(async()=>{
  const b=await chromium.launch();

  // ---------- a new visitor ----------
  let ctx=await b.newContext(M); let p=await ctx.newPage();
  const errs=[]; p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL); await p.waitForTimeout(1800);
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

  // ---------- it goes away, and stays away ----------
  await p.click("#hellook"); await p.waitForTimeout(400);
  say("Look around dismisses it", (await up(p))===false);
  say("  and the map is usable underneath",
    (await p.$$eval("#chart .n",e=>e.length))>400);
  await p.reload(); await p.waitForTimeout(1800);
  say("  and it does not come back", (await up(p))===false);
  say("no page errors", errs.filter(x=>!/Failed to load/.test(x)).join(" | ")||true);
  await ctx.close();

  // ---------- the other ways out ----------
  for(const [name,act] of [
      ["Escape", async q=>q.keyboard.press("Escape")],
      ["a tap outside", async q=>q.click("#hellobd",{position:{x:10,y:10}})]]){
    const c2=await b.newContext(M); const q=await c2.newPage();
    await q.goto(URL); await q.waitForTimeout(1700);
    await act(q); await q.waitForTimeout(400);
    say(name+" dismisses it too", (await up(q))===false);
    say("  and that counts as seen", await q.evaluate(()=>{
      try{ return localStorage.getItem("offshoots.seen")==="1"; }catch(e){ return true; }}));
    await c2.close();
  }

  // ---------- the way in it offers ----------
  { const c3=await b.newContext(M); const q=await c3.newPage();
    await q.goto(URL); await q.waitForTimeout(1700);
    await q.click("#hellomood"); await q.waitForTimeout(1500);
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
    await q.goto(URL+"#dub"); await q.waitForTimeout(1800);
    say("a shared style link skips it", (await up(q))===false);
    say("  and lands on the style", (await q.evaluate(()=>location.hash))==="#dub");
    // skipping is not the same as seeing: the explanation is still owed
    await q.goto(URL); await q.waitForTimeout(1800);
    say("  so the map itself still explains itself later", await up(q));
    await c4.close(); }

  // ---------- desktop ----------
  { const c5=await b.newContext(D); const q=await c5.newPage();
    await q.goto(URL); await q.waitForTimeout(1700);
    say("the card is there on a desktop too", await up(q));
    const fit=await q.evaluate(()=>{const r=document.getElementById("hellocard").getBoundingClientRect();
      return {w:Math.round(r.width), centred:Math.abs((r.left+r.right)/2-innerWidth/2)<=2,
        inside:r.top>=-1 && r.bottom<=innerHeight+1};});
    say("  centred at "+fit.w+"px and fully on screen", fit.centred && fit.inside && fit.w<=420);
    await c5.close(); }

  await b.close();
})();
