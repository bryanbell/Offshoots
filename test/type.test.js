// Type and tap targets on the panels.
//
// The panel used to carry twenty different font sizes, most of them under 13px, plus
// three all-caps labels with letter-spacing, and controls as short as 28px. None of
// that is how iOS sets text. This suite pins the result so it cannot drift back:
//
//   - nothing readable is under 13px (SF's Footnote, the smallest step Apple ships)
//   - no all-caps tracked micro-labels
//   - anything you tap clears 44pt
//
// It measures what is painted rather than reading the stylesheet, so a rule that loses
// the cascade still fails here. That matters: a higher-specificity `all:unset` silently
// cancelled the panel title's height once.
//
// It walks three surfaces, not one. An earlier version only walked the root panel, and
// the all-caps check passed against the very CSS it was written to catch, because every
// all-caps label lived in the style panel and the menus.
const {chromium}=require("playwright");
const URL="file://"+__dirname+"/../index.html";
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));

// Touch and pointer are different tiers, so the floors differ. A phone and an iPad
// hold iOS's 17pt Body and 44pt targets; a desktop sidebar steps down one notch the
// way macOS does. Both are asserted, so neither tier can quietly drift.
const TIERS={touch:{minType:13,tap:44}, pointer:{minType:12,tap:36}};

// The map is its own typographic problem: 460 labels competing for one canvas. Label
// size used to be derived from the zoom scale, which put 139 of them under 9px and the
// smallest at 7.9px. They sit in a legible band now and do not move with zoom, so the
// floor is the thing worth pinning. Measured on what is painted, across the whole map
// rather than one sample, because the sizes vary per node.
const MAP_FLOOR={touch:11, pointer:11.5};
const readMap=(p)=>p.evaluate(()=>{
  const px=e=>parseFloat(getComputedStyle(e).fontSize);
  const labels=[...document.querySelectorAll("#chart .n text:not(.halo)")].map(px).sort((a,b)=>a-b);
  const one=s=>{const e=document.querySelector(s); return e?+px(e).toFixed(1):null;};
  return {n:labels.length, min:+labels[0].toFixed(1), max:+labels[labels.length-1].toFixed(1),
    axis:one("#axis text"), lane:one(".lane .vt"), count:one(".lane .cnt")};
});
// decorative glyphs and counters are not reading copy, so they are exempt by name
const EXEMPT="\\b(cnt|vt|ck|dot|sw|mi|cv|shg|upchev|svcchev|pkgo|plgo)\\b";

const readType=(p,scope)=>p.evaluate(([ex,sc])=>{
  const re=new RegExp(ex), out=[];
  document.querySelectorAll(sc+" *").forEach(e=>{
    if(e.children.length || !e.textContent.trim()) return;
    const cs=getComputedStyle(e);
    if(cs.display==="none"||cs.visibility==="hidden"||!e.getClientRects().length) return;
    const cls=(e.className||e.tagName).toString();
    if(re.test(cls)) return;
    out.push({cls:cls.split(" ")[0]||e.tagName, size:parseFloat(cs.fontSize),
      tt:cs.textTransform, txt:e.textContent.trim().slice(0,18)});
  });
  return out;
},[EXEMPT,scope]);

const readTaps=(p,scope,tap)=>p.evaluate(([sc,t])=>{
  const out=[];
  document.querySelectorAll(sc+" button, "+sc+" a, "+sc+" summary").forEach(e=>{
    const r=e.getBoundingClientRect(), d=getComputedStyle(e).display;
    if(!r.height || d==="none") return;
    // a link set inline in running prose flows with the text; the 44pt floor is for
    // discrete controls, not for a phrase inside a paragraph
    if(e.tagName==="A" && d==="inline") return;
    const after=getComputedStyle(e,"::after");       // a control may expand its own hit area
    let h=r.height;
    if(after.content!=="none" && after.position==="absolute"){
      const inset=parseFloat(after.top);
      if(!isNaN(inset) && inset<0) h += -inset*2;
    }
    if(h+0.5 < t) out.push({cls:(e.className||e.tagName).toString().split(" ")[0]||e.tagName, h:Math.round(h)});
  });
  const seen=new Map(); out.forEach(o=>{ if(!seen.has(o.cls)) seen.set(o.cls,o); });
  return [...seen.values()];
},[scope,tap]);


// A full-bleed rule across the panel is the thing being replaced: grouping is done with
// a shaded block and, inside a list, a hairline inset to where the text starts.
const readRules=(p)=>p.evaluate(()=>{
  const body=document.getElementById("panelBody");
  const w=body.getBoundingClientRect().width, out=[];
  body.querySelectorAll("*").forEach(e=>{
    if(e.closest(".navrow")) return;              // the sticky header's hairline is a scroll cue
    const cs=getComputedStyle(e), r=e.getBoundingClientRect();
    if(!r.width) return;
    const t=parseFloat(cs.borderTopWidth)||0, b=parseFloat(cs.borderBottomWidth)||0;
    if((t>0||b>0) && r.width >= w*0.9)
      out.push({cls:(e.className||e.tagName).toString().split(" ")[0]||e.tagName,
                px:Math.max(t,b), width:Math.round(r.width)});
  });
  return out;
});

(async()=>{
  const b=await chromium.launch();
  let bad=0;
  let TIER=TIERS.touch;
  const check=(label,type,taps)=>{
    const small=type.filter(t=>t.size<TIER.minType);
    say(label+": "+type.length+" strings, none under "+TIER.minType+"px"
      +(small.length?" — "+[...new Set(small.map(t=>t.cls+" "+t.size+"px"))].join(", "):""), small.length===0);
    if(small.length) bad++;
    const caps=type.filter(t=>t.tt==="uppercase");
    say(label+": no all-caps labels"
      +(caps.length?" — "+[...new Set(caps.map(t=>t.cls+' "'+t.txt+'"'))].join(", "):""), caps.length===0);
    if(caps.length) bad++;
    if(taps){
      say(label+": every control clears "+TIER.tap+"pt"
        +(taps.length?" — "+taps.map(t=>t.cls+" "+t.h+"px").join(", "):""), taps.length===0);
      if(taps.length) bad++;
    }
  };

  for(const [name,vp,mob,open,tierName] of [["phone",{width:390,height:844},true,true,"touch"],
                                   ["tablet",{width:834,height:1112},true,true,"touch"],
                                   ["desktop",{width:1440,height:900},false,false,"pointer"]]){
    TIER=TIERS[tierName];
    const ctx=await b.newContext({viewport:vp,isMobile:mob,hasTouch:mob,deviceScaleFactor:2});

    // 1. the overview
    let p=await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(900);
    if(open){ await p.click("#grab").catch(()=>{}); await p.waitForTimeout(700); }
    check(name+" overview", await readType(p,"#panelBody"), await readTaps(p,"#panelBody",TIER.tap));

    const rules=await readRules(p);
    say(name+": no full-bleed rules across the panel"
      +(rules.length?" — "+rules.map(r=>r.cls+" "+r.px+"px").join(", "):""), rules.length===0);
    if(rules.length) bad++;

    // open a list and confirm it is one grouped block with inset separators
    await p.click('[data-mk="coffee"]').catch(()=>{});
    await p.waitForTimeout(700);
    const grp=await p.evaluate(()=>{
      const ps=document.querySelector(".picks"); if(!ps) return null;
      const rows=[...ps.children];
      const sep=rows.length>1?getComputedStyle(rows[1],"::after"):null;
      return {rows:rows.length, groupBg:getComputedStyle(ps).backgroundColor,
        radius:parseFloat(getComputedStyle(ps).borderTopLeftRadius),
        firstHasSep:rows.length?getComputedStyle(rows[0],"::after").content!=="none"
          && parseFloat(getComputedStyle(rows[0],"::after").height)>0:false,
        sepLeft:sep?parseFloat(sep.left):-1, sepH:sep?parseFloat(sep.height):-1};
    });
    if(!grp){ say(name+": the pick list opened", false); bad++; }
    else {
      const ok = grp.rows===12 && grp.radius>=10
        && !/rgba\(0, 0, 0, 0\)/.test(grp.groupBg)
        && grp.sepLeft>=24 && grp.sepH>0 && grp.sepH<=1 && !grp.firstHasSep;
      say(name+": "+grp.rows+" rows in one block, radius "+grp.radius
        +", hairline "+grp.sepH+"px inset "+grp.sepLeft+"px, none above the first row", ok);
      if(!ok) bad++;
    }

    // the map itself
    const mp=await readMap(p);
    const floor=MAP_FLOOR[tierName];
    say(name+" map: all "+mp.n+" labels at or above "+floor+"px ("+mp.min+" to "+mp.max+")",
        mp.n>400 && mp.min>=floor-0.01);
    say(name+" map: the labels still have a range ("+mp.min+" to "+mp.max+")", mp.max-mp.min>=2);
    const chrome=[["axis",mp.axis],["lane name",mp.lane],["lane count",mp.count]].filter(([,v])=>v!==null);
    const smallChrome=chrome.filter(([,v])=>v<11);
    say(name+" map: axis, lane and count all at or above 11px ("
        +chrome.map(([k,v])=>k+" "+v).join(", ")+")", smallChrome.length===0);
    if(!(mp.n>400 && mp.min>=floor-0.01) || mp.max-mp.min<2 || smallChrome.length) bad++;

    // 2. a menu, which is where the uppercase section header lived
    await p.click('[data-menu="fams"]').catch(()=>{});
    await p.waitForTimeout(400);
    const menu=await p.$(".navmenu:not([hidden])");
    if(menu){
      check(name+" menu", await readType(p,".navmenu:not([hidden])"),
                          await readTaps(p,".navmenu:not([hidden])",TIER.tap));
    } else say(name+" menu: opened", false), bad++;
    await p.close();
    // 3. a style panel, on a fresh page: hash navigation on a loaded page does not select
    p=await ctx.newPage();
    await p.goto(URL+"#shoegaze"); await p.waitForTimeout(1100);
    if(open){ await p.click("#grab").catch(()=>{}); await p.waitForTimeout(700); }
    const got=await p.$eval(".pcard .mn",e=>e.textContent).catch(()=>null);
    say(name+" style panel opened on Shoegaze", got==="Shoegaze");
    if(got!=="Shoegaze") bad++;
    check(name+" style", await readType(p,"#panelBody"), await readTaps(p,"#panelBody",TIER.tap));
    await p.close();
  }
  // the cover is the one thing that gets bigger on a pointer screen rather than smaller
  { const sizes={};
    for(const [name,vp] of [["phone",{width:390,height:844,isMobile:true,hasTouch:true}],
        ["tablet",{width:834,height:1112,isMobile:true,hasTouch:true}],
        ["desktop",{width:1440,height:900}]]){
      const p=await b.newPage({viewport:vp});
      await p.goto(URL+"#jamband"); await p.waitForTimeout(900);
      sizes[name]=await p.evaluate(()=>{ const e=document.querySelector(".plrow img.pcov, .plrow .pcovph");
        return e?Math.round(e.getBoundingClientRect().width):0; });
      await p.close();
    }
    // the cover is the one thing the pointer tier makes bigger rather than smaller, and the
    // row stopped spending width on a 40px disc, so every tier gained
    say("playlist cover: phone "+sizes.phone+", tablet "+sizes.tablet+", desktop "+sizes.desktop,
      sizes.phone>=76 && sizes.tablet>=76 && sizes.desktop>=110
      && sizes.desktop>sizes.tablet && sizes.desktop>sizes.phone);
    const dp=await b.newPage({viewport:{width:1440,height:900}});
    await dp.goto(URL+"#jamband"); await dp.waitForTimeout(900);
    const box=await dp.evaluate(()=>{ const b=document.querySelector(".plrow img.pcov, .plrow .pcovph").getBoundingClientRect();
      return [Math.round(b.width),Math.round(b.height)]; });
    await dp.close();
    say("  and still square at "+box.join("x"), box[0]===box[1]);
  }

  await b.close();
  process.exit(bad?1:0);
})();
