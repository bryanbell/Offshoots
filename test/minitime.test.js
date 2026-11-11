// The mini timeline: a window for the part of the map on screen, a dot for the selected
// style, and a press that moves the map. A card on desktop; a thin line along the year
// bar on a phone.
const {chromium}=require("playwright");
const skipWelcome=require("./_hello");
const {settle,until,arm}=require("./_wait");
const URL="file://"+__dirname+"/../index.html";
const say=(k,v)=>console.log((v===true?"PASS ":"FAIL ")+k+(typeof v!=="boolean"?": "+v:""));

(async()=>{
  const b=await chromium.launch({args:["--allow-file-access-from-files"]});
  skipWelcome(b);
  const errs=[];
  const look=p=>p.evaluate(()=>{
    const box=document.getElementById("minitime"), w=box&&box.querySelector(".mtwin"), d=box&&box.querySelector(".mtsel");
    const sc=document.getElementById("scroller"), r=box&&box.getBoundingClientRect();
    return {shown:!!box&&r.width>0&&r.height>0, h:r?Math.round(r.height):0, win:w?+w.getAttribute("x"):null,
      winW:w?+w.getAttribute("width"):null, dot:!!d, labels:box?box.querySelectorAll(".mtlbl").length:0, left:sc.scrollLeft};
  });

  // desktop: a card with years, a window and the selected style's dot
  const p=await b.newPage({viewport:{width:1400,height:900}});
  p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL+"#afrobeat"); await arm(p);
  await until(p,()=>!!document.querySelector("#minitime .mtwin")); await settle(p);
  const a=await look(p);
  say("desktop shows the mini timeline with its years", a.shown && a.labels>=4);
  say("  a window for the screen and a dot for the selected style", a.winW>0 && a.dot);
  await p.evaluate(()=>{ document.getElementById("scroller").scrollLeft+=600; });
  await until(p,x=>+document.querySelector("#minitime .mtwin").getAttribute("x")>x, a.win);
  const b2=await look(p);
  say("  the window follows the map as it scrolls", b2.win>a.win);
  const box=await p.$("#minitime"); const bb=await box.boundingBox();
  await p.mouse.click(bb.x+bb.width*0.12, bb.y+bb.height/2);
  await until(p,l=>document.getElementById("scroller").scrollLeft<l, b2.left);
  say("  pressing it moves the map to that time", (await look(p)).left<b2.left);
  await p.close();

  // phone: folded into the year bar, a thin line with no labels of its own
  const m=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  m.on("pageerror",e=>errs.push(String(e)));
  await m.goto(URL+"#afrobeat"); await arm(m);
  await until(m,()=>!!document.querySelector("#minitime .mtwin")); await settle(m);
  const c=await look(m);
  say("phone folds it into the year bar ("+c.h+"px tall, "+c.labels+" labels)", c.shown && c.labels===0 && c.h<=26 && c.dot);

  say("no page errors", errs.length===0 || errs.join(" | "));
  await b.close();
})();
