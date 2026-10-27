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
  // the title is a heading again; share is its own button at the foot of the card
  say("title is a heading", await d.$eval(".navttl",e=>e.tagName==="H2"&&!e.hasAttribute("data-share")));
  say("with no glyph on it", await d.$eval(".navttl",e=>!e.querySelector(".shg")));
  const sb=await d.evaluate(()=>{ const w=document.querySelector(".shbtn.wide");
    if(!w) return null;
    const r=w.getBoundingClientRect(), body=document.getElementById("panelBody");
    const tally=document.querySelector(".tally").getBoundingClientRect();
    return {label:w.querySelector(".shlbl").textContent, pos:getComputedStyle(w).position,
      width:Math.round(r.width), room:Math.round(body.clientWidth),
      tall:Math.round(r.height), beforeTally:Math.round(tally.top-r.bottom),
      only:document.querySelectorAll("#panel [data-share]").length}; });
  say("share is a labelled button at the foot ("+(sb&&sb.label)+")", !!sb && /Share/.test(sb.label));
  say("  running the full width, "+sb.width+" of "+sb.room, sb.width>=sb.room-48);
  say("  in the flow, not pinned over the text ("+sb.pos+")", sb.pos==="static");
  say("  above the tally by "+sb.beforeTally+"px", sb.beforeTally>=0);
  say("  tap target "+sb.tall+"px", sb.tall>=34);
  say("  and it is the only share control on the panel", sb.only===1);

  const c=await d.$eval(".navrow",r=>{ const row=r.getBoundingClientRect();
    const nm=r.querySelector(".navttl .mn");
    const t=document.createRange(); t.selectNodeContents(nm);
    const tr=t.getBoundingClientRect();
    return Math.round(((tr.left+tr.right)/2)-((row.left+row.right)/2)); });
  say("painted name off centre in the row by "+c+"px", Math.abs(c)<=1);

  // ---------- sharing ----------
  await d.click(".shbtn.wide"); await d.waitForTimeout(250);
  say("copied the style link", await d.evaluate(()=>window.__copied[0]||""));
  say("the button confirms", await d.$eval(".shbtn .shlbl",e=>e.textContent));
  say("  and the title is left alone", await d.$eval(".navttl .mn",e=>e.textContent)==="Disco");
  await d.waitForTimeout(1700);
  say("label comes back", await d.$eval(".shbtn .shlbl",e=>e.textContent));

  // overview shares the map
  d=await fresh(b,Dk);
  // the root has no body text to hang a wide button under, so its share is a round one
  // in the left track, where back sits on every other panel
  say("overview title is a heading below the row", await d.$eval(".ovcard .bigttl",e=>e.tagName==="H1"));
  const rb=await d.evaluate(()=>{ const card=document.querySelector(".ovcard"),
    sh=document.querySelector("#panelBody .shbtn.wide"), row=card.querySelector(".navrow");
    if(!sh) return null;
    const sr=sh.getBoundingClientRect(), body=document.getElementById("panelBody");
    return {label:sh.querySelector(".shlbl").textContent, width:Math.round(sr.width),
      room:body.clientWidth, pos:getComputedStyle(sh).position,
      round:document.querySelectorAll("#panelBody .shbtn.round").length,
      inHeader:row.querySelectorAll("[data-share]").length,
      last:sh.parentNode.lastElementChild===sh,
      only:document.querySelectorAll("#panelBody [data-share]").length}; });
  say("the root shares the same way a style does ("+rb.label+")", rb.label==="Share this app");
  say("  full width, "+rb.width+" of "+rb.room, rb.width>=rb.room-48);
  say("  in the flow at the foot of the card", rb.pos==="static" && rb.last);
  say("  nothing round left in the header", rb.round===0 && rb.inHeader===0);
  say("  and it is the only share control here", rb.only===1);
  await d.$eval("#panelBody .shbtn.wide",e=>e.scrollIntoView({block:"center"})); await d.waitForTimeout(250);
  await d.click("#panelBody .shbtn.wide"); await d.waitForTimeout(250);
  const u=await d.evaluate(()=>window.__copied[0]||"");
  say("copied the map link (no #)", !u.includes("#") ? true : u);
  say("  and says so in its label",
    await d.$eval("#panelBody .shbtn.wide .shlbl",e=>e.textContent)==="Link copied");
  await d.waitForTimeout(1700);
  say("  then goes back to the label",
    await d.$eval("#panelBody .shbtn.wide .shlbl",e=>e.textContent)==="Share this app");
  // the title on the map is a heading, not a second way to do the same thing
  const mh=await d.evaluate(()=>{ const h=document.querySelector("#maphead .mh");
    return {tag:h.tagName, share:document.querySelectorAll("#maphead [data-share]").length,
      buttons:document.querySelectorAll("#maphead button, #maphead a").length}; });
  say("the map title is a heading ("+mh.tag+")", mh.tag==="H1");
  say("  with nothing to click on the band", mh.share===0 && mh.buttons===0);
  say("  so the panel is the only place to share from", (await d.$$("[data-share]")).length===1);

  // ---------- mobile: the minimised sheet still expands on a title tap ----------
  // the title no longer shares, so tapping it has one job: open the sheet. The share
  // button is at the foot of the card, which is only reachable once it is open.
  let p=await fresh(b,M,"#disco");
  say("sheet starts minimised", (await p.$eval("body",e=>e.classList.contains("open")))===false);
  // the peek is a look at the playlist, not a place to act from. The button was showing
  // in it, under the cover art and behind the expand chevron.
  say("  and the share button is not in the peek",
    (await p.$eval(".shbtn.wide",e=>getComputedStyle(e).display))==="none");
  await p.click(".navttl"); await p.waitForTimeout(500);
  say("tapping the title opens the sheet", await p.$eval("body",e=>e.classList.contains("open")));
  say("  which is what brings the button in",
    (await p.$eval(".shbtn.wide",e=>getComputedStyle(e).display))!=="none");
  say("and shares nothing by itself", (await p.evaluate(()=>window.__copied.length))===0);
  await p.$eval(".shbtn.wide",e=>e.scrollIntoView({block:"center"})); await p.waitForTimeout(300);
  await p.click(".shbtn.wide"); await p.waitForTimeout(300);
  say("the button at the foot does the sharing", (await p.evaluate(()=>window.__copied.length))===1);
  const tb=await p.$eval(".shbtn.wide",e=>[Math.round(e.getBoundingClientRect().height)]);
  say("tap target "+tb[0]+"px tall", tb[0]>=44);
  // a long name must not let the tap area reach back on one side or the pair on the other
  await p.goto(URL+"#skapunk"); await p.waitForTimeout(100);
  await p.reload(); await p.waitForTimeout(900);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(400);
  const gap=await p.$eval(".navrow",r=>{ const t=r.querySelector(".navttl").getBoundingClientRect();
    const bk=r.querySelector("#panelBack").getBoundingClientRect();
    const x=r.querySelector(".pmin").getBoundingClientRect();
    return [Math.round(t.left-bk.right),Math.round(x.left-t.right),r.querySelector(".navttl .mn").textContent]; });
  say("longest title clears back by "+gap[0]+"px and the X by "+gap[1]+"px ("+gap[2]+")", gap[0]>=0&&gap[1]>=0);
  // From and Led to left the header for the body, as the same grouped list the panel uses
  // for its other collections: a single card, a row each, hairline between them
  const seg=await p.$eval(".sect-lineage .listgrp",e=>{const cs=getComputedStyle(e);
    const rows=[...e.querySelectorAll(".listrow")];
    const gb=e.getBoundingClientRect();
    return {bg:cs.backgroundColor, radius:parseFloat(cs.borderTopLeftRadius),
      labels:rows.map(r=>r.querySelector(".lrlbl").textContent),
      full:rows.every(r=>Math.round(r.getBoundingClientRect().width)===Math.round(gb.width)),
      inHeader:!!e.closest(".navrow"),
      halves:rows.map(r=>getComputedStyle(r).backgroundColor)};});
  say("one card carries both directions ("+seg.labels.join(" / ")+")",
    seg.labels.join("/")==="Came from/Led to" && seg.radius>=10);
  say("each row spans it, and neither paints its own ground",
    seg.full && seg.halves.every(c=>/rgba\(0, 0, 0, 0\)/.test(c)));
  say("and it is in the body, not the header", seg.inHeader===false);
  // directly under the title: where a style sits in the map is the first thing the panel
  // says about it, ahead of what you can play
  const first=await p.$$eval("#panelBody .sect",e=>e.map(x=>x.className.match(/sect-[\w]+/)[0]));
  say("lineage leads the card ("+first.join(" / ")+")", first[0]==="sect-lineage");
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
