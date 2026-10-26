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

  const c=await d.$eval(".navrow",r=>{ const row=r.getBoundingClientRect();
    const nm=r.querySelector(".navttl .mn");
    const t=document.createRange(); t.selectNodeContents(nm);
    const tr=t.getBoundingClientRect();
    return Math.round(((tr.left+tr.right)/2)-((row.left+row.right)/2)); });
  say("painted name off centre in the row by "+c+"px", Math.abs(c)<=1);

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
  // a long name must not let the tap area reach back on one side or the pair on the other
  await p.goto(URL+"#skapunk"); await p.waitForTimeout(100);
  await p.reload(); await p.waitForTimeout(900);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(400);
  const gap=await p.$eval(".navrow",r=>{ const t=r.querySelector(".navttl").getBoundingClientRect();
    const bk=r.querySelector("#panelBack").getBoundingClientRect();
    const pr=r.querySelector(".navpair").getBoundingClientRect();
    return [Math.round(t.left-bk.right),Math.round(pr.left-t.right),r.querySelector(".navttl .mn").textContent]; });
  say("longest title clears back by "+gap[0]+"px and the pair by "+gap[1]+"px ("+gap[2]+")", gap[0]>=0&&gap[1]>=0);
  // the pair is one segmented control: a single pill, split by a hairline, chevrons not arrows
  const seg=await p.$eval(".navpair",e=>{const cs=getComputedStyle(e);
    const f=e.querySelector(".nav-from .navbtn").getBoundingClientRect();
    const l=e.querySelector(".nav-led .navbtn").getBoundingClientRect();
    const divider=getComputedStyle(e.querySelector(".nav-led")).borderLeftWidth;
    return {bg:cs.backgroundColor, radius:parseFloat(cs.borderTopLeftRadius),
      touching:Math.round(l.left-f.right), divider,
      halves:[getComputedStyle(e.querySelector(".nav-from .navbtn")).backgroundColor,
              getComputedStyle(e.querySelector(".nav-led .navbtn")).backgroundColor]};});
  say("one pill carries both halves", !/rgba\(0, 0, 0, 0\)/.test(seg.bg) && seg.radius>=14);
  say("the halves are flush ("+seg.touching+"px) and share a "+seg.divider+" divider",
    seg.touching<=1 && parseFloat(seg.divider)>0);
  say("neither half paints its own ground", seg.halves.every(c=>/rgba\(0, 0, 0, 0\)/.test(c)));
  // back carries its destination, and gives it up rather than crowding the title
  const bk=await p.$eval("#panelBack",e=>{const l=e.querySelector(".bklbl");
    return {text:l.textContent, ellipsis:getComputedStyle(l).textOverflow};});
  const toMap=await p.$eval("#panelBack",e=>({cls:e.classList.contains("tomap"),
    icon:getComputedStyle(e.querySelector(".bkmap")).display!=="none",
    lbl:getComputedStyle(e.querySelector(".bklbl")).display!=="none", text:e.querySelector(".bklbl").textContent}));
  say("going back to the map shows the glyph, never the words",
    toMap.cls && toMap.icon && !toMap.lbl && toMap.text==="");
  say("and still says where it goes", (await p.$eval("#panelBack",e=>e.getAttribute("title")))==="Back to the map");
  say("the label overflows with an ellipsis when it is a style", bk.ellipsis==="ellipsis");
  // the sticky row must not paint a ground denser than the sheet it sits on: at full
  // opacity over a 74-78% sheet it drew a lighter box across the whole header
  const hdr=await p.evaluate(()=>{const n=getComputedStyle(document.querySelector(".navrow")).backgroundColor;
    return {row:n, scrolled:document.body.classList.contains("pscrolled")};});
  say("the header has no ground of its own at rest ("+hdr.row+")",
    /rgba\(0, 0, 0, 0\)|transparent/.test(hdr.row) || hdr.scrolled);
  await p.screenshot({path:__dirname+"/screens/m-sharettl.png"});

  // the panel regains the space the footer took
  const gained=await p.$eval("#panel",e=>Math.round(e.getBoundingClientRect().height));
  say("open panel height", gained);
  // ---------- About has a URL of its own ----------
  // #about is the one hash that is not a style id, so it has to survive boot and land
  // on the open section rather than on an empty overview.
  const ab=await fresh(b,M);
  await ab.click("#grab").catch(()=>{});
  await ab.waitForTimeout(600);
  await ab.click(".aboutwrap summary"); await ab.waitForTimeout(800);
  say("About carries a copy control", (await ab.$$(".aboutwrap [data-aboutcopy]")).length===1);
  await ab.click(".aboutwrap [data-aboutcopy]"); await ab.waitForTimeout(400);
  const copied=await ab.evaluate(()=>window.__copied.slice(-1)[0]||"");
  say("it copies a #about link ("+copied.split("/").pop()+")", /#about$/.test(copied));
  say("and says so", (await ab.$eval(".aboutwrap .aboutcopy .lbl",e=>e.textContent))==="Link copied");
  // the install fold sits below it and carries a link of its own, not About's
  say("install sits below About", await ab.$eval(".aboutwrap",e=>
    e.compareDocumentPosition(document.querySelector(".installwrap"))===Node.DOCUMENT_POSITION_FOLLOWING));
  await ab.click(".installwrap summary"); await ab.waitForTimeout(700);
  say("its heading", await ab.$eval(".installwrap summary span",e=>e.textContent));
  say("a section per platform", (await ab.$$eval(".installwrap .subh",e=>e.map(x=>x.textContent))).join(" / "));
  say("each one with numbered steps", (await ab.$$(".installwrap .steps")).length>=4);
  await ab.click(".installwrap [data-aboutcopy]"); await ab.waitForTimeout(400);
  const icop=await ab.evaluate(()=>window.__copied.slice(-1)[0]||"");
  say("it copies a #install link ("+icop.split("/").pop()+")", /#install$/.test(icop));
  await ab.close();

  // follow that link cold, the way someone receiving it would
  const al=await fresh(b,M,"#about");
  await al.waitForTimeout(1500);
  const land=await al.evaluate(()=>{
    const d=document.querySelector(".aboutwrap"), body=document.getElementById("panelBody");
    return {open:d.open, sheet:document.body.classList.contains("open"),
      top:Math.round(d.getBoundingClientRect().top-body.getBoundingClientRect().top),
      hash:location.hash};});
  say("the link opens the sheet", land.sheet);
  say("with About expanded", land.open);
  say("scrolled to it ("+land.top+"px from the top)", land.top<=16);
  say("and keeps the hash", land.hash==="#about");
  say("no errors following it", al._errs.length===0 ? true : al._errs.join(" | "));
  await al.close();

  // and that link lands the same way About's does
  const il=await fresh(b,M,"#install");
  await il.waitForTimeout(1500);
  const iland=await il.evaluate(()=>{
    const d=document.querySelector(".installwrap"), body=document.getElementById("panelBody");
    return {open:d.open, about:document.querySelector(".aboutwrap").open,
      sheet:document.body.classList.contains("open"),
      top:Math.round(d.getBoundingClientRect().top-body.getBoundingClientRect().top),
      hash:location.hash};});
  say("#install opens the sheet", iland.sheet);
  say("with the install fold expanded", iland.open);
  say("and About left alone", iland.about===false);
  say("scrolled to it ("+iland.top+"px from the top)", iland.top<=16);
  say("and keeps the hash", iland.hash==="#install");
  say("no errors following it", il._errs.length===0 ? true : il._errs.join(" | "));
  await il.close();

  say("no page errors", p._errs.length===0 ? true : p._errs.join(" | "));
  say("no desktop errors", d._errs.length===0 ? true : d._errs.join(" | "));

  await b.close();
})();
