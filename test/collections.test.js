// A collection used to be twelve picks and is now forty-odd, which changes what it is. At
// twelve you read the whole thing; at forty you need the order stated, and you need a way
// out of reading it at all. So: the written order is the default and is called what it is,
// and a control picks for you.
const path=require("path");
const {chromium}=require("playwright");
const skipWelcome=require("./_hello");
const {settle,until,shown,arm,raise}=require("./_wait");
const D=require(path.join(__dirname,"..","src","data.js"));
const URL="file://"+path.join(__dirname,"..","index.html");
const say=(k,v)=>console.log((v===true?"PASS ":"FAIL ")+k+(typeof v!=="boolean"?": "+v:""));
const note=(k,v)=>console.log("     "+k+(v===undefined?"":": "+v));

(async()=>{
  // ---- the data, before anything is drawn ----
  const play=new Set([...Object.keys(D.PLAY||{}),...Object.keys(D.SPLAY||{})]);
  const ids=new Set(D.DATA.map(r=>r[0]));
  const sizes=D.MODES.map(m=>m[4].length);
  const total=sizes.reduce((a,b)=>a+b,0);
  note("collections", D.MODES.length+", "+total+" entries, "
    +Math.min(...sizes)+" to "+Math.max(...sizes)+" each");
  say("every collection names a style that exists",
    D.MODES.every(m=>m[4].every(([id])=>ids.has(id))) ? true
      : D.MODES.flatMap(m=>m[4].filter(([id])=>!ids.has(id)).map(([id])=>m[0]+":"+id)).slice(0,4).join(" "));
  // the point of a collection is to play something, and the surprise control picks blind
  // from it, so a member with no playlist is a dead end it can land you on
  const noplay=D.MODES.flatMap(m=>m[4].filter(([id])=>!play.has(id)).map(([id])=>m[0]+":"+id));
  say("  and every one of them has a playlist to play",
    noplay.length===0 ? true : noplay.slice(0,5).join(" "));
  const dup=D.MODES.filter(m=>new Set(m[4].map(x=>x[0])).size!==m[4].length).map(m=>m[0]);
  say("  with no style listed twice in one collection",
    dup.length===0 ? true : dup.join(" "));
  const used=new Set(D.MODES.flatMap(m=>m[4].map(x=>x[0])));
  // Every other collection is chosen by fit. A style that fits none of them belongs in
  // Something New, the catch-all, rather than being pushed into a mood it does not suit.
  const orphan=[...play].filter(x=>!used.has(x));
  say("every playlist on the map is in at least one collection ("+used.size+" of "+play.size+")",
    orphan.length===0 ? true : orphan.length+" left out (add each where it fits, or to Something New): "+orphan.slice(0,6).join(" "));
  // one collection that is thirty kinds of the same thing is one idea repeated
  const fam={}; D.DATA.forEach(r=>fam[r[0]]=r[3]);
  const thin=D.MODES.filter(m=>m[4].length>=20
    && new Set(m[4].map(x=>fam[x[0]])).size<5).map(m=>m[0]);
  say("  and no big collection is a single family in disguise",
    thin.length===0 ? true : thin.join(" "));
  // a line that appears twice was written for neither place
  const line={}; D.MODES.forEach(m=>m[4].forEach(([id,why])=>(line[why]=line[why]||[]).push(m[0]+":"+id)));
  const reused=Object.entries(line).filter(([,w])=>w.length>1);
  say("  and every reason is written for the collection it is in",
    reused.length===0 ? true : reused.slice(0,3).map(([w,x])=>x.join("/")+": "+w).join(" | "));

  // ---- the page ----
  const b=await chromium.launch(); await skipWelcome(b);
  for(const [tag,vp] of [["phone  ",{width:390,height:844}],["desktop",{width:1280,height:900}]]){
    const p=await (await b.newContext({viewport:vp})).newPage();
    const perr=[]; p.on("pageerror",e=>perr.push(e.message));
    await p.goto(URL); await arm(p); await shown(p,"#chart .n"); await settle(p);
    if(await p.evaluate(()=>!document.body.classList.contains("open"))){
      await raise(p);
      await until(p,()=>document.body.classList.contains("open")); await settle(p); }
    // a collection opens by tapping it: the hash does not deep-link one
    await p.click('[data-mode="dinner"]');
    await until(p,()=>!!document.querySelector('.ppage[data-p="mode:dinner"]'));
    await settle(p); await new Promise(r=>setTimeout(r,250));

    const look=()=>p.evaluate(()=>{
      const pg=document.querySelector('.ppage[data-p="mode:dinner"]');
      const btn=pg.querySelector("[data-pickany]"), seg=pg.querySelector(".sortpick");
      // the deck, which is the one line under the name. The how-it-sounds paragraph
      // that used to sit here as well is not shown any more: three stacked texts
      // above the first playlist made a page you read before you got to use it.
      const lede=pg.querySelector(".pgdeck"), list=pg.querySelector(".picks");
      const r=x=>x?x.getBoundingClientRect():null;
      return {names:[...pg.querySelectorAll(".pknm")].map(x=>x.textContent),
        label:btn?(btn.querySelector(".lrlbl")||{}).textContent:"(none)",
        sub:btn?(btn.querySelector(".lrsub")||{}).textContent:"",
        chev:btn?!!btn.querySelector(".lrcv"):false,
        carded:btn?!!btn.closest(".listgrp"):false,
        tap:btn?Math.round(r(btn).height):0,
        aboveList: btn&&list ? r(btn).bottom<=r(list).top : null,
        belowLede: btn&&lede ? r(btn).top>=r(lede).top : null,
        spill: seg ? Math.round(r(seg).right-r(pg).right) : null,
        head: pg.querySelector(".secthead.picksort .secttl"),
        headTx: (pg.querySelector(".secthead.picksort .secttl")||{}).textContent||"",
        headLines: (()=>{ const h=pg.querySelector(".secthead.picksort .secttl");
          return h ? Math.round(r(h).height/parseFloat(getComputedStyle(h).lineHeight)) : 0; })(),
        onOneLine: (()=>{ const h=pg.querySelector(".secthead.picksort .secttl");
          return h&&seg ? Math.abs(r(h).top-r(seg).top)<r(h).height : null; })(),
        segW: seg?Math.round(r(seg).width):null,
        aboveFirst: seg&&list ? r(seg).bottom<=r(list).top+1 : null,
        tabTap: seg?Math.round(r(seg).height):0,
        cur: seg?(seg.querySelector(".sortx")||{}).textContent:"",
        sorts:(()=>{const sel=seg&&seg.querySelector("select");
          return sel?[...sel.options].map(o=>o.text+(o.selected?"*":"")):[];})()};
    });
    const v=await look();
    const dinner=D.MODES.find(m=>m[0]==="dinner");
    note(tag, v.names.length+" picks, row \""+v.label+" / "+v.sub+"\"");
    say(tag+": the whole collection is on the page", v.names.length===dinner[4].length);
    say("  with a control that picks one for you (\""+v.label+"\")",
      v.label==="Surprise Me");
    // the same row as Surprise me on the Explore panel: icon, label, second line, chevron,
    // in a card. It said the same thing as an accent-filled button, and shouted it.
    say("    drawn as a go row in a card, saying what it picks from (\""+v.sub+"\")",
      v.carded && v.chev && v.sub==="One of these "+dinner[4].length+", at random");
    say("  clearing the tap floor ("+v.tap+"px)", v.tap>=44);
    say("  sitting under the description and above the list", v.belowLede && v.aboveList);
    note("  sort", v.sorts.join(" "));
    // the written order is editorial, so it is called Best fit, not Relevance, which read
    // like a search score
    say("  and the three orders, best fit first and selected",
      JSON.stringify(v.sorts)===JSON.stringify(["Best fit*","A–Z","Most used"]));
    say("  with the sort inside the page ("+v.spill+"px)", v.spill<=0);
    // Three words were wider than the panel, so the control scrolled and the third order
    // sat off the edge. Then it was three glyphs you had to press to identify. It is one
    // inline picker now, the same control the Listen on row uses: the order it is on said
    // in a word, and the other two in the platform's own list behind it.
    say("  as one picker naming the order it is on (\""+v.cur+"\", "+v.segW+"px wide)",
      v.cur==="Best fit" && v.segW<=180);
    say("    still a tap target ("+v.tabTap+"px)", v.tabTap>=36);
    { const h=await p.evaluate(()=>{
        const u=[...document.querySelectorAll(".ppage")].filter(x=>!x.hidden)[0];
        const c=u.querySelector(".picksort .pkcount"), r=u.querySelector(".pk .pick");
        const y=sel=>r.querySelector(sel).getBoundingClientRect().top;
        return {count:c?+c.textContent:-1, label:c?c.getAttribute("aria-label"):"",
          order:y(".pknm")<y(".pkwhy") && y(".pkwhy")<y(".pkfam")};});
      say("  the heading says how many ("+h.count+")", h.count===dinner[4].length && h.label===h.count+" styles");
      say("  and each row reads name, then why it is here, then family and year", h.order); }
    // the sort is the order of the list, so it belongs on the list's heading, not adrift
    // under the lede where it read as another fact about the collection
    say("  on one line with a heading for the list (\""+v.headTx+"\")",
      v.headTx.length>0 && v.onOneLine===true && v.headLines===1 && v.aboveFirst===true);

    // relevance is the written order, which is the collection's own argument
    say("  relevance is the order the collection was written in",
      JSON.stringify(v.names)===JSON.stringify(dinner[4].map(([id])=>
        D.DATA.find(r=>r[0]===id)[1])));
    await p.selectOption('.psortsel','az'); await settle(p);
    const az=(await look()).names;
    say("  A–Z sorts by name ("+az.slice(0,2).join(", ")+" … "+az.slice(-1)+")",
      az.length===v.names.length
      && az.every((n,i)=>i===0||az[i-1].localeCompare(n)<=0));
    // nothing has been opened in this browser, so there is nothing to go on and the order
    // must fall back rather than scramble
    await p.selectOption('.psortsel','used'); await settle(p);
    const un=(await look()).names;
    say("  Most used falls back to relevance on a browser with no history",
      JSON.stringify(un)===JSON.stringify(v.names));
    // and once something has been opened it leads
    await p.evaluate(()=>localStorage.setItem("musicatlas.styleuse",
      JSON.stringify({tropicalia:9})));
    await p.selectOption('.psortsel','fit'); await settle(p);
    await p.selectOption('.psortsel','used'); await settle(p);
    const un2=(await look()).names;
    say("    and puts what this browser opens most at the top (\""+un2[0]+"\")",
      un2[0]==="Tropicália" && un2.length===v.names.length);
    await p.selectOption('.psortsel','fit'); await settle(p);
    // What's Current narrows rather than reorders: a switch of its own under Surprise Me,
    // each half carrying its count. On, only CURRENT styles, in the collection's own order,
    // with the heading's count and Surprise Me following, and the rest one tap away
    { const sw=await p.evaluate(()=>{ const u=[...document.querySelectorAll(".ppage")].filter(x=>!x.hidden)[0];
        const s=u.querySelector(".pkfilt"), top=u.querySelector(".modetop"), h=u.querySelector(".secthead.picksort");
        return {txt:s?[...s.querySelectorAll("[data-pickfilt]")].map(b=>b.textContent+(b.getAttribute("aria-pressed")==="true"?"*":"")):[],
          placed:!!s && s.getBoundingClientRect().bottom<=top.getBoundingClientRect().top && top.getBoundingClientRect().bottom<=h.getBoundingClientRect().top,
          tap:s?Math.min(...[...s.querySelectorAll("button")].map(b=>b.getBoundingClientRect().height)):0}; });
      const nc=dinner[4].filter(([id])=>D.CURRENT[id]).length;
      say("  an All / What's Current switch with counts ("+sw.txt.join(" | ")+")",
        JSON.stringify(sw.txt)===JSON.stringify(["All"+dinner[4].length+"*","What's Current"+nc]));
      say("    above Surprise Me, which sits on the list it draws from, clearing the tap floor", sw.placed && sw.tap>=44); }
    await p.click('.ppage:not([hidden]) [data-pickfilt="current"]'); await settle(p);
    { const want=dinner[4].filter(([id])=>D.CURRENT[id]).map(([id])=>D.DATA.find(r=>r[0]===id)[1]);
      const cv=await p.evaluate(()=>{ const u=[...document.querySelectorAll(".ppage")].filter(x=>!x.hidden)[0];
        return {names:[...u.querySelectorAll(".picks .pknm")].map(e=>e.textContent),
          count:u.querySelector(".pkcount").textContent, sub:u.querySelector(".modetop .lrsub").textContent,
          on:u.querySelector('[data-pickfilt="current"]').getAttribute("aria-pressed"), all:(u.querySelector("[data-pickall]")||{}).textContent}; });
      say("  What's Current keeps only what younger listeners play ("+cv.names.join(", ")+")",
        JSON.stringify(cv.names)===JSON.stringify(want));
      say("    and the switch, the count and Surprise Me say so",
        cv.on==="true" && cv.count===String(want.length) && cv.sub==="One of these "+want.length+", at random");
      say("    with the rest one tap away ("+cv.all+")", cv.all==="Show All "+dinner[4].length);
      await p.click(".ppage:not([hidden]) [data-pickall]"); await settle(p);
      const back=await look();
      say("    which puts back the whole collection in its own order",
        JSON.stringify(back.names)===JSON.stringify(v.names)
        && await p.evaluate(()=>document.querySelector('.ppage:not([hidden]) [data-pickfilt="all"]').getAttribute("aria-pressed")==="true")); }
    // changing the order used to rebuild the heading through a function that called
    // itself, so every change threw while the list still re-sorted
    say("    and changing the order raises no error", perr.length===0 ? true : perr[0]);

    // the control's one promise: it lands you on something from this collection
    const inHere=new Set(dinner[4].map(([id])=>id));
    // Landing on a style replaces the page stack, so the collection has to be opened
    // again for each try rather than tapped repeatedly: the first draft of this loop
    // clicked a control that was no longer on the page and timed out.
    const backToCollection=async()=>{
      await p.goto(URL); await p.reload();
      await arm(p); await shown(p,"#chart .n"); await settle(p);
      if(await p.evaluate(()=>!document.body.classList.contains("open"))){
        await raise(p);
        await until(p,()=>document.body.classList.contains("open")); await settle(p); }
      await p.click('[data-mode="dinner"]');
      await until(p,()=>!!document.querySelector('.ppage[data-p="mode:dinner"]'));
      await settle(p);
    };
    let landed=[];
    for(let i=0;i<4;i++){
      await backToCollection();
      await p.click("[data-pickany]"); await settle(p);
      await new Promise(r=>setTimeout(r,250));
      landed.push(await p.evaluate(()=>location.hash.slice(1)));
    }
    say("  surprise lands inside this collection every time ("+landed.length+" tries)",
      landed.every(h=>inHere.has(h)) ? true : landed.filter(h=>!inHere.has(h)).join(" "));
    say("    and not always on the same one", new Set(landed).size>1);
    // Again: a draw offers another from the same pool, beside a bare Back, with the map
    // button gone to make the room. Each Again lands in the collection, does not repeat
    // until it has to, and Back still goes to the collection, not the previous draw.
    { const bar=()=>p.evaluate(()=>{ const a=document.getElementById("panelAgain"), h=document.getElementById("panelHome"),
        b=document.getElementById("panelBack"), l=b&&b.querySelector(".bklbl");
        return {again:!!a&&!a.hidden&&a.textContent.trim(), home:!!h&&!h.hidden,
          label:!!l&&getComputedStyle(l).display!=="none", back:b&&b.getAttribute("aria-label")}; });
      const v0=await bar();
      say("  a draw shows Again beside a bare Back, no map button ("+JSON.stringify(v0)+")",
        v0.again==="Again" && !v0.home && !v0.label && /^Back to /.test(v0.back||""));
      const drawn=[await p.evaluate(()=>location.hash.slice(1))];
      for(let i=0;i<5;i++){ await p.click("#panelAgain"); await settle(p); drawn.push(await p.evaluate(()=>location.hash.slice(1))); }
      say("  Again draws from the same collection without repeating ("+drawn.join(", ")+")",
        drawn.every(h=>inHere.has(h)) && new Set(drawn).size===drawn.length);
      await p.click("#panelBack"); await settle(p);
      say("  and Back after it goes to the collection",
        await p.evaluate(()=>location.hash==="#mode:dinner"));
      // reached any other way, a style has no Again
      await p.click('.ppage[data-p="mode:dinner"] .pick'); await settle(p);
      say("  a style picked from the list has no Again", !(await bar()).again); }
    await p.close();
  }
  // ---- the same painting wherever you meet a collection ----
  // The page wore the Phosphor glyph while the circle you tapped to get there and the row
  // in the list both wore the painting, so arriving looked like arriving somewhere else.
  {
    const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
    await p.goto(URL); await arm(p); await shown(p,"#chart .n"); await settle(p);
    if(await p.evaluate(()=>!document.body.classList.contains("open"))){
      await raise(p);
      await until(p,()=>document.body.classList.contains("open")); await settle(p); }
    const miss=[], unloaded=[];
    // three of them, opened for real, rather than reading the markup: a src that never
    // resolves to a file looks identical in the HTML and blank on the page
    for(const k of ["focus","dinner","showkid"]){
      const want=await p.evaluate(key=>{
        const c=document.querySelector('.mcirc[data-mode="'+key+'"] img')
          || document.querySelector('.mgrid [data-mode="'+key+'"] img');
        return c?c.getAttribute("src"):null; },k);
      await p.click('[data-mode="'+k+'"]');
      await until(p,()=>!!document.querySelector(".ppage:not([hidden]) .pghead .pgi"));
      await settle(p); await new Promise(r=>setTimeout(r,350));
      const got=await p.evaluate(()=>{
        const i=document.querySelector(".ppage:not([hidden]) .pghead .pgi");
        const im=i&&i.querySelector("img");
        return {src:im?im.getAttribute("src"):null,
          loaded:im?(im.complete&&im.naturalWidth>0):false,
          glyph:!!(i&&i.querySelector(".facefb svg"))}; });
      if(!want || got.src!==want) miss.push(k+": "+got.src+" vs "+want);
      if(!got.loaded) unloaded.push(k);
      if(!got.glyph) miss.push(k+": no glyph behind it");
      // back out of a collection rather than reloading: a mode page pops to the root
      // panel, where the circles are. Only a style panel resets the stack.
      await p.click("#panelBack");
      await until(p,()=>!!document.querySelector('[data-mode="focus"]'));
      await settle(p);
    }
    say("a collection's page wears the same art as the circle you tapped",
      miss.length===0 ? true : miss.join(" | "));
    say("  and the file is really there (3 opened)",
      unloaded.length===0 ? true : "blank: "+unloaded.join(" "));
    // ---- the other direction: a style says which collections it is in ----
    // the pair has to agree both ways. A style panel that names a collection the
    // collection does not name back is a link into a page the style is not on.
    {
      const inmodes=id=>D.MODES.filter(m=>m[4].some(p=>p[0]===id)).map(m=>m[0]);
      // one style in many, one in a couple, one in none
      const many=D.DATA.map(r=>r[0]).sort((a,b)=>inmodes(b).length-inmodes(a).length)[0];
      const none=D.DATA.map(r=>r[0]).find(id=>inmodes(id).length===0);
      // a hash change on a page that is already loaded is a same-document navigation, so
      // the style never opens: goto puts the hash on, reload makes it a real one
      const read=async id=>{
        await p.goto(URL+"#"+id); await p.reload();
        await arm(p); await shown(p,"#chart .n"); await settle(p);
        await p.evaluate(()=>document.body.classList.add("open"));
        await settle(p);
        return p.evaluate(()=>{
          // "no section" only counts as an answer if the panel was built at all
          if(!document.querySelector("#panelBody .sect")) return "panel never built";
          const s=document.querySelector(".sect-inmodes");
          if(!s) return null;
          return {keys:[...s.querySelectorAll(".mcirc")].map(b=>b.dataset.mode),
            aside:(s.querySelector(".sectaside")||{}).textContent,
            labels:[...s.querySelectorAll(".mclbl")].map(e=>e.textContent)}; });
      };
      const got=await read(many);
      const want=inmodes(many);
      note("styles in no collection", D.DATA.filter(r=>!inmodes(r[0]).length).length+" of "+D.DATA.length);
      say("a style's panel names every collection that names it ("+many+", "+want.length+")",
        got && String(got.keys)===String(want) ? true
          : "panel: "+(got?got.keys.join(" "):"no section")+" | data: "+want.join(" "));
      say("  with the count beside the heading",
        got && got.aside===String(want.length) ? true : got&&got.aside);
      // the row scrolls sideways like the artists above it, and from the same edge: a
      // grid here made the section read as a different component from its neighbour
      const row=await p.evaluate(()=>{
        const f=e=>e&&{scrolls:e.scrollWidth>e.clientWidth+2,
          tile:Math.round(e.firstElementChild.getBoundingClientRect().width),
          left:Math.round(e.getBoundingClientRect().left)};
        return {mine:f(document.querySelector(".sect-inmodes .mrow")),
          artists:f(document.querySelector(".whorow.acrow"))}; });
      say("  laid out as the artists row is, and scrolling sideways with it",
        row.mine && row.artists && row.mine.scrolls
          && row.mine.tile===row.artists.tile && row.mine.left===row.artists.left
          ? true : JSON.stringify(row));
      say("  and each circle labelled with the collection's name",
        got && String(got.labels)===String(want.map(k=>D.MODES.find(m=>m[0]===k)[1]))
          ? true : got&&got.labels.join(" | "));
      const empty=await read(none);
      say("a style in no collection gets no section rather than an empty one ("+none+")",
        empty===null ? true : "section present");
      // and the link works from inside a style panel, which is a different stack from
      // the root panel the circles are usually tapped in
      await p.goto(URL+"#"+many); await p.reload();
      await arm(p); await shown(p,"#chart .n"); await settle(p);
      await p.evaluate(()=>document.body.classList.add("open")); await settle(p);
      await p.click(".sect-inmodes .mcirc");
      await until(p,()=>!!document.querySelector(".ppage:not([hidden]) .pghead .pgi"));
      await settle(p);
      const open=await p.evaluate(()=>{
        const u=document.querySelector(".ppage:not([hidden])");
        return u?u.querySelector(".bigttl").textContent.trim():null; });
      say("  and tapping one opens that collection",
        open===D.MODES.find(m=>m[0]===want[0])[1] ? true : open);
      await p.goto(URL); await p.reload();
      await arm(p); await shown(p,"#chart .n"); await settle(p);
      if(await p.evaluate(()=>!document.body.classList.contains("open"))){
        await raise(p);
        await until(p,()=>document.body.classList.contains("open")); await settle(p); }
    }
    await p.close();
  }

  // ---- explore and listen, said apart ----
  // A pick row used to be one button titled "Show on the map". It is two acts now: the
  // row opens the style, and a pill beside it opens the style's playlist in your service,
  // so the shortest path from a mood to hearing something is one tap.
  { const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
    await p.goto(URL); await arm(p); await shown(p,"#chart .n"); await settle(p);
    if(await p.evaluate(()=>!document.body.classList.contains("open"))){
      await raise(p); await until(p,()=>document.body.classList.contains("open")); await settle(p); }
    await p.click('[data-mode="focus"]');
    await until(p,()=>!!document.querySelector('.ppage[data-p="mode:focus"]')); await settle(p);
    const rows=await p.evaluate(()=>{
      const pks=[...document.querySelectorAll('.ppage:not([hidden]) .picks .pk')];
      return {n:pks.length,
        twoActs:pks.every(k=>k.querySelector("button.pick[data-go]") && k.querySelector("a.pklis")),
        labelled:pks.every(k=>/^Explore /.test(k.querySelector(".pick").getAttribute("aria-label")||"")
          && /^Open the .* playlist in /.test(k.querySelector(".pklis").getAttribute("aria-label")||"")),
        says:[...new Set(pks.map(k=>k.querySelector(".pklis .plsvc").textContent.trim()))],
        apple:pks.every(k=>/music\.apple\.com/.test(k.querySelector(".pklis").href)),
        newTab:pks.every(k=>k.querySelector(".pklis").target==="_blank"),
        tall:pks.every(k=>k.querySelector(".pklis").getBoundingClientRect().height>=36
          && k.getBoundingClientRect().height>=44),
        noPlay:!pks.some(k=>/\bPlay\b/.test(k.textContent))};});
    say("every pick row is a style to explore and a playlist to listen to ("+rows.n+" rows)", rows.twoActs);
    say("  each named for what it does", rows.labelled);
    say("  the pill saying "+JSON.stringify(rows.says.join("/"))+", not Play", rows.says.join("")==="Listen" && rows.noPlay);
    say("  opening the playlist in the stored service, in a new tab", rows.apple && rows.newTab);
    say("  at a tap size", rows.tall);
    // a stored service reaches the collection's pills too
    { const q=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
      await q.addInitScript(()=>{ try{ localStorage.setItem("svc","spotify"); }catch(e){} });
      await q.goto(URL); await arm(q); await shown(q,"#chart .n"); await settle(q);
      if(await q.evaluate(()=>!document.body.classList.contains("open"))){
        await raise(q); await until(q,()=>document.body.classList.contains("open")); await settle(q); }
      await q.click('[data-mode="focus"]');
      await until(q,()=>!!document.querySelector('.ppage[data-p="mode:focus"]')); await settle(q);
      const sp=await q.evaluate(()=>{
        const a=[...document.querySelectorAll('.ppage:not([hidden]) .picks .pklis:not([hidden])')];
        return {n:a.length, all:a.every(x=>/open\.spotify\.com/.test(x.href)
          && /in Spotify$/.test(x.getAttribute("aria-label")||""))};});
      say("  and follow the stored service ("+sp.n+" Spotify pills)", sp.n>0 && sp.all);
      await q.close(); }
    // the row opens the style, and the style says why it was in the collection
    const first=await p.$eval('.ppage:not([hidden]) .picks .pk .pick',e=>e.dataset.go);
    const why=D.MODES.find(m=>m[0]==="focus")[4].find(x=>x[0]===first)[1];
    await p.click('.ppage:not([hidden]) .picks .pk .pick');
    await until(p,t=>location.hash==="#"+t && !!document.querySelector("#chart .n.cur"),first); await settle(p);
    const st=await p.evaluate(()=>({name:(document.querySelector(".pcard .pttl .ptnm")||{}).textContent,
      line:!!document.querySelector(".frommode"),
      back:(document.querySelector("#panelBack .bklbl")||{}).textContent,
      intro:(document.querySelector(".sthead .stintro")||{}).textContent||"",
      fold:!!document.querySelector("#panelBody .aboutfold"),
      wk:!!document.querySelector(".sthead .stintro a.stwk")}));
    // The collection's line went from the style panel: it repeated the back pill and the
    // row just tapped, and pushed the playlist down a phone screen. It stays on the row.
    say("the row opens the style ("+st.name+"), with back naming the collection", st.back==="Focus");
    say("  and no second copy of the collection's line on the style", !st.line);
    // What the style is goes under its name: the written description, whole, ending on
    // a Wikipedia link, and no fold.
    const desc=D.DESC[first]||"";
    say("  with what the style is under its name, from its description: "+JSON.stringify(st.intro.slice(0,60)),
      !!desc && st.intro.indexOf(desc)===0);
    say("  ending on a Wikipedia link, with no About fold", st.wk && !st.fold);
    say("  and not the collection's line", st.intro.indexOf(why)<0);
    // a style reached any other way carries the same description
    await p.goto(URL+"#"+first); await p.reload(); await arm(p); await shown(p,"#chart .n"); await settle(p);
    say("a style reached by link carries the same line on what it is", await p.evaluate(t=>
      ((document.querySelector(".sthead .stintro")||{}).textContent||"")===t, st.intro));
    // a style with no written description gets the link alone: its data note and lineage
    // sentence say where it came from, not what it sounds like
    await p.goto(URL+"#melodeath"); await p.reload(); await arm(p); await shown(p,"#chart .n"); await settle(p);
    const bare=await p.evaluate(()=>{const i=document.querySelector(".sthead .stintro");
      return {text:i?i.textContent.trim():"", wk:!!(i&&i.querySelector("a.stwk")), fold:!!document.querySelector(".aboutfold")};});
    say("a style with no written description gets the Wikipedia link alone ("+JSON.stringify(bare.text)+")",
      bare.wk && bare.text==="Wikipedia" && !bare.fold);
    await p.close(); }

  // ---- the page is the home panel's dial, every collection on it ----
  { const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
    await p.goto(URL+"#modes"); await arm(p); await shown(p,"#chart .n"); await settle(p);
    await until(p,()=>!!document.querySelector('.ppage:not([hidden]) .mgrid'));
    const g=await p.evaluate(()=>{
      const t=[...document.querySelectorAll(".ppage:not([hidden]) .mgrid .mcirc")];
      const home=document.querySelector(".sect-modes .mdial .mcirc:not(.mcall)");
      return {n:t.length,
        named:t.filter(x=>((x.querySelector(".mclbl")||{}).textContent||"").trim()).length,
        // the line on what it is for is not printed on a tile, so a screen reader is told it
        told:t.every(x=>{ const m=MODES.find(y=>y[0]===x.dataset.mode); return (x.getAttribute("aria-label")||"").includes(m[2]); }),
        opens:t.every(x=>/Opens the collection/.test(x.getAttribute("aria-label")||"")),
        square:t.every(x=>{const r=x.getBoundingClientRect(); return Math.abs(r.width-r.height)<2;}),
        same:!home || (getComputedStyle(home).borderRadius===getComputedStyle(t[0]).borderRadius
          && Math.abs(home.getBoundingClientRect().width-t[0].getBoundingClientRect().width)<2)};});
    say("the Collections page shows all "+g.n+" as the home panel's tiles", g.n===D.MODES.length && g.square && g.same);
    say("  each named on its picture", g.named===g.n);
    say("  with what it is for and that it opens in its label", g.told && g.opens);
    // the sort cuts the list into sections with a heading each
    const secs=async()=>p.evaluate(()=>[...document.querySelectorAll(".ppage:not([hidden]) .modesec")]
      .map(x=>({t:x.querySelector(".msecttl").textContent, n:x.querySelectorAll(".mcirc").length,
        said:+x.querySelector(".sectaside").textContent})));
    // the default is the clock order; quietest is one choice away
    const dflt=await secs();
    say("by default the list is cut by the clock: "+dflt.map(x=>x.t).join(", "),
      /^(Late night|This morning|This afternoon|This evening|Tonight),Any Time,Later$/.test(dflt.map(x=>x.t).join())
      && dflt.every(x=>x.n===x.said) && dflt.reduce((a,x)=>a+x.n,0)===D.MODES.length);
    await p.selectOption(".msortsel","quiet");
    await until(p,()=>document.querySelector(".msortsel").value==="quiet"); await settle(p);
    const quiet=await secs();
    say("sorted quietest, the list is "+quiet.length+" bands: "+quiet.map(x=>x.t).join(", "),
      quiet.map(x=>x.t).join()==="Still,Quiet,Steady,Lively,Loud" && quiet.every(x=>x.n===x.said)
      && quiet.reduce((a,x)=>a+x.n,0)===D.MODES.length);
    await p.selectOption(".msortsel","loud");
    await until(p,()=>document.querySelector(".msortsel").value==="loud"); await settle(p);
    const loud=await secs();
    say("  loudest, the same bands the other way: "+loud.map(x=>x.t).join(", "),
      loud.map(x=>x.t).join()==="Loud,Lively,Steady,Quiet,Still" && loud.reduce((a,x)=>a+x.n,0)===D.MODES.length);
    await p.selectOption(".msortsel","az");
    await until(p,()=>document.querySelector(".msortsel").value==="az"); await settle(p);
    const az=await secs();
    say("  A to Z, one per letter ("+az.length+"): "+az.map(x=>x.t).join(""),
      az.every(x=>x.t.length===1) && az.map(x=>x.t).join("")===az.map(x=>x.t).sort().join("")
      && az.reduce((a,x)=>a+x.n,0)===D.MODES.length);
    await p.selectOption(".msortsel","used");
    await until(p,()=>document.querySelector(".msortsel").value==="used"); await settle(p);
    const used=await secs();
    say("  most used, with nothing opened yet: one band, "+used.map(x=>x.t).join(", "),
      used.length===1 && used[0].n===D.MODES.length);
    await p.close(); }
  await b.close();
})();
