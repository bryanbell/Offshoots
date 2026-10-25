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
    return r.top>=0 && r.bottom<=innerHeight && r.right<=innerWidth;});
  say("desktop menu inside the viewport", db);
  await d.screenshot({path:__dirname+"/screens/d-fams.png"});
  say("no desktop page errors", d._errs.length===0 ? true : d._errs.join(" | "));

  await b.close();
})();
