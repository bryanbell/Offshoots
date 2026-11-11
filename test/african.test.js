// The first six classes of the African music curriculum. Each one has to be findable by
// what a person would type (including the spelling without an accent, and an alternate
// name), open straight from its Atlas address, and show a whole page with no playlist yet.
const {chromium}=require("playwright");
const skipWelcome=require("./_hello");
const {settle,until,arm}=require("./_wait");
const D=require("../src/data.js");
const URL="file://"+__dirname+"/../index.html";
const say=(k,v)=>console.log((v===true?"PASS ":"FAIL ")+k+(typeof v!=="boolean"?": "+v:""));

// id, then what someone might type for it
const SIX=[
  ["congolese_rumba",["congolese rumba","rumba congolaise","kinshasa","franco"]],
  ["rai",["raï","rai","oran","khaled"]],
  ["taarab",["taarab","twarab","zanzibar","siti binti saad"]],
  ["mbaqanga",["mbaqanga","township","mahlathini"]],
  ["mbalax",["mbalax","sabar","youssou"]],
  ["ethiojazz",["ethio-jazz","ethiopian jazz","mulatu"]],
  // the styles added to give them parents and children
  ["palmwine",["palm-wine","kwame asare"]],
  ["egyptiansong",["egyptian concert song","umm kulthum"]],
  ["marabi",["marabi"]],
  ["wahrani",["wahrani","blaoui houari"]],
  ["kwela",["kwela","pennywhistle"]],
  ["soukous",["soukous","papa wemba"]],
  ["sa_bubblegum",["township bubblegum","brenda fassie"]],
  ["ndombolo",["ndombolo","koffi"]],
];

(async()=>{
  const b=await chromium.launch({args:["--allow-file-access-from-files"]});
  skipWelcome(b);
  const errs=[];
  const byId=Object.fromEntries(D.DATA.map(r=>[r[0],r]));

  for(const [id] of SIX){
    const r=byId[id];
    say(id+" is on the map, without a playlist or course number yet",
      !!r && !D.PLAY[id] && !D.SPLAY[id] && !D.PTITLE[id] && !D.COVER[id]);
  }

  // search, on the desktop map's own field
  const p=await b.newPage({viewport:{width:1400,height:900}});
  p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL); await arm(p);
  await until(p,()=>!!document.querySelector("#chart .n")); await settle(p);
  for(const [id,qs] of SIX){
    const name=byId[id][1];
    for(const q of qs){
      await p.$eval("#q",(e,v)=>{ e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); },q);
      await until(p,()=>{const r=document.getElementById("res"); return !!r && r.querySelectorAll("button").length>0;});
      await settle(p);
      const top=await p.$$eval("#res button .rnm",e=>e.slice(0,5).map(x=>x.textContent));
      say(`"${q}" finds ${name} (${top.slice(0,3).join(", ")})`, top.includes(name));
    }
  }
  await p.close();

  // straight from the address, on a desktop and a phone
  for(const [vpName,vp] of [["desktop",{viewport:{width:1400,height:900}}],
      ["phone",{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}]]){
    for(const [id] of SIX){
      const q=await b.newPage(vp);
      q.on("pageerror",e=>errs.push(id+": "+String(e)));
      await q.goto(URL+"#"+id); await arm(q);
      const ok=await until(q,i=>!!document.querySelector(`#chart .n.cur[data-id="${i}"]`),id);
      await settle(q);
      // a style with no art of its own asks for one and swaps in its family tile when that
      // fails, so give a missing file its error event before calling anything broken
      await until(q,()=>![...document.querySelectorAll("#panelBody img")].some(x=>x.complete&&x.naturalWidth===0&&!x.closest("[hidden]")));
      const v=await q.evaluate(i=>{
        const t=document.querySelector("#panelBody .pttl .ptnm");
        const body=document.getElementById("panelBody").textContent;
        const bad=[...document.querySelectorAll("#panelBody img")].filter(x=>x.complete&&x.naturalWidth===0&&!x.closest("[hidden]"));
        const broken=bad.length, which=bad.map(x=>x.getAttribute("src")+" @"+(x.parentElement&&x.parentElement.className)).join(" , ");
        return {name:t?t.textContent:"", hash:location.hash, undef:/undefined|NaN/.test(body), broken, which};
      },id);
      say(`${vpName} #${id} opens ${byId[id][1]}`, !!ok && v.name===byId[id][1] && v.hash==="#"+id);
      say(`  with no blank or broken parts (${v.broken} broken images${v.which?": "+v.which:""})`, !v.undef && v.broken===0);
      await q.close();
    }
  }

  say("no page errors", errs.length===0 || errs.join(" | "));
  await b.close();
})();
