// Browse by mood, place or task.
//
// Twenty-five ways in used to be twenty-five chips, tapped to unroll a list underneath
// them, which meant a tap always moved the thing you had just tapped off the top of the
// screen. They are a two-column list now, and a tap pushes a page: same picks, but they
// arrive where your eye already is, with a back button instead of a scroll.
//
// What this holds onto: one row per mode, loudest first, each rated and coloured by how
// loud it is, two abreast without clipping a label, and a tap that pushes a page of
// twelve picks you can select from.
const {chromium}=require("playwright");
const URL="file://"+__dirname+"/../index.html";
const fresh=async(b,vp)=>{ const p=await b.newPage({viewport:vp}); const errs=[];
  p.on("pageerror",e=>errs.push(String(e))); p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
  await p.goto(URL); await p.waitForTimeout(800);
  if(vp===M){ await p.click("#grab").catch(()=>{}); await p.waitForTimeout(500); }
  p._errs=errs; return p; };
const M={width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2};
const Dk={width:1280,height:900};
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));

(async()=>{
  const b=await chromium.launch();

  // ---------- the Places row ----------
  // The overview opens on a row of circles you swipe sideways, the way Apple Maps opens
  // on its Places. The full set is a tap away behind the heading, so what matters here
  // is that the row is scrollable, that the first few are reachable without it, and that
  // the heading really does open the rest.
  let p=await fresh(b,M);
  const nModes=await p.evaluate(()=>typeof MODES!=="undefined"?MODES.length:-1);
  const rows=await p.$$(".mcirc");
  say("one circle per mode ("+nModes+")", nModes>0 && rows.length===nModes);
  say("and no chips or rows left over", (await p.$$(".modechip")).length===0
    && (await p.$$(".sect-modes .listrow")).length===0);
  say("no picks before a tap", (await p.$$(".picks .pick")).length===0);
  say("every circle carries an icon and a label", await p.$$eval(".mcirc",
    e=>e.every(x=>x.querySelector(".mco svg") && x.querySelector(".mclbl").textContent.trim().length>0)));

  const lay=await p.evaluate(()=>{
    const r=[...document.querySelectorAll(".mcirc")], row=document.querySelector(".mrow");
    const rb=row.getBoundingClientRect();
    const vis=r.filter(x=>{const b=x.getBoundingClientRect(); return b.left>=rb.left-1 && b.right<=rb.right+1;});
    const c=r[0].querySelector(".mco").getBoundingClientRect();
    return {scrolls:row.scrollWidth>row.clientWidth+1, vis:vis.length,
      round:Math.abs(c.width-c.height)<=1 && c.width>=52,
      clipped:r.filter(x=>{const l=x.querySelector(".mclbl"); return l.scrollHeight>l.clientHeight+1;})
               .map(x=>x.querySelector(".mclbl").textContent),
      tap:Math.min(...r.map(x=>Math.round(x.getBoundingClientRect().height)))};});
  say("the row scrolls sideways", lay.scrolls);
  // on a filled circle an outline reads as a wire drawing, so every glyph is a solid
  // shape: filled, no stroke, and big enough in the circle to carry at a glance
  const gl=await p.evaluate(()=>{
    const g=[...document.querySelectorAll(".mcirc .mco svg")];
    return {n:g.length,
      filled:g.every(x=>{const cs=getComputedStyle(x);
        return cs.fill!=="none" && (cs.stroke==="none"||parseFloat(cs.strokeWidth||0)===0);}),
      paths:g.every(x=>x.querySelectorAll("path,rect,circle").length>0),
      share:Math.round(100*g[0].getBoundingClientRect().width
        /g[0].closest(".mco").getBoundingClientRect().width)};});
  say("  every glyph is solid, not stroked", gl.n>0 && gl.filled && gl.paths);
  // Remix Icon is Apache 2.0, which wants its notice carried with the work. The map is
  // one file that anyone can save, so the notice lives on the About page inside it.
  say("  and the set it came from is credited", await p.evaluate(async()=>{
    document.querySelector('[data-page="about"]').click();
    await new Promise(r=>setTimeout(r,700));
    const t=(document.querySelector(".ppage:not([hidden])")||{}).textContent||"";
    const ok=/Remix Icon/.test(t) && /Apache License 2\.0/.test(t);
    document.getElementById("panelBack").click();
    await new Promise(r=>setTimeout(r,700));
    return ok;}));
  // no glyph may be worn by two modes: a shared icon makes two rows look like one
  say("  no two modes wear the same glyph", await p.evaluate(()=>{
    const seen=new Set();
    for(const x of document.querySelectorAll(".mcirc .mco svg")){
      const k=x.innerHTML.replace(/\s+/g," ").trim();
      if(seen.has(k)) return false; seen.add(k);
    } return seen.size===26;}));
  say("  filling "+gl.share+"% of its circle", gl.share>=45 && gl.share<=60);
  // a mouse has no momentum of its own, so the row carries a flick after the button is up
  const fling=await p.evaluate(async()=>{
    const row=document.querySelector(".mrow"); row.scrollLeft=0;
    const at=()=>Math.round(row.scrollLeft);
    const ev=(t,x)=>row.dispatchEvent(new PointerEvent(t,{pointerId:7,pointerType:"mouse",
      button:0,buttons:t==="pointerup"?0:1,clientX:x,clientY:
      Math.round(row.getBoundingClientRect().top+20),bubbles:true,cancelable:true}));
    ev("pointerdown",300);
    for(let i=1;i<=8;i++){ ev("pointermove",300-i*22); await new Promise(r=>setTimeout(r,16)); }
    const held=at(); ev("pointerup",300-8*22);
    await new Promise(r=>setTimeout(r,900));
    return {held, after:at()};});
  say("  and carries "+(fling.after-fling.held)+"px past the release", fling.after-fling.held>=30);
  await p.evaluate(()=>{document.querySelector(".mrow").scrollLeft=0;});
  await p.waitForTimeout(250);
  say("  with "+lay.vis+" in reach before it does", lay.vis>=3);
  say("  each a circle of "+Math.round(lay.tap)+"px", lay.round && lay.tap>=44);
  say("  and no label cut off"+(lay.clipped.length?": "+lay.clipped.join(", "):""), lay.clipped.length===0);

  // the heading is the control that opens the rest, chevron and all, and it has to be
  // big enough to hit: as a plain <h3> turned button it came out 25px tall
  const sh=await p.evaluate(()=>{const h=document.querySelector(".sect-modes .secthead");
    return {go:h.tagName==="BUTTON" && h.dataset.page==="modes",
      cv:!!h.querySelector(".sectcv svg"), h:Math.round(h.getBoundingClientRect().height)};});
  say("the heading opens the full set", sh.go && sh.cv);
  say("  and is "+sh.h+"px tall", sh.h>=44);
  await p.click(".sect-modes .secthead"); await p.waitForTimeout(700);
  const all=await p.evaluate(()=>{
    const r=[...document.querySelectorAll(".ppage:not([hidden]) .modelist .listrow")];
    const grp=document.querySelector(".ppage:not([hidden]) .modelist");
    return {n:r.length, cols:new Set(r.map(x=>Math.round(x.getBoundingClientRect().left))).size,
      clipped:r.filter(x=>{const l=x.querySelector(".lrlbl"); return l.scrollWidth>l.clientWidth+1;})
               .map(x=>x.querySelector(".lrlbl").textContent),
      over:grp?r.some(x=>x.getBoundingClientRect().right>grp.getBoundingClientRect().right+1):true,
      h:r.length?Math.round(r[0].getBoundingClientRect().height):0};});
  say("listing all "+all.n+" two abreast", all.n===nModes && all.cols===2);
  say("  nothing clipped at 390"+(all.clipped.length?": "+all.clipped.join(", "):""), all.clipped.length===0);
  say("  nor spilling out of the group", all.over===false);
  say("  each row "+all.h+"px, still a tap target", all.h>=44);
  // the gutter rule was drawn by each odd row, inset top and bottom, which left a gap at
  // every row boundary and read as a dashed line. One line down the whole grid now.
  const rule=await p.evaluate(()=>{
    const g=document.querySelector(".ppage:not([hidden]) .modelist.two");
    const af=getComputedStyle(g,"::after"), gb=g.getBoundingClientRect();
    const gaps=[...g.querySelectorAll(".listrow:nth-child(odd)")]
      .filter(r=>getComputedStyle(r,"::after").content!=="none").length;
    return {on:af.content!=="none", h:Math.round(parseFloat(af.height)||0),
      grid:Math.round(gb.height), perRow:gaps,
      // every row's own rule spans its whole column rather than stopping short
      short:[...g.querySelectorAll(".listrow")].filter(r=>{
        const bf=getComputedStyle(r,"::before");
        return bf.content!=="none" && parseFloat(bf.left)>1;}).length};});
  say("  one unbroken gutter rule, "+rule.h+"px of "+rule.grid,
    rule.on && rule.h===rule.grid && rule.perRow===0);
  say("  and each row's rule spans its column", rule.short===0);
  // the left column once started flush at the card edge, from when this list sat unboxed
  // on the Explore panel. In a card both columns take the same inset from their own edge
  const inset=await p.evaluate(()=>{
    const g=document.querySelector(".ppage:not([hidden]) .modelist.two");
    const r=[...g.querySelectorAll(".listrow")], gb=g.getBoundingClientRect();
    const mid=gb.left+gb.width/2;
    return {l:Math.round(r[0].querySelector(".lrico").getBoundingClientRect().left-gb.left),
      r:Math.round(r[1].querySelector(".lrico").getBoundingClientRect().left-mid)};});
  say("  both columns inset the same ("+inset.l+" / "+inset.r+")",
    inset.l===inset.r && inset.l>=10);
  // the page has a link of its own, the way About and How to install do
  const share=await p.evaluate(()=>{const c=document.querySelector(".ppage:not([hidden]) .pagecopy");
    return c?{hash:c.dataset.aboutcopy, lbl:(c.querySelector(".lbl")||{}).textContent}:null;});
  say("  with a link to copy ("+(share&&share.lbl)+")",
    !!share && share.hash==="modes" && /copy a link/i.test(share.lbl));
  await p.click("#panelBack"); await p.waitForTimeout(700);

  // ---------- how loud it is ----------
  // every mode carries a level, and the circle is filled with it. The ramp has to read
  // in order, so the five levels are five distinct fills running cool to hot, and the
  // white glyph has to hold up on every one of them.
  const lv=await p.evaluate(()=>[...document.querySelectorAll(".mcirc")].map(c=>{
    const m=(c.className.match(/\blv([1-5])\b/)||[])[1];
    const cs=getComputedStyle(c);
    return {name:c.querySelector(".mclbl").textContent, lv:m,
      fill:cs.getPropertyValue("--lvc").trim(),
      glyph:getComputedStyle(c.querySelector(".mco")).color,
      lbl:getComputedStyle(c.querySelector(".mclbl")).color};}));
  say("every circle is rated 1 to 5", lv.length>0 && lv.every(c=>/^[1-5]$/.test(c.lv)));
  // quietest first, which is where most listening starts. A browser with a tally in it
  // puts the modes you open at the front instead, so this is the order a fresh one gets.
  const order=lv.map(c=>+c.lv);
  say("they run quietest first ["+order.join("")+"]", order.every((v,i)=>i===0||v>=order[i-1]));
  say("the first is a 1 and the last a 5", order[0]===1 && order[order.length-1]===5);
  // and then it learns. Opening a mode is tallied in this browser alone, and the ones
  // you open float to the front of the row the next time the overview is built, so what
  // you actually use is in reach without a swipe. The full list behind the heading does
  // not move, which is what keeps one stable place to find anything.
  const before=await p.$$eval(".mcirc .mclbl",e=>e.map(x=>x.textContent));
  const stored=await p.evaluate(()=>{
    try{ localStorage.setItem("offshoots.modeuse",JSON.stringify({driving:5,party:2})); return true; }
    catch(e){ return false; }});
  if(!stored) say("the row cannot learn without storage, and still renders", before.length===nModes);
  else {
    await p.reload(); await p.waitForTimeout(900);
    await p.click("#grab").catch(()=>{}); await p.waitForTimeout(600);
    const after=await p.$$eval(".mcirc .mclbl",e=>e.map(x=>x.textContent));
    say("a tally puts the most-opened first ("+after.slice(0,2).join(", ")+")",
      after[0]==="Driving" && after[1]==="Party");
    say("  without losing any of the "+after.length,
      after.length===nModes && new Set(after).size===nModes);
    say("  and the rest keep their order",
      after.slice(2).join("/")===before.filter(x=>x!=="Driving"&&x!=="Party").join("/"));
    // the list behind the heading is the stable reference, so it must not reorder
    await p.click(".sect-modes .secthead"); await p.waitForTimeout(700);
    const page=await p.$$eval(".ppage:not([hidden]) .modelist .lrlbl",e=>e.map(x=>x.textContent));
    say("  while the full list stays put ("+page.slice(0,2).join(", ")+")",
      page.join("/")===before.join("/"));
    await p.click("#panelBack"); await p.waitForTimeout(600);
    await p.evaluate(()=>{ try{ localStorage.removeItem("offshoots.modeuse"); }catch(e){} });
    await p.reload(); await p.waitForTimeout(900);
    await p.click("#grab").catch(()=>{}); await p.waitForTimeout(600);
    say("  and clearing the tally puts it back",
      (await p.$$eval(".mcirc .mclbl",e=>e.map(x=>x.textContent))).join("/")===before.join("/"));
  }

  // ---------- a tap pushes a page ----------
  await p.click('[data-mode="focus"]'); await p.waitForTimeout(700);
  const pg=await p.evaluate(()=>{
    const up=[...document.querySelectorAll(".ppage")].filter(x=>!x.hidden);
    const bk=document.getElementById("panelBack");
    return {pages:document.querySelectorAll(".ppage").length, shown:up.length,
      key:up.length?up[0].dataset.p:null,
      title:up.length?up[0].querySelector(".bigttl .mn").textContent:null,
      icon:up.length?!!up[0].querySelector(".bigttl .pgi svg"):false,
      lede:up.length?(up[0].querySelector(".pglede")||{}).textContent:null,
      lvc:up.length?(up[0].className.match(/\blv([1-5])\b/)||[])[1]:null,
      picks:document.querySelectorAll(".ppage:not([hidden]) .picks [data-go]").length,
      back:!bk.hidden, backLbl:(bk.querySelector(".bklbl")||{}).textContent,
      top:document.getElementById("panelBody").scrollTop};});
  say("Focus pushes a page ("+pg.title+")", pg.key==="mode:focus" && pg.title && pg.title.length>0);
  say("  one page shown of "+pg.pages, pg.shown===1);
  say("  with its own icon and its why-text", pg.icon && pg.lede && pg.lede.length>20);
  say("  coloured by how loud it is (lv"+pg.lvc+")", /^[1-5]$/.test(pg.lvc||""));
  say("  listing "+pg.picks+" picks", pg.picks===12);
  say("  starting at the top", pg.top===0);
  say("  and a way back ("+pg.backLbl+")", pg.back && pg.backLbl==="Explore");
  // every pick carries its playlist's cover, or, where there is no file, the same square
  // filled with the family colour and the style's initials. Never a gap: the three lines
  // of text are laid out against that column.
  await p.waitForTimeout(900);
  const art=await p.evaluate(()=>{const r=[...document.querySelectorAll(".ppage:not([hidden]) .pick")];
    return {n:r.length, img:r.filter(x=>x.querySelector("img.pcov")).length,
      ph:r.filter(x=>x.querySelector(".pcovph")).length,
      sq:r.every(x=>{const c=x.querySelector("img.pcov,.pcovph"); if(!c) return false;
        const b=c.getBoundingClientRect();
        return b.width>=40 && Math.abs(b.width-b.height)<=1;}),
      inked:r.filter(x=>x.querySelector(".pcovph")).every(x=>{
        const t=x.querySelector(".pcovph b");
        return t && /^[A-Z0-9]{1,2}$/.test(t.textContent.trim());})};});
  say("  all "+art.n+" carry a square ("+art.img+" covers, "+art.ph+" tiles)", art.n>0 && art.sq);
  say("  and a tile says which style it stands for", art.inked);
  // the rows came out of their card: each one now spans the panel, and what lines up is
  // the art, with the heading above it, rather than the row's own edges
  const box=await p.evaluate(()=>{
    const r=document.querySelector(".ppage:not([hidden]) .picks [data-go]").getBoundingClientRect();
    const body=document.getElementById("panelBody").getBoundingClientRect();
    const art=document.querySelector(".ppage:not([hidden]) .pick img.pcov,.ppage:not([hidden]) .pick .pcovph").getBoundingClientRect();
    const ttl=document.querySelector(".ppage:not([hidden]) .bigttl").getBoundingClientRect();
    return {h:Math.round(r.height), bleed:Math.round(r.width)-Math.round(body.width),
      off:Math.round(art.left-ttl.left)};});
  say("a pick row is "+box.h+"px and spans the panel", box.h>=44 && Math.abs(box.bleed)<=1);
  say("  its art lining up with the title ("+box.off+"px off)", Math.abs(box.off)<=1);
  say("no row overflows itself", await p.$$eval(".ppage:not([hidden]) .picks [data-go]",
    e=>e.every(x=>x.scrollWidth<=x.clientWidth+1)));

  await p.click("#panelBack"); await p.waitForTimeout(700);
  say("back returns to the overview",
    (await p.$$(".mcirc")).length===nModes
    && (await p.evaluate(()=>document.getElementById("panelBack").hidden))===true);

  // switching modes replaces rather than stacks
  await p.click('[data-mode="workout"]'); await p.waitForTimeout(700);
  await p.evaluate(()=>{const r=document.querySelector('[data-mode="workout"]'); if(r) r.click();});
  await p.waitForTimeout(400);
  say("a mode cannot be pushed onto itself",
    (await p.evaluate(()=>[...document.querySelectorAll(".ppage")].filter(x=>!x.hidden).length))===1
    && (await p.$$(".ppage")).length===2);

  // picking a style leaves the stack behind
  const target=await p.$eval(".ppage:not([hidden]) .picks [data-go]:nth-child(2)",e=>e.dataset.go);
  await p.click(".ppage:not([hidden]) .picks [data-go]:nth-child(2)"); await p.waitForTimeout(800);
  say("a pick selects "+target, (await p.evaluate(()=>location.hash))==="#"+target);
  say("  and the panel shows it", (await p.$eval(".pcard .mn",e=>e.textContent)).length>0);
  say("  with the map node lit", (await p.$$eval("#chart .n.cur",e=>e.length))===1);
  say("  from a clean stack", (await p.$$('.ppage[data-p^="mode:"]')).length===0);

  // Escape unwinds a mode page rather than closing the panel
  await p.evaluate(()=>{history.replaceState(null,"","#"); location.hash="";});
  await p.waitForTimeout(400);
  p=await fresh(b,M);
  await p.click('[data-mode="party"]'); await p.waitForTimeout(700);
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
  say("Escape pops the page, leaving the panel open",
    (await p.$$('.ppage[data-p^="mode:"]:not([hidden])')).length===0
    && (await p.$eval("body",e=>e.classList.contains("open")))===true);
  say("no mobile page errors", p._errs.filter(x=>!/Failed to load/.test(x)).join(" | ")||true);
  await p.screenshot({path:__dirname+"/screens/m-modes.png"});
  await p.close();

  // ---------- desktop ----------
  const d=await fresh(b,Dk);
  say("the sidebar opens on circles too", (await d.$$(".mcirc")).length===nModes);
  await d.click(".sect-modes .secthead"); await d.waitForTimeout(700);
  const dl=await d.evaluate(()=>{
    const r=[...document.querySelectorAll(".ppage:not([hidden]) .modelist .listrow")];
    return {cols:new Set(r.map(x=>Math.round(x.getBoundingClientRect().left))).size,
      clipped:r.filter(x=>{const l=x.querySelector(".lrlbl"); return l.scrollWidth>l.clientWidth+1;})
               .map(x=>x.querySelector(".lrlbl").textContent)};});
  say("and its full set runs two abreast", dl.cols===2);
  await d.click("#panelBack"); await d.waitForTimeout(600);
  say("and clips nothing"+(dl.clipped.length?": "+dl.clipped.join(", "):""), dl.clipped.length===0);
  await d.click('[data-mode="sit"]'); await d.waitForTimeout(600);
  say("tapping one pushes a page of picks",
    (await d.$$eval(".ppage:not([hidden]) .picks [data-go]",e=>e.length))===12);
  say("  which stays inside the panel", await d.evaluate(()=>{
    const pg=document.querySelector(".ppage:not([hidden])"), b=document.getElementById("panelBody");
    return Math.round(pg.getBoundingClientRect().width)<=Math.round(b.getBoundingClientRect().width);}));
  await d.screenshot({path:__dirname+"/screens/d-modes.png"});
  say("no desktop page errors", d._errs.filter(x=>!/Failed to load/.test(x)).join(" | ")||true);

  await b.close();
})();
