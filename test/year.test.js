// A year on the timeline opens that year: the biggest songs on the Hot 100, the styles
// taking off and the ones that began, with the map lit for them. The arrows step a year
// in place rather than stacking pages, and leaving the page puts the map back.
const {chromium}=require("playwright");
const skipWelcome=require("./_hello");
const {settle,until,arm}=require("./_wait");
const D=require("../src/data.js");
const URL="file://"+__dirname+"/../index.html";
const say=(k,v)=>console.log((v===true?"PASS ":"FAIL ")+k+(typeof v!=="boolean"?": "+v:""));
const ready=async q=>{ await arm(q); await until(q,()=>!!document.querySelector("#chart .n")); await settle(q); };
const page=p=>p.evaluate(()=>{ const u=[...document.querySelectorAll(".ppage")].filter(x=>!x.hidden).pop();
  const svg=document.getElementById("chart");
  return {key:u&&u.dataset.p, title:(u&&u.querySelector(".bigttl")||{}).textContent||"",
    hits:u?[...u.querySelectorAll(".hitcard")].map(r=>({song:r.querySelector(".hitttl").textContent, href:r.querySelector(".hitsong").getAttribute("href"),
      sty:(r.querySelector(".hitsty")||{dataset:{}}).dataset.go||"", styArt:!!r.querySelector(".hitsty .hitsart img, .hitsty .hitsart .pcovph")})):[],
    rail:!!(u&&u.querySelector(".hitrail")),
    rising:u?[...u.querySelectorAll(".yrpage .yrrows")].map(g=>[...g.querySelectorAll("[data-go]")].map(x=>x.dataset.go)):[],
    // its cover, or, for a style with a playlist but no cover yet, the tile with its
    // initials that replaces a cover that will not load (South African Bubblegum, Nov 15)
    rowArt:u?[...u.querySelectorAll(".yrpage .yrrows .toprow")].every(r=>!!r.querySelector(".mrart img, .mrart .pcovph")):false,
    lit:svg.classList.contains("yrlit"), yh:[...svg.querySelectorAll(".n.yh")].map(g=>g.dataset.id),
    pill:(document.querySelector("#axsel text")||{}).textContent||"", hash:location.hash}; });

(async()=>{
  const b=await chromium.launch({args:["--allow-file-access-from-files"]});
  skipWelcome(b);
  const errs=[];
  const p=await b.newPage({viewport:{width:1440,height:900}}); p.on("pageerror",e=>errs.push(String(e)));
  // Apple's catalogue stands in here: each song's cover is looked up once and kept
  const looked=[];
  await p.route("https://itunes.apple.com/search**",r=>{ const t=new (require("url").URL)(r.request().url()).searchParams.get("term"); looked.push(t);
    r.fulfill({contentType:"application/json",headers:{"access-control-allow-origin":"*"},
      body:JSON.stringify({results:[{trackName:t,artistName:t,artworkUrl100:"https://is1-ssl.mzstatic.com/t/"+looked.length+"/100x100bb.jpg",
        trackViewUrl:"https://music.apple.com/us/album/t/"+looked.length+"?i="+looked.length+"&uo=4"}]})}); });
  await p.route("https://is1-ssl.mzstatic.com/**",r=>r.fulfill({contentType:"image/jpeg",
    body:require("fs").readFileSync(__dirname+"/../assets/album-covers/"+require("fs").readdirSync(__dirname+"/../assets/album-covers").find(f=>f.endsWith(".jpg")))}));
  await p.goto(URL); await ready(p);
  say("the axis says a year can be tapped", await p.evaluate(()=>/tap a year/.test(document.querySelector("#axis .axcap").textContent)));
  // tap 1984 on the axis, a little past the 1980 label
  const at=await p.evaluate(()=>{ const t=[...document.querySelectorAll("#axis text.yl")], a=t.find(x=>x.textContent==="1980"), c=t.find(x=>x.textContent==="1990");
    const x=+a.getAttribute("x")+0.4*(+c.getAttribute("x")-+a.getAttribute("x"));
    const sc=document.getElementById("scroller"); sc.scrollLeft=Math.max(0,x-500); return x; });
  await settle(p);
  const xy=await p.evaluate(x=>{ const r=document.getElementById("axis").getBoundingClientRect(); return {x:r.left+x,y:r.bottom-8}; },at);
  await p.mouse.click(xy.x,xy.y);
  await until(p,()=>/^#year:/.test(location.hash)); await settle(p);
  const y=await page(p), want=D.HITS["1984"];
  say("tapping the axis at 1984 opens 1984 ("+y.key+")", y.key==="year:1984" && y.title==="1984" && y.hash==="#year:1984");
  say("  with the year's ten biggest songs side by side, in chart order", y.rail && y.hits.length===10 && y.hits.every((h,i)=>h.song===want[i][0]));
  await until(p,()=>document.querySelectorAll(".ppage:not([hidden]) .hitface img.hitrec").length===10);
  say("  each song's record in its circle, looked up once each", looked.length===10
    && await p.evaluate(()=>[...document.querySelectorAll(".ppage:not([hidden]) .hitface")].every(f=>!f.classList.contains("hasfb"))));
  say("  each opening in the listening service", y.hits.every(h=>/^https:\/\/|^music:/.test(h.href)));
  // the song's own page, not a search: the Music app on a Mac opens a search link by
  // launching and then doing nothing
  { const hrefs=await p.$$eval(".ppage:not([hidden]) a.hitsong",e=>e.map(x=>x.getAttribute("href")));
    say("  and once looked up, each goes to the song itself, not a search",
      hrefs.length===10 && hrefs.every(h=>/^https:\/\/music\.apple\.com\/us\/album\/t\/\d+\?i=\d+$/.test(h)) || hrefs.slice(0,2).join(" ")); }
  say("  and each tied to its style, labelled with the style's art", y.hits.filter(h=>h.sty).length===want.filter(h=>h[2]).length && y.hits.filter(h=>h.sty).every(h=>h.styArt));
  say("  the styles listed as rows with their art", y.rowArt);
  say("  plus what was taking off and what began, never a style in both",
    y.rising.length>=1 && (y.rising.length<2 || !y.rising[0].some(id=>y.rising[1].includes(id))));
  // the styles that held the most of the chart that year, wherever they began, each once
  const sec=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll(".ppage:not([hidden]) .yrsech")].map(h=>
    [h.querySelector(".msecttl").textContent,[...h.nextElementSibling.querySelectorAll("[data-go]")].map(x=>x.dataset.go)])));
  const popWant=D.POPULAR["1984"].map(p=>p[0]).filter(id=>!(sec["New This Year"]||[]).includes(id));
  const listed=Object.values(sec).slice(1).flat();
  say("Most Popular lists 1984's biggest styles in order, older ones too", JSON.stringify(sec["Most Popular"])===JSON.stringify(popWant)
    && D.DATA.some(d=>popWant.includes(d[0]) && d[2]<1975));
  say("  and no style is listed twice across the sections", new Set(listed).size===listed.length);
  const hitIds=[...new Set(want.map(h=>h[2]).filter(Boolean))];
  say("the map lights the year's charting styles ("+y.yh.length+")", y.lit && hitIds.every(id=>y.yh.includes(id)));
  say("  and marks 1984 on the axis", y.pill==="1984");
  // the arrows step in place: one page, a new year
  const depth=async()=>p.evaluate(()=>[...document.querySelectorAll(".pstack > .ppage")].length);
  const d0=await depth();
  await p.click('.ppage:not([hidden]) .yrstep[data-year="1985"]'); await settle(p);
  const y2=await page(p);
  say("the later arrow steps to 1985 in place", y2.key==="year:1985" && y2.hash==="#year:1985" && (await depth())===d0 && y2.pill==="1985");
  // a style from the list opens, and the year's lighting gives way to it
  // the rail's arrow pages it on a desktop
  await p.click('.ppage:not([hidden]) .hitpg.next'); await p.waitForTimeout(700);
  say("the chart rail pages sideways with its arrow", await p.evaluate(()=>document.querySelector('.ppage:not([hidden]) .hitrail').scrollLeft>100
    && !document.querySelector('.ppage:not([hidden]) .hitpg.prev').hidden));
  const sid=y2.hits.find(h=>h.sty).sty;
  await p.click(`.ppage:not([hidden]) .hitsty[data-go="${sid}"]`); await until(p,id=>!!document.querySelector(`#chart .n.cur[data-id="${id}"]`),sid); await settle(p);
  say("a song's style opens that style, and the year stands down", !(await page(p)).lit);
  // holding an arrow opens the decades instead of stepping a year
  { const t=await b.newPage({viewport:{width:1440,height:900}}); t.on("pageerror",e=>errs.push(String(e)));
    await t.route("https://itunes.apple.com/**",r=>r.abort());
    await t.goto(URL+"#year:1988"); await ready(t); await until(t,()=>!!document.querySelector('.pgflank .yrstep[data-year="1989"]')); await settle(t);
    const r=await t.evaluate(()=>{ const b=document.querySelector('.pgflank .yrstep[data-year="1989"]').getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}; });
    await t.mouse.move(r.x,r.y); await t.mouse.down(); await t.waitForTimeout(650); await t.mouse.up(); await t.waitForTimeout(200);
    const m=await t.evaluate(()=>({open:!!document.querySelector(".decmenu"), hash:location.hash,
      decs:[...document.querySelectorAll(".decmenu .decit")].map(x=>x.dataset.dec),
      on:(document.querySelector(".decmenu .decit.on")||{dataset:{}}).dataset.dec, focus:document.activeElement.classList.contains("decit")}));
    say("holding an arrow opens the decades, 1900s to 2020s, the year staying put",
      m.open && m.hash==="#year:1988" && m.decs[0]==="1900" && m.decs[m.decs.length-1]==="2020" && m.on==="1980" && m.focus);
    await t.click('.decmenu .decit[data-dec="1960"]'); await settle(t);
    say("  and a decade jumps to its first year, in place", await t.evaluate(()=>location.hash==="#year:1960" && !document.querySelector(".decmenu")
      && document.querySelector(".ppage:not([hidden]) .bigttl").textContent==="1960"));
    await t.click('.pgflank .yrstep[data-year="1961"]'); await settle(t);
    say("  while a tap still steps one year", await t.evaluate(()=>location.hash==="#year:1961"));
    await t.click('.pgflank .yrstep[data-year="1960"]',{button:"right"}); await t.waitForTimeout(200);
    const rc=await t.evaluate(()=>!!document.querySelector(".decmenu"));
    await t.keyboard.press("Escape"); await t.waitForTimeout(200);
    say("  a right-click opens it too, and Escape closes it", rc && await t.evaluate(()=>!document.querySelector(".decmenu") && location.hash==="#year:1961"));
    await t.close(); }
  // a sent link opens the year directly
  const q=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}); q.on("pageerror",e=>errs.push(String(e)));
  await q.goto(URL+"#year:1966"); await ready(q); await until(q,()=>!!document.querySelector('.ppage[data-p="year:1966"]')); await settle(q);
  const m=await page(q);
  say("a link to #year:1966 opens 1966 on a phone", m.key==="year:1966" && m.hits.length===10 && m.lit);
  await q.click("#panelBack"); await settle(q);
  say("  and back puts the map as it was", !(await page(q)).lit && !(await q.evaluate(()=>!!document.querySelector("#axsel text"))));
  // before the Hot 100 there is no chart, and the page says why
  await q.goto(URL+"#year:1950"); await ready(q); await until(q,()=>!!document.querySelector('.ppage[data-p="year:1950"]')); await settle(q);
  say("1950 has no chart, so no charts section, and still what was taking off",
    await q.evaluate(()=>{ const u=document.querySelector('.ppage[data-p="year:1950"]');
      return !u.querySelector(".hitrail") && ![...u.querySelectorAll(".msecttl")].some(x=>/Charts/.test(x.textContent))
        && !!u.querySelector(".yrrows"); }));
  say("the year sits between its arrows, with nothing written under it",
    await q.evaluate(()=>{ const u=document.querySelector('.ppage[data-p="year:1950"]'), f=u.querySelector(".pgflank");
      const k=f?[...f.children].map(x=>x.matches(".yrstep")?"arrow":x.matches(".bigttl")?"year":"?").join(" "):"";
      return k==="arrow year arrow" && !u.querySelector(".pglede") && !u.querySelector(".msecsub"); }));
  // Explore the Atlas has a way in that says the timeline can be tapped. Fresh, the map
  // is in the roots before any chart, so it opens this year; scrolled to the 80s, the 80s.
  { const r=await b.newPage({viewport:{width:1440,height:900}}); r.on("pageerror",e=>errs.push(String(e)));
    await r.route("https://itunes.apple.com/search**",x=>x.fulfill({contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:'{"results":[]}'}));
    await r.goto(URL); await ready(r);
    const row=await r.evaluate(()=>{ const x=document.querySelector(".sect-onmap [data-yearnow]");
      return x ? x.querySelector(".lrlbl, .lrt, span").textContent+" | "+x.textContent : ""; });
    say("Explore the Atlas has A Year in Music, saying the timeline can be tapped ("+row.replace(/\s+/g," ").trim()+")",
      /A Year in Music/.test(row) && /timeline/.test(row));
    await r.click(".sect-onmap [data-yearnow]"); await settle(r);
    const h1=await r.evaluate(()=>location.hash);
    say("  from a fresh map it opens this year ("+h1+")", /^#year:20\d\d$/.test(h1));
    await r.click("#panelBack"); await settle(r);
    // centre the map on Post-Hardcore, a 1985 style, by where its dot sits
    await r.evaluate(()=>{ const sc=document.getElementById("scroller"), s=sc.getBoundingClientRect();
      const g=document.querySelector('#chart .n[data-id="posthc"]'), d=(g.querySelector("circle,path,use")||g).getBoundingClientRect();
      sc.scrollLeft+= (d.left+d.width/2)-(s.left+s.width/2); });
    await settle(r);
    await r.click(".sect-onmap [data-yearnow]"); await settle(r);
    const h2=await r.evaluate(()=>location.hash);
    say("  and from a map scrolled to the mid-80s it opens a year there ("+h2+")", /^#year:198[3-8]$/.test(h2));
    await r.close(); }
  say("no page errors", errs.length===0 || errs.join(" | "));
  await b.close();
})();
