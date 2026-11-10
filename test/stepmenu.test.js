// Arrow keys step along the lineage from the selected style: left opens what it came from,
// right what it led to, up and down move, Enter goes, Escape closes. It previews the lit
// row on the map without selecting it, and it never fires while typing.
const path=require("path");
const {chromium}=require("playwright");
const skipWelcome=require("./_hello");
const {settle,until,arm}=require("./_wait");
const D=require(path.join(__dirname,"..","src","data.js"));
const URL="file://"+path.join(__dirname,"..","index.html");
const say=(k,v)=>console.log((v===true?"PASS ":"FAIL ")+k+(typeof v!=="boolean"?": "+v:""));

(async()=>{
  const b=await chromium.launch({args:["--allow-file-access-from-files"]});
  skipWelcome(b);
  const errs=[];
  const p=await b.newPage({viewport:{width:1400,height:900}});
  p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL+"#emopop"); await arm(p);
  await until(p,()=>!!document.querySelector('#chart .n.cur[data-id="emopop"]')); await settle(p);
  const row=D.DATA.find(r=>r[0]==="emopop");
  const parents=row[4].split(" ").filter(Boolean);
  const kids=D.DATA.filter(r=>(r[4]||"").split(" ").includes("emopop")).map(r=>r[0]);

  await p.keyboard.press("ArrowRight");
  const r1=await p.evaluate(()=>{ const m=document.querySelector(".stepmenu");
    return m && {side:m.classList.contains("after"), n:m.querySelectorAll(".stepit").length,
      lit:(document.querySelector("#chart .n.pv")||{dataset:{}}).dataset.id, hash:location.hash}; });
  say("right arrow opens what came after ("+(r1&&r1.n)+" of "+kids.length+")", !!r1 && r1.side && r1.n===kids.length);
  say("  previewing the first on the map without selecting it", !!r1 && kids.includes(r1.lit) && r1.hash==="#emopop");
  const first=r1.lit;
  await p.keyboard.press("ArrowDown");
  const lit2=await p.evaluate(()=>(document.querySelector("#chart .n.pv")||{dataset:{}}).dataset.id);
  say("  down moves to the next", lit2!==first && kids.includes(lit2));
  await p.keyboard.press("Enter");
  const went=await until(p,id=>!!document.querySelector(`#chart .n.cur[data-id="${id}"]`),lit2);
  say("  Enter goes there and closes the menu", !!went && !(await p.$(".stepmenu")));
  await settle(p);

  await p.goto(URL+"#emopop"); await arm(p);
  await until(p,()=>!!document.querySelector('#chart .n.cur[data-id="emopop"]')); await settle(p);
  await p.keyboard.press("ArrowLeft");
  const n2=await p.$$eval(".stepmenu.before .stepit",e=>e.length);
  say("left arrow opens what came before ("+n2+" of "+parents.length+")", n2===parents.length);
  await p.keyboard.press("Escape");
  const after=await p.evaluate(()=>({m:!!document.querySelector(".stepmenu"), sel:(document.querySelector("#chart .n.cur")||{dataset:{}}).dataset.id,
    peek:document.getElementById("chart").classList.contains("peek")}));
  say("  Escape closes it and leaves the style selected", !after.m && after.sel==="emopop" && !after.peek);
  await p.keyboard.press("ArrowLeft"); await p.keyboard.press("ArrowRight");
  say("  the other arrow closes it too", !(await p.$(".stepmenu")));

  // no menu with nothing selected, or while typing
  await p.goto(URL); await arm(p); await settle(p);
  await p.keyboard.press("ArrowRight");
  say("nothing selected, no menu", !(await p.$(".stepmenu")));
  await p.goto(URL+"#emopop"); await arm(p); await settle(p);
  await p.evaluate(()=>{ const i=document.createElement("input"); i.id="tmpi"; document.body.appendChild(i); i.focus(); });
  await p.keyboard.press("ArrowRight");
  say("typing in a field, no menu", !(await p.$(".stepmenu")));

  say("no page errors", errs.length===0 || errs.join(" | "));
  await b.close();
})();
