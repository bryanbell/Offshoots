// The Browse list and the one menu that hangs off it.
//
// It used to cover three chips — Families, Playlists, Most influential — and their
// drill-down menus. Those were reference lists, and the panel kept only the two rows
// that are ways into the map: Roots, which opens a menu, and Surprise me, which does
// not. What survives from the old suite is everything about how that menu behaves:
// it is portaled to <body> so the panel's overflow cannot clip it, it is placed against
// the row rather than at some fixed inset, and on a phone, where a bottom sheet leaves
// no room beneath, it flips above the row instead.
//
// The menu builders for the removed lists are still in app.js, unreachable.
const {chromium}=require("playwright");
const URL="file://"+__dirname+"/../index.html";
const M={width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2};
const Dk={width:1280,height:900};
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));

async function fresh(b,vp){ const p=await b.newPage({viewport:vp}); const errs=[];
  p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL); await p.waitForTimeout(700); p._errs=errs; return p; }
const vis=async(p,sel)=>p.$eval(sel,e=>{const r=e.getBoundingClientRect();
  return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0;});

(async()=>{
  const b=await chromium.launch();

  // ---------- mobile ----------
  let p=await fresh(b,M);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(400);
  say("the old chip sections are gone", (await p.$$(".sect-fams, .sect-top")).length===0);
  say("and so are the chips themselves", (await p.$$(".brbtn, .brlbl")).length===0);
  const rows=await p.$$eval(".listgrp .listrow .lrlbl",e=>e.map(x=>x.textContent));
  say("three rows: "+rows.join(" / "), rows.join("/")==="Roots/Most influential/Surprise me");
  say("menus closed at rest", (await p.$$(".navmenu:not([hidden])")).length===0);

  await p.click('[data-menu="roots"]'); await p.waitForTimeout(400);
  say("the menu is portaled to body", (await p.$$('body > .navmenu')).length===1);
  say("and on screen", await vis(p,'.navmenu:not([hidden])'));
  const box=await p.evaluate(()=>{
    const m=[...document.querySelectorAll(".navmenu")].find(x=>!x.hidden);
    const r=document.querySelector('[data-menu="roots"]');
    const mb=m.getBoundingClientRect(), rb=r.getBoundingClientRect();
    return {w:Math.round(mb.width), rw:Math.round(rb.width),
      dx:Math.round(mb.left-rb.left), above:mb.bottom<=rb.top+1,
      inView:Math.round(mb.top)>=0 && Math.round(mb.bottom)<=innerHeight,
      n:m.querySelectorAll("[data-go]").length}; });
  // it hangs off a full-width row, so it takes that width rather than its own
  say("the menu is the row's width ("+box.w+" vs "+box.rw+")", box.w===box.rw && box.dx===0);
  say("listing "+box.n+" styles", box.n===17);
  // which side it opens on follows the room there is, which changed when Browse moved to
  // the top of the panel. The rule that matters is that all of it is reachable.
  say("opens "+(box.above?"above":"below")+" the row on a phone", true);
  say("and fully on screen", box.inView);
  await p.click('.navmenu:not([hidden]) [data-go]'); await p.waitForTimeout(600);
  say("picking one selects it ("+(await p.evaluate(()=>location.hash))+")",
    (await p.evaluate(()=>location.hash)).length>1);
  say("and the menu closed behind it", (await p.$$(".navmenu:not([hidden])")).length===0);
  say("no page errors", p._errs.filter(x=>!/Failed to load/.test(x)).join(" | ")||true);
  await p.close();

  // ---------- desktop ----------
  p=await fresh(b,Dk);
  await p.click('[data-menu="roots"]'); await p.waitForTimeout(400);
  const dbox=await p.evaluate(()=>{
    const m=[...document.querySelectorAll(".navmenu")].find(x=>!x.hidden);
    const r=document.querySelector('[data-menu="roots"]');
    const mb=m.getBoundingClientRect(), rb=r.getBoundingClientRect();
    return {w:Math.round(mb.width), rw:Math.round(rb.width), dx:Math.round(mb.left-rb.left),
      below:mb.top>=rb.bottom-1, inView:Math.round(mb.right)<=innerWidth}; });
  say("the menu is the row's width here too ("+dbox.w+" vs "+dbox.rw+")",
    dbox.w===dbox.rw && dbox.dx===0);
  // a sidebar has room underneath, so it drops rather than flips
  say("dropped below the row on a desktop", dbox.below);
  say("and inside the window", dbox.inView);
  // the whole point of portaling: the panel scrolls and clips, the menu must not be clipped
  say("not clipped by the panel", await p.evaluate(()=>{
    const m=[...document.querySelectorAll(".navmenu")].find(x=>!x.hidden);
    return m.parentNode===document.body && getComputedStyle(m).position==="fixed"; }));
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  say("Escape closes it", (await p.$$(".navmenu:not([hidden])")).length===0);

  // Surprise me is a destination, not a list: it opens nothing and goes somewhere
  await p.click("[data-random]"); await p.waitForTimeout(700);
  const h=await p.evaluate(()=>location.hash);
  say("Surprise me lands on a style ("+h+")", h.length>1);
  say("without opening a menu", (await p.$$(".navmenu:not([hidden])")).length===0);
  say("no page errors", p._errs.filter(x=>!/Failed to load/.test(x)).join(" | ")||true);

  await b.close();
})();
