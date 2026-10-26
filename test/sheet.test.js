// The mobile sheet's pull-to-minimise gesture.
//
// Two things to know before changing this file.
//
// Synthetic touch events do not drive native scrolling: dispatching touchmove over a
// scrollable element moves no scrollbar. The scrolled-sheet check below therefore moves
// panelBody.scrollTop by hand, in step with the finger, exactly as the browser would.
// Without that the sheet never reaches its top and the check fails against correct code.
//
// #grab ignores a synthetic .click(): it runs its own pointerdown/pointerup logic. Open
// the sheet with a real p.click("#grab"). An evaluate-click leaves the sheet shut, which
// makes every "it closed" assertion pass without testing anything.
const {chromium}=require("playwright");
const URL="file://"+__dirname+"/../index.html";
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));

(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const p=await ctx.newPage(); const errs=[]; p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL); await p.waitForTimeout(900);

  const open=()=>p.evaluate(()=>document.body.classList.contains("open"));
  const setTop=v=>p.evaluate(v=>{document.getElementById("panelBody").scrollTop=v;},v);
  const top=()=>p.evaluate(()=>document.getElementById("panelBody").scrollTop);
  const ensure=async()=>{ if(!await open()){ await p.click("#grab"); await p.waitForTimeout(500);} };
  // trackScroll mimics what the browser does with the first part of a downward pull
  const swipe=(x,y,dx,dy,steps,trackScroll)=>p.evaluate(async ([x,y,dx,dy,steps,track])=>{
      const el=document.elementFromPoint(x,y)||document.getElementById("panel");
      const pb=document.getElementById("panelBody");
      const mk=(t,cx,cy)=>new TouchEvent(t,{bubbles:true,cancelable:true,
        touches:t==="touchend"?[]:[new Touch({identifier:1,target:el,clientX:cx,clientY:cy})],
        changedTouches:[new Touch({identifier:1,target:el,clientX:cx,clientY:cy})]});
      el.dispatchEvent(mk("touchstart",x,y));
      let prev=y;
      for(let i=1;i<=steps;i++){
        const cx=x+dx*i/steps, cy=y+dy*i/steps;
        if(track && pb.scrollTop>0) pb.scrollTop=Math.max(0,pb.scrollTop-(cy-prev));
        prev=cy;
        el.dispatchEvent(mk("touchmove",cx,cy));
        await new Promise(r=>setTimeout(r,16));
      }
      el.dispatchEvent(mk("touchend",x+dx,y+dy));
    },[x,y,dx,dy,steps||14,!!trackScroll]);

  await ensure();
  say("the sheet is genuinely open to start", await open());
  const R=await p.evaluate(()=>{const r=document.getElementById("panel").getBoundingClientRect(); return [Math.round(r.top),Math.round(r.bottom)];});
  say("open height "+(R[1]-R[0])+"px", R[1]-R[0]>500);
  const mid=Math.round((R[0]+R[1])/2);

  // the ask: anywhere in the card, not just the handle
  for(const [name,y] of [["near the top of the sheet",R[0]+70],["in the middle",mid],["near the bottom",R[1]-60]]){
    await ensure(); await setTop(0); await p.waitForTimeout(150);
    await swipe(195,y,0,120); await p.waitForTimeout(400);
    say("a pull down "+name+" closes it", (await open())===false);
  }

  // the case the old handler could not do: it latched "am I at the top" at touchstart,
  // so a pull that began while the body was scrolled could never close the sheet
  await ensure(); await setTop(200); await p.waitForTimeout(200);
  say("the body scrolls to "+(await top()), (await top())>0);
  await swipe(195,mid,0,320,26,true); await p.waitForTimeout(400);
  say("one continuous pull from a scrolled sheet closes it", (await open())===false);

  // and the things that must still not close it
  await ensure(); await setTop(0); await p.waitForTimeout(250);
  const chip=await p.evaluate(()=>{const c=document.querySelector(".modechip"); const r=c.getBoundingClientRect(); return [Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)];});
  await swipe(chip[0],chip[1],-160,30); await p.waitForTimeout(350);
  say("a sideways swipe over a chip leaves it open", await open());
  await setTop(0); await p.waitForTimeout(150);
  await swipe(195,mid,0,30); await p.waitForTimeout(350);
  say("a small downward nudge is not a pull", await open());

  await p.click("#grab"); await p.waitForTimeout(500);
  say("it is minimised again", (await open())===false);
  await swipe(195,R[1]-40,0,-60); await p.waitForTimeout(400);
  say("a swipe up still opens it", await open());

  // the open/close transition. Sample inside the page on every frame: a Playwright
  // round-trip is slow enough that an eased 340ms animation can look like a jump.
  const frames=(act)=>p.evaluate(async (act)=>{
    const el=document.getElementById("panel"), out=[];
    let run=true; const tick=()=>{ if(!run) return; out.push(Math.round(el.getBoundingClientRect().height)); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    if(act==="grab") document.getElementById("grab").dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,clientY:0,pointerId:1})),
                     document.getElementById("grab").dispatchEvent(new PointerEvent("pointerup",{bubbles:true,clientY:0,pointerId:1}));
    await new Promise(r=>setTimeout(r,700)); run=false; return out;
  },act);
  const spread=h=>{ const lo=Math.min(...h), hi=Math.max(...h);
    return [...new Set(h)].filter(v=>v>lo+8&&v<hi-8).length; };
  await ensure(); await p.waitForTimeout(400);
  const closing=await frames("grab");
  say("closing moves through "+spread(closing)+" intermediate heights", spread(closing)>=5);
  say("it is minimised at the end", (await open())===false);
  const opening=await frames("grab");
  say("opening moves through "+spread(opening)+" intermediate heights", spread(opening)>=5);
  say("it is open at the end", await open());
  const left=await p.evaluate(()=>{const s=document.getElementById("panel").style; return s.height+"|"+s.maxHeight;});
  say("no inline height or cap left behind ("+left+")", left==="|");
  // reversing part way must not strand it at an in-between height
  await p.click("#grab"); await p.waitForTimeout(110);
  await p.click("#grab"); await p.waitForTimeout(800);
  const back=await p.evaluate(()=>Math.round(document.getElementById("panel").getBoundingClientRect().height));
  say("reversed mid-animation, it settles at "+back+"px", Math.abs(back-(R[1]-R[0]))<=2);

  say("no page errors", errs.filter(x=>!/Failed to load/.test(x)).join(" | ")||true);
  await b.close();
})();
