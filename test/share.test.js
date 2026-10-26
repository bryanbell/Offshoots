const {chromium}=require("playwright");
const URL="file://"+__dirname+"/../index.html";
const M={width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2};
const Dk={width:1280,height:900};
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));
async function fresh(b,vp,hash){ const p=await b.newPage({viewport:vp});
  const errs=[]; p.on("pageerror",e=>errs.push(String(e)));
  // no real share sheet in headless, and clipboard needs a stub to resolve
  await p.addInitScript(()=>{ window.__copied=[];
    Object.defineProperty(navigator,"share",{value:undefined,configurable:true});
    Object.defineProperty(navigator,"clipboard",{configurable:true,
      value:{writeText:t=>{window.__copied.push(t);return Promise.resolve();}}});
  });
  await p.goto(URL+(hash||"")); await p.waitForTimeout(800); p._errs=errs; return p; }

(async()=>{
  const b=await chromium.launch();

  // ---------- the old footer is gone ----------
  let d=await fresh(b,Dk,"#disco");
  say("footer button removed", (await d.$$("#pshare, #pfoot")).length===0);
  say("title is a button", await d.$eval(".navttl",e=>e.tagName==="BUTTON"&&e.hasAttribute("data-share")));
  say("it says what it does", await d.$eval(".navttl",e=>e.getAttribute("title")));
  say("glyph on the year line, not the name", await d.$eval(".navttl",e=>
    !!e.querySelector(".my .shg") && !e.querySelector(".mn .shg")));

  // the name must still be centred in the row
  const c=await d.$eval(".navrow",r=>{ const row=r.getBoundingClientRect();
    const nm=r.querySelector(".navttl .mn");
    const t=document.createRange(); t.selectNodeContents(nm);
    const tr=t.getBoundingClientRect();
    return Math.round(((tr.left+tr.right)/2)-((row.left+row.right)/2)); });
  say("painted name off centre by "+c+"px", Math.abs(c)<=1);

  // ---------- sharing ----------
  await d.click(".navttl"); await d.waitForTimeout(250);
  say("copied the style link", await d.evaluate(()=>window.__copied[0]||""));
  say("title confirms", await d.$eval(".navttl .mn",e=>e.textContent));
  await d.waitForTimeout(1700);
  say("name comes back", await d.$eval(".navttl .mn",e=>e.textContent));
  say("label restored too", await d.$eval(".navttl",e=>e.getAttribute("title")));

  // overview shares the map
  d=await fresh(b,Dk);
  say("overview title is a button", await d.$eval(".ovttl",e=>e.tagName==="BUTTON"));
  await d.click(".ovttl"); await d.waitForTimeout(250);
  const u=await d.evaluate(()=>window.__copied[0]||"");
  say("copied the map link (no #)", !u.includes("#") ? true : u);
  say("overview title confirms", await d.$eval(".ovttl .mn",e=>e.textContent));
  await d.waitForTimeout(1700);
  say("overview name comes back", await d.$eval(".ovttl .mn",e=>e.textContent)==="Offshoots");
  // the glyph lives at the end of the header row now, not beside the name
  say("no glyph inside the title", (await d.$$eval(".ovttl .shg",e=>e.length))===0);
  const ob=await d.evaluate(()=>{const s=document.querySelector(".ovshare").getBoundingClientRect(),
    h=document.querySelector(".ovcard .phead").getBoundingClientRect(),
    t=document.querySelector(".ovttl").getBoundingClientRect();
    return [Math.round(h.right-s.right),Math.round(s.left-t.right),Math.round(s.height),
      Math.abs(Math.round((s.top+s.height/2)-(h.top+h.height/2)))];});
  say("sits at the header's right edge ("+ob[0]+"px)", ob[0]<=1);
  say("clear of the title by "+ob[1]+"px", ob[1]>0);
  say("centred on the header, off by "+ob[3]+"px", ob[3]<=1);
  say("tap target "+ob[2]+"px", ob[2]>=34);
  await d.evaluate(()=>{window.__copied.length=0;});
  await d.click(".ovshare"); await d.waitForTimeout(250);
  const u2=await d.evaluate(()=>window.__copied[0]||"");
  say("the moved glyph still shares", !!u2 && !u2.includes("#") ? true : u2||"nothing copied");
  await d.waitForTimeout(1700);

  // ---------- mobile: minimised sheet still expands on a title tap ----------
  let p=await fresh(b,M,"#disco");
  say("sheet starts minimised", (await p.$eval("body",e=>e.classList.contains("open")))===false);
  await p.click(".navttl"); await p.waitForTimeout(500);
  say("tapping the title opens the sheet first", await p.$eval("body",e=>e.classList.contains("open")));
  say("and did not share yet", (await p.evaluate(()=>window.__copied.length))===0);
  await p.click(".navttl"); await p.waitForTimeout(300);
  say("tapping again shares", (await p.evaluate(()=>window.__copied.length))===1);
  // the ::after overlay does not show up in a bounding box, so probe what a finger would hit
  const tb=await p.$eval(".navttl",e=>{ const r=e.getBoundingClientRect(), x=Math.round(r.left+r.width/2);
    const hits=y=>{ const el=document.elementFromPoint(x,y); return !!(el&&el.closest(".navttl")); };
    let top=Math.round(r.top), bot=Math.round(r.bottom);
    while(top>0 && hits(top-1)) top--;
    while(bot<innerHeight && hits(bot+1)) bot++;
    return [bot-top, Math.round(r.height)]; });
  say("tap target "+tb[0]+"px tall (box is "+tb[1]+")", tb[0]>=44);
  // a long name must not let the tap area reach the From / Led to buttons
  await p.goto(URL+"#skapunk"); await p.waitForTimeout(100);
  await p.reload(); await p.waitForTimeout(900);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(400);
  const gap=await p.$eval(".navrow",r=>{ const t=r.querySelector(".navttl").getBoundingClientRect();
    const l=r.querySelector(".nav-from .navbtn").getBoundingClientRect();
    const g=r.querySelector(".nav-led .navbtn").getBoundingClientRect();
    return [Math.round(t.left-l.right),Math.round(g.left-t.right),r.querySelector(".navttl .mn").textContent]; });
  say("longest title clears From by "+gap[0]+"px and Led to by "+gap[1]+"px ("+gap[2]+")", gap[0]>0&&gap[1]>0);
  await p.screenshot({path:__dirname+"/screens/m-sharettl.png"});

  // the panel regains the space the footer took
  const gained=await p.$eval("#panel",e=>Math.round(e.getBoundingClientRect().height));
  say("open panel height", gained);
  say("no page errors", p._errs.length===0 ? true : p._errs.join(" | "));
  say("no desktop errors", d._errs.length===0 ? true : d._errs.join(" | "));

  await b.close();
})();
