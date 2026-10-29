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

  // ---------- the list ----------
  let p=await fresh(b,M);
  const nModes=await p.evaluate(()=>typeof MODES!=="undefined"?MODES.length:-1);
  const rows=await p.$$(".modelist .listrow");
  say("one row per mode ("+nModes+")", nModes>0 && rows.length===nModes);
  say("and no chips left over from the old build", (await p.$$(".modechip")).length===0);
  say("counted in the aside", (await p.$eval(".sect-modes .sectaside",e=>e.textContent))===nModes+" ways in");
  say("no picks before a tap", (await p.$$(".picks .pick")).length===0);
  // the chevron that says a tap goes somewhere, not that a fold opens
  say("every row carries an icon and a label", await p.$$eval(".modelist .listrow",
    e=>e.every(x=>x.querySelector(".lrico svg") && x.querySelector(".lrlbl").textContent.trim().length>0)));

  // two abreast: the point of the layout is that twenty-five rows fit without a scroll
  // the length of the panel, so the two things to watch are the column count and whether
  // halving the width starts clipping the longer labels
  const lay=await p.evaluate(()=>{
    const r=[...document.querySelectorAll(".modelist .listrow")];
    const lefts=[...new Set(r.map(x=>Math.round(x.getBoundingClientRect().left)))].sort((a,b)=>a-b);
    const grp=document.querySelector(".modelist").getBoundingClientRect();
    return {cols:lefts.length, lefts,
      clipped:r.filter(x=>{const l=x.querySelector(".lrlbl"); return l.scrollWidth>l.clientWidth+1;})
               .map(x=>x.querySelector(".lrlbl").textContent),
      over:r.some(x=>x.getBoundingClientRect().right>grp.right+1),
      h:Math.round(r[0].getBoundingClientRect().height)};});
  say("they run two abreast", lay.cols===2);
  say("and nothing is clipped at 390"+(lay.clipped.length?": "+lay.clipped.join(", "):""), lay.clipped.length===0);
  say("nor spills out of the group", lay.over===false);
  say("each row is "+lay.h+"px, still a tap target", lay.h>=44);

  // ---------- how loud it is ----------
  // every mode carries a level, and the icon takes its colour from that. The ramp has to
  // read in order, so the five levels are five distinct colours running cool to hot.
  const lv=await p.evaluate(()=>[...document.querySelectorAll(".modelist .listrow")].map(c=>{
    const m=(c.className.match(/\blv([1-5])\b/)||[])[1];
    return {name:c.querySelector(".lrlbl").textContent, lv:m,
      fg:getComputedStyle(c.querySelector(".lrlbl")).color,
      bg:getComputedStyle(c).backgroundColor,
      icon:getComputedStyle(c.querySelector(".lrico")).color};}));
  say("every row is rated 1 to 5", lv.length>0 && lv.every(c=>/^[1-5]$/.test(c.lv)));
  const order=lv.map(c=>+c.lv);
  say("they run loudest first ["+order.join("")+"]", order.every((v,i)=>i===0||v<=order[i-1]));
  say("the first is a 5 and the last a 1", order[0]===5 && order[order.length-1]===1);
  const icons=new Set(lv.map(c=>c.icon));
  say("the five levels are five icon colours ("+icons.size+")", icons.size===5);
  const lumi=c=>{const [r,g,bl]=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;
    return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);}); return .2126*r+.7152*g+.0722*bl;};
  const ratio=(a,b)=>(Math.max(lumi(a),lumi(b))+.05)/(Math.min(lumi(a),lumi(b))+.05);
  const card=await p.$eval(".listgrp",e=>getComputedStyle(e).backgroundColor);
  const worst=Math.min(...lv.map(c=>ratio(c.fg,/rgba\(0, 0, 0, 0\)/.test(c.bg)?card:c.bg)));
  say("the faintest label reads at "+worst.toFixed(2)+":1", worst>=4.5);
  const byLv={}; lv.forEach(c=>byLv[c.lv]=c.icon);
  const hue=c=>{let [r,g,bl]=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255);
    const mx=Math.max(r,g,bl), mn=Math.min(r,g,bl), d=mx-mn;
    if(!d) return 0;
    let h = mx===r ? ((g-bl)/d)%6 : mx===g ? (bl-r)/d+2 : (r-g)/d+4;
    h*=60; return h<0?h+360:h;};
  const ramp=[1,2,3,4,5].map(n=>Math.round(hue(byLv[n])));
  say("the hue falls from blue to red ["+ramp.join(" ")+"]",
    ramp.every((v,i)=>i===0||v<ramp[i-1]) && ramp[0]>180 && ramp[4]<30);

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
  const box=await p.$eval(".ppage:not([hidden]) .picks [data-go]",e=>{const r=e.getBoundingClientRect();
    return [Math.round(r.height),Math.round(r.width)];});
  say("a pick row is "+box.join(" x "), box[0]>=44 && box[1]<=390-24);
  say("no row overflows itself", await p.$$eval(".ppage:not([hidden]) .picks [data-go]",
    e=>e.every(x=>x.scrollWidth<=x.clientWidth+1)));

  await p.click("#panelBack"); await p.waitForTimeout(700);
  say("back returns to the list",
    (await p.$$(".modelist .listrow")).length===nModes
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
  const dl=await d.evaluate(()=>{
    const r=[...document.querySelectorAll(".modelist .listrow")];
    return {cols:new Set(r.map(x=>Math.round(x.getBoundingClientRect().left))).size,
      clipped:r.filter(x=>{const l=x.querySelector(".lrlbl"); return l.scrollWidth>l.clientWidth+1;})
               .map(x=>x.querySelector(".lrlbl").textContent)};});
  say("the sidebar runs two abreast too", dl.cols===2);
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
