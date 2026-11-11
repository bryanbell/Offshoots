// Resting the mouse on a style on the map shows a small card beside it: art, family and
// year, the description if there is one, and its key artists. It is a
// preview: it takes no clicks, selects nothing, waits a beat before the first one so a
// pointer crossing the map does not flash cards, and goes when the pointer leaves, the map
// moves or a key is pressed. Never on touch, and never for the style already open. The style
// itself, its neighbours and its lines lift at once, through any dimming.
const {chromium}=require("playwright");
const skipWelcome=require("./_hello");
const {settle,until,arm}=require("./_wait");
const URL="file://"+__dirname+"/../index.html";
const say=(k,v)=>console.log((v===true?"PASS ":"FAIL ")+k+(typeof v!=="boolean"?": "+v:""));
const ready=async q=>{ await arm(q); await until(q,()=>!!document.querySelector("#chart .n")); await settle(q); };
const at=(p,id)=>p.evaluate(id=>{ const g=document.querySelector(`#chart .n[data-id="${id}"]`);
  g.scrollIntoView({block:"center",inline:"center"});
  const r=g.querySelector("text:not(.halo)").getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; },id);
const card=p=>p.evaluate(()=>{ const c=document.querySelector(".hovcard"); if(!c) return null;
  const r=c.getBoundingClientRect(), m=document.getElementById("scroller").getBoundingClientRect();
  return {txt:c.innerText, pe:getComputedStyle(c).pointerEvents, img:!!c.querySelector("img.pcov"),
    inside:r.left>=m.left && r.right<=m.right && r.top>=m.top && r.bottom<=m.bottom, r:[r.left,r.top,r.right,r.bottom]}; });

(async()=>{
  const b=await chromium.launch({args:["--allow-file-access-from-files"]});
  skipWelcome(b);
  const errs=[];
  const p=await b.newPage({viewport:{width:1440,height:900}}); p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL); await ready(p);
  const f=await at(p,"fusion"); await p.waitForTimeout(200);
  await p.mouse.move(f.x-60,f.y-60); await p.mouse.move(f.x,f.y,{steps:3});
  await p.waitForTimeout(100);
  say("a card waits a beat before showing", !(await card(p)));
  await until(p,()=>!!document.querySelector(".hovcard"));
  const c=await card(p);
  say("resting on a style shows its card", !!c && /Jazz Fusion/.test(c.txt) && /Jazz · 1969/.test(c.txt) && c.img);
  say("  with the description", /electric bass/.test(c.txt));
  // who to listen for, not the lineage the map already draws
  say("  and its key artists, not its lineage", /Key artists\s*Weather Report, Mahavishnu Orchestra/.test(c.txt) && !/From|Led to/.test(c.txt));
  say("  inside the map, off the name, taking no clicks", c.inside && c.pe==="none" &&
    !(c.r[0]<f.x && c.r[2]>f.x && c.r[1]<f.y && c.r[3]>f.y));
  say("  without selecting anything", await p.evaluate(()=>!document.querySelector("#chart .n.cur") && !/fusion/.test(location.hash)));
  // straight on to another style swaps at once
  const h=await p.evaluate(()=>{ const g=document.querySelector('#chart .n[data-id="postbop"] text:not(.halo)'); const r=g.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; });
  await p.mouse.move(h.x,h.y); await p.waitForTimeout(60);
  say("moving to another style swaps the card at once", /Post-Bop/.test(((await card(p))||{}).txt||""));
  await p.mouse.move(h.x,h.y-200); await p.waitForTimeout(200);
  say("leaving the style hides it", !(await card(p)));
  // the map moving or a click takes it away
  await p.mouse.move(f.x,f.y); await until(p,()=>!!document.querySelector(".hovcard"));
  await p.mouse.wheel(0,200); await p.waitForTimeout(100);
  say("scrolling the map hides it", !(await card(p)));
  const f2=await at(p,"fusion"); await p.waitForTimeout(200);
  await p.mouse.move(f2.x,f2.y-80); await p.mouse.move(f2.x,f2.y); await until(p,()=>!!document.querySelector(".hovcard"));
  await p.mouse.down(); await p.mouse.up(); await settle(p);
  say("clicking opens the style and the card goes", !(await card(p)) && await p.evaluate(()=>!!document.querySelector('#chart .n.cur[data-id="fusion"]')));
  await p.mouse.move(f2.x,f2.y-80); await p.mouse.move(f2.x,f2.y); await p.waitForTimeout(600);
  say("no card for the style already open", !(await card(p)));
  // a style with no description still gets a card, just shorter
  const bare=await p.evaluate(()=>[...document.querySelectorAll("#chart .n")].map(g=>g.dataset.id).find(id=>!(typeof DESC!=="undefined"&&DESC[id])));
  if(bare){ const q=await at(p,bare); await p.waitForTimeout(200); await p.mouse.move(q.x,q.y-80); await p.mouse.move(q.x,q.y);
    await until(p,()=>!!document.querySelector(".hovcard"));
    say("a style without a description still gets a card", !!(await card(p)) && await p.evaluate(()=>!document.querySelector(".hovcard .hcdesc"))); }
  // over a selection: the hovered style, its neighbours and its lines come up at once,
  // through the dimming, before the card's wait
  await p.goto(URL+"#girl_group"); await ready(p);
  const cp=await at(p,"countrypolitan"); await p.waitForTimeout(200);
  await p.mouse.move(cp.x,cp.y-80); await p.mouse.move(cp.x,cp.y); await p.waitForTimeout(220);   // past the .15s fade, before the card
  const lit=await p.evaluate(()=>{ const op=id=>+getComputedStyle(document.querySelector(`#chart .n[data-id="${id}"]`)).opacity;
    const n=["nashville","easylistening","countrypop"].filter(id=>document.querySelector(`#chart .n[data-id="${id}"]`));
    const es=[...document.querySelectorAll('#chart .e')].filter(e=>e.dataset.p==="countrypolitan"||e.dataset.c==="countrypolitan");
    return {self:op("countrypolitan"), near:[...document.querySelectorAll("#chart .n.hvn")].map(g=>+getComputedStyle(g).opacity),
      lines:es.map(e=>+getComputedStyle(e).opacity), card:!!document.querySelector(".hovcard"), other:op("bluegrass")}; });
  say("over a selection, the hovered style comes to full strength at once ("+lit.self+")", lit.self===1 && !lit.card);
  say("  with the styles it came from and led to ("+lit.near.length+")", lit.near.length>=2 && lit.near.every(o=>o===1));
  say("  and the lines between them", lit.lines.length===lit.near.length && lit.lines.every(o=>o>0.8));
  say("  while the rest stays dimmed", lit.other<0.5);
  await p.mouse.move(cp.x,cp.y-200); await p.waitForTimeout(250);
  say("  and it all goes back when the pointer leaves", await p.evaluate(()=>!document.querySelector("#chart .hv,#chart .hvn,#chart .hve")
    && +getComputedStyle(document.querySelector('#chart .n[data-id="countrypolitan"]')).opacity<0.5));
  // the card waits, but when it comes the lift stays
  await p.mouse.move(cp.x,cp.y); await until(p,()=>!!document.querySelector(".hovcard"));
  say("  the card coming up keeps the lift", await p.evaluate(()=>!!document.querySelector("#chart .n.hv")));
  // and the card sits clear of the lines it is describing where it can
  say("  with the card off the hovered style's lines", await p.evaluate(()=>{ const c=document.querySelector(".hovcard").getBoundingClientRect();
    const g=document.querySelector('#chart .n[data-id="countrypolitan"]').getBoundingClientRect();
    return !(c.left<g.left && c.right>g.left-40 && c.top<g.bottom && c.bottom>g.top); }));
  await p.close();

  const m=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}); m.on("pageerror",e=>errs.push(String(e)));
  await m.goto(URL); await ready(m);
  await m.dispatchEvent('#chart .n[data-id="fusion"]',"pointerover",{pointerType:"touch",bubbles:true});
  await m.waitForTimeout(600);
  say("never on a phone", !(await card(m)));
  await m.close();

  say("no page errors", errs.length===0 || errs.join(" | "));
  await b.close();
})();
