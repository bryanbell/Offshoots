// Reading the map as time. People did not take left to right as years until something
// said so, so the axis now says what it measures, writes years out, marks where the
// scale compresses, and shows the year of the style you are on with a line down to it.
// On desktop the year follows the pointer. Search opens a band above the axis instead
// of covering it.
const {chromium}=require("playwright");
const skipWelcome=require("./_hello");
const {settle,until,arm}=require("./_wait");
const URL="file://"+__dirname+"/../index.html";
const say=(k,v)=>console.log((v===true?"PASS ":"FAIL ")+k+(typeof v!=="boolean"?": "+v:""));
const ready=async q=>{ await arm(q); await until(q,()=>!!document.querySelector("#chart .n")); await settle(q); };

(async()=>{
  const b=await chromium.launch({args:["--allow-file-access-from-files"]});
  skipWelcome(b);
  const errs=[];

  for(const [nm,vp] of [["desktop",{viewport:{width:1440,height:900}}],
                        ["phone",{viewport:{width:390,height:844},isMobile:true,hasTouch:true}]]){
    const p=await b.newPage(vp); p.on("pageerror",e=>errs.push(String(e)));
    await p.goto(URL); await ready(p);
    const ax=await p.evaluate(()=>{ const t=[...document.querySelectorAll("#axis text")].map(x=>x.textContent);
      const brk=document.querySelector("#axis .axbreak"), div=document.querySelector("#chart .g10.rootdiv");
      return {t, brk:!!brk, div:!!div, divx:div?+div.getAttribute("x1"):null,
        brkx:brk?(()=>{const bb=brk.getBBox(); return bb.x+bb.width/2;})():null,
        ticks:document.querySelectorAll("#axis .axtick").length}; });
    say(nm+": the axis says what it measures", ax.t.includes("Year each style emerged →"));
    say(nm+": the roots say they are compressed", ax.t.some(x=>/^Roots.*\(compressed\)$/.test(x)));
    say(nm+": years are written out, no '55 shorthand", !ax.t.some(x=>/[’']\d\d/.test(x)) && ax.t.includes("1960") && ax.t.includes("2000"));
    say(nm+": every five years ticked ("+ax.ticks+")", ax.ticks>=20);
    say(nm+": a break mark on the 1950 divider, which is dashed down the map",
      ax.brk && ax.div && Math.abs(ax.brkx-ax.divx)<6);

    // the selected style's year on the axis, with a guide down to it
    await p.goto(URL+"#house"); await ready(p);
    await until(p,()=>!!document.querySelector("#axsel text"));
    const sel=await p.evaluate(()=>{ const t=document.querySelector("#axsel text"), g=document.getElementById("yrguide"),
      n=document.querySelector('#chart .n[data-id="house"]');
      const nx=n?+n.getAttribute("transform").match(/translate\(([\d.]+)/)[1]:null;
      return {txt:t.textContent, x:+t.getAttribute("x"), nx, vis:g.getAttribute("visibility"), gx:+g.getAttribute("x1")}; });
    say(nm+": the selected style's year is on the axis ("+sel.txt+")", sel.txt==="1984" && Math.abs(sel.x-sel.nx)<1);
    say(nm+": with a guide line down to it", sel.vis===null && Math.abs(sel.gx-sel.nx)<1);
    // a pill sits on a year label: the label goes rather than half showing
    say(nm+": no year label shows through a pill", await p.evaluate(()=>{
      const ps=[...document.querySelectorAll("#axsel rect,#axhov rect")].map(r=>[+r.getAttribute("x"),+r.getAttribute("x")+ +r.getAttribute("width")]);
      return [...document.querySelectorAll("#axis text.yl")].every(t=>{ if(getComputedStyle(t).visibility==="hidden") return true;
        const x=+t.getAttribute("x"), hw=t.textContent.length*3.5; return !ps.some(([a,b2])=>x+hw>a && x-hw<b2); }); }));

    // names for screen readers, but no browser tooltip: a <title> was drawn over the search field
    say(nm+": map styles carry a label but no tooltip", await p.evaluate(()=>{
      const g=document.querySelector('#chart .n[data-id="house"]');
      return !g.querySelector("title") && /Chicago House/.test(g.getAttribute("aria-label")||""); }));

    // search: a band opens above the axis, nothing covered
    const before=await p.evaluate(()=>document.getElementById("axis").getBoundingClientRect().top);
    await p.click("#mapSearch"); await settle(p); await p.waitForTimeout(300);
    const open=await p.evaluate(()=>({axis:document.getElementById("axis").getBoundingClientRect().top,
      field:document.querySelector("#bottomSearch input").getBoundingClientRect().bottom}));
    say(nm+": search opens above the axis and the map slides down ("+Math.round(before)+" to "+Math.round(open.axis)+"px)",
      open.axis>=open.field && open.axis>before+20);
    await p.keyboard.press("Escape"); await settle(p); await p.waitForTimeout(300);
    const shut=await p.evaluate(()=>document.getElementById("axis").getBoundingClientRect().top);
    say(nm+": and slides back when it closes", Math.abs(shut-before)<2);

    // the year under the pointer, on desktop only
    if(nm==="desktop"){
      const box=await p.evaluate(()=>{ const r=document.getElementById("scroller").getBoundingClientRect(); return {x:r.left+r.width*.5,y:r.top+r.height*.6}; });
      await p.mouse.move(box.x,box.y); await p.waitForTimeout(150);
      const hv=await p.evaluate(()=>({t:(document.querySelector("#axhov text")||{}).textContent||"",
        vis:document.getElementById("yrhov").getAttribute("visibility")}));
      say("desktop: the year follows the pointer ("+hv.t+")", /^\d{4}s?$/.test(hv.t) && hv.vis===null);
      await p.mouse.move(5,5); await p.evaluate(()=>document.getElementById("scroller").dispatchEvent(new PointerEvent("pointerleave")));
      await p.waitForTimeout(150);
      say("desktop: and goes when the pointer leaves the map", await p.evaluate(()=>!document.querySelector("#axhov text")));
    } else {
      await p.dispatchEvent("#scroller","pointermove",{pointerType:"touch",clientX:200,clientY:400});
      await p.waitForTimeout(150);
      say("phone: no pointer year on touch", await p.evaluate(()=>!document.querySelector("#axhov text")));
    }
    await p.close();
  }

  // the welcome says how to read the map, once
  { const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await p.goto(URL); await until(p,()=>!!document.querySelector("#hellocard .hnote"));
    say("the welcome says left to right is time", await p.evaluate(()=>
      /Left to right is time/.test(document.querySelector("#hellocard .hnote").textContent)));
    await p.close(); }

  say("no page errors", errs.length===0 || errs.join(" | "));
  await b.close();
})();
