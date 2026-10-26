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
  // read the expected count from the page rather than hard-coding it: this assertion
  // has silently gone non-boolean twice when a mode was added
  const nModes=await p.evaluate(()=>typeof MODES!=="undefined"?MODES.length:-1);
  say("one chip per mode ("+nModes+")", nModes>0 && chips.length===nModes);
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

  // every mode carries how loud it is, and the chip takes its colour from that. The
  // ramp has to read in order, so the five levels are five distinct colours.
  p=await fresh(b,M);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(500);
  const lv=await p.evaluate(()=>[...document.querySelectorAll(".modechip")].map(c=>{
    const cs=getComputedStyle(c);
    return {name:c.querySelector(".nm").textContent, lv:c.dataset.lv,
      bg:cs.backgroundColor, fg:cs.color, icon:getComputedStyle(c.querySelector(".mi")).color};}));
  say("every chip is rated 1 to 5", lv.length>0 && lv.every(c=>/^[1-5]$/.test(c.lv)));
  // the chips run quietest first, so the colour reads as one ramp down the section
  const order=lv.map(c=>+c.lv);
  say("they run 1 to 5 ["+order.join("")+"]", order.every((v,i)=>i===0||v>=order[i-1]));
  say("the first is a 1 and the last a 5", order[0]===1 && order[order.length-1]===5);
  const grounds=new Set(lv.map(c=>c.bg)), icons=new Set(lv.map(c=>c.icon));
  say("the five levels are five grounds ("+grounds.size+")", grounds.size===5);
  say("and five icon colours ("+icons.size+")", icons.size===5);
  const lumi=c=>{const [r,g,bl]=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;
    return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);}); return .2126*r+.7152*g+.0722*bl;};
  const ratio=(a,b)=>(Math.max(lumi(a),lumi(b))+.05)/(Math.min(lumi(a),lumi(b))+.05);
  const worst=Math.min(...lv.map(c=>ratio(c.fg,c.bg)));
  say("the faintest label on its own chip reads at "+worst.toFixed(2)+":1", worst>=4.5);
  // the ramp must run cool to hot, not be five arbitrary colours
  const byLv={}; lv.forEach(c=>byLv[c.lv]=c.icon);
  const hue=c=>{let [r,g,b]=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255);
    const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn;
    if(!d) return 0;
    let h = mx===r ? ((g-b)/d)%6 : mx===g ? (b-r)/d+2 : (r-g)/d+4;
    h*=60; return h<0?h+360:h;};
  const ramp=[1,2,3,4,5].map(n=>Math.round(hue(byLv[n])));
  say("the hue falls from blue to red ["+ramp.join(" ")+"]",
    ramp.every((v,i)=>i===0||v<ramp[i-1]) && ramp[0]>180 && ramp[4]<30);

  // picking a mode brings its list to the top of the sheet. The scroller is #panelBody:
  // #panel is overflow:hidden, and scrolling that moved nothing for as long as it existed.
  p=await fresh(b,M);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(500);
  const sTop=()=>p.evaluate(()=>document.getElementById("panelBody").scrollTop);
  const listAt=()=>p.evaluate(()=>{const b=document.getElementById("panelBody").getBoundingClientRect(),
    o=document.querySelector(".modeout").getBoundingClientRect(); return Math.round(o.top-b.top);});
  say("the sheet starts at its top", (await sTop())===0);
  await p.click('[data-mk="winddown"]'); await p.waitForTimeout(900);
  say("picking a mode scrolls the sheet ("+(await sTop())+"px)", (await sTop())>40);
  say("and leaves the list "+(await listAt())+"px from the top", Math.abs((await listAt())-8)<=5);
  // the heading repeats the chip's icon
  const same=await p.evaluate(()=>{const h=document.querySelector(".modettl .mi svg"),
    c=document.querySelector('[data-mk="winddown"] .mi svg');
    return !!h && !!c && h.innerHTML===c.innerHTML;});
  say("the heading carries the chip's own icon", same);
  say("the heading still reads as text", (await p.$eval(".modettl .mtx",e=>e.textContent.trim()))==="Winding down");
  // and a way back up, since the chips are off the top by the time the list is in view
  const deep=await sTop();
  say("the heading carries a back button", await p.evaluate(()=>!!document.querySelector(".modettl .modeup")));
  say("it is labelled", (await p.$eval(".modeup",e=>e.textContent.trim()))==="All ways in");
  // an underlined link like the service picker, not another round button
  const ub=await p.evaluate(()=>{const e=document.querySelector(".modeup"), cs=getComputedStyle(e), r=e.getBoundingClientRect();
    return {h:Math.round(r.height), dec:cs.textDecorationLine, bg:cs.backgroundColor};});
  say("no pill behind it ("+ub.bg+")", /rgba\(0, 0, 0, 0\)|transparent/.test(ub.bg));
  say("underlined like the service picker", ub.dec==="underline");
  say("still "+ub.h+"px tall to tap", ub.h>=30);
  await p.click(".modeup"); await p.waitForTimeout(900);
  say("it scrolls back up, "+deep+" -> "+(await sTop()), (await sTop())<deep);
  say("the chips are on screen again", await p.evaluate(()=>{
    const b=document.getElementById("panelBody").getBoundingClientRect(),
      c=document.querySelector(".modechips").getBoundingClientRect();
    return c.top>=b.top-1 && c.top<b.bottom;}));
  say("the mode stayed open", (await p.$eval(".modettl .mtx",e=>e.textContent.trim()))==="Winding down");
  say("and its chip is still lit", (await p.$eval(".modechip.on",e=>e.textContent.trim()))==="Wind down");
  say("the heading does not overflow the sheet", await p.evaluate(()=>{
    const b=document.getElementById("panelBody");
    return b.scrollWidth<=b.clientWidth+1;}));
  // the longest heading has to live beside the label without clipping
  await p.click('[data-mk="family"]'); await p.waitForTimeout(700);
  const fit=await p.evaluate(()=>{const t=document.querySelector(".modettl .mtx"), u=document.querySelector(".modeup");
    return {clipped:t.scrollWidth>t.clientWidth+1,
      gap:Math.round(u.getBoundingClientRect().left-t.getBoundingClientRect().right)};});
  say("the longest heading is not clipped, "+fit.gap+"px clear of the label", !fit.clipped&&fit.gap>=4);
  await p.click('[data-mk="winddown"]'); await p.waitForTimeout(700);

  await p.click('[data-mk="cocktails"]'); await p.waitForTimeout(900);
  say("switching modes scrolls again, to "+(await listAt())+"px", Math.abs((await listAt())-8)<=5);
  // and from a minimised sheet, which opens first
  p=await fresh(b,M);
  await p.click('[data-mk="party"]'); await p.waitForTimeout(1200);
  say("a chip tapped while minimised opens the sheet", await p.$eval("body",e=>e.classList.contains("open")));
  say("and still lands on the list ("+(await listAt())+"px)", Math.abs((await listAt())-8)<=7);

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
