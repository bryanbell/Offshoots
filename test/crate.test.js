// Your Crate: the bookmark beside a style's name keeps it, every style opened is
// remembered with when, and the crate page shows both plus how much of each family has
// been opened. All of it lives in this browser's localStorage and nowhere else. The home
// panel only grows a Your Crate section once there is something in it.
const {chromium}=require("playwright");
const skipWelcome=require("./_hello");
const {settle,until,arm}=require("./_wait");
const URL="file://"+__dirname+"/../index.html";
const say=(k,v)=>console.log((v===true?"PASS ":"FAIL ")+k+(typeof v!=="boolean"?": "+v:""));
const ready=async q=>{ await arm(q); await until(q,()=>!!document.querySelector("#chart .n")); await settle(q); };
// a fresh document each time: a hash-only goto is a same-document navigation (README)
const open=async(p,h)=>{ await p.goto("about:blank"); await p.goto(URL+(h?"#"+h:"")); await ready(p);
  // a page hash opens its page once the sheet has finished opening, not at load
  if(h==="crate"){ await until(p,()=>!!document.querySelector('.ppage[data-p="crate"] .cratelist')); await settle(p); } };

(async()=>{
  const b=await chromium.launch({args:["--allow-file-access-from-files"]});
  skipWelcome(b);
  for(const [label,vp] of [["mobile",{width:390,height:844}],["desktop",{width:1440,height:900}]]){
    const c=await b.newContext({viewport:vp}); const p=await c.newPage();
    const errs=[]; p.on("pageerror",e=>errs.push(String(e)));
    console.log("# "+label);

    await open(p,"");
    say("a first visit has no Your Crate section", !(await p.$(".sect-crate")));
    // the welcome flag is musicatlas.seen; the crate must not read or overwrite it
    say("  and the welcome flag is left alone", await p.evaluate(()=>localStorage.getItem("musicatlas.seen"))==="1");

    await open(p,"shoegaze");
    const b0=await p.$eval(".sthead .savebtn",e=>({pressed:e.getAttribute("aria-pressed"),lbl:e.getAttribute("aria-label")}));
    say("a style's name carries the bookmark, unpressed", b0.pressed==="false" && /Save Shoegaze/.test(b0.lbl));
    say("  outside the h1, so the compact bar still reads the bare name",
      await p.$eval(".sthead .pttl",e=>!e.querySelector(".savebtn") && /^Shoegaze/.test(e.textContent)));
    await p.click(".sthead .savebtn");
    say("pressing it saves the style", await p.$eval(".sthead .savebtn",e=>e.getAttribute("aria-pressed"))==="true"
      && await p.evaluate(()=>JSON.parse(localStorage.getItem("musicatlas.crate")).join())==="shoegaze");
    say("  without leaving the style", /shoegaze/.test(await p.evaluate(()=>location.hash)));

    await open(p,"dub");
    say("another style starts unsaved", await p.$eval(".sthead .savebtn",e=>e.getAttribute("aria-pressed"))==="false");
    await p.click(".sthead .savebtn");
    await open(p,"shoegaze");
    say("a saved style opens saved", await p.$eval(".sthead .savebtn",e=>e.getAttribute("aria-pressed"))==="true");
    await open(p,"bebop");
    const seen=await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem("musicatlas.visited"))).sort().join());
    say("every style opened is remembered: "+seen, seen==="bebop,dub,shoegaze");

    await open(p,"");
    const row=await p.$eval(".sect-crate",e=>e.innerText);
    say("home grows Your Crate once there is something in it", /Your Crate/.test(row) && /2 saved/.test(row) && /3 of \d+ styles explored/.test(row));
    say("  after Collections, before Explore the Atlas", await p.evaluate(()=>{
      const s=[...document.querySelectorAll("#panelBody .sect")].map(x=>[...x.classList].find(c=>/^sect-/.test(c)));
      return s.indexOf("sect-modes")<s.indexOf("sect-crate") && s.indexOf("sect-crate")<s.indexOf("sect-onmap"); }));
    await p.evaluate(()=>document.querySelector('.sect-crate [data-page="crate"]').click());
    await until(p,()=>!!document.querySelector('.ppage[data-p="crate"]')); await settle(p);
    say("the row opens the crate page at #crate", await p.evaluate(()=>location.hash)==="#crate");
    const saved=await p.$$eval(".crate-saved .toprow",e=>e.map(x=>x.dataset.go).join());
    say("saved styles, newest first: "+saved, saved==="dub,shoegaze");
    const rec=await p.$$eval(".crate-recent .listrow",e=>e.map(x=>x.dataset.go).join());
    say("recently opened, latest first: "+rec, rec==="bebop,shoegaze,dub");
    const prog=await p.$$eval(".crate-prog .cprow",e=>e.map(x=>x.dataset.fam+":"+x.querySelector(".lrct").textContent));
    const sum=prog.reduce((a,x)=>a+ +x.split(":")[1].split("/")[0],0);
    say("one progress row per family, adding up to what was opened", prog.length>10 && sum===3);

    // a saved row goes to its style
    await p.click('.crate-saved .toprow[data-go="dub"]');
    await until(p,()=>/dub/.test(location.hash)); await settle(p);
    say("a saved row opens its style", await p.$eval(".sthead .ptnm",e=>e.textContent)==="Dub");
    await p.click(".sthead .savebtn");
    say("pressing the bookmark again takes it out", await p.evaluate(()=>JSON.parse(localStorage.getItem("musicatlas.crate")).join())==="shoegaze");

    // a direct #crate link works, and clearing empties everything after a confirm
    await open(p,"crate");
    say("#crate opens the page directly", !!(await p.$('.ppage[data-p="crate"] .cratelist')));
    p.once("dialog",d=>d.dismiss());
    await p.click("[data-crateclear]");
    say("cancelling the confirm keeps it all", (await p.$$(".crate-saved .toprow")).length===1);
    p.once("dialog",d=>d.accept());
    await p.click("[data-crateclear]");
    await until(p,()=>!document.querySelector(".crate-saved .toprow"));
    say("confirming clears the crate and the history", await p.evaluate(()=>
      localStorage.getItem("musicatlas.crate")==="[]" && localStorage.getItem("musicatlas.visited")==="{}"
      && !!document.querySelector(".crate-saved .crateempty")));

    // a stale id from a style since removed is dropped, not shown as a blank
    await p.evaluate(()=>{ localStorage.setItem("musicatlas.crate",'["nosuchstyle","bebop"]');
      localStorage.setItem("musicatlas.visited",'{"nosuchstyle":1,"bebop":2}'); });
    await open(p,"crate");
    { const got=await p.$$eval(".crate-saved .toprow",e=>e.map(x=>x.dataset.go).join());
      say("ids no longer on the map are skipped: "+got, got==="bebop"); }
    say("no page errors", errs.length===0 ? true : errs.join(" | "));
    await c.close();
  }
  await b.close();
})();
