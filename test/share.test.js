const {chromium}=require("playwright");
const skipWelcome=require("./_hello");
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
  const b=await chromium.launch(); skipWelcome(b);

  // ---------- the old footer is gone ----------
  let d=await fresh(b,Dk,"#disco");
  say("footer button removed", (await d.$$("#pshare, #pfoot")).length===0);
  // the title is the lineage control: one tap, both directions, parents left and children
  // right. Share is its own button at the foot of the card.
  say("title opens the lineage", await d.$eval(".navttl",
    e=>e.tagName==="BUTTON" && e.dataset.menu==="lineage" && !e.hasAttribute("data-share")));
  say("with no share glyph on it", await d.$eval(".navttl",e=>!e.querySelector(".shg")));
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
  say("  below the tally by "+(-sb.beforeTally)+"px", sb.beforeTally<=0);
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
    sh=document.querySelector("#panelBody .shbtn"), row=card.querySelector(".navrow");
    if(!sh) return null;
    const sr=sh.getBoundingClientRect(), body=document.getElementById("panelBody");
    return {label:sh.querySelector(".shlbl").textContent, width:Math.round(sr.width),
      room:body.clientWidth, pos:getComputedStyle(sh).position,
      round:document.querySelectorAll("#panelBody .shbtn.round").length,
      inHeader:row.querySelectorAll("[data-share]").length,
      last:sh.parentNode.lastElementChild===sh,
      only:document.querySelectorAll("#panelBody [data-share]").length}; });
  say("the root shares the same way a style does ("+rb.label+")", rb.label==="Share this app");
  // on the overview it is a row in the list that ends the panel, not a button of its own
  say("  full width, "+rb.width+" of "+rb.room, rb.width>=rb.room-48);
  say("  the last row of the colophon list", rb.last && rb.pos!=="absolute" && rb.pos!=="fixed");
  say("  nothing round left in the header", rb.round===0 && rb.inHeader===0);
  say("  and it is the only share control here", rb.only===1);
  await d.$eval("#panelBody .shbtn",e=>e.scrollIntoView({block:"center"})); await d.waitForTimeout(250);
  await d.click("#panelBody .shbtn"); await d.waitForTimeout(250);
  const u=await d.evaluate(()=>window.__copied[0]||"");
  say("copied the map link (no #)", !u.includes("#") ? true : u);
  say("  and says so in its label",
    await d.$eval("#panelBody .shbtn .shlbl",e=>e.textContent)==="Link copied");
  await d.waitForTimeout(1700);
  say("  then goes back to the label",
    await d.$eval("#panelBody .shbtn .shlbl",e=>e.textContent)==="Share this app");
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
  // the title is the lineage control now, so it opens its menu rather than the sheet.
  // That is the point: the lineage is reachable from the peek, where it used to be when
  // it was a pill in the header, and is not once it is a section in the card.
  say("tapping the title opens the lineage from the peek",
    (await p.$$(".navmenu:not([hidden]) .lcol")).length===2);
  say("  without opening the sheet", (await p.$eval("body",e=>e.classList.contains("open")))===false);
  say("and shares nothing by itself", (await p.evaluate(()=>window.__copied.length))===0);
  await p.keyboard.press("Escape"); await p.waitForTimeout(250);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(600);
  await p.$eval("#panelBody .shbtn",e=>e.scrollIntoView({block:"center"})); await p.waitForTimeout(300);
  await p.click("#panelBody .shbtn"); await p.waitForTimeout(300);
  say("the control at the foot does the sharing", (await p.evaluate(()=>window.__copied.length))===1);
  const tb=await p.$eval("#panelBody .shbtn",e=>[Math.round(e.getBoundingClientRect().height)]);
  say("tap target "+tb[0]+"px tall", tb[0]>=44);
  // a long name must not let the tap area reach back on one side or the pair on the other
  await p.goto(URL+"#skapunk"); await p.waitForTimeout(100);
  await p.reload(); await p.waitForTimeout(900);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(400);
  // the title button spans the row now, under two controls pinned to its corners, so what
  // has to clear them is the painted name rather than the button's box
  const gap=await p.$eval(".navrow",r=>{ const mn=r.querySelector(".navttl .mn");
    const rg=document.createRange(); rg.selectNodeContents(mn);
    const t=rg.getBoundingClientRect();
    const bk=r.querySelector("#panelBack").getBoundingClientRect();
    const x=r.querySelector(".pmin").getBoundingClientRect();
    return [Math.round(t.left-bk.right),Math.round(x.left-t.right),mn.textContent]; });
  say("longest title clears back by "+gap[0]+"px and the X by "+gap[1]+"px ("+gap[2]+")", gap[0]>=0&&gap[1]>=0);
  // one menu, two columns. It was a segmented pill, then a pair of rows in the card; both
  // spent a line of the panel on something the name can carry.
  say("no lineage section is left in the card", (await p.$$(".sect-lineage")).length===0);
  await p.click(".navttl"); await p.waitForTimeout(400);
  const seg=await p.evaluate(()=>{
    const m=[...document.querySelectorAll(".navmenu")].find(x=>!x.hidden);
    if(!m) return null;
    const cols=[...m.querySelectorAll(".lcol")];
    const mb=m.getBoundingClientRect(), card=document.querySelector(".pcard").getBoundingClientRect();
    const cb=cols.map(c=>c.getBoundingClientRect());
    return {heads:cols.map(c=>c.querySelector(".navhd").textContent.replace(/\s+/g," ").trim()),
      counts:cols.map(c=>c.querySelectorAll("[data-go]").length),
      sideBySide:cb.length===2 && Math.abs(cb[0].top-cb[1].top)<2 && cb[1].left>=cb[0].right-1,
      halves:cb.map(r=>Math.round(r.width)), menuW:Math.round(mb.width),
      cardW:Math.round(card.width), dx:Math.round(mb.left-card.left),
      divider:getComputedStyle(cols[1]).borderLeftWidth};});
  say("the title opens both lists at once ("+seg.heads.join(" | ")+")",
    /^Came from/.test(seg.heads[0]) && /^Led to/.test(seg.heads[1]));
  say("  side by side, parents left and children right", seg.sideBySide);
  say("  split by a "+seg.divider+" rule", parseFloat(seg.divider)>0);
  say("  the menu is the card's width ("+seg.menuW+" vs "+seg.cardW+"), aligned to it",
    seg.menuW===seg.cardW && Math.abs(seg.dx)<=1);
  // a title with a tinted slab under it reads as a text field, so it has no ground of its
  // own; the chevron beside the year is what says it opens
  const look=await p.evaluate(()=>{ const t=document.querySelector(".navttl");
    return {bg:getComputedStyle(t).backgroundColor, exp:t.getAttribute("aria-expanded"),
      turned:getComputedStyle(t.querySelector(".lrcv")).transform}; });
  say("the title carries no ground, even open ("+look.bg+")", /rgba\(0, 0, 0, 0\)|transparent/.test(look.bg));
  say("  and its chevron is turned over while it is", look.exp==="true" && /-1, 0, 0, -1/.test(look.turned));
  // the header stays put while the card scrolls under it, so the name, back and the X are
  // reachable at any scroll position. .pcard used to close right after the header, which
  // left the sticky box no room to travel.
  const stuck=await p.evaluate(async()=>{ const pb=document.getElementById("panelBody");
    const row=document.querySelector(".navrow");
    const at=()=>Math.round(row.getBoundingClientRect().top-pb.getBoundingClientRect().top);
    const before=at(); pb.scrollTop=2000; await new Promise(z=>setTimeout(z,250));
    const hit=sel=>{ const e=document.querySelector(sel); if(!e) return false;
      const r=e.getBoundingClientRect();
      const t=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
      return !!(t && (t===e || e.contains(t) || t.closest(sel))); };
    return {before, after:at(), scrolled:pb.scrollTop, inCard:!!row.closest(".pcard"),
      back:hit("#panelBack"), x:hit(".pmin"), title:hit(".navttl")}; });
  say("the header holds at the top through a "+stuck.scrolled+"px scroll",
    stuck.scrolled>0 && stuck.before===0 && stuck.after===0);
  say("  with the title, back and the X all still hittable",
    stuck.title && stuck.back && stuck.x);
  say("  because the card wraps the content it sticks within", stuck.inCard);
  // and it is opaque while stuck: the panel is already translucent over the map, so a
  // translucent header on top of it let the card's own content read through the title
  const band=await p.evaluate(()=>{ const r=document.querySelector(".navrow");
    const cs=getComputedStyle(r);
    const n=(cs.backgroundColor.match(/[\d.]+/g)||[]);
    return {bg:cs.backgroundColor, alpha:n.length>3?+n[3]:1,
      scrolled:document.body.classList.contains("pscrolled")}; });
  say("  and opaque under the title while it is ("+band.bg+")", band.scrolled && band.alpha===1);
  await p.click(".navttl"); await p.waitForTimeout(400);
  const back2=await p.evaluate(()=>{ const t=document.querySelector(".navttl");
    return {exp:t.getAttribute("aria-expanded"), turned:getComputedStyle(t.querySelector(".lrcv")).transform,
      shut:!document.querySelector(".navmenu:not([hidden])")}; });
  // closeNav only reset .navbtn, so the title's chevron stayed upside down after closing
  say("closing turns the chevron back ("+back2.turned+")",
    back2.shut && back2.exp==="false" && back2.turned==="none");
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
  await ab.click('[data-page="about"]'); await ab.waitForTimeout(700);
  say("About carries a copy control", (await ab.$$('.ppage[data-p="about"] [data-aboutcopy]')).length===1);
  await ab.click('.ppage[data-p="about"] [data-aboutcopy]'); await ab.waitForTimeout(400);
  const copied=await ab.evaluate(()=>window.__copied.slice(-1)[0]||"");
  say("it copies a #about link ("+copied.split("/").pop()+")", /#about$/.test(copied));
  say("and says so", (await ab.$eval('.ppage[data-p="about"] .aboutcopy .lbl',e=>e.textContent))==="Link copied");
  // the install fold sits below it and carries a link of its own, not About's
  // back out of About and into install, which is the row under it
  await ab.click("#panelBack"); await ab.waitForTimeout(500);
  say("install sits below About", await ab.$eval('[data-page="about"]',e=>
    e.compareDocumentPosition(document.querySelector('[data-page="install"]'))===Node.DOCUMENT_POSITION_FOLLOWING));
  await ab.click('[data-page="install"]'); await ab.waitForTimeout(700);
  say("its heading", await ab.$eval('.ppage[data-p="install"] .bigttl .mn',e=>e.textContent));
  say("a section per platform", (await ab.$$eval('.ppage[data-p="install"] .subh',e=>e.map(x=>x.textContent))).join(" / "));
  say("each one with numbered steps", (await ab.$$('.ppage[data-p="install"] .steps')).length>=4);
  await ab.click('.ppage[data-p="install"] [data-aboutcopy]'); await ab.waitForTimeout(400);
  const icop=await ab.evaluate(()=>window.__copied.slice(-1)[0]||"");
  say("it copies a #install link ("+icop.split("/").pop()+")", /#install$/.test(icop));
  await ab.close();

  // follow that link cold, the way someone receiving it would
  const al=await fresh(b,M,"#about");
  await al.waitForTimeout(1500);
  const land=await al.evaluate(()=>{
    const d=document.querySelector('.ppage[data-p="about"]'), body=document.getElementById("panelBody");
    return {page:!!d&&!d.hidden, sheet:document.body.classList.contains("open"),
      scroll:body.scrollTop,
      back:!document.getElementById("panelBack").hidden, hash:location.hash};});
  say("the link opens the sheet", land.sheet);
  say("on the About page", land.page);
  say("scrolled to the top of it", land.scroll===0);
  say("with a way back", land.back);
  say("and keeps the hash", land.hash==="#about");
  say("no errors following it", al._errs.length===0 ? true : al._errs.join(" | "));
  await al.close();

  // and that link lands the same way About's does
  const il=await fresh(b,M,"#install");
  await il.waitForTimeout(1500);
  const iland=await il.evaluate(()=>{
    const d=document.querySelector('.ppage[data-p="install"]'), body=document.getElementById("panelBody");
    return {page:!!d&&!d.hidden, about:!!document.querySelector('.ppage[data-p="about"]'),
      sheet:document.body.classList.contains("open"),
      scroll:body.scrollTop,
      hash:location.hash};});
  say("#install opens the sheet", iland.sheet);
  say("on the install page", iland.page);
  say("and About was not pushed with it", iland.about===false);
  say("scrolled to the top of it", iland.scroll===0);
  say("and keeps the hash", iland.hash==="#install");
  say("no errors following it", il._errs.length===0 ? true : il._errs.join(" | "));
  await il.close();

  // the opaque band has to reach the card's edges: inset, it left a channel down each
  // side that the content scrolling underneath showed through
  { const w=await b.newPage({viewport:M});
    await w.goto(URL+"#neoswing"); await w.waitForTimeout(1200);
    await w.click("#grab").catch(()=>{}); await w.waitForTimeout(700);
    await w.evaluate(()=>{document.getElementById("panelBody").scrollTop=260;});
    await w.waitForTimeout(400);
    const r=await w.evaluate(()=>{
      const row=document.querySelector(".pcard .navrow"), body=document.getElementById("panelBody");
      const rb=row.getBoundingClientRect(), bb=body.getBoundingClientRect();
      const btn=document.querySelector(".pcard .navleft")||document.querySelector(".pcard #panelBack");
      const x=document.querySelector(".pcard .pmin");
      return {on:document.body.classList.contains("pscrolled"),
        dl:Math.round(rb.left-bb.left), dr:Math.round(bb.right-rb.right),
        btnL:btn?Math.round(btn.getBoundingClientRect().left-bb.left):-1,
        xR:x?Math.round(bb.right-x.getBoundingClientRect().right):-1}; });
    say("the header is stuck after scrolling", r.on);
    say("and its band runs to both edges ("+r.dl+"/"+r.dr+")", r.dl===0 && r.dr===0);
    // the bleed is cancelled on the two absolutely placed controls, which must not move
    say("with the back cluster still inset "+r.btnL+"px", r.btnL===16);
    say("and the close still inset "+r.xR+"px", r.xR===16);
    await w.close(); }

  // the prose and the tally read as a named section like Listen on above them,
  // and like the rest of the body they stay out of the peek
  { const w=await b.newPage({viewport:M});
    await w.goto(URL+"#blackmetal"); await w.waitForTimeout(1200);
    say("the prose is hidden in the peek",
      await w.$eval(".sect-about",e=>getComputedStyle(e).display==="none"));
    await w.click("#grab").catch(()=>{}); await w.waitForTimeout(700);
    const r=await w.evaluate(()=>{ const s=document.querySelector(".sect-about");
      return {shown:getComputedStyle(s).display!=="none",
        head:(s.querySelector(".secttl")||{}).textContent||"",
        prose:!!s.querySelector(".wikiline"), tally:!!s.querySelector(".tally"),
        beforeShare:!!(s.compareDocumentPosition(document.querySelector("[data-share]"))&4)}; });
    say("and shown when the panel is open", r.shown);
    say("under the heading \""+r.head+"\"", r.head==="What it is");
    say("carrying the description and the tally", r.prose && r.tally);
    say("and still above the share button", r.beforeShare);
    await w.close(); }

  say("no page errors", p._errs.length===0 ? true : p._errs.join(" | "));
  say("no desktop errors", d._errs.length===0 ? true : d._errs.join(" | "));

  await b.close();
})();
