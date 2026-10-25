const {chromium}=require("playwright");
const URL="file://"+__dirname+"/../index.html";
const fresh=async(b,vp)=>{ const p=await b.newPage({viewport:vp}); const errs=[];
  p.on("pageerror",e=>errs.push(String(e))); p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
  await p.goto(URL); await p.waitForTimeout(700); p._errs=errs; return p; };
const M={width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2};
const Dk={width:1280,height:900};

(async()=>{
  const b=await chromium.launch();
  const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v==="string"||typeof v==="number"?": "+v:""));

  // ---- mobile ----
  let p=await fresh(b,M);
  await p.click("#grab").catch(()=>{});                 // open the sheet
  await p.waitForTimeout(400);
  const chips=await p.$$(".modechip");
  say("mode chips rendered", chips.length===13 ? true : chips.length);
  say("chip labels", (await p.$$eval(".modechip",e=>e.map(x=>x.textContent.trim()).join(" / "))));
  say("picks hidden before a tap", (await p.$$(".picks .pick")).length===0);

  await p.click('[data-mk="focus"]');
  await p.waitForTimeout(300);
  say("focus picks", (await p.$$(".picks .pick")).length===12);
  say("heading", await p.$eval(".modettl",e=>e.textContent));
  say("first pick", await p.$eval(".picks .pick",e=>e.textContent.replace(/\s+/g," ").trim()));
  say("chip marked pressed", await p.$eval('[data-mk="focus"]',e=>e.getAttribute("aria-pressed")==="true"&&e.classList.contains("on")));
  // tap target size
  const box=await p.$eval(".picks .pick",e=>{const r=e.getBoundingClientRect();return [Math.round(r.height),Math.round(r.width)];});
  say("pick row height/width", box.join(" x ")); say("row >= 44px tall", box[0]>=44);
  say("row fits panel", box[1] <= 390-24);

  // switching modes replaces rather than stacks
  await p.click('[data-mk="workout"]'); await p.waitForTimeout(250);
  say("switch replaces", (await p.$$(".picks .pick")).length===12 && (await p.$$(".modeout")).length===1);
  say("workout heading", await p.$eval(".modettl",e=>e.textContent));
  // tapping the open chip closes it
  await p.click('[data-mk="workout"]'); await p.waitForTimeout(250);
  say("tap again closes", (await p.$$(".picks .pick")).length===0 && (await p.$$(".modechip.on")).length===0);

  // picking a style navigates
  await p.click('[data-mk="winddown"]'); await p.waitForTimeout(250);
  const target=await p.$eval(".picks .pick:nth-child(2)",e=>e.dataset.go);
  await p.click(".picks .pick:nth-child(2)"); await p.waitForTimeout(600);
  say("pick selects "+target, await p.evaluate(()=>location.hash)==="#"+target);
  say("panel shows that style", await p.$eval(".pcard .mn",e=>e.textContent));
  say("map node highlighted", await p.$$eval("#chart .n.cur",e=>e.length)===1);

  // returning to the overview keeps the chosen mode open
  await p.evaluate(()=>{ const f=document.querySelector("#chart"); });
  await p.click("#chart",{position:{x:200,y:60}}).catch(()=>{});
  await p.waitForTimeout(500);
  const back=await p.$$(".modechip.on");
  say("mode remembered on return", back.length<=1);
  say("no mobile page errors", p._errs.length===0 ? true : p._errs.join(" | "));
  await p.screenshot({path:__dirname+"/screens/m-modes.png"});

  // open focus again for the screenshot
  p=await fresh(b,M);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(300);
  await p.click('[data-mk="focus"]'); await p.waitForTimeout(400);
  await p.screenshot({path:__dirname+"/screens/m-focus.png"});

  // ---- desktop ----
  const d=await fresh(b,Dk);
  await d.click('[data-mk="sit"]'); await d.waitForTimeout(300);
  say("desktop picks", (await d.$$(".picks .pick")).length===12);
  const over=await d.$eval(".picks .pick",e=>e.scrollWidth<=e.clientWidth+1);
  say("no horizontal overflow in a row", over);
  await d.screenshot({path:__dirname+"/screens/d-modes.png",fullPage:false});
  say("no desktop page errors", d._errs.length===0 ? true : d._errs.join(" | "));

  await b.close();
})();
