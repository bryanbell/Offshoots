// Key artists are read from the head of a style's note, which is usually the artist list
// but sometimes opens with where the style came from: "UK; named by Whistla 2009".
// Those places were being drawn as artists. A single-word rule would have been the wrong
// fix, since Nirvana, Prince, Chic and Burial are all one word, so the places are named
// instead; this checks both halves of that, the ones that should go and the ones that
// must stay. Each style opens on a fresh page: a hash change on a loaded page is a
// same-document navigation and does not re-select.
const {chromium}=require("playwright");
const skipWelcome=require("./_hello");
const {settle,until,shown,arm}=require("./_wait");
const URL="file://"+__dirname+"/../index.html";
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));
// boot runs on document.fonts.ready and draws the map before it reads the hash, so the
// first drawn node is what says boot has got as far as choosing what to show.
const ready=async q=>{ await arm(q); await shown(q,"#chart .n"); await settle(q); };
// the chips this suite reads are built by the selection, so a deep link has arrived when
// the map has lit the node it chose
const cur=q=>until(q,()=>!!document.querySelector("#chart .n.cur"));
const selected=async q=>{ await ready(q); await cur(q); await settle(q); };
// The glide drives #panel with an inline height and clears it on transitionend, so an
// inline height still on the panel means the sheet is still moving even though nothing is
// mutating. The two rows are compared by geometry, so both have to be at rest.
const opened=async q=>{ await until(q,()=>document.body.classList.contains("open"));
  await until(q,()=>!document.getElementById("panel").style.height); await settle(q); };
// A push leaves the page it came from visible until it is hidden 240ms later, so the
// arrival is "the first page still showing is this one" rather than "this one exists".
const onPage=async(q,k)=>{ await until(q,k=>{
    const u=[...document.querySelectorAll(".ppage")].filter(x=>!x.hidden)[0];
    return !!u && u.dataset.p===k;},k); await settle(q); };

(async()=>{
  const b=await chromium.launch(); skipWelcome(b);
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  const who=async id=>{ const p=await ctx.newPage(); await p.goto(URL+"#"+id); await selected(p);
    const w=await p.$$eval(".acrow .acirc .aclbl", e=>e.map(x=>x.textContent.trim()).filter(Boolean));
    await p.close(); return w; };

  // a place at the head of the note is not a key artist
  for(const [id,place,keep] of [["futuregarage","UK","Burial"],["amapiano","South Africa","Kabza De Small"],
      ["psytrance","Goa","Astral Projection"],["conjunto","Accordion-led","Flaco Jiménez"]]){
    const w=await who(id);
    say(id+" does not list "+place+" as an artist", !w.includes(place));
    say("  and still lists "+keep, w.includes(keep));
  }
  // one-word artist names must survive, which is what makes the place list necessary
  for(const [id,name] of [["grunge","Nirvana"],["minneapolis","Prince"],["disco","Chic"],["krautrock","Can"]]){
    const w=await who(id);
    say(id+" still lists "+name, w.includes(name));
  }
  // Fred again.. belongs to this lineage and was nowhere on the map
  const fg=await who("futuregarage");
  say("Future Garage lists Fred again..", fg.includes("Fred again.."));
  say("  alongside "+fg.join(", "), fg.length>=3);

  // the playlist roster: search reaches every artist on a style's playlist, while the
  // panel still shows only the handful ART names
  { const p=await ctx.newPage();
    await p.goto(URL); await ready(p);
    // the field is typed into, so wait for it to be on screen rather than merely in the DOM
    await p.$eval("#mapSearch",e=>e.click());
    await until(p,()=>{const e=document.querySelector("#bottomSearch input");
      return !!e && !!e.getClientRects().length;});
    await settle(p);
    // the input handler ranks and redraws the hits on the spot, so there is nothing to wait
    // out but the list redrawing itself
    const find=async t=>{ await p.fill("#bottomSearch input",t); await settle(p);
      return p.$$eval("#bottomSearch .results li",e=>e.map(x=>x.innerText.split("\n")[0])); };
    // none of these four is in ART, so each one fails before the roster exists
    for(const [name,style] of [["Marshall Jefferson","Chicago House"],["Patti Page","Traditional Pop"],
        ["Doug Carn","Spiritual Jazz"],["Bush Tetras","No Wave"]]){
      const r=await find(name);
      say(name+" finds "+style+" ("+(r.join(", ")||"nothing")+")", r.includes(style));
    }
    // and a name on several playlists returns each of those styles
    const th=await find("Talking Heads");
    say("Talking Heads returns "+th.length+" styles ("+th.join(", ")+")", th.length>=3);
    // the row says which artist matched, so the hit does not look arbitrary
    const line=await p.$eval("#bottomSearch .results li button small",e=>e.textContent);
    say("the row names the artist ("+line+")", /Talking Heads/.test(line));
    // the panel is unchanged: still the short curated list, not the whole playlist
    const sizes=await p.evaluate(()=>{
      const A=ROSTER, keys=Object.keys(A);
      return {styles:keys.length, names:keys.reduce((n,k)=>n+A[k].length,0),
        panel:Math.max(...keys.map(k=>(ART[k]||[]).length))};});
    say("roster covers "+sizes.styles+" styles and "+sizes.names+" artists", sizes.names>1500);
    say("and the panel still lists at most "+sizes.panel+" per style", sizes.panel<=5);

    // track titles, ranked below everything else
    const quiet=async t=>{ await p.fill("#bottomSearch input",t); await settle(p);
      return p.evaluate(()=>{ const r=document.querySelector("#bottomSearch .results");
        return r.hidden?[]:[...r.querySelectorAll("li")].map(x=>x.querySelector("span").textContent); }); };
    for(const [song,style] of [["Blue Monday","Synth-Pop"],["Good Vibrations","California Sound"],
        ["Planet Rock","Detroit Techno"]]){
      const r=await quiet(song);
      say('"'+song+'" finds '+style+" ("+(r.join(", ")||"nothing")+")", r.includes(style));
    }
    // Electro's note already names 'Planet Rock', so that row reads as a note; the rows
    // that matched only on a title are the ones that quote it
    const sline=await p.evaluate(()=>{ const li=[...document.querySelectorAll("#bottomSearch .results li")]
      .find(x=>x.querySelector("span").textContent==="Detroit Techno");
      return li?li.querySelector("small").textContent:""; });
    say("and quotes the title that matched ("+sline+")", /\u201c.*\u201d/.test(sline));
    // a word in a title on most playlists must not outrank a name or a note
    const you=await quiet("you");
    say('"you" leads with the name match ('+you.slice(0,2).join(", ")+")", you[0]==="Youth Crew");
    const songy=await p.evaluate(()=>Object.values(SONGS).filter(v=>v.some(t=>/you/i.test(t))).length);
    say("  though "+songy+" styles have it in a title", songy>50);
    // and a three-letter query does not reach titles at all
    const three=await p.evaluate(()=>Object.values(SONGS).filter(v=>v.some(t=>/the/i.test(t))).length);
    await quiet("the");
    const quoted=await p.evaluate(()=>[...document.querySelectorAll("#bottomSearch .results li button small")]
      .filter(e=>/\u201c/.test(e.textContent)).length);
    say('the '+three+' styles matching "the" only in a title are not offered ('+quoted+' quoted rows)',
      three>0 && quoted===0);
    await p.close(); }

  // ---------- the row, and the roster behind it ----------
  // The chips wrapped across three ragged rows, which gave the longest name the widest
  // row and a hole beside the shortest. One line that scrolls now, with every artist the
  // map knows behind the heading: 135 styles carry a roster that nothing had ever shown.
  { const p=await ctx.newPage(); const errs=[];
    p.on("pageerror",e=>errs.push(String(e)));
    await p.goto(URL); await ready(p);
    await p.evaluate(()=>{const n=document.querySelector("#chart .n[data-id=dub]");
      n.dispatchEvent(new MouseEvent("click",{bubbles:true}));});
    // the click selects, which rebuilds the panel the row is measured off: the map lighting
    // the node is what says the selection landed
    await until(p,()=>{const n=document.querySelector("#chart .n.cur");
      return !!n && n.dataset.id==="dub";});
    await settle(p);
    const chipNames=await p.$$eval(".acrow .aclbl",e=>e.map(x=>x.textContent));
    const row=await p.evaluate(()=>{
      const r=document.querySelector(".acrow"), h=document.querySelector(".subh.subgo");
      if(!r) return null;
      const c=[...r.querySelectorAll(".acirc")];
      return {chips:c.length, nowrap:getComputedStyle(r).flexWrap==="nowrap",
        scrolls:r.scrollWidth>r.clientWidth+1,
        oneLine:[...new Set(c.map(x=>Math.round(x.getBoundingClientRect().top)))].length===1,
        // a symbol per kind of act, so a row of artists reads before you read a name
        symbols:c.every(x=>!!x.querySelector(".aco svg") && /\br-\w+/.test(x.className)),
        round:c.every(x=>{const q=x.querySelector(".aco").getBoundingClientRect();
          return Math.abs(q.width-q.height)<=1 && q.width>=56;}),
        isBtn:!!h && h.tagName==="BUTTON" && h.dataset.page==="artists",
        count:h?+(h.querySelector(".subct")||{}).textContent:0,
        // the tap floor steps down on a pointer tier, so ask the page rather than assume
        floor:parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tap"))||44,
        tap:h?Math.round(h.getBoundingClientRect().height):0};});
    say("the key artists are one scrolling line of "+(row&&row.chips),
      !!row && row.nowrap && row.oneLine && row.scrolls);
    say("  each a circle carrying a symbol for what the act is",
      !!row && row.symbols && row.round);
    // four circles landing exactly on the screen edge read as the end of the row, so the
    // tile is sized from the row and the fourth is always cut about in half
    const peek=await p.evaluate(()=>{
      const row=document.querySelector(".acrow"), rb=row.getBoundingClientRect();
      const c=[...row.querySelectorAll(".acirc")];
      const part=c.filter(x=>{const q=x.getBoundingClientRect();
        return q.left<rb.right-6 && q.right>rb.right+6;});
      if(!part.length) return {frac:0};
      const q=part[0].getBoundingClientRect();
      return {frac:Math.round(100*(rb.right-q.left)/q.width),
        full:c.filter(x=>x.getBoundingClientRect().right<=rb.right+0.5).length};});
    say("  with one cut "+peek.frac+"% at the edge, after "+peek.full,
      peek.frac>=25 && peek.frac<=75);
    say("  with a heading that opens the rest ("+(row&&row.count)+")",
      !!row && row.isBtn && row.count>row.chips);
    say("  and that heading is "+(row&&row.tap)+"px to tap", !!row && row.tap>=row.floor);
    await p.click(".subh.subgo"); await onPage(p,"artists");
    const pg=await p.evaluate(()=>{
      const u=[...document.querySelectorAll(".ppage")].filter(x=>!x.hidden)[0];
      const rows=[...u.querySelectorAll(".amrow")];
      return {title:(u.querySelector(".bigttl .mn")||{}).textContent,
        n:rows.length, years:u.querySelectorAll(".amyr").length,
        spans:[...u.querySelectorAll(".amyr")].map(x=>x.textContent),
        names:rows.map(x=>x.querySelector(".lrlbl").textContent),
        blank:rows.every(x=>x.target==="_blank" && /noopener/.test(x.rel)),
        hrefs:rows.every(x=>/^https?:/.test(x.href)),
        tap:Math.min(...rows.map(x=>Math.round(x.getBoundingClientRect().height)))};});
    say("tapping it lists all "+pg.n+" on a page called "+pg.title,
      pg.title==="Key artists" && pg.n===(row&&row.count));
    // the panel's three or four lead the page, and each row carries the years that
    // artist was making music, which is the one fact a bare name withholds
    say("  the panel's own first", pg.names.slice(0,row.chips).join("/")
      ===chipNames.join("/"));
    say("  "+pg.years+" of "+pg.n+" carrying their years", pg.years>=Math.ceil(pg.n*0.6));
    say("  every span a plausible shape",
      pg.spans.every(t=>/^(1[89]|20)\d\d(\u2013((1[89]|20)?\d\d)?)?$/.test(t)));
    say("  nobody listed twice", new Set(pg.names).size===pg.n);
    say("  each opening safely in its own tab", pg.blank && pg.hrefs);
    say("  rows at least "+pg.tap+"px", pg.tap>=(row?row.floor:44));
    // the eight kinds are eight colours, each one readable with a white symbol on it
    const pal=await p.evaluate(()=>{
      const want=["band","voice","mc","guitar","keys","player","dj","studio","none"];
      const probe=document.createElement("i"); probe.style.display="none";
      document.body.appendChild(probe);
      const out={};
      for(const r of want){ probe.className="acirc r-"+r;
        out[r]=getComputedStyle(probe).getPropertyValue("--rc").trim(); }
      probe.remove(); return out;});
    const hex=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
    const lum=h=>{const [r,g,b]=hex(h).map(v=>{v/=255;
      return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);}); return .2126*r+.7152*g+.0722*b;};
    const vals=Object.values(pal);
    say("eight kinds, "+new Set(vals).size+" colours, plus a fallback",
      vals.every(v=>/^#[0-9a-f]{6}$/i.test(v)) && new Set(vals).size===vals.length);
    const worst=Math.min(...vals.map(v=>1.05/(lum(v)+.05)));
    say("  the faintest reads at "+worst.toFixed(2)+":1 under a white symbol", worst>=3);
    say("no page errors", errs.filter(x=>!/Failed to load/.test(x)).join(" | ")||true);
    await p.close(); }

  // the roles themselves: what the map claims about each act, checked for shape
  { const p=await ctx.newPage();
    await p.goto(URL); await ready(p);
    const t=await p.evaluate(()=>{
      const OK=["band","voice","mc","guitar","keys","player","dj","studio"];
      const vals=Object.values(ROLE);
      const key=new Set(); for(const d of DATA) (ART[d[0]]||[]).forEach(x=>key.add(x));
      const spread={}; vals.forEach(v=>spread[v]=(spread[v]||0)+1);
      return {n:vals.length, odd:vals.filter(v=>OK.indexOf(v)<0).length,
        kinds:Object.keys(spread).length,
        covered:[...key].filter(x=>ROLE[x]).length, key:key.size,
        spread};});
    say(t.n+" acts classified, all into one of the eight", t.odd===0 && t.kinds===8);
    say("  covering "+t.covered+" of the "+t.key+" key artists",
      t.covered>=Math.floor(t.key*0.9));
    // one bucket swallowing everything would mean the symbols say nothing
    say("  no kind holding more than half ("
      +Object.entries(t.spread).sort((a,b)=>b[1]-a[1])[0].join(" ")+")",
      Math.max(...Object.values(t.spread))<t.n*0.5);
    await p.close(); }

  // a style with no roster opens a page too: the row scrolls, so the page is the only
  // place the whole set sits still, however short it is
  { const p=await ctx.newPage();
    await p.goto(URL); await ready(p);
    const plain=await p.evaluate(()=>{
      // no ROSTER entry at all means there is nothing behind the chips to open
      const bare=DATA.map(r=>r[0]).find(id=>
        (ART[id]||[]).length && !(typeof ROSTER!=="undefined" && ROSTER[id]));
      if(!bare) return null;
      const node=document.querySelector(`#chart .n[data-id="${bare}"]`);
      if(!node) return {skip:true};
      node.dispatchEvent(new MouseEvent("click",{bubbles:true}));
      return {id:bare};});
    // the heading is drawn by the panel the click rebuilds, so the wait belongs outside the
    // page: the map lighting the chosen node is what says that rebuild has happened
    if(plain && plain.id){
      await until(p,id=>{const n=document.querySelector("#chart .n.cur");
        return !!n && n.dataset.id===id && !!document.querySelector(".subh");},plain.id);
      await settle(p);
      Object.assign(plain, await p.evaluate(()=>{ const h=document.querySelector(".subh");
        return {tag:h?h.tagName:"", go:!!document.querySelector(".subh.subgo")};}));
    }
    if(!plain) say("every style with artists has a roster behind it", true);
    else if(plain.skip) say("the no-roster style is off the rendered map", true);
    else say("a style with no roster still opens a page ("+plain.id+")",
      plain.tag==="BUTTON" && plain.go===true);
    await p.close(); }

  // ---------- the two circle rows are one component ----------
  // Key artists on a style panel and the ways in on the overview are the same shape: a
  // heading that opens the full set, then filled circles you swipe. They were written
  // twice and drifted — a 76px circle against 80, a 36px glyph against 41, two label
  // sizes, two heading weights — which reads as a near-miss rather than a hierarchy.
  // This measures them against each other instead of against numbers typed here, so the
  // next change to one has to be made to both.
  // newContext wants the viewport nested; passed flat, Playwright ignores the unknown keys
  // and quietly hands back a 1280x720 desktop. This block spent two months of its short life
  // comparing the two rows at desktop width while saying phone, and waiting out two 30s
  // action timeouts for a #grab that is not on a desktop at all.
  { const M={viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2};
    const c2=await b.newContext(M);
    const geom=async (hash,tile,circ,lbl,row,head)=>{
      const q=await c2.newPage();
      await q.goto(URL+hash); await ready(q);
      if(hash) await cur(q);
      // #grab is the phone sheet's handle. Ask whether it is on screen before clicking it:
      // where the layout has no peek there is nothing to expand, and a click on a control
      // that will never appear is a thirty-second sleep wearing a click's clothes.
      const handle=await q.$eval("#grab",e=>!!e.getClientRects().length).catch(()=>false);
      if(handle){ await q.click("#grab"); await opened(q); }
      // wait for the row itself rather than a stopwatch: under a loaded machine the sheet
      // can still be opening, and a missing row would read as the two rows disagreeing
      await q.waitForSelector(tile,{state:"attached",timeout:8000}).catch(()=>{});
      await settle(q);
      const g=await q.evaluate(([tile,circ,lbl,row,head])=>{
        const t=document.querySelector(tile); if(!t) return null;
        const co=t.querySelector(circ), l=t.querySelector(lbl),
              r=document.querySelector(row), h=document.querySelector(head),
              sv=co.querySelector("svg"), cv=h&&h.querySelector(".sectcv svg");
        // the chevron is a sibling of the title, not inside it: measure type off whichever
        // element carries the words, and the chevron off the heading as a whole
        const ht=(h&&h.querySelector(".secttl"))||h;
        const cs=getComputedStyle, px=e=>+e.getBoundingClientRect().width.toFixed(1);
        return {tile:px(t), circle:px(co), glyph:px(sv), gap:cs(r).gap,
          label:cs(l).fontSize+"/"+cs(l).fontWeight,
          stack:cs(t).gap, radius:cs(co).borderRadius,
          head:ht?cs(ht).fontSize+"/"+cs(ht).fontWeight:"none",
          chev:cv?px(cv):0};
      },[tile,circ,lbl,row,head]);
      await q.close(); return g; };

    const ways = await geom("", ".mcirc", ".mco", ".mclbl", ".mrow", ".secthead.sectgo");
    const arts = await geom("#gospel", ".acirc", ".aco", ".aclbl", ".acrow", ".subh.subgo");
    if(!ways || !arts) say("both circle rows are on screen to compare", false);
    else {
      const same=k=>String(ways[k])===String(arts[k]);
      const show=k=>k+" "+ways[k]+" vs "+arts[k];
      const off=["tile","circle","glyph","gap","label","stack","radius"].filter(k=>!same(k));
      say("the ways in and key artists circles are the same component"
        +(off.length?" — "+off.map(show).join(", "):" ("+ways.circle+"px circle, "
          +ways.glyph+"px glyph, "+ways.gap+" apart, "+ways.label.split("/")[0]+" label)"),
        off.length===0);
      // the heading above each row carries the same weight: a lighter one on either side
      // would say the rows rank differently when they do not
      say("  and their headings match"+(ways.head===arts.head?" ("+ways.head+")":": "
        +ways.head+" vs "+arts.head), ways.head===arts.head);
      say("  down to the chevron that opens them", ways.chev===arts.chev && ways.chev>0);
      // the measured tile is what forces a half circle at the right edge; if it ever goes
      // back to a fixed width the peek is a coincidence again
      say("  sized so one is cut off at the edge, not by a fixed guess",
        ways.tile>ways.circle && ways.tile<ways.circle*1.6);
    }
    await c2.close(); }

  await b.close();
})();
