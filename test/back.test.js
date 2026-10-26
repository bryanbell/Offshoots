const {chromium}=require("playwright");
const URL="file://"+__dirname+"/../index.html";
const M={width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2};
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));
async function fresh(b,vp,hash){ const p=await b.newPage({viewport:vp}); const errs=[];
  p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL+(hash||"")); await p.waitForTimeout(800); p._errs=errs; return p; }
const shown=p=>p.evaluate(()=>{const e=document.getElementById("panelBack");
  return !!e && !e.hidden && getComputedStyle(e).visibility!=="hidden";});
const label=p=>p.evaluate(()=>{const e=document.getElementById("panelBack"); return e?e.getAttribute("title"):"";});
const hash=p=>p.evaluate(()=>location.hash);

(async()=>{
  const b=await chromium.launch();
  let p=await fresh(b,M);

  say("hidden with nothing behind you", (await shown(p))===false);

  // overview with a mode open -> a style -> back
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(400);
  await p.click('[data-mk="winddown"]'); await p.waitForTimeout(500);
  say("still hidden after only opening a mode", (await shown(p))===false);
  const first=await p.$eval(".picks .pick",e=>e.dataset.go);
  await p.click(".picks .pick"); await p.waitForTimeout(600);
  say("appears after picking "+first, await shown(p));
  say("label", await label(p));
  await p.click("#panelBack"); await p.waitForTimeout(600);
  say("back lands on the overview", (await hash(p))==="");
  say("the mode is still open", await p.$eval(".modettl",e=>e.textContent));
  say("that chip is still lit", await p.$eval(".modechip.on",e=>e.textContent.trim()));
  say("hidden again at the start of the trail", (await shown(p))===false);

  // a four-deep lineage walk, then back out of it one at a time
  p=await fresh(b,M,"#punk");
  // a chain where every stop still leads somewhere, so the Led to button is never disabled
  const walk=["hardcore","thrash","deathmetal","blackmetal"];
  for(const id of walk){
    await p.click('[data-menu="led"]'); await p.waitForTimeout(350);
    await p.click(`.navmenu:not([hidden]) [data-go="${id}"]`); await p.waitForTimeout(550);
  }
  say("walked", "punk -> "+walk.join(" -> "));
  say("button shows the previous stop", await label(p));
  const seen=[];
  for(let i=0;i<4;i++){ await p.click("#panelBack"); await p.waitForTimeout(550); seen.push(await hash(p)); }
  say("retraced", seen.join(" "));
  const want=["#"+walk[2],"#"+walk[1],"#"+walk[0],"#punk"];
  say("retraced in reverse order", seen.join()===want.join() ? true : "wanted "+want.join(" "));
  say("a deep link still offers one step out to the map", await shown(p));
  say("that last step says", await label(p));
  // back lives in the panel now, so it is a plain arrow with the destination in its title
  say("it still says where it goes", (await label(p))==="Back to the map");
  say("home is hidden here, so only one way out is offered", (await p.$eval("#mapHome",e=>!e.hidden))===false);
  await p.click("#panelBack"); await p.waitForTimeout(550);
  say("and lands on the unselected map", (await hash(p))==="" && (await p.$eval(".ovcard .mn",e=>e.textContent))==="Offshoots");
  say("hidden once the trail runs out", (await shown(p))===false);
  say("no stale highlight left on the map", (await p.$$eval("#chart .n.cur",e=>e.length))===0);
  await p.screenshot({path:__dirname+"/screens/m-back.png"});

  // the trail survives a browse-menu jump too, and empty-space taps
  p=await fresh(b,M,"#disco");
  await p.click('[data-menu="from"]'); await p.waitForTimeout(350);
  await p.click(".navmenu:not([hidden]) [data-go]"); await p.waitForTimeout(550);
  const mid=await hash(p);
  await p.click("#chart",{position:{x:300,y:120}}).catch(()=>{}); await p.waitForTimeout(500);
  say("clearing to the map is a step too", await shown(p));
  say("its label", await label(p));
  await p.click("#panelBack"); await p.waitForTimeout(550);
  say("back returns to "+mid, (await hash(p))===mid);

  // the row reads back | title | from led, with the two lineage menus together
  const boxes=await p.evaluate(()=>{const r=document.querySelector(".navrow").getBoundingClientRect();
    const g=sel=>{const e=document.querySelector(sel).getBoundingClientRect();
      return [Math.round(e.left-r.left),Math.round(e.right-r.left),Math.round(e.height)];};
    return {back:g("#panelBack"), title:g(".navttl"), from:g(".nav-from"), led:g(".nav-led")};});
  say("back is left of the title", boxes.back[1]<=boxes.title[0]);
  say("From and Led to are paired on the right ("+(boxes.led[0]-boxes.from[1])+"px apart)",
    boxes.from[0]>boxes.title[1]-1 && boxes.led[0]-boxes.from[1]<=10 && boxes.led[0]>=boxes.from[1]);
  say("back tap target "+boxes.back[2]+"px", boxes.back[2]>=34);
  say("no page errors", p._errs.length===0 ? true : p._errs.filter(x=>!/Failed to load/.test(x)).join(" | ")||true);

  // the home pill: a shortcut only worth showing once back has become a walk
  const home=q=>q.$eval("#mapHome",e=>!e.hidden&&getComputedStyle(e).display!=="none");
  p=await fresh(b,M);
  say("home hidden on the map itself", (await home(p))===false);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(400);
  await p.click('[data-mk="winddown"]'); await p.waitForTimeout(500);
  await p.click(".picks .pick"); await p.waitForTimeout(600);
  say("home still hidden one step out", (await home(p))===false);
  const hwalk=["hardcore","thrash"];
  p=await fresh(b,M,"#punk");
  await p.click('[data-menu="led"]'); await p.waitForTimeout(350);
  await p.click(`.navmenu:not([hidden]) [data-go="${hwalk[0]}"]`); await p.waitForTimeout(550);
  say("home appears two styles deep", await home(p));
  say("and back names the style it returns to", /^Back to /.test(await label(p)));
  say("it says", await p.$eval("#mapHome",e=>e.getAttribute("title")));
  const hb=await p.evaluate(()=>{const h=document.getElementById("mapHome").getBoundingClientRect(),
    s=document.getElementById("mapSearch").getBoundingClientRect();
    return [Math.round(h.width),Math.round(h.height),Math.round(h.right),Math.round(s.left)];});
  say("tap target "+hb[0]+"x"+hb[1], hb[0]>=40&&hb[1]>=40);
  say("clear of the search button ("+hb[2]+" vs "+hb[3]+")", hb[2]<hb[3]);
  await p.click("#mapHome"); await p.waitForTimeout(600);
  say("one tap lands on the map", (await hash(p))==="" && (await p.$eval(".ovcard .mn",e=>e.textContent))==="Offshoots");
  say("and hides itself again", (await home(p))===false);
  // home is a reset: the walk that led here is gone, so back goes too
  say("back is cleared away with it", (await shown(p))===false);
  // and the trail really is empty, not merely hidden: the next move starts from the map
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(400);
  await p.click('[data-mk="winddown"]'); await p.waitForTimeout(500);
  await p.click(".picks .pick"); await p.waitForTimeout(600);
  say("the next step starts a fresh trail", await label(p));
  say("not the walk from before", (await label(p))==="Back to the map");
  say("no page errors", p._errs.length===0 ? true : p._errs.filter(x=>!/Failed to load/.test(x)).join(" | ")||true);

  await b.close();
})();
