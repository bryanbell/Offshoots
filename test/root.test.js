const {chromium}=require("playwright");
const URL="file://"+__dirname+"/../index.html";
const M={width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2};
const Dk={width:1280,height:900};
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));
async function fresh(b,vp,hash){ const p=await b.newPage({viewport:vp}); const errs=[];
  p.on("pageerror",e=>errs.push(String(e)));
  await p.goto(URL+(hash||"")); await p.waitForTimeout(850); p._errs=errs; return p; }

(async()=>{
  const b=await chromium.launch();
  let p=await fresh(b,M);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(450);

  // ---- order on the page ----
  const order=await p.$eval("#panelBody",e=>[...e.querySelectorAll(".ovcard,.sect-feat,.sect-modes,.browse,.ovhint,.aboutwrap")]
    .map(x=>x.className.split(" ").find(c=>/ovcard|sect-feat|sect-modes|browse|ovhint|aboutwrap/.test(c))));
  say("reading order", order.join(" → "));
  // the panel names its job. Its sections name theirs, and the two folds, which used to
  // dangle at the foot of the card, are what Learn means.
  const groups=await p.$$eval("#panelBody .sect .secttl",e=>e.map(x=>x.textContent));
  say("sections: "+groups.join(" / "), groups.includes("Browse") && groups[groups.length-1]==="Learn");
  say("  the folds live under Learn", (await p.$$(".sect-learn .fold")).length===2);
  say("  and none are left loose", (await p.$$eval("#panelBody > .more > .fold",e=>e.length))===0);
  // "Start here" is the style you are handed; the 17 are where the music starts. Both
  // were called start. The list row took the word the axis already prints over that region.
  const starts=await p.evaluate(()=>({
    heads:[...document.querySelectorAll("#panelBody .secttl")].map(x=>x.textContent),
    row:(document.querySelector(".sect-browse .listrow .lrlbl")||{}).textContent||"",
    axis:[...document.querySelectorAll("#axis text")].map(x=>x.textContent).join(" ")}));
  say("nothing on the panel says start ("+starts.heads.join(" / ")+")",
    starts.heads.every(h=>!/start/i.test(h)));
  say("  the 17 are "+JSON.stringify(starts.row), starts.row==="Roots");
  say("  which is the axis's own word for that region", /Roots/.test(starts.axis));

  say("browse leads, then the modes", order.indexOf("browse")<order.indexOf("sect-modes"));
  say("map hint demoted below browse", order.indexOf("ovhint")>order.indexOf("browse"));

  const nFams=await p.evaluate(()=>typeof FAMS!=="undefined"?FAMS.length:-1);
  // ---- 2: the title block describes the map, so it sits on the map ----
  say("meta", await p.$eval("#maphead .mmeta",e=>e.textContent));
  say("playlist count is on the map", (await p.$eval("#maphead .mmeta",e=>e.textContent)).includes("playlists"));
  say("and not repeated in the panel", (await p.$$("#panelBody .mmeta, .ovcard .tag")).length===0);
  // the band is a quiet label now: no blurb, a smaller name, and both set below full strength
  const quiet=await p.evaluate(()=>{ const t=document.querySelector("#maphead .mh"),
    m=document.querySelector("#maphead .mmeta"), body=getComputedStyle(document.body);
    const dim=c=>{ const n=(c.match(/[\d.]+/g)||[]).map(Number);
      return n.length>3 ? n[3] : /\/\s*([\d.]+)/.test(c) ? +RegExp.$1 : 1; };
    return {size:parseFloat(getComputedStyle(t).fontSize), blurb:!!document.querySelector("#maphead .mtag"),
      ttlDim:dim(getComputedStyle(t).color), metaDim:dim(getComputedStyle(m).color),
      heading:parseFloat(body.getPropertyValue("--t-title1"))||0}; });
  say("the blurb is gone", quiet.blurb===false);
  say("  the name is "+quiet.size+"px, smaller than the old title size", quiet.size<=20);
  say("  and both lines are dimmed ("+quiet.ttlDim+", "+quiet.metaDim+")",
    quiet.ttlDim<1 && quiet.metaDim<1);
  // it sits above the first lane rather than over it
  const band=await p.evaluate(()=>{ const h=document.getElementById("maphead").getBoundingClientRect(),
    l=document.querySelector(".lane[data-fam]").getBoundingClientRect();
    return {gap:Math.round(l.top-h.bottom), h:Math.round(h.height)}; });
  say("the band is "+band.h+"px and the first lane starts "+band.gap+"px below it", band.h>40 && band.gap>=0);
  // the blurb and the counts sit beside the name, not under it, wherever there is room
  { const q=await b.newPage({viewport:{width:1440,height:900}});
    await q.goto(URL); await q.waitForTimeout(1000);
    const lay=await q.evaluate(()=>{ const t=document.querySelector("#maphead .mh").getBoundingClientRect(),
      g=document.querySelector("#maphead .mmeta").getBoundingClientRect(),
      f=document.querySelector(".lane.fill"), h=document.getElementById("maphead").getBoundingClientRect();
      const fb=f?f.getBoundingClientRect():null;
      return {beside:Math.round(g.left-t.right), sameLine:Math.abs(Math.round(g.top-t.top))<30,
        band:Math.round(h.height), fillTop:fb?Math.round(fb.top):null,
        fillH:fb?Math.round(fb.height):null, bandTop:Math.round(h.top)}; });
    say("the counts sit "+lay.beside+"px right of the name, on its line", lay.beside>0 && lay.sameLine);
    say("  which keeps the band to "+lay.band+"px", lay.band<=56);
    say("  and the lane strip is filled beside it ("+lay.fillH+"px from "+lay.fillTop+")",
      lay.fillH!==null && Math.abs(lay.fillH-lay.band)<=2 && Math.abs(lay.fillTop-lay.bandTop)<=2);
    // it belongs to the map, so panning the timeline carries it along
    const before=await q.evaluate(()=>Math.round(document.querySelector("#maphead .mh").getBoundingClientRect().left));
    await q.evaluate(()=>{ document.getElementById("scroller").scrollLeft=200; }); await q.waitForTimeout(300);
    const after=await q.evaluate(()=>({ttl:Math.round(document.querySelector("#maphead .mh").getBoundingClientRect().left),
      strip:Math.round(document.querySelector(".lane.fill").getBoundingClientRect().left)}));
    say("  panning 200px moves the title with the map ("+before+" to "+after.ttl+")", before-after.ttl>=190);
    say("  while the lane strip stays pinned at "+after.strip, after.strip<=1);
    await q.close(); }
  // the back and map pills float over the top left of the map, where the title now is
  { const q=await b.newPage({viewport:{width:1440,height:900}});
    await q.goto(URL+"#delta"); await q.waitForTimeout(1100);
    await q.evaluate(()=>{ document.getElementById("scroller").scrollTop=0; }); await q.waitForTimeout(350);
    const hit=await q.evaluate(()=>{ const a=document.getElementById("navpills").getBoundingClientRect();
      const over=s=>{ const e=document.querySelector(s); if(!e) return false;
        const r=e.getBoundingClientRect();
        return !(a.right<r.left||a.left>r.right||a.bottom<r.top||a.top>r.bottom); };
      return {vis:a.width>0, title:over("#maphead .mh"), tag:false, meta:over("#maphead .mmeta")}; });
    say("with a style selected the pills are showing", hit.vis);
    say("  and clear of the title, tagline and counts", !hit.title && !hit.tag && !hit.meta);
    await q.close(); }
  // the app icon left the header and moved into About, so check both ends of that:
  // a bare .appicon count would now find the one inside the collapsed details
  say("no app icon in the header", (await p.$$(".ovcard .navrow .appicon")).length===0);
  say("it moved into About", (await p.$$(".aboutwrap .abouthd .appicon")).length===1);

  // ---- the root panel's header and its list of ways in ----
  // the header carries nothing now: the title is a large one under it, the roots moved
  // into the Browse list, and share is a button at the foot like a style panel's
  const hdr=await p.evaluate(()=>{ const card=document.querySelector(".ovcard"),
      row=card&&card.querySelector(".navrow");
    if(!row) return null;
    const t=card.querySelector(".bigttl"), sect=card.parentNode.querySelector(".secttl"),
      tb=t.getBoundingClientRect(), rb=row.getBoundingClientRect();
    return {name:t.textContent, align:getComputedStyle(t).textAlign,
      size:parseFloat(getComputedStyle(t.querySelector(".mn")||t).fontSize),
      sectSize:sect?parseFloat(getComputedStyle(sect).fontSize):0,
      flush:sect?Math.round(tb.left-sect.getBoundingClientRect().left):99,
      belowRow:Math.round(tb.top-rb.bottom), inRow:!!row.querySelector(".bigttl"),
      controls:[...row.querySelectorAll("button")].filter(b=>!b.hidden).length,
      rowH:Math.round(rb.height)}; });
  say("the root is titled "+(hdr&&hdr.name), !!hdr && hdr.name==="Explore");
  say("  left-aligned under the row, "+(hdr&&hdr.belowRow)+"px below it",
    !!hdr && hdr.align==="left" && hdr.belowRow>=0 && hdr.inRow===false);
  say("  flush with the section headings ("+(hdr&&hdr.flush)+"px)", !!hdr && Math.abs(hdr.flush)<=1);
  say("  and bigger than them, "+(hdr&&hdr.size)+" against "+(hdr&&hdr.sectSize),
    !!hdr && hdr.size>=28 && hdr.size>hdr.sectSize);
  say("  the row above it is empty, "+(hdr&&hdr.rowH)+"px tall",
    !!hdr && hdr.controls===0 && hdr.rowH<=24);

  // the ways in are one grouped list, the way a phone app lists collections
  const grp=await p.evaluate(()=>{ const g=document.querySelector(".sect-browse .listgrp");
    if(!g) return null;
    const rows=[...g.querySelectorAll(".listrow")];
    const gb=g.getBoundingClientRect();
    return {labels:rows.map(r=>r.querySelector(".lrlbl").textContent),
      counts:rows.map(r=>(r.querySelector(".lrct")||{}).textContent||""),
      chevrons:rows.map(r=>!!r.querySelector(".lrcv")),
      icons:rows.every(r=>!!r.querySelector(".lrico svg")),
      oneCard:rows.every(r=>Math.round(r.getBoundingClientRect().width)===Math.round(gb.width)),
      radius:parseFloat(getComputedStyle(g).borderRadius),
      tap:Math.min(...rows.map(r=>Math.round(r.getBoundingClientRect().height))),
      inset:getComputedStyle(g).getPropertyValue("--lrlead").trim()}; });
  // Families, Playlists and Most influential came out: they were reference lists, and
  // what is left is the two rows that are ways in rather than ways to look something up
  say("one list: "+(grp&&grp.labels.join(" / ")),
    !!grp && grp.labels.join("/")==="Roots/Surprise me");
  say("  with a count on each ("+(grp&&grp.counts.join(", "))+")", !!grp && grp.counts.every(c=>c.length>0));
  say("  an icon on each, in one rounded card of radius "+(grp&&grp.radius),
    !!grp && grp.icons && grp.oneCard && grp.radius>=10);
  say("  separators inset to the name ("+(grp&&grp.inset)+")", !!grp && parseFloat(grp.inset)>=40);
  say("  rows at least "+(grp&&grp.tap)+"px", !!grp && grp.tap>=44);
  // four of them open a list; the last is a destination, so it has no chevron
  say("  the first opens a list, the second does not", !!grp &&
    grp.chevrons[0]===true && grp.chevrons[1]===false);

  await p.click(".sect-browse .listrow"); await p.waitForTimeout(400);
  const menu=await p.evaluate(()=>{ const m=[...document.querySelectorAll(".navmenu")].find(x=>!x.hidden);
    if(!m) return null;
    const items=[...m.querySelectorAll("[data-go]")].map(x=>x.dataset.go);
    return {head:m.querySelector(".navhd").textContent, n:items.length,
      allRoots:items.every(id=>{ const row=DATA.find(d=>d[0]===id); return !!row && !(row[4]||"").trim(); })}; });
  say("  the roots row opens a menu headed "+(menu&&'"'+menu.head+'"'), !!menu && menu.head==="Roots");
  say("  listing "+(menu&&menu.n)+" styles, every one of them a root", !!menu && menu.allRoots && menu.n===17);
  await p.click(".navmenu:not([hidden]) [data-go]"); await p.waitForTimeout(700);
  say("  and picking one selects it ("+(await p.evaluate(()=>location.hash))+")",
    await p.evaluate(()=>location.hash.length>1));
  await p.goto(URL); await p.waitForTimeout(900);
  // the last row goes somewhere rather than opening anything
  await p.click("[data-random]"); await p.waitForTimeout(700);
  const r1=await p.evaluate(()=>location.hash);
  say("  the last row lands on a style ("+r1+")", r1.length>1);
  await p.goto(URL); await p.waitForTimeout(900);

  // Start here was a second random pick beside Surprise me, so it went. What it proved
  // still matters for the rows that replaced it: a named row on a minimised sheet has to
  // navigate rather than just expand the panel, which is what tap-anywhere-to-open does.
  { const mini=await fresh(b,M);
    say("sheet starts minimised", (await mini.$eval("body",e=>e.classList.contains("open")))===false);
    say("  and nothing is left of Start here",
      (await mini.$$(".sect-feat, .featpick, .shuf, [data-shuffle]")).length===0);
    await mini.close(); }

  // ---- 5: about disclosure ----
  say("about starts closed", (await p.$eval(".aboutwrap",e=>e.open))===false);
  const shut=await p.$eval(".aboutwrap",e=>Math.round(e.getBoundingClientRect().height));
  say("collapsed about is "+shut+"px (summary only)", shut<60);
  // About is the last thing in the panel, so opening it laid the text out below the
  // fold and the tap looked like it had done nothing at all.
  const abState=()=>p.evaluate(()=>{
    const b=document.getElementById("panelBody"), d=document.querySelector(".aboutwrap"),
          t=d.querySelector(".about"), br=b.getBoundingClientRect();
    return {open:d.open, top:Math.round(d.getBoundingClientRect().top-br.top),
      textTop:t?Math.round(t.getBoundingClientRect().top-br.top):null,
      h:b.clientHeight, atEnd:Math.round(b.scrollHeight-b.clientHeight-b.scrollTop)<=1};
  });
  const abBefore=await abState();
  await p.click(".aboutwrap summary"); await p.waitForTimeout(900);
  const abAfter=await abState();
  say("opens on tap", abAfter.open);
  say("it started "+abBefore.top+"px down, past the fold", abBefore.top > abBefore.h*0.6);
  say("opening scrolls it up to "+abAfter.top+"px", abAfter.top < abBefore.top - 100);
  say("as far up as the panel can go"+(abAfter.atEnd?" (scroller at its end)":""),
      abAfter.top <= 12 || abAfter.atEnd);

  // the last block used to sit flush against the panel's bottom edge
  const tail=await p.evaluate(()=>{
    const b=document.getElementById("panelBody");
    b.scrollTop=b.scrollHeight;
    const last=b.lastElementChild.lastElementChild||b.lastElementChild;
    return Math.round(b.getBoundingClientRect().bottom-last.getBoundingClientRect().bottom);
  });
  say("air below the last block ("+tail+"px)", tail>=12);
  say("stats line inside", await p.$eval(".aboutwrap .stats",e=>e.textContent));
  say("families stated once", (await p.$eval("#panelBody",e=>e.textContent)).split("families").length-1);

  // ---- 6: aside ----
  say("mode aside", await p.$eval(".sect-modes .sectaside",e=>e.textContent));

  // ---- space saved ----
  await p.click(".aboutwrap summary"); await p.waitForTimeout(250);  // close it again
  const hgt=await p.$eval("#panelBody",e=>{const a=e.querySelector(".ovcard").getBoundingClientRect(),
    z=e.querySelector(".aboutwrap").getBoundingClientRect(); return Math.round(z.bottom-a.top);});
  say("root panel height, about collapsed (was 765)", hgt);
  await p.screenshot({path:__dirname+"/screens/r-m-root.png"});
  // the lane bands are family-coloured at two opacities; the rhythm only survives while
  // every low row stays darker than every high row, whichever families sit next to each other
  const bands=await p.evaluate(()=>{
    const lum=c=>{const s=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});
      return .2126*s[0]+.7152*s[1]+.0722*s[2];};
    const px=el=>{const cs=getComputedStyle(el); const m=cs.fill.match(/[\d.]+/g).map(Number);
      const a=parseFloat(cs.fillOpacity), bg=[15,15,17];
      return lum(m.slice(0,3).map((v,i)=>bg[i]+(v-bg[i])*a));};
    const r=[...document.querySelectorAll("#chart .band")];
    const hi=r.filter(x=>!x.classList.contains("b2")).map(px);
    const lo=r.filter(x=>x.classList.contains("b2")).map(px);
    return {n:r.length, hiMin:Math.min(...hi), loMax:Math.max(...lo)};
  });
  say("every lane is banded ("+bands.n+")", bands.n===nFams);
  say("low rows all darker than high rows", bands.loMax < bands.hiMin);
  say("no mobile errors", p._errs.filter(x=>!/Failed to load/.test(x)).length===0);

  const d=await fresh(b,Dk);
  await d.screenshot({path:__dirname+"/screens/r-d-root.png"});
  say("no desktop errors", d._errs.filter(x=>!/Failed to load/.test(x)).length===0);

  // ---- one mark, one meaning ----
  // Fill used to say "before 1950" left of the divider and "has a playlist" right of
  // it, so the same visual property meant two different things depending on where you
  // were on the x-axis. Era is already carried by position and by the italic label.
  const marks=await d.evaluate(()=>{
    const of=g=>{ if(!g) return null; const c=g.querySelector("circle"), cs=getComputedStyle(c);
      return {fill:cs.fill, stroke:cs.stroke, tri:!!g.querySelector(".ply")}; };
    const same=(a,b)=>a&&b&&a.fill===b.fill&&a.stroke===b.stroke&&a.tri===b.tri;
    return {
      rings:[...document.querySelectorAll("#chart .n circle")]
              .filter(c=>parseFloat(getComputedStyle(c).strokeWidth)>=2).length,
      playMatches: same(of(document.querySelector(".n.root.has")),
                        of(document.querySelector(".n:not(.root).has"))),
      plainMatches: same(of(document.querySelector(".n.root:not(.has)")),
                         of(document.querySelector(".n:not(.root):not(.has)"))),
      rootsItalic: getComputedStyle(document.querySelector(".n.root text:not(.halo)")).fontStyle==="italic"
    };});
  say("no hollow rings left on the map ("+marks.rings+")", marks.rings===0);
  say("a pre-1950 style with a playlist is marked like any other", marks.playMatches);
  say("and one without is marked like any other", marks.plainMatches);
  say("era is still carried by the italic label", marks.rootsItalic);

  // ---- the map fills a wide window ----
  // The year scale is a fixed number of pixels per year, so past a certain width it ran
  // out before the canvas did and left dead space to the right of the last year. Both
  // ends are checked: it must fill when there is room, and must still overflow and
  // scroll when there is not, or the fix would be shrinking the map on normal screens.
  const span=async q=>q.evaluate(()=>{
    const sc=document.getElementById("scroller"), ch=document.getElementById("chart");
    return {sc:sc.clientWidth, chart:Math.round(ch.getBoundingClientRect().width)};});
  for(const w of [2560,3440]){
    const wide=await fresh(b,{width:w,height:1000});
    const m=await span(wide);
    const gap=m.sc-m.chart;
    say("at "+w+"px the map reaches the edge (chart "+m.chart+" vs "+m.sc+")", gap<=8);
    say("  and no errors there", wide._errs.filter(x=>!/Failed to load/.test(x)).length===0);
    await wide.close();
  }
  const narrow=await fresh(b,{width:1440,height:1000});
  const nm=await span(narrow);
  say("at 1440px it still overflows and scrolls ("+nm.chart+" vs "+nm.sc+")", nm.chart>nm.sc);
  await narrow.close();

  await b.close();
})();
