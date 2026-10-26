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
  say("old chip sections gone", (await p.$$(".sect-fams, .sect-top")).length===0);
  say("three browse buttons", (await p.$$(".brbtn")).length===3);
  say("labels", await p.$$eval(".brlbl",e=>e.map(x=>x.textContent).join(" / ")));
  say("menus closed at rest", (await p.$$(".navmenu.brmenu:not([hidden])")).length===0);

  // open Families
  await p.click('[data-menu="fams"]'); await p.waitForTimeout(350);
  say("families menu portaled to body", (await p.$$('body > .navmenu[data-br="fams"]')).length===1);
  say("menu on screen", await vis(p,'.navmenu[data-br="fams"]'));
  say("16 family rows", (await p.$$(".navmenu[data-br=\"fams\"] [data-fambr]")).length===16);
  say("first row", (await p.$eval(".navmenu[data-br=\"fams\"] [data-fambr]",e=>e.textContent.replace(/\s+/g," ").trim())));
  const mb=await p.$eval('.navmenu[data-br="fams"]',e=>{const r=e.getBoundingClientRect();
    return [Math.round(r.top),Math.round(r.height),Math.round(r.left),Math.round(r.width)];});
  say("menu top/height/left/width", mb.join(" / "));
  say("menu fits viewport", mb[0]>=0 && mb[0]+mb[1]<=844 && mb[2]>=0 && mb[2]+mb[3]<=390);
  const rowH=await p.$eval(".navmenu[data-br=\"fams\"] [data-fambr]",e=>Math.round(e.getBoundingClientRect().height));
  say("row height "+rowH, rowH>=44);

  // drill in
  await p.click('.navmenu [data-fambr="carib"]'); await p.waitForTimeout(300);
  say("drilled to styles", (await p.$$(".navmenu[data-br=\"fams\"] [data-go]")).length===14);
  say("back row present", await p.$eval(".brback",e=>e.textContent.replace(/\s+/g," ").trim()));
  say("still one menu open", (await p.$$(".navmenu:not([hidden])")).length===1);
  await p.screenshot({path:__dirname+"/screens/m-fams.png"});

  // back out
  await p.click(".brback"); await p.waitForTimeout(250);
  say("back to families", (await p.$$(".navmenu[data-br=\"fams\"] [data-fambr]")).length===16 && (await p.$$(".brback")).length===0);

  // drill in again and pick a style
  await p.click('.navmenu [data-fambr="jazz"]'); await p.waitForTimeout(250);
  const target=await p.$eval(".navmenu[data-br=\"fams\"] [data-go]",e=>e.dataset.go);
  await p.click(".navmenu[data-br=\"fams\"] [data-go]"); await p.waitForTimeout(600);
  say("picking selects "+target, (await p.evaluate(()=>location.hash))==="#"+target);
  say("menu closed after pick", (await p.$$(".navmenu:not([hidden])")).length===0);
  say("nothing stranded on body", (await p.$$("body > .navmenu")).length===0);
  say("panel shows it", await p.$eval(".pcard .mn",e=>e.textContent));

  // reopening starts at level 1 again, not mid-drill
  await p.evaluate(()=>{ history.replaceState(null,"",location.pathname); });
  p=await fresh(b,M);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(350);
  await p.click('[data-menu="fams"]'); await p.waitForTimeout(250);
  await p.click('.navmenu [data-fambr="metal"]'); await p.waitForTimeout(250);
  await p.keyboard.press("Escape"); await p.waitForTimeout(250);
  await p.click('[data-menu="fams"]'); await p.waitForTimeout(250);
  say("reopens at the family list", (await p.$$(".navmenu[data-br=\"fams\"] [data-fambr]")).length===16);

  // the influence menu
  await p.click('[data-menu="top"]'); await p.waitForTimeout(300);
  say("only one menu open at a time", (await p.$$(".navmenu:not([hidden])")).length===1);
  say("24 influence rows", (await p.$$('.navmenu[data-br="top"] [data-go]')).length===24);
  say("top entry", await p.$eval('.navmenu[data-br="top"] [data-go]',e=>e.textContent.replace(/\s+/g," ").trim()));
  await p.screenshot({path:__dirname+"/screens/m-top.png"});

  // outside tap closes
  const box=await p.$eval(".navmenu:not([hidden])",e=>{const r=e.getBoundingClientRect();return [r.right,r.top];});
  await p.mouse.click(Math.round(box[0])+30, Math.round(box[1])+40);
  await p.waitForTimeout(300);
  say("outside tap closes", (await p.$$(".navmenu:not([hidden])")).length===0 && (await p.$$("body > .navmenu")).length===0);
  say("no mobile page errors", p._errs.length===0 ? true : p._errs.join(" | "));

  // ---------- desktop ----------
  const d=await fresh(b,Dk);
  await d.click('[data-menu="fams"]'); await d.waitForTimeout(300);
  say("desktop families menu", (await d.$$(".navmenu[data-br=\"fams\"] [data-fambr]")).length===16);
  await d.click('.navmenu [data-fambr="elec"]'); await d.waitForTimeout(300);
  say("largest family (68) scrolls inside the menu",
      await d.$eval('.navmenu[data-br="fams"]',e=>e.scrollHeight>e.clientHeight+5));
  const db=await d.$eval('.navmenu[data-br="fams"]',e=>{const r=e.getBoundingClientRect();
    return {top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),
      vw:innerWidth,vh:innerHeight};});
  say("desktop menu inside the viewport", db.top>=0&&db.bottom<=db.vh&&db.left>=0&&db.right<=db.vw);
  // a popover, not a tinted extension of the panel: light ground, dark type
  const look=await d.$eval('.navmenu[data-br="fams"]',e=>{const cs=getComputedStyle(e);
    const lum=c=>{const [r,g,b]=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;
      return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);}); return .2126*r+.7152*g+.0722*b;};
    const item=getComputedStyle(e.querySelector("button")).color;
    const L1=lum(cs.backgroundColor), L2=lum(item);
    return {bg:cs.backgroundColor, lighter:L1>L2,
      ratio:+(((Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05))).toFixed(2)};});
  say("the menu ground is lighter than its type ("+look.bg+")", look.lighter);
  say("dark type on it reads at "+look.ratio+":1", look.ratio>=4.5);

  // an open menu must not survive a navigation. It is portaled to <body>, so when the
  // panel is rebuilt underneath it there is nothing left to close it: select() closed
  // menus and clearSel did not, which left one stranded on the way back to the map.
  for(const [name,act] of [
    ["back to the map", async q=>{ await q.click("#panelBack"); }],
    ["back to a style", async q=>{ await q.click('.navmenu:not([hidden]) [data-go]'); await q.waitForTimeout(600);
                                   await q.click('[data-menu="from"]'); await q.waitForTimeout(350);
                                   await q.click("#panelBack"); }],
  ]){
    const q=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await q.goto(URL+"#punk"); await q.waitForTimeout(900);
    await q.click('[data-menu="led"]'); await q.waitForTimeout(400);
    await act(q); await q.waitForTimeout(800);
    const r=await q.evaluate(()=>({open:[...document.querySelectorAll(".navmenu")].filter(m=>!m.hidden).length,
      onBody:document.querySelectorAll("body > .navmenu").length}));
    say(name+" closes an open menu ("+r.open+" open, "+r.onBody+" left on body)", r.open===0 && r.onBody===0);
    await q.close();
  }

  // the From and Led to menus, at the narrowest width the app is used at
  for(const [kind,vp] of [["from",{width:320,height:700}],["led",{width:320,height:700}],
                          ["from",{width:390,height:844}],["led",{width:390,height:844}]]){
    const q=await b.newPage({viewport:vp,isMobile:true,hasTouch:true});
    await q.goto(URL+"#disco"); await q.waitForTimeout(900);
    await q.click("#grab").catch(()=>{}); await q.waitForTimeout(400);
    await q.click(`[data-menu="${kind}"]`); await q.waitForTimeout(450);
    const r=await q.evaluate(()=>{const m=[...document.querySelectorAll(".navmenu")].find(x=>!x.hidden);
      if(!m) return null; const x=m.getBoundingClientRect();
      return {l:Math.round(x.left),r:Math.round(x.right),vw:innerWidth};});
    say(kind+" menu at "+vp.width+"px stays on screen ("+(r?r.l+" to "+r.r:"missing")+")",
      !!r && r.l>=0 && r.r<=r.vw);
    await q.close();
  }
  await d.screenshot({path:__dirname+"/screens/d-fams.png"});
  say("no desktop page errors", d._errs.length===0 ? true : d._errs.join(" | "));

  await b.close();
})();
