// Hovering a style in a collection previews it on the map: the style lights, the lines to
// and from it light, and the map slides to it. It is a preview, so it must not select
// anything, move the address or leave a crumb, and moving off the list has to put the map
// back. On a phone there is no hover and the sheet is over the map, so it does nothing.
const {chromium}=require("playwright");
const skipWelcome=require("./_hello");
const {settle,until,arm}=require("./_wait");
const URL="file://"+__dirname+"/../index.html";
const say=(k,v)=>console.log((v===true?"PASS ":"FAIL ")+k+(typeof v!=="boolean"?": "+v:""));
const ready=async q=>{ await arm(q); await until(q,()=>!!document.querySelector("#chart .n")); await settle(q); };

async function openCoffee(p){
  await p.goto(URL+"#modes"); await ready(p);
  await until(p,()=>!!document.querySelector('.moderow[data-mode="coffee"]'));
  await p.click('.moderow[data-mode="coffee"]');
  await until(p,()=>document.querySelectorAll(".picks .pk .pick[data-go]").length>3);
  await settle(p);
}
const look=p=>p.evaluate(()=>{
  const svg=document.getElementById("chart"), s=document.getElementById("scroller");
  const pv=svg.querySelector(".n.pv");
  return {peek:svg.classList.contains("peek"), pv:pv?pv.dataset.id:null,
    near:svg.querySelectorAll(".n.pvn").length, lines:svg.querySelectorAll(".e.pve").length,
    sel:(svg.querySelector(".n.cur")||{dataset:{}}).dataset.id||null, hash:location.hash, x:s.scrollLeft, y:s.scrollTop};
});

(async()=>{
  const b=await chromium.launch({args:["--allow-file-access-from-files"]});
  skipWelcome(b);
  const errs=[];

  const p=await b.newPage({viewport:{width:1280,height:800}});
  p.on("pageerror",e=>errs.push(String(e)));
  await openCoffee(p);
  const before=await look(p);
  const rows=await p.$$eval(".picks .pk .pick[data-go]",r=>r.map(x=>x.dataset.go));
  // a row whose style is off screen to start with, so the map has somewhere to go
  const id=await p.evaluate(rows=>{
    const s=document.getElementById("scroller").getBoundingClientRect();
    return rows.find(k=>{ const r=document.querySelector(`#chart .n[data-id="${k}"]`).getBoundingClientRect();
      return r.right<s.left||r.left>s.right||r.bottom<s.top||r.top>s.bottom; });},rows);
  await p.hover(`.picks .pk .pick[data-go="${id}"]`);
  await until(p,id=>{const g=document.querySelector("#chart .n.pv"); return !!g&&g.dataset.id===id;},id);
  await until(p,x=>{const s=document.getElementById("scroller"); return s.scrollLeft!==x[0]||s.scrollTop!==x[1];},[before.x,before.y]);
  const on=await look(p);
  say("hovering a row lights that style on the map", on.peek && on.pv===id);
  const ln=await p.evaluate(id=>[...document.querySelectorAll("#chart .e")]
    .filter(e=>e.dataset.p===id||e.dataset.c===id).map(e=>e.dataset.p===id?e.dataset.c:e.dataset.p),id);
  say("  and the styles it came from and led to", on.near===new Set(ln).size && on.near>0);
  say("  and the lines between them", on.lines===ln.length);
  say("  and the map moves to it", on.x!==before.x || on.y!==before.y);
  // smooth scrolling, so wait for it to land rather than for a fixed time
  const inView=await until(p,id=>{
    const r=document.querySelector(`#chart .n[data-id="${id}"]`).getBoundingClientRect();
    const s=document.getElementById("scroller").getBoundingClientRect();
    return r.left>s.left && r.right<s.right && r.top>s.top && r.bottom<s.bottom;},id);
  say("  so the style is on screen", inView);
  say("  without selecting it", on.sel===before.sel && on.hash===before.hash);

  // a second row moves the preview, not adds to it
  const id2=rows[0];
  await p.hover(`.picks .pk .pick[data-go="${id2}"]`);
  await until(p,id=>{const g=document.querySelector("#chart .n.pv"); return !!g&&g.dataset.id===id;},id2);
  say("a second row moves the preview", (await p.$$eval("#chart .n.pv",g=>g.length))===1);

  // off the list: the map's highlighting goes back as it was
  await p.mouse.move(200,400);
  await until(p,()=>!document.getElementById("chart").classList.contains("peek"));
  const off=await look(p);
  say("moving off the list ends the preview", !off.peek && off.pv===null && off.lines===0);
  say("  and still nothing was selected", off.sel===before.sel && off.hash===before.hash);

  // clicking the row still opens the style, with no preview left over
  await p.hover(`.picks .pk .pick[data-go="${id}"]`);
  await until(p,id=>!!document.querySelector(`#chart .n.pv[data-id="${id}"]`),id);
  await p.click(`.picks .pk .pick[data-go="${id}"]`);
  await until(p,id=>!!document.querySelector(`#chart .n.cur[data-id="${id}"]`),id); await settle(p);
  const opened=await look(p);
  say("clicking the row opens the style, preview cleared", opened.sel===id && !opened.peek);

  // the Listen pill is not a preview target of its own, and hovering it changes nothing new
  // phone: no hover, sheet over the map
  const m=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  m.on("pageerror",e=>errs.push(String(e)));
  await openCoffee(m);
  const mid=await m.$eval(".picks .pk .pick[data-go]",x=>x.dataset.go);
  await m.dispatchEvent(`.picks .pk .pick[data-go="${mid}"]`,"pointerover",{pointerType:"touch",bubbles:true});
  await m.waitForTimeout(400);
  say("on a phone nothing previews", !(await look(m)).peek);

  // Most Influential's rows preview the same way
  { const t=await b.newPage({viewport:{width:1280,height:800}});
    t.on("pageerror",e=>errs.push(String(e)));
    await t.goto(URL+"#top"); await ready(t);
    await until(t,()=>document.querySelectorAll(".toplist .toprow[data-go]").length>3); await settle(t);
    const tb=await look(t);
    const tid=await t.$eval(".toplist .toprow[data-go]",x=>x.dataset.go);
    await t.hover(`.toplist .toprow[data-go="${tid}"]`);
    const lit=await until(t,id=>{const g=document.querySelector("#chart .n.pv"); return !!g&&g.dataset.id===id;},tid);
    const ton=await look(t);
    say("hovering a Most Influential row lights that style and its lines", !!lit && ton.peek && ton.near>0 && ton.lines>0);
    say("  without selecting it", ton.sel===tb.sel && ton.hash===tb.hash);
    await t.mouse.move(200,400);
    await until(t,()=>!document.getElementById("chart").classList.contains("peek"));
    say("  and moving off ends it", !(await look(t)).peek);
    await t.close(); }

  say("no page errors", errs.length===0 || errs.join(" | "));
  await b.close();
})();
