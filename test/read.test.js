// Go deeper: the curated reading on a style panel.
//
// This is the first content in the app that can be wrong in a way a reader notices. A
// playlist either plays or it does not; a link can resolve to nothing, or to a summary
// of what the panel already said. So the suite checks the shape of the table as much as
// the rendering: every row complete, every link https and unique, no encyclopedias, and
// a note on every one, since the note is what makes it worth a tap.
const {chromium}=require("playwright");
const URL="file://"+__dirname+"/../index.html";
const M={width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2};
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));

(async()=>{
  const b=await chromium.launch();
  let p=await b.newPage({viewport:M}); const errs=[];
  p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL); await p.waitForTimeout(900);

  const t=await p.evaluate(()=>{
    const ids=new Set(DATA.map(r=>r[0]));
    const rows=[]; for(const k in READ) for(const r of READ[k]) rows.push([k,r]);
    const urls=rows.map(([,r])=>r[0]);
    return {styles:Object.keys(READ).length, n:rows.length,
      known:Object.keys(READ).every(k=>ids.has(k)),
      wide:rows.every(([,r])=>r.length===7),
      https:urls.every(u=>u.indexOf("https://")===0),
      // one piece can legitimately cover two styles, so the rule is per style
      uniq:Object.keys(READ).every(k=>{const u=READ[k].map(r=>r[0]);
        return new Set(u).size===u.length;}),
      shared:urls.length-new Set(urls).size,
      enc:urls.filter(u=>/wikipedia|britannica|fandom|discogs|allmusic|rateyourmusic/i.test(u)).length,
      noted:rows.every(([,r])=>typeof r[6]==="string" && r[6].length>20),
      dashes:rows.filter(([,r])=>/—/.test(r[6])).length,
      years:rows.every(([,r])=>r[3]>=1900 && r[3]<=2026),
      access:[...new Set(rows.map(([,r])=>r[5]))].sort().join("|"),
      kinds:[...new Set(rows.map(([,r])=>r[4]))].length};});

  say(t.n+" reads across "+t.styles+" styles", t.n>0 && t.styles>0);
  say("every style key is a style on the map", t.known);
  say("every row carries all seven fields", t.wide);
  say("every link is https", t.https);
  say("no link appears twice on one style", t.uniq);
  say("and "+t.shared+" piece"+(t.shared===1?"":"s")+" covering two styles", t.shared<=3);
  say("no encyclopedias or databases ("+t.enc+")", t.enc===0);
  say("every one says why it is worth reading", t.noted);
  say("and says it without an em dash", t.dashes===0);
  say("years are plausible", t.years);
  say("access is blank or named ("+t.access+")",
    t.access.split("|").every(a=>["","paywall","partial","registration"].indexOf(a)>=0));
  say(t.kinds+" kinds of thing, not just articles", t.kinds>=5);
  await p.close();

  // a style with reads shows them, under a heading, above the share button
  p=await b.newPage({viewport:M}); p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL+"#house"); await p.waitForTimeout(1200);
  say("hidden in the peek",
    await p.$eval(".sect-read",e=>getComputedStyle(e).display==="none"));
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(700);
  const r=await p.evaluate(()=>{
    const s=document.querySelector(".sect-read"), a=[...s.querySelectorAll("a.rd")];
    return {shown:getComputedStyle(s).display!=="none",
      head:s.querySelector(".secttl").textContent,
      aside:s.querySelector(".sectaside").textContent,
      n:a.length,
      full:a.every(x=>x.querySelector(".rdt")&&x.querySelector(".rdm")&&x.querySelector(".rdn")),
      blank:a.every(x=>x.target==="_blank"&&/noopener/.test(x.rel)),
      tap:Math.min(...a.map(x=>Math.round(x.getBoundingClientRect().height))),
      beforeShare:!!(s.compareDocumentPosition(document.querySelector("[data-share]"))&4),
      afterAbout:!!(document.querySelector(".sect-about").compareDocumentPosition(s)&4)};});
  say("shown when the panel opens, as \""+r.head+"\"", r.shown && r.head==="Go deeper");
  say("counted in the aside ("+r.aside+")", r.aside===r.n+" reads");
  say("each row carries title, source and note", r.full);
  say("each opens in its own tab, safely", r.blank);
  say("smallest row is "+r.tap+"px", r.tap>=44);
  say("it sits under What it is", r.afterAbout);
  say("and above the share button", r.beforeShare);
  await p.close();

  // and a style with nothing says nothing, rather than showing an empty heading
  p=await b.newPage({viewport:M}); p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL+"#grunge"); await p.waitForTimeout(1200);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(700);
  say("a style with no reads shows no section", (await p.$$(".sect-read")).length===0);
  say("but still shows What it is", (await p.$$(".sect-about")).length===1);
  await p.close();

  say("no page errors", errs.filter(x=>!/Failed to load/.test(x)).join(" | ")||true);
  await b.close();
})();
