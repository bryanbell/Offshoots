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
  // "Start here" is the style you are handed; the header's 17 are where the music starts.
  // Both were called start. The header took the word the axis already uses for that region.
  const starts=await p.evaluate(()=>({
    heads:[...document.querySelectorAll("#panelBody .secttl")].map(x=>x.textContent),
    menu:(document.querySelector(".nav-roots .navmenu .navhd")||{}).textContent||"",
    axis:[...document.querySelectorAll("#axis text")].map(x=>x.textContent).join(" ")}));
  say("only the section says start ("+starts.heads[0]+")", /start/i.test(starts.heads[0]));
  say("  the header's 17 are "+JSON.stringify(starts.menu), starts.menu==="Roots");
  say("  which is the axis's own word for that region", /Roots/.test(starts.axis));

  say("start-here sits above the modes", order.indexOf("sect-feat")===1 && order.indexOf("sect-modes")===2);
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

  // ---- the root panel's forward button ----
  // the panel header is the style panels' header now, and at the root "forward" is the
  // styles with nothing before them, so the map can be walked from its beginning
  // the root is an index, so its name is a large left-aligned title under the row rather
  // than a centred one inside it. The row keeps share on the left and the roots on the right.
  const hdr=await p.evaluate(()=>{ const card=document.querySelector(".ovcard"),
      row=card&&card.querySelector(".navrow");
    if(!row) return null;
    const t=card.querySelector(".bigttl"), btn=row.querySelector(".nav-roots .navbtn"),
      sect=card.parentNode.querySelector(".secttl"),
      cb=card.getBoundingClientRect(), tb=t.getBoundingClientRect(),
      rb=row.getBoundingClientRect();
    return {name:t.textContent, glyph:!!row.querySelector(".navttl .shg"),
      share:!!row.querySelector(".shbtn.round"),
      align:getComputedStyle(t).textAlign,
      size:parseFloat(getComputedStyle(t.querySelector(".mn")||t).fontSize),
      sectSize:sect?parseFloat(getComputedStyle(sect).fontSize):0,
      flush:sect?Math.round(tb.left-sect.getBoundingClientRect().left):99,
      belowRow:Math.round(tb.top-rb.bottom),
      inRow:!!row.querySelector(".bigttl"),
      off:0,
      clipped:false,
      count:btn?btn.querySelector(".ct").textContent:null,
      pairs:row.querySelectorAll(".navwrap").length}; });
  say("the root header is the shared one, titled "+(hdr&&hdr.name), !!hdr && hdr.name==="Explore");
  say("  left-aligned under the row, "+(hdr&&hdr.belowRow)+"px below it",
    !!hdr && hdr.align==="left" && hdr.belowRow>=0 && hdr.inRow===false);
  say("  flush with the section headings ("+(hdr&&hdr.flush)+"px)", !!hdr && Math.abs(hdr.flush)<=1);
  say("  and bigger than them, "+(hdr&&hdr.size)+" against "+(hdr&&hdr.sectSize),
    !!hdr && hdr.size>=28 && hdr.size>hdr.sectSize);
  say("  with no glyph on the heading", !!hdr && hdr.glyph===false);
  say("  and a round share button in the left track", !!hdr && hdr.share);
  say("  with one direction to go, not two", !!hdr && hdr.pairs===1);
  say("  pointing at "+(hdr&&hdr.count)+" first-level styles", !!hdr && +hdr.count>0);
  await p.click(".nav-roots .navbtn"); await p.waitForTimeout(400);
  const menu=await p.evaluate(()=>{ const m=[...document.querySelectorAll(".navmenu")].find(x=>!x.hidden);
    if(!m) return null;
    const items=[...m.querySelectorAll("[data-go]")].map(x=>x.dataset.go);
    return {head:m.querySelector(".navhd").textContent, n:items.length,
      allRoots:items.every(id=>{ const row=DATA.find(d=>d[0]===id); return !!row && !(row[4]||"").trim(); }),
      first:m.querySelector("[data-go] .nm").textContent}; });
  say("  the menu is headed "+(menu&&'"'+menu.head+'"'), !!menu && menu.head.length>0);
  say("  listing "+(menu&&menu.n)+" styles, every one of them a root", !!menu && menu.allRoots && menu.n===+hdr.count);
  await p.click(".navmenu:not([hidden]) [data-go]"); await p.waitForTimeout(700);
  say("  and picking one selects it ("+(await p.evaluate(()=>location.hash))+")",
    await p.evaluate(()=>location.hash.length>1));
  await p.goto(URL); await p.waitForTimeout(900);

  // ---- 1: start-here row ----
  say("one featured row", (await p.$$(".featpick")).length===1);
  say("no cover art on it", (await p.$$(".sect-feat img.pcov, .sect-feat .pcovph")).length===0);
  say("no play button on it", (await p.$$(".sect-feat .plgo, .sect-feat .pkgo")).length===0);
  say("still a single target to the map", await p.$eval(".featpick",e=>e.tagName==="BUTTON"&&!!e.dataset.go));
  say("the pick still has a playlist behind it", await p.evaluate(()=>{const id=document.querySelector(".featpick").dataset.go;return !!(PLAY[id]||SPLAY[id]);}));
  const feat=await p.$eval(".featpick",e=>[e.dataset.go,e.textContent.replace(/\s+/g," ").trim()]);
  say("featured", feat[1]);
  const sh=await p.$eval(".shuf",e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];});
  say("shuffle target "+sh.join("x"), sh[0]>=40&&sh[1]>=40);
  await p.click(".shuf"); await p.waitForTimeout(300);
  const feat2=await p.$eval(".featpick",e=>e.dataset.go);
  say("shuffle re-rolls without navigating", feat2!==feat[0] && (await p.evaluate(()=>location.hash))==="");
  await p.click(".featpick"); await p.waitForTimeout(600);
  say("tapping it opens that style", (await p.evaluate(()=>location.hash))==="#"+feat2);

  // regression: the minimised sheet is tap-anywhere-to-open, and that branch used to
  // run first, so Start here only expanded the panel instead of going anywhere
  const mini=await fresh(b,M);
  say("sheet starts minimised", (await mini.$eval("body",e=>e.classList.contains("open")))===false);
  const mid=await mini.$eval(".featpick",e=>e.dataset.go);
  await mini.click(".featpick"); await mini.waitForTimeout(700);
  say("Start here navigates from a minimised sheet", (await mini.evaluate(()=>location.hash))==="#"+mid);
  say("and the map scrolled to the node", await mini.evaluate(()=>{
    const n=document.querySelector("#chart .n.cur"); if(!n) return false;
    const r=n.getBoundingClientRect(); return r.top>-10 && r.top<innerHeight; }));
  say("without forcing the sheet open", (await mini.$eval("body",e=>e.classList.contains("open")))===false);
  await mini.click("#panelBack"); await mini.waitForTimeout(600);
  say("back returns to the overview", (await mini.evaluate(()=>location.hash))==="");
  await mini.close();
  say("and the panel has its playlist", (await p.$$(".sect-listen")).length===1);

  // ---- 1: Playlists menu ----
  p=await fresh(b,M);
  await p.click("#grab").catch(()=>{}); await p.waitForTimeout(400);
  say("three browse buttons", await p.$$eval(".brlbl",e=>e.map(x=>x.textContent).join(" / ")));
  // derived from the data rather than hard-coded: this broke the moment playlists were added
  const nPlay=await p.evaluate(()=>DATA.filter(r=>PLAY[r[0]]||SPLAY[r[0]]).length);
  const n=await p.$eval('[data-menu="pl"] .ct',e=>+e.textContent);
  say("playlist count on the button matches the data ("+n+")", n===nPlay);
  await p.click('[data-menu="pl"]'); await p.waitForTimeout(350);
  const fams=await p.$$eval('.navmenu[data-br="pl"] [data-plbr]',e=>e.map(x=>x.textContent.replace(/\s+/g," ").trim()));
  say("families offered", fams.length+" — "+fams.slice(0,3).join(", "));
  const sum=await p.$$eval('.navmenu[data-br="pl"] [data-plbr] small',e=>e.reduce((s,x)=>s+ +x.textContent,0));
  say("family counts add up to the total ("+sum+")", sum===nPlay);
  say("fewer families than the Families menu (only listenable ones)", fams.length<=nFams);
  await p.click('.navmenu[data-br="pl"] [data-plbr]'); await p.waitForTimeout(300);
  const rows=await p.$$('.navmenu[data-br="pl"] [data-go]');
  say("drilled into a family", rows.length>0);
  say("every row there is playable", await p.$$eval('.navmenu[data-br="pl"] [data-go]',(e,)=>e.length>0));
  await p.screenshot({path:__dirname+"/screens/r-m-pl.png"});
  await p.click(".navmenu .brback"); await p.waitForTimeout(250);
  say("back to the family list", (await p.$$('.navmenu[data-br="pl"] [data-plbr]')).length===fams.length);
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  await p.click('[data-menu="fams"]'); await p.waitForTimeout(300);
  // read the expected count from the page: this assertion went stale the moment a
  // family was added, and a literal here says nothing about whether the menu is right
  say("Families still lists all "+nFams,
      nFams>0 && (await p.$$('.navmenu[data-br="fams"] [data-fambr]')).length===nFams);
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);

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
