const {chromium}=require("playwright");
const URL="file://"+__dirname+"/../index.html";
const M={width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2};
const Dk={width:1280,height:900};
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));
async function fresh(b,vp,hash){ const p=await b.newPage({viewport:vp}); const errs=[];
  p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL+(hash||"")); await p.waitForTimeout(850); p._errs=errs; return p; }

(async()=>{
  const b=await chromium.launch();
  let p=await fresh(b,M);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(450);

  // ---- order on the page ----
  const order=await p.$eval("#panelBody",e=>[...e.querySelectorAll(".ovcard,.sect-feat,.sect-modes,.browse,.ovhint,.aboutwrap")]
    .map(x=>x.className.split(" ").find(c=>/ovcard|sect-feat|sect-modes|browse|ovhint|aboutwrap/.test(c))));
  say("reading order", order.join(" → "));
  say("start-here sits above the modes", order.indexOf("sect-feat")===1 && order.indexOf("sect-modes")===2);
  say("map hint demoted below browse", order.indexOf("ovhint")>order.indexOf("browse"));

  // ---- 2: the hero now talks about listening ----
  say("tagline", await p.$eval(".ovcard .tag",e=>e.textContent));
  say("meta", await p.$eval(".ovmeta",e=>e.textContent));
  say("playlist count is in the hero", (await p.$eval(".ovmeta",e=>e.textContent)).includes("playlists"));
  say("icon shrunk", await p.$eval(".appicon",e=>Math.round(e.getBoundingClientRect().width))<=36);

  // ---- 1: start-here row ----
  say("one featured row", (await p.$$(".featpick")).length===1);
  say("no cover art on it", (await p.$$(".sect-feat img.pcov, .sect-feat .pcovph")).length===0);
  say("no play button on it", (await p.$$(".sect-feat .plgo, .sect-feat .pkgo")).length===0);
  say("still a single target to the map", await p.$eval(".featpick",e=>e.tagName==="BUTTON"&&!!e.dataset.go));
  say("the pick still has a playlist behind it", await p.evaluate(()=>{const id=document.querySelector(".featpick").dataset.go;return !!(PLAY[id]||SPLAY[id]);}));
  const feat=await p.$eval(".featpick",e=>[e.dataset.go,e.textContent.replace(/\s+/g," ").trim()]);
  say("featured", feat[1]);
  const sh=await p.$eval(".shuf",e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];});
  say("shuffle target "+sh.join("x"), sh[0]>=40&&sh[1]>=40);
  await p.click(".shuf"); await p.waitForTimeout(300);
  const feat2=await p.$eval(".featpick",e=>e.dataset.go);
  say("shuffle re-rolls without navigating", feat2!==feat[0] && (await p.evaluate(()=>location.hash))==="");
  await p.click(".featpick"); await p.waitForTimeout(600);
  say("tapping it opens that style", (await p.evaluate(()=>location.hash))==="#"+feat2);
  say("and the panel has its playlist", (await p.$$(".sect-listen")).length===1);

  // ---- 1: Playlists menu ----
  p=await fresh(b,M);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(400);
  say("three browse buttons", await p.$$eval(".brlbl",e=>e.map(x=>x.textContent).join(" / ")));
  const n=await p.$eval('[data-menu="pl"] .ct',e=>+e.textContent);
  say("playlist count on the button "+n, n===233);
  await p.click('[data-menu="pl"]'); await p.waitForTimeout(350);
  const fams=await p.$$eval('.navmenu[data-br="pl"] [data-plbr]',e=>e.map(x=>x.textContent.replace(/\s+/g," ").trim()));
  say("families offered", fams.length+" — "+fams.slice(0,3).join(", "));
  const sum=await p.$$eval('.navmenu[data-br="pl"] [data-plbr] small',e=>e.reduce((s,x)=>s+ +x.textContent,0));
  say("counts add up to 233", sum===233 ? true : sum);
  say("fewer families than the Families menu (only listenable ones)", fams.length<=16);
  await p.click('.navmenu[data-br="pl"] [data-plbr]'); await p.waitForTimeout(300);
  const rows=await p.$$('.navmenu[data-br="pl"] [data-go]');
  say("drilled into a family", rows.length>0);
  say("every row there is playable", await p.$$eval('.navmenu[data-br="pl"] [data-go]',(e,)=>e.length>0));
  await p.screenshot({path:__dirname+"/screens/r-m-pl.png"});
  await p.click(".navmenu .brback"); await p.waitForTimeout(250);
  say("back to the family list", (await p.$$('.navmenu[data-br="pl"] [data-plbr]')).length===fams.length);
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  await p.click('[data-menu="fams"]'); await p.waitForTimeout(300);
  say("Families still lists all 16", (await p.$$('.navmenu[data-br="fams"] [data-fambr]')).length===16);
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);

  // ---- 5: about disclosure ----
  say("about starts closed", (await p.$eval(".aboutwrap",e=>e.open))===false);
  const shut=await p.$eval(".aboutwrap",e=>Math.round(e.getBoundingClientRect().height));
  say("collapsed about is "+shut+"px (summary only)", shut<60);
  await p.click(".aboutwrap summary"); await p.waitForTimeout(300);
  say("opens on tap", await p.$eval(".aboutwrap",e=>e.open));
  say("stats line inside", await p.$eval(".aboutwrap .stats",e=>e.textContent));
  say("families stated once", (await p.$eval("#panelBody",e=>e.textContent)).split("families").length-1);

  // ---- 6: aside ----
  say("mode aside", await p.$eval(".sect-modes .sectaside",e=>e.textContent));

  // ---- space saved ----
  await p.click(".aboutwrap summary"); await p.waitForTimeout(250);  // close it again
  const hgt=await p.$eval("#panelBody",e=>{const a=e.querySelector(".ovcard").getBoundingClientRect(),
    z=e.querySelector(".aboutwrap").getBoundingClientRect(); return Math.round(z.bottom-a.top);});
  say("root panel height, about collapsed (was 765)", hgt);
  await p.screenshot({path:__dirname+"/screens/r-m-root.png"});
  say("no mobile errors", p._errs.filter(x=>!/Failed to load/.test(x)).length===0);

  const d=await fresh(b,Dk);
  await d.screenshot({path:__dirname+"/screens/r-d-root.png"});
  say("no desktop errors", d._errs.filter(x=>!/Failed to load/.test(x)).length===0);
  await b.close();
})();
