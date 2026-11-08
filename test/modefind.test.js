// The Collections page has its own filter: type a mood, a place, a moment or a feeling and
// the list narrows to the collections that fit. These checks pin the behaviour someone
// relies on: the words they would actually type find the obvious collection first, a
// half-typed word already works, nothing found says so, and clearing puts the page back.
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
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL+"#modes"); await ready(p);
  await until(p,()=>!!document.querySelector(".ppage:not([hidden]) .mfindin"));

  const state=()=>p.evaluate(()=>{
    const pg=[...document.querySelectorAll(".ppage")].filter(x=>!x.hidden).pop();
    const shown=e=>!!e && !!e.getClientRects().length;
    return {hits:[...pg.querySelectorAll(".mfindout .mrlbl")].map(x=>x.textContent),
      none:(pg.querySelector(".mfnone")||{}).textContent||"",
      head:(pg.querySelector(".mfindout .msecttl")||{}).textContent||"",
      sections:shown(pg.querySelector(".modelist")), sort:shown(pg.querySelector(".secthead.picksort")),
      clear:shown(pg.querySelector(".mfclear")), value:pg.querySelector(".mfindin").value,
      page:pg.dataset.p};});
  const type=async v=>{ await p.fill(".ppage:not([hidden]) .mfindin",v); await settle(p); return state(); };

  const s0=await state();
  say("the filter sits on the Collections page, empty, with the sorted sections under it",
    s0.page==="modes" && s0.value==="" && s0.sections && s0.sort && !s0.clear && !s0.hits.length);
  const ph=await p.$eval(".mfindin",e=>({ph:e.placeholder, lbl:e.getAttribute("aria-label"),
    fs:parseFloat(getComputedStyle(e).fontSize), h:e.getBoundingClientRect().height}));
  say("  saying what to type, with a label for a screen reader", /mood/i.test(ph.ph) && /collection/i.test(ph.lbl||""));
  // iOS zooms the page into any field under 16px
  say("  at 16px, so a phone does not zoom in on it, and a full tap high", ph.fs>=16 && ph.h>=44);

  // the words someone would type for a feeling find the collection made for it, first
  const firsts=[["sad","Sit With It"],["angry","Burn It Off"],["relaxed","Wind Down"],
    ["nostalgic","Back Then"],["heartbreak","On Your Mind"],["first date","With Someone"],
    ["i want to feel happy","Lift the Mood"],["something to study to","Focus"],["grumpy","Burn It Off"],
    ["bummer","Sit With It"],["exhausted","Wind Down"],["smitten","On Your Mind"]];
  const miss=[];
  for(const [q,want] of firsts){ const s=await type(q); if(s.hits[0]!==want) miss.push(q+" gave "+(s.hits[0]||"nothing")); }
  say("feelings and moments find their collection first ("+firsts.length+" phrases)", miss.length?miss.join("; "):true);

  const s1=await type("sad");
  say("  and the sorted sections and their sort step aside for the matches", !s1.sections && !s1.sort && s1.clear);
  say("  under a heading saying how many fit", /^One fits$|fit$/.test(s1.head));
  const s2=await type("slee");
  say("a half-typed word already works", s2.hits[0]==="Sleep");
  const s3=await type("loud");
  say("loud and quiet lean on how loud each collection is", s3.hits.length>=3 && s3.hits.includes("Workout"));
  // a slip of the thumb still finds it, but a real word is not read as a typo of another
  say("one letter off still finds it (hapy, nostalgc)",
    (await type("hapy")).hits[0]==="Lift the Mood" && (await type("nostalgc")).hits[0]==="Back Then");
  say("  while a real word is not read as a typo of another (bummer is not summer)",
    (await type("bummer")).hits.join()==="Sit With It");
  // nothing found is not a dead end: it says so and offers collections to tap
  const s4=await type("zzqx");
  say("nothing found says so, and offers "+s4.hits.length+" collections to start from instead",
    /Nothing fits/.test(s4.head) && s4.hits.length>=4 && new Set(s4.hits).size===s4.hits.length && s4.hits.includes("Sit With It"));

  // clearing puts the page back as it was
  await type("sad");
  await p.tap(".ppage:not([hidden]) .mfclear"); await settle(p);
  const s5=await state();
  say("clear empties the field and brings the sections back", s5.value==="" && s5.sections && s5.sort && !s5.hits.length && !s5.clear);
  // Escape clears first, and stays on the page; it is a second Escape that goes back
  await type("sad");
  await p.focus(".ppage:not([hidden]) .mfindin"); await p.keyboard.press("Escape"); await settle(p);
  const s6=await state();
  say("Escape clears what is typed and stays on Collections", s6.page==="modes" && s6.value==="" && s6.sections);

  // a match opens its collection like any other row
  await type("camping");
  await p.tap(".ppage:not([hidden]) .mfindout .moderow[data-mode='camping']");
  await until(p,()=>{const pg=[...document.querySelectorAll(".ppage")].filter(x=>!x.hidden).pop(); return pg && /camping/.test(pg.dataset.p||"");});
  await settle(p);
  say("tapping a match opens that collection", await p.evaluate(()=>/camping/.test([...document.querySelectorAll(".ppage")].filter(x=>!x.hidden).pop().dataset.p||"")));

  say("no page errors", errs.length===0 || errs.join(" | "));
  await b.close();
})();
