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

  // dragging the card's header, which is where a thumb lands on an open sheet.
  // pause matters: a quick flick down closes whatever the distance, so a short drag meant
  // to spring back has to be slow enough not to read as one.
  const hgt=()=>p.evaluate(()=>Math.round(document.getElementById("panel").getBoundingClientRect().height));
  const drag=async(x,y,dy,steps,release=true,pause=0)=>{
    await p.mouse.move(x,y); await p.mouse.down();
    const seen=[];
    for(let i=1;i<=steps;i++){ await p.mouse.move(x,y+dy*i/steps); seen.push(await hgt()); if(pause) await p.waitForTimeout(pause); }
    if(release) await p.mouse.up();
    return seen; };
  await ensure(); await p.waitForTimeout(500);
  const hd=await p.evaluate(()=>{const r=document.querySelector(".pcard .navrow").getBoundingClientRect();
    return [Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)];});
  const follow=await drag(hd[0],hd[1],170,8,false);
  say("the sheet follows the finger from the header", new Set(follow).size>=5);
  await p.mouse.up(); await p.waitForTimeout(700);
  say("released past halfway it minimises", (await open())===false);
  await ensure(); await p.waitForTimeout(500);
  await drag(hd[0],hd[1],40,5,true,90); await p.waitForTimeout(700);
  say("a short slow drag springs back open", await open());
  await drag(hd[0],hd[1],45,4); await p.waitForTimeout(700);
  say("a quick flick down closes it even at 45px", (await open())===false);
  // the header carries no control at all now, so the whole row is drag and nothing else.
  // Share is a button at the foot of the card, out of the handle's way entirely.
  await ensure(); await p.waitForTimeout(500);
  await p.evaluate(()=>{window.__copied=[];navigator.clipboard.writeText=async t=>{window.__copied.push(t)};});
  // the X sits in the drag handle, so the same tap-versus-drag rule applies to it
  say("the handle carries the minimise control",
    (await p.$$eval(".ovcard .navrow button",e=>e.filter(b=>!b.hidden).length))===1);
  await p.click(".ovcard .pmin"); await p.waitForTimeout(700);
  // it closes rather than minimises: the sheet goes, the map is whole, and the pull tab
  // at the bottom of the screen is what brings it back
  const away=await p.evaluate(()=>({gone:document.body.classList.contains("sheetgone"),
    panel:getComputedStyle(document.getElementById("panel")).display,
    pull:(()=>{const t=document.getElementById("sheetpull");
      return t?getComputedStyle(t).display:"missing";})(),
    kept:location.hash}));
  say("  tapping it puts the sheet away", away.gone && away.panel==="none");
  say("  leaving a pull tab to bring it back ("+away.pull+")", away.pull!=="none" && away.pull!=="missing");
  await p.click("#sheetpull"); await p.waitForTimeout(700);
  say("  which does", await p.evaluate(()=>!document.body.classList.contains("sheetgone")));
  await ensure(); await p.waitForTimeout(500);
  await p.$eval("#panelBody .shbtn.wide",e=>e.scrollIntoView({block:"center"})); await p.waitForTimeout(300);
  await p.click("#panelBody .shbtn.wide"); await p.waitForTimeout(400);
  say("the button at the foot shares", await p.evaluate(()=>window.__copied.length===1));
  say("and the sheet stayed open", await open());
  await p.waitForTimeout(1800);
  // the title is inert: it drags and nothing else
  await p.evaluate(()=>{window.__copied=[];});
  const ttl=await p.evaluate(()=>{const r=document.querySelector(".ovcard .bigttl").getBoundingClientRect(); return [Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)];});
  await p.mouse.click(ttl[0],ttl[1]); await p.waitForTimeout(400);
  say("tapping the title shares nothing", await p.evaluate(()=>window.__copied.length===0));
  // the row is 13px tall with nothing in it, so the title under it is the grip
  await ensure(); await p.waitForTimeout(500);
  // the card is still scrolled to the share button from the step above
  await p.evaluate(()=>{document.getElementById("panelBody").scrollTop=0;}); await p.waitForTimeout(400);
  const hd2=await p.evaluate(()=>{const r=document.querySelector(".ovcard .bigttl").getBoundingClientRect();
    return [Math.round(r.left+r.width/2),Math.round(r.top+r.height/2),Math.round(r.height)];});
  say("the title is a "+hd2[2]+"px grip, which the empty row is not", hd2[2]>=34);
  await drag(hd2[0],hd2[1],170,8); await p.waitForTimeout(700);
  say("dragging it shuts the sheet", (await open())===false);
  // the drag ceiling has to match the open height, or dragging up pulls the sheet down
  await ensure(); await p.waitForTimeout(500);
  const up=await drag(hd[0],hd[1],-60,5,false);
  say("dragging up does not shrink it", Math.min(...up)>=(R[1]-R[0])-2);
  await p.mouse.up(); await p.waitForTimeout(600);

  // nothing in the card may sit at a different offset in one state than the other, or the
  // contents slide under the finger as the sheet moves
  const offsets=()=>p.evaluate(()=>{const pa=document.getElementById("panel").getBoundingClientRect();
    const o={}; [".pcard",".ovcard .navttl",".sect-feat",".sect"].forEach(s=>{const e=document.querySelector(s);
      if(e) o[s]=+(e.getBoundingClientRect().top-pa.top).toFixed(2);}); return o;});
  await p.goto(URL); await p.waitForTimeout(900);
  const shut=await offsets();
  await p.click("#grab"); await p.waitForTimeout(800);
  const wide=await offsets();
  const moved=Object.keys(shut).filter(k=>Math.abs(shut[k]-wide[k])>0.5);
  say("the card holds its position in both states"+(moved.length?" ("+moved.map(k=>k+" "+shut[k]+" -> "+wide[k]).join(", ")+")":""), moved.length===0);

  // the sheet floats over the map rather than docking under it, which is what gives the
  // frosted ground something to blur. The map therefore keeps its height, and two things
  // that used to come free from that resize now have to be maintained by hand.
  await p.goto(URL); await p.waitForTimeout(1000);
  const geo=()=>p.evaluate(()=>{const pan=document.getElementById("panel").getBoundingClientRect();
    const s=document.getElementById("scroller").getBoundingClientRect();
    return {overlap:Math.round(Math.min(s.bottom,pan.bottom)-Math.max(s.top,pan.top)), mapH:Math.round(s.height)};});
  const g1=await geo();
  say("the map runs behind the sheet ("+g1.overlap+"px)", g1.overlap>100);
  const frost=await p.evaluate(()=>{const cs=getComputedStyle(document.getElementById("panel"));
    return [cs.backdropFilter||cs.webkitBackdropFilter||"none", cs.backgroundColor];});
  say("its ground is frosted: "+frost[0], /blur/.test(frost[0]));
  say("and translucent: "+frost[1], /rgba|\/ 0\./.test(frost[1]));
  await p.click("#grab"); await p.waitForTimeout(900);
  const g2=await geo();
  say("opening no longer resizes the map ("+g1.mapH+" -> "+g2.mapH+")", g1.mapH===g2.mapH);
  // a tinted style panel frosts over its own family ground, not the root's.
  // On a fresh page: a hash change on a page already loaded is a same-document
  // navigation, so the app does not re-select and the panel never tints.
  const tp=await ctx.newPage();
  await tp.goto(URL+"#disco"); await tp.waitForTimeout(1200);
  const tint=await tp.evaluate(()=>{const el=document.getElementById("panel"), cs=getComputedStyle(el);
    return {tinted:el.classList.contains("tinted"), bg:cs.backgroundColor,
      bf:cs.backdropFilter||cs.webkitBackdropFilter||"none",
      ground:el.style.getPropertyValue("--tint").trim()};});   // set inline, per selection
  say("the style panel is tinted ("+tint.ground+")", tint.tinted && !!tint.ground);
  say("and frosted over it", /blur/.test(tint.bf) && /rgba|\/ 0\./.test(tint.bg));
  await tp.close();
  // 1. a style chosen with the sheet open must land in the band still showing
  await p.click('[data-mk="winddown"]'); await p.waitForTimeout(900);
  await p.click(".picks .pick"); await p.waitForTimeout(1200);
  const cur=await p.evaluate(()=>{const n=document.querySelector("#chart .n.cur");
    if(!n) return null; const r=n.getBoundingClientRect(), pan=document.getElementById("panel").getBoundingClientRect();
    return {gap:Math.round(pan.top-r.bottom), top:Math.round(r.top)};});
  say("the chosen style sits "+(cur?cur.gap:"?")+"px clear of the sheet", !!cur && cur.gap>0 && cur.top>0);
  // 2. the end of the map must come out from under it, in every state the sheet can be
  // in. The clearance has to beat the sheet's 30px shadow too, or the last lane sits in
  // the shadow and reads as stuck underneath however far you scroll.
  const SHADOW=30;
  const bottomGap=async()=>{
    await p.evaluate(()=>{const s=document.getElementById("scroller"); s.scrollTop=s.scrollHeight;});
    await p.waitForTimeout(450);
    return p.evaluate(()=>{const pan=document.getElementById("panel").getBoundingClientRect();
      const band=[...document.querySelectorAll("#chart .band")].map(x=>x.getBoundingClientRect()).sort((a,b)=>b.bottom-a.bottom)[0];
      const node=[...document.querySelectorAll("#chart .n")].map(x=>x.getBoundingClientRect()).sort((a,b)=>b.bottom-a.bottom)[0];
      return {lane:Math.round(pan.top-band.bottom), style:Math.round(pan.top-node.bottom)};});
  };
  const open1=await bottomGap();
  say("with the sheet open, the last lane clears it by "+open1.lane+"px", open1.lane>SHADOW);
  await p.click("#grab"); await p.waitForTimeout(900);
  const shut1=await bottomGap();
  say("minimised, the same ("+shut1.lane+"px lane, "+shut1.style+"px style)", shut1.lane>SHADOW && shut1.style>SHADOW);
  // and at a height the user dragged it to, which no setOpen reports
  await p.mouse.move(195,R[1]-160); await p.mouse.down();
  for(let i=1;i<=8;i++){ await p.mouse.move(195,R[1]-160-i*9); await p.waitForTimeout(40); }
  await p.mouse.up(); await p.waitForTimeout(900);
  const drag1=await bottomGap();
  say("and at a dragged height ("+drag1.lane+"px)", drag1.lane>SHADOW);

  say("no page errors", errs.filter(x=>!/Failed to load/.test(x)).join(" | ")||true);
  await b.close();
})();
