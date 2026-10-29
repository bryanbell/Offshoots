(function(){
const FAM = {}; FAMS.forEach((f,i)=>FAM[f[0]]={key:f[0],name:f[1],h:f[2],short:f[3]||f[1],i,
  c:(typeof FAMMAP!=="undefined"&&FAMMAP[f[0]])||`hsl(${f[2]} 72% 64%)`});
const nodes = DATA.map(d=>({id:d[0],name:d[1],year:d[2],fam:d[3],parents:d[4]?d[4].split(" "):[],note:d[5]||"",disp:d[6]||String(d[2]),children:[],artists:(typeof ART!=="undefined"&&ART[d[0]])||[],sources:d[7]||[],roster:(typeof ROSTER!=="undefined"&&ROSTER[d[0]])||[],songs:(typeof SONGS!=="undefined"&&SONGS[d[0]])||[],done:(typeof PLAY!=="undefined"&&!!PLAY[d[0]])}));
nodes.forEach(n=>{ n.search=(n.note+" "+n.artists.join(" ")+" "+n.roster.join(" ")).toLowerCase();
  n.songsearch=n.songs.join(" | ").toLowerCase(); });
// Apple Music artist links: start as a search URL, upgrade to the artist page once the iTunes Search API resolves an ID (cached).
let AMID={}; try{ AMID=JSON.parse(localStorage.getItem("amid")||"{}") }catch(e){}
// On Apple devices use the music:// scheme so the Music app opens directly (no browser tab / in-app browser pane).
const APPLE=/Mac|iPhone|iPad|iPod/.test(navigator.platform||"")||/Mac|iPhone|iPad/.test(navigator.userAgent||"");
const amScheme = "https://"; // music:// is swallowed by in-app web views; https universal links hand off to the Music app
const amHref = name=> AMID[name] ? `${amScheme}music.apple.com/us/artist/${AMID[name]}` : `${amScheme}music.apple.com/us/search?term=${encodeURIComponent(name)}`;
function wikiTitle(n,u){ const m=u.match(/\/wiki\/([^?#]+)$/); if(m && !/^Special:/.test(m[1])){ try{ return decodeURIComponent(m[1]).replace(/_/g," ") }catch(e){} } return n.name; }
// Wikipedia: the article recorded as a source when there is one, otherwise a "go to article" search on the style name
function wikiTxt(n){ return wiki(n).replace("class=\"wk\"","class=\"wk txt\"").replace(/<svg[\s\S]*?<\/svg>/,"").replace(/<\/?span>/g,""); }
function wiki(n){
  const u=(n.sources||[]).find(s=>/wikipedia\.org\/wiki\//.test(s))
    || "https://en.wikipedia.org/wiki/Special:Search?go=Go&search="+encodeURIComponent(n.name.split("/")[0].replace(/\([^)]*\)/g,"").trim());
  return `<a class="wk" href="${esc(u)}" target="_blank" rel="noopener" title="Read about ${esc(n.name)} on Wikipedia"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3.2A6.3 6.3 0 0 1 8 4.4a6.3 6.3 0 0 1 5.5-1.2v8.6A6.3 6.3 0 0 0 8 13a6.3 6.3 0 0 0-5.5-1.2z"/><path d="M8 4.4V13"/></svg><span>Learn more on Wikipedia</span></a>`;
}
// Emily's own Apple Music class playlists, keyed by style id (paths are relative to music.apple.com)
// cover art, if art/<id>.jpg is sitting next to the page; missing files remove themselves
const ART_DIR="art/", ART_EXT=".jpg";
// two letters for a style with no art file, so the row keeps its shape
function initials(name){
  const w=String(name||"").split(/[^A-Za-z0-9]+/).filter(Boolean);
  if(!w.length) return "?";
  return (w.length>1 ? w[0][0]+w[1][0] : w[0].slice(0,2)).toUpperCase();
}
const cover = (id,n) => {
  const f = (typeof COVER!=="undefined" && COVER[id]) || id;   // COVER maps a style to its file name; otherwise the id is the file name
  const node = n || byId[id];
  const c = node ? FAM[node.fam].c : "";
  const ini = initials(node?node.name:id);
  return `<img class="pcov" src="${ART_DIR}${encodeURIComponent(f)}${ART_EXT}" alt="" loading="lazy" decoding="async" data-c="${esc(c)}" data-ini="${esc(ini)}">`;
};
// cover plus a playlist title say what the section is; a heading on top of that is noise
function playLabel(n){
  const t=(typeof PTITLE!=="undefined"&&PTITLE[n.id])||"";
  const c=(typeof COVER!=="undefined"&&COVER[n.id])||"";
  if(t&&c) return "";
  return t ? "Start by listening to" : "Start with this playlist";
}
const OPENGO=`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.9 10.1 10.2 5.8"/><path d="M6.4 5.6h4.2v4.2"/></svg>`;
const PLAYGO=`<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5.6 3.4l6.2 4.1a.6.6 0 0 1 0 1l-6.2 4.1a.6.6 0 0 1-.9-.5V3.9a.6.6 0 0 1 .9-.5z"/></svg>`;
// one row: art left, labels middle, play button right. paintPlay() repoints it at the
// selected service, or marks it unavailable while keeping the row in place.
function plist(n){
  const ap=(typeof PLAY!=="undefined"&&PLAY[n.id])||"";
  const sp=(typeof SPLAY!=="undefined"&&SPLAY[n.id])||"";
  if(!ap && !sp) return "";
  const t=(typeof PTITLE!=="undefined"&&PTITLE[n.id])||n.name;
  return `<a class="plrow pl" target="_blank" rel="noopener"`
    + ` data-ap="${ap?esc("https://music.apple.com"+ap):""}" data-spid="${esc(sp)}" data-style="${esc(n.name)}">`
    + cover(n.id,n)
    // the arrow used to be a disc at the right-hand end, taking width the long playlist
    // titles needed. It sits at the end of the service line instead, where it still says
    // the row leaves the page.
    + `<span class="pltx"><b class="plttl">${esc(t)}</b>`
    + `<span class="plline"><span class="plsvc"></span><span class="plgo">${OPENGO}</span></span></span></a>`;
}
function paintPlay(){
  document.querySelectorAll("#panelBody a.plrow").forEach(a=>{
    const ap=a.dataset.ap||"", sp=a.dataset.spid||"", nm=a.dataset.style||"";
    const lbl=a.querySelector(".plsvc"); if(!lbl) return;
    const url = SVC==="spotify" ? (sp?"https://open.spotify.com/playlist/"+sp:"") : SVC==="apple" ? ap : "";
    if(url){
      a.classList.remove("off"); a.removeAttribute("aria-disabled");
      a.className="plrow "+(SVC==="spotify"?"sp":"pl");
      a.href=url; if(SVC==="spotify") a.dataset.sp=sp; else delete a.dataset.sp;
      lbl.textContent="Playlist on "+svcName();
      a.title="Open the "+nm+" playlist in "+svcName();
    } else {
      // the row stays so the section keeps its shape; it just can't be played here yet
      a.className="plrow off"; a.removeAttribute("href"); delete a.dataset.sp;
      a.setAttribute("aria-disabled","true");
      lbl.textContent="Not on "+svcName()+" yet";
      a.title="No "+svcName()+" playlist for "+nm+" yet";
    }
  });
}
// one plain sentence about the style: its own note when that is prose, otherwise built from the lineage
function about(n){
  const written=(typeof DESC!=="undefined"&&DESC[n.id])||"";
  if(written) return written;
  if(n.prose) return n.prose;
  const names = ids => ids.slice(0,3).map(i=>byId[i].name);
  const list = xs => xs.length<2 ? xs[0] : xs.slice(0,-1).join(", ")+" and "+xs[xs.length-1];
  const bits=[];
  if(n.parents.length) bits.push(`Grew out of ${list(names(n.parents))}${n.parents.length>3?" and others":""}.`);
  if(n.children.length) bits.push(`Led to ${n.children.length} ${n.children.length===1?"style":"styles"}.`);
  return bits.join(" ");
}
const SPK=`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.2H2.2v3.6H4L7.2 12V4z"/><path d="M9.8 6a2.6 2.6 0 0 1 0 4"/><path d="M11.8 4.2a5 5 0 0 1 0 7.6"/></svg>`;
const BRAND={apple:"#fa233b",spotify:"#1db954",qobuz:"#0070ef"};
let SVC="apple"; try{ SVC=localStorage.getItem("svc")||"apple" }catch(e){}
const spHref = name=>`https://open.spotify.com/search/${encodeURIComponent(name)}`;
const qbHref = name=>`https://www.qobuz.com/us-en/search?q=${encodeURIComponent(name)}`;
const svcHref = name=> SVC==="spotify" ? spHref(name) : SVC==="qobuz" ? qbHref(name) : amHref(name);
const svcName = ()=> SVC==="spotify" ? "Spotify" : SVC==="qobuz" ? "Qobuz" : "Apple Music";
const am = name=>`<a class="am" href="${svcHref(name)}" data-name="${esc(name)}" target="_blank" rel="noopener" title="Open ${esc(name)} in ${svcName()}" aria-label="${esc(name)}, open in ${svcName()}"><span>${esc(name)}</span><i class="amgo" aria-hidden="true">${OPENGO}</i></a>`;
function setSvc(s){
  SVC=s; try{ localStorage.setItem("svc",s) }catch(e){}
  document.querySelectorAll("a.am[data-name]").forEach(x=>{ x.href=svcHref(x.dataset.name); x.title="Open in "+svcName(); });
  document.querySelectorAll("[data-svc]").forEach(bt=>bt.setAttribute("aria-pressed",String(bt.dataset.svc===s)));
  document.querySelectorAll(".svc").forEach(el=>el.style.setProperty("--brand", BRAND[s]||"#0071e3"));
  paintPlay();
  if(s==="apple") amUpgrade();
  document.querySelectorAll(".svc .svctx").forEach(x=>{ x.textContent=svcName(); });
}
const amPending=new Map();
function amResolve(name){
  if(AMID[name]!==undefined) return Promise.resolve(AMID[name]);
  if(amPending.has(name)) return amPending.get(name);
  const p=fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=musicArtist&limit=5&country=US`).then(r=>r.json()).then(j=>{
    const rs=j.results||[]; const lc=name.toLowerCase();
    const hit=rs.find(r=>(r.artistName||"").toLowerCase()===lc)||rs.find(r=>(r.artistName||"").toLowerCase().replace(/^the /,"")===lc.replace(/^the /,""))||rs[0];
    AMID[name]=hit?hit.artistId:0; try{ localStorage.setItem("amid",JSON.stringify(AMID)) }catch(e){}
    return AMID[name];
  }).catch(()=>null).finally(()=>amPending.delete(name));
  amPending.set(name,p); return p;
}
// Both services open their web player when given an https link in a browser. Try the app's URL scheme first and
// fall back to the web link when nothing picks it up (e.g. inside the Claude desktop app's web view).
const MACOS=/Mac/.test(navigator.platform||"")&&!/iPhone|iPad|iPod/.test(navigator.userAgent||"")&&navigator.maxTouchPoints<2;
const APPLEOS=/Mac|iPhone|iPad|iPod/.test(navigator.platform||"")||/Mac|iPhone|iPad/.test(navigator.userAgent||"");
function deepFor(a){
  if(SVC==="qobuz") return a.href;                 // Qobuz has no documented URL scheme; stay on the web
  if(SVC==="spotify") return "spotify:search:"+encodeURIComponent(a.dataset.name||"");
  return a.href.replace(/^https:/,"music:");
}
function openArtist(name){
  const url=svcHref(name);
  const deep = SVC==="spotify" ? "spotify:search:"+encodeURIComponent(name) : url.replace(/^https:/,"music:");
  if(SVC==="qobuz" || !(MACOS||COARSE) || (SVC==="apple" && !APPLEOS)){ window.open(url,"_blank","noopener"); return; }
  let taken=false; const mark=()=>{taken=true};
  window.addEventListener("blur",mark); document.addEventListener("visibilitychange",mark);
  const f=document.createElement("iframe"); f.style.display="none"; f.src=deep; document.body.appendChild(f);
  setTimeout(()=>{ window.removeEventListener("blur",mark); document.removeEventListener("visibilitychange",mark); f.remove(); if(!taken) window.open(url,"_blank","noopener"); },1200);
}
const COARSE=matchMedia("(hover:none) and (pointer:coarse)").matches;
if(MACOS) document.addEventListener("click",e=>{
  const a=e.target.closest("a.am, a.pl, a.sp"); if(!a||e.metaKey||e.ctrlKey||e.shiftKey) return;
  const isPl=a.classList.contains("pl"), isSp=a.classList.contains("sp");
  if(!isPl && !isSp && SVC==="qobuz") return;               // no app scheme for Qobuz, let the link open normally
  if(!isPl && !isSp && SVC==="apple" && !APPLEOS) return;   // only Apple platforms have the Music app
  e.preventDefault();
  const url=a.href, deep=isPl ? a.href.replace(/^https:/,"music:") : isSp ? "spotify:playlist:"+a.dataset.sp : deepFor(a);
  let taken=false; const mark=()=>{taken=true};
  window.addEventListener("blur",mark); document.addEventListener("visibilitychange",mark);
  const f=document.createElement("iframe"); f.style.display="none"; f.src=deep; document.body.appendChild(f);
  setTimeout(()=>{ window.removeEventListener("blur",mark); document.removeEventListener("visibilitychange",mark); f.remove(); if(!taken) window.open(url,"_blank","noopener"); },1200);
});
function amUpgrade(){
  if(SVC!=="apple") return;
  document.querySelectorAll("a.am[data-name]").forEach(a=>{ const nm=a.dataset.name; amResolve(nm).then(id=>{ if(id && SVC==="apple") a.href=`${amScheme}music.apple.com/us/artist/${id}`; }); });
}
const byId = Object.fromEntries(nodes.map(n=>[n.id,n]));
nodes.forEach(n=>n.parents.forEach(p=>byId[p].children.push(n.id)));
const nEdges = nodes.reduce((a,n)=>a+n.parents.length,0);
const TOUCH = matchMedia("(hover:none) and (pointer:coarse)").matches;
const esc = s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $ = id=>document.getElementById(id);
const statsEl=document.createElement("span"); statsEl.id="stats"; statsEl.hidden=true; document.body.appendChild(statsEl);
$("stats").textContent = `${nodes.length} styles · ${nodes.filter(n=>n.year<1950).length} of them pre-1950 roots · ${nEdges} lineage links · ${FAMS.length} families`;

const AXH=30, END=2026;
const BAR=()=>$("spacer").offsetHeight;
let Z=1; const BASE=.576, ZMIN=.7, ZMAX=3.3; let LOD=false; // Z is shown as %, 100% = BASE scale
let NARROW, OVERLAY, LABELW, ROOTW, PX, RH, FS, R, PAD, X0, FSMIN, FSMAX;
function dims(){
  NARROW = innerWidth<700; OVERLAY = innerWidth<900;
  LABELW = NARROW?36:40; ROOTW = NARROW?280:340; PX = NARROW?38:34;
  RH = NARROW?25:21; FS = NARROW?13:12; R = NARROW?5:4.5; PAD = NARROW?7:9; X0 = LABELW+18;
  const k=Z*BASE; RH*=k; FS*=k; R*=k; PAD*=k; X0=LABELW+18*k;
  // Label size is held in a legible band and does not move with zoom. It used to be
  // FS*scale, which put 139 of the 460 labels under 9px and the smallest at 7.9px on a
  // desktop. 11px is the smallest size Apple sets text at, so that is the floor; the
  // hubs still read as hubs because the band keeps the same ranking. Density when you
  // zoom out is the LOD's job, not the type's: a map label stays readable and the map
  // drops labels instead, which is what Maps does.
  FSMIN = NARROW?11:11.5; FSMAX = NARROW?14:14.5;
  // The year scale was a fixed number of pixels per year, so on a wide window it ran
  // out before the canvas did and left dead space to the right of the last year.
  // Work out what 100% has to mean for this viewport so the span reaches the edge.
  // Width only: type and row height keep their own scale, so a wide screen spreads the
  // timeline rather than magnifying it.
  const room = scroller.clientWidth - (LABELW+18*BASE) - 40;
  const span = (ROOTW + (END-1950)*PX) * BASE;        // the axis at 100%, before filling
  // never below 1: on an ordinary screen the scale is untouched and the map scrolls,
  // and zooming out still shrinks, because the factor is fixed at 100% rather than
  // recomputed against the current zoom
  const FILL = room>0 ? Math.max(1, room/span) : 1;
  PX*=k*FILL; ROOTW*=k*FILL;
}
const xOf = y=> y<1950 ? X0+(Math.max(y,1895)-1895)/55*ROOTW : X0+ROOTW+(y-1950)*PX;
const mctx = document.createElement("canvas").getContext("2d");
const scroller=$("scroller");

let W=0,H=0,lanes=[];
const CMAX = Math.max(...nodes.map(n=>n.children.length));
// How much came out of a style is the one thing size says on this map, and a smooth
// square-root ramp said it too quietly: a leaf was 11.5px and the biggest trunk 14.5px,
// a quarter larger after twenty-five descendants. Five discrete tiers instead, because
// the eye groups steps and reads a continuous ramp as noise. Weight climbs with them.
const TIERS=[[12,4],[6,3],[3,2],[1,1],[0,0]];
const TIERFS=[[11.5,400],[12.5,400],[14,500],[16.5,600],[19,700]];
const TIERFS_N=[[11,400],[12,400],[13.5,500],[15.5,600],[18,700]];
nodes.forEach(n=>{ const c=n.children.length;
  n.tier = TIERS.find(t=>c>=t[0])[1];
  n.sc = 1.15+0.95*Math.sqrt(c/CMAX);
  n.fw = TIERFS[n.tier][1];
  n.bold = n.fw>=600; });
function layout(avail){
  lanes=[]; W=xOf(END)+40; nodes.forEach(n=>n.row=null);
  FAMS.forEach(([k])=>{
    const list = nodes.filter(n=>n.fam===k).sort((a,b)=>a.year-b.year||a.name.localeCompare(b.name));
    const ends=[], rowH=[];
    list.forEach(n=>{
      // the tier picks the size; the dot follows it so a big label never wears a small mark
      n.fs = (NARROW?TIERFS_N:TIERFS)[n.tier][0];
      n.r = R*(0.88+0.17*n.tier);
      mctx.font = `${n.fw} ${n.fs}px 'IBM Plex Sans', system-ui, sans-serif`;
      n.x = xOf(n.year);
      n.lod = LOD && n.children.length===0;           // leaf drawn as a dot only at overview zoom
      n.w = n.lod ? 0 : mctx.measureText(n.name).width;
      const need = n.lod ? n.x-n.r-2 : n.x-n.r-3;
      const free = r => r>=0 && r<ends.length && ends[r] <= need;
      // prefer the row of a same-family parent (latest first), then a same-family child-of-parent sibling row, then first free
      let r = -1;
      const pr = n.parents.map(p=>byId[p]).filter(p=>p.fam===k && p.row!=null).sort((a,b)=>b.year-a.year);
      // a style never sits above a parent in its own family, so lineage reads downward
      const minRow = pr.length ? Math.max(...pr.map(p=>p.row)) : 0;
      for(const p of pr){ if(free(p.row)){ r=p.row; break; } }
      if(r<0) r = ends.findIndex((e,i)=> i>=minRow && e <= need);
      // for the influential styles, keeping lineage downward is worth a new row; elsewhere take any free row
      const strict = pr.length && (n.bold || pr.some(p=>p.bold));
      if(r<0 && !strict) r = ends.findIndex(e=> e <= need);
      if(r<0){r=ends.length;ends.push(0);rowH.push(RH)}
      ends[r] = n.lod ? n.x+n.r+4 : n.x+n.r+6+n.w+12; n.row=r;
      rowH[r] = Math.max(rowH[r], n.lod ? RH*.8 : n.fs*1.5);
      W = Math.max(W, n.x+n.r+6+n.w+24);
    });
    while(rowH.length<2) rowH.push(RH);
    const off=[]; let acc=0; rowH.forEach((h,i)=>{off[i]=acc;acc+=h;});
    const need = (54 + 7.4*FAM[k].short.length) - PAD*2;   // room for the vertical pill label
    if(acc<need){ rowH[rowH.length-1]+=need-acc; acc=need; }
    lanes.push({k,list,rowH,off,inner:acc,count:list.length});
  });
  // stretch lanes so the chart fills the visible height
  const base = lanes.reduce((a,l)=>a+l.inner+PAD*2,0);
  const extra = avail>base ? (avail-base)/lanes.length : 0;
  let y=HEADH;                      // the title row sits in the chart, above the first lane
  lanes.forEach(l=>{
    l.h = l.inner+PAD*2+extra; l.y0=y;
    const top = y+PAD+extra/2;
    l.list.forEach(n=>{ n.rh=l.rowH[n.row]; n.y = top+l.off[n.row]+n.rh/2; });
    y+=l.h;
  });
  H=y;
}

function draw(){
  let ax=`<svg width="${W}" height="${AXH}"><text class="rt" x="${X0}" y="19">Roots, before 1950</text>`;
  ax += `<text x="${xOf(END)}" y="19" text-anchor="middle" class="now">${END}</text>`;
  for(let yr=1950; yr<=2025; yr+=5){ const x=xOf(yr); if(yr===2025) continue; ax += yr%10===0 ? `<text x="${x}" y="19" text-anchor="middle">${yr}</text>` : `<text x="${x}" y="19" text-anchor="middle" opacity=".55">’${String(yr).slice(2)}</text>`; }
  document.documentElement.style.setProperty("--stripw",(LABELW-8)+"px");
  $("axis").innerHTML = ax+`</svg><div id="corner" style="width:${LABELW-8}px;transform:translateX(${scroller.scrollLeft}px)"></div>`;
  let s="";
  // every lane carries a wash of its own family colour: the old alternating neutral was
  // five levels of luminance off the map and invisible. Two opacities keep the rhythm,
  // and the two ranges do not overlap, so the alternation cannot invert whichever
  // families end up adjacent - a light family at the low level stays darker than a
  // dark family at the high one. test/root.test.js holds that invariant.
  lanes.forEach((l,i)=>{
    s+=`<rect class="band${i%2?"":" b2"}" x="0" y="${l.y0}" width="${W}" height="${l.h}" style="fill:${FAM[l.k].c}"/>`;
    if(i) s+=`<line class="lanedge" x1="0" x2="${W}" y1="${l.y0}" y2="${l.y0}"/>`;
  });
  s+=`<line class="nowline" x1="${xOf(END)}" x2="${xOf(END)}" y1="0" y2="${H}"/>`;
  for(let yr=1950; yr<=2025; yr+=5){ const x=xOf(yr); s+=`<line class="${yr%10?'g5':'g10'}" x1="${x}" x2="${x}" y1="0" y2="${H}"/>`; }
  s+=`<g id="edges">`;
  nodes.forEach(c=>c.parents.forEach(pid=>{
    const p=byId[pid], x1=p.x, y1=p.y, x2=c.x, y2=c.y, dx=Math.max(28,(x2-x1)*.5);
    s+=`<path class="e" data-p="${p.id}" data-c="${c.id}" style="--c:${FAM[p.fam].c}" d="M${x1},${y1} C${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}"/>`;
  }));
  s+=`</g><g id="nodes">`;
  nodes.forEach(n=>{
    s+=`<g class="n${n.year<1950?' root':''}${n.lod?' leaf':''}${n.done?' has':''}" data-id="${n.id}" style="--c:${FAM[n.fam].c}" transform="translate(${n.x},${n.y})"><title>${esc(n.name)} (${esc(n.disp)})</title><rect class="hit" x="${-n.r-4}" y="${-n.rh/2}" width="${n.w+n.r*2+14}" height="${n.rh}"/><circle r="${(n.done?n.r*1.95:n.r).toFixed(2)}"/>${n.done
      ? `<path class="ply" d="M${(-n.r*.85).toFixed(2)} ${(-n.r*1.1).toFixed(2)}L${(n.r*1.15).toFixed(2)} 0L${(-n.r*.85).toFixed(2)} ${(n.r*1.1).toFixed(2)}Z"/>`:""}<text class="halo" aria-hidden="true" x="${n.r+5}" y="${n.fs*.36}" style="font-size:${n.fs.toFixed(1)}px;font-weight:${n.fw}">${esc(n.name)}</text><text x="${n.r+5}" y="${n.fs*.36}" style="font-size:${n.fs.toFixed(1)}px;font-weight:${n.fw}">${esc(n.name)}</text></g>`;
  });
  s+=`</g>`;
  const svg=$("chart"); svg.setAttribute("width",W); svg.setAttribute("height",H); svg.setAttribute("viewBox",`0 0 ${W} ${H}`); svg.style.setProperty("--fs",FS+"px"); svg.innerHTML=s;
  $("inner").style.width=W+"px";
  const L=$("lanes"); L.style.top=(BAR()+AXH)+"px"; L.style.setProperty("--lz",1);
  L.innerHTML = `<div class="lane fill" style="top:0;height:${HEADH}px;left:0;width:${LABELW-8}px"></div>` + lanes.map((l,i)=>`<div class="lane c" data-fam="${l.k}" style="--c:${FAM[l.k].c};top:${l.y0}px;height:${l.h}px;left:0;width:${LABELW-8}px" title="${esc(FAM[l.k].name)} · ${l.count} styles"><span class="vt">${esc(FAM[l.k].short)}</span><span class="cnt">${l.count}</span></div>`).join("");
  L.style.transform=`translateX(${scroller.scrollLeft}px)`;
}
scroller.addEventListener("scroll",()=>{ const t=`translateX(${scroller.scrollLeft}px)`; $("lanes").style.transform=t;
  const c=$("corner"); if(c) c.style.transform=t; },{passive:true});

// size the tree to the rest of the viewport
function fit(){}

// ---------- the map's title row ----------
// The title, the line about what the map is for and the two counts used to be the first
// card in the panel. They describe the map, not the panel, so they sit on the map, in a
// band above the first lane that layout() leaves empty for them.
let HEADH = 0;
function mapHeadHTML(){
  // a label on the map rather than a masthead: no blurb, nothing to click, and set quietly
  // enough that it does not compete with the style names a few pixels below it.
  return '<h1 class="mh">Offshoots</h1>'
    + '<p class="mmeta">'+nodes.length+' styles · '+playable().length+' playlists</p>';
}
function measureHead(){
  const h=$("maphead"); if(!h){ HEADH=0; return; }
  if(!h.firstChild) h.innerHTML=mapHeadHTML();
  h.style.top=(BAR()+AXH)+"px";
  h.style.width=Math.max(300,scroller.clientWidth)+"px";   // measured against the window, not the chart
  HEADH=Math.ceil(h.getBoundingClientRect().height);
}

// ---------- lineage ----------
function walk(id,key){ const m=new Map(), q=[[id,0]]; while(q.length){ const [c,d]=q.shift(); for(const x of byId[c][key]){ if(!m.has(x)){ m.set(x,d+1); q.push([x,d+1]); } } } return m; }
let state={sel:null,mode:"both"};
let PHEAD="";
const CHEVSVG='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l5 5 5-5"/></svg>';
// what kind of thing it is, as a shape: the word is there too, but the icon is what
// carries down a scrolled list
// What you will be doing with it, drawn as a shape. This is the medium, not the kind:
// an oral history can be a tape you play or a transcript you read, and a microphone on
// both promised audio that most of them do not have.
const MEDICON={"read":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3.2 4.6h5a2.4 2.4 0 0 1 1.8.8 2.4 2.4 0 0 1 1.8-.8h5v9.8h-5a2.4 2.4 0 0 0-1.8.8 2.4 2.4 0 0 0-1.8-.8h-5z\"/><path d=\"M10 5.4v10\"/></svg>","listen":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3.4 9.1v1.8\"/><path d=\"M6.4 6.4v7.2\"/><path d=\"M9.4 3.4v13.2\"/><path d=\"M12.4 5.8v8.4\"/><path d=\"M15.4 8.2v3.6\"/></svg>","watch":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"2.6\" y=\"4.6\" width=\"14.8\" height=\"10.8\" rx=\"2.4\"/><path d=\"M8.3 7.9l4.3 2.1-4.3 2.1z\"/></svg>","look":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"2.6\" y=\"5.4\" width=\"14.8\" height=\"10.4\" rx=\"2.4\"/><circle cx=\"10\" cy=\"10.6\" r=\"2.9\"/><path d=\"M6.9 5.4l1-1.6h4.2l1 1.6\"/></svg>","book":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4.4 3.4h3.2v13.2H4.4z\"/><path d=\"M8.4 3.4h3v13.2h-3z\"/><path d=\"M12.3 4.3l2.9.8-3.3 12-1-.3\"/></svg>","series":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"10\" cy=\"10\" r=\"7.2\"/><circle cx=\"10\" cy=\"10\" r=\"2.2\"/><path d=\"M10 4.6a5.4 5.4 0 0 1 5.4 5.4\"/></svg>"};





// Laid out like a news list rather than a stack of cards: what it is and who ran it on
// top, the headline next, and the reason to read it underneath. One block, hairlines
// between, so the eye runs down the titles instead of stopping at every box.
function readSect(n){
  const rows = (typeof READ!=="undefined" && READ[n.id]) || [];
  if(!rows.length) return "";
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  // A mark per row, so the eye has something to land on. Real favicons would be better
  // and are not available: nothing in this session can reach those hosts, and hotlinking
  // them would break the installed copy offline and tell every publisher who is reading.
  // So the mark is drawn from the data: the source's own initials, in the medium's colour.
  const SKIP=/^(the|of|and|a|an|for|on|in|at|de|la)$/i;
  const mono = p => {
    const t = p.replace(/^the\s+/i,"").trim();
    if(/^[A-Z0-9][A-Z0-9&.']{1,3}$/.test(t)) return t;          // NPR, PBS, KQED, SPIN
    const w = t.split(/[\s/.-]+/).filter(x=>x && !SKIP.test(x));
    if(w.length>=2) return w.slice(0,3).map(x=>x[0]).join("").toUpperCase();
    return (w[0]||t).slice(0,2).replace(/^./,c=>c.toUpperCase());
  };
  const items = rows.map(r=>{
    const kind = esc(r[4]);
    // the icon carries the medium; the word is added only where it is a promise the kind
    // does not already make, so no row ever reads "Audio Listen"
    const SAY={listen:"Listen",watch:"Watch"};
    const say = SAY[r[7]] && !/^(audio|documentary)$/.test(r[4]) ? SAY[r[7]] : "";
    // a 33 1/3 is one short book about one record, which makes it the narrowest door into
    // a style there is, so it gets the series badge and a record instead of a shelf
    const ser = r[4]==="33 1/3";
    // every one of these carried the same sentence, which told you nothing a glance at
    // the badge did not. The artist is the fact a title alone withholds (Psychocandy is
    // not much use without The Jesus and Mary Chain), so it takes the kicker, the badge
    // is left to the tile that already draws it, and the note goes.
    // a series row spends its kicker on the record, which the title alone withholds, and
    // drops the year: the badge and the author are enough to know what you are opening,
    // and three facts ran the line onto a second one.
    const kicker = (ser
        ? (r[8] ? `<i class="rdk rdby">${esc(r[8])}</i> \u00b7 ${esc(r[2])}`
                : `${esc(r[2])} \u00b7 ${r[3]}`)
        : `<i class="rdk">${esc(cap(r[4]))}</i>`
          + (say ? ` <i class="rdv">${say}</i>` : "")
          + ` \u00b7 ${esc(r[2])} \u00b7 ${r[3]}`)
      + (r[5] ? ` <i class="rdw">${esc(cap(r[5]))}</i>` : "");
    return `<a class="rd rd-${ser?"series":esc(r[7])}" href="${esc(r[0])}" target="_blank" rel="noopener noreferrer" title="${kind}, ${esc(r[7])}">`
      + `<i class="rdi">${ser ? `<b class="rdser">33\u2153</b>`
          : r[7]==="book" ? MEDICON.book
          : (m=>`<b class="rdmo${m.length>3?" wide":""}">${esc(m)}</b>`)(mono(r[2]))}</i>`
      + `<span class="rdx"><span class="rdm">${kicker}</span>`
      + `<span class="rdt">${esc(r[1])}</span>`
      + (r[6] ? `<span class="rdn">${esc(r[6])}</span>` : "") + `</span></a>`;
  }).join("");
  return sect("read","Go deeper",`<div class="reads">${items}</div>`,
    `<span class="sectaside">${rows.length} ${rows.length===1?"source":"sources"}</span>`);
}

function sect(key,label,html,aside,page){
  // a heading that opens a fuller version of what is under it becomes the control that
  // opens it, chevron and all, rather than sitting beside a separate row that does
  const inner = `<h3 class="secttl">${esc(label)}</h3>${aside||""}`
    + (page?`<span class="sectcv">${GOCHEV}</span>`:"");
  const head = label
    ? (page ? `<button type="button" class="secthead sectgo" data-page="${esc(page)}"
         aria-label="${esc(label)}, see all">${inner}</button>`
             : `<div class="secthead">${inner}</div>`)
    : "";
  return `<div class="sect sect-${key}${label?"":" nohead"}">${head}<div class="secbody">${html}</div></div>`;
}
const HOPS=2; // generations of lineage drawn on the map
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// center a node in the part of the map that is actually visible:
// the lane strip is pinned at the left, the toolbar and axis sit over the top
// How much of the map the floating sheet covers. Zero on desktop, where the panel is a
// docked column beside the map rather than over it.
function sheetCover(){
  if(!OVERLAY) return 0;
  const el=$("panel");
  if(!el || document.body.classList.contains("sheetgone")) return 0;
  const r=el.getBoundingClientRect(), s=scroller.getBoundingClientRect();
  return Math.max(0, Math.round(s.bottom - r.top));
}
function centerOn(n,smooth,onlyIfNeeded){
  const padL = LABELW, padT = BAR()+AXH;
  const availW = Math.max(40, scroller.clientWidth - padL);
  // centre in the band still showing, not in the scroller, or the style lands behind the sheet
  const availH = Math.max(40, scroller.clientHeight - padT - sheetCover());
  if(onlyIfNeeded){
    // a tap on the map shouldn't slide the map out from under the next tap:
    // leave it alone while the style sits in the middle of what's visible
    const vx = n.x - scroller.scrollLeft - padL, vy = n.y - scroller.scrollTop;
    const mx = availW*.22, my = availH*.22;
    if(vx>mx && vx<availW-mx && vy>my && vy<availH-my) return;
  }
  scroller.scrollTo({
    left: Math.max(0, n.x - padL - availW/2),
    top:  Math.max(0, n.y - availH/2),
    behavior:(smooth&&!reduce)?"smooth":"auto"
  });
}

// repaint:false keeps the panel's DOM as it is and only redraws the map highlighting.
// resizing and zooming use it, so the cover <img> isn't torn down and reloaded (which flickers).
// A view is where the user was: a style, or the overview with whatever listening mode
// they had open. Four taps into a lineage it is easy to lose the way out, so every real
// change of view drops a crumb and the floating button walks back down the trail.
const TRAIL=[], TRAILMAX=30;
function hereNow(){ return {sel:state.sel||null, mode:(typeof MODE!=="undefined"&&MODE)||null}; }
function pushTrail(){
  const v=hereNow(), last=TRAIL[TRAIL.length-1];
  if(last && last.sel===v.sel && last.mode===v.mode) return;   // nothing actually changed
  TRAIL.push(v); if(TRAIL.length>TRAILMAX) TRAIL.shift();
  syncBack();
}
let GOINGBACK=false;
function goBack(){
  closeNav();
  const v=TRAIL.pop(); if(!v) return;
  GOINGBACK=true;
  try{
    if(typeof MODE!=="undefined") MODE=v.mode;
    if(v.sel && byId[v.sel]) select(v.sel,{scroll:true,smooth:!reduce});
    else clearSel();
  } finally { GOINGBACK=false; }
  syncBack();
}
function backLabel(){
  const v=TRAIL[TRAIL.length-1]; if(!v) return "";
  if(!v.sel) return "Back to the map";
  const n=byId[v.sel];
  return n ? "Back to "+n.name : "Back";
}
// back presses needed to reach the overview. The map may not be in the trail at all,
// which happens on a shared link, and that is exactly when the shortcut earns its place.
function goHome(){
  if(!state.sel) return;
  TRAIL.length=0;                    // home is a reset, not another step: back goes with it
  if(typeof MODE!=="undefined") MODE=null;
  GOINGBACK=true;
  try{ clearSel(); } finally { GOINGBACK=false; }
  syncBack();
}
function syncBack(){
  // the root pill stays over the map whenever you are not looking at the unselected
  // root, so there is always one tap back to the whole picture
  // a disabled pill sitting over the lane strip is a control that does nothing taking up
  // the one corner the map has: it goes when there is nowhere to go back to
  const hm=$("mapHome");
  if(hm){ hm.hidden = !state.sel; hm.disabled = false; }
  // back itself lives in the panel now, where it is not sitting beside a From button
  const b=$("panelBack"); if(!b) return;
  // a pushed page owns the back button while it is up: it is the nearer thing to leave
  if(PSTACK.length){
    const under = PSTACK.length>1 ? PSTACK[PSTACK.length-2].title : (state.sel ? byId[state.sel].name : "Explore");
    b.hidden=false; b.setAttribute("aria-label","Back to "+under); b.setAttribute("title","Back to "+under);
    const t0=b.querySelector(".bklbl"); if(t0) t0.textContent=under;
    b.classList.remove("tomap"); b.classList.add("topage");
    return;
  }
  const l=backLabel();
  b.hidden=!l; if(!l) return;
  b.setAttribute("aria-label",l); b.setAttribute("title",l);
  b.classList.remove("topage");
  const v=TRAIL[TRAIL.length-1], toMap=!(v&&v.sel&&byId[v.sel]);
  const t=b.querySelector(".bklbl");
  if(t) t.textContent = toMap ? "" : byId[v.sel].name;
  b.classList.toggle("tomap",toMap);
}
function select(id,{scroll=true,smooth=true,keepPlace=false,repaint=true}={}){
  if(!byId[id]) return;
  const switched = state.sel!==id;
  if(switched && !GOINGBACK) pushTrail();
  state.sel=id; closeNav();
  // only a real change of style brings a dismissed sheet back; re-selects from
  // resize, zoom and setOpen must leave it where the user put it
  if(switched) restoreSheet();
  syncPull();
  const n=byId[id];
  const anc=walk(id,"parents"), desc=walk(id,"children");
  // the map highlights two generations each way; the panel still lists the full ancestry
  const near=m=>new Map([...m].filter(([,d])=>d<=HOPS));
  const ancV=near(anc), descV=near(desc);
  const showA = state.mode!=="desc", showD = state.mode!=="anc";
  const on=new Set([id]); if(showA) ancV.forEach((_,k)=>on.add(k)); if(showD) descV.forEach((_,k)=>on.add(k));
  const svg=$("chart"); svg.classList.add("sel");
  const depth=k=>Math.min(showA&&ancV.has(k)?ancV.get(k):99, showD&&descV.has(k)?descV.get(k):99);
  svg.querySelectorAll(".n").forEach(g=>{ const k=g.dataset.id, dp=k===id?0:depth(k); g.classList.toggle("on",on.has(k)); g.classList.toggle("cur",k===id); g.classList.toggle("d2",dp===2); g.classList.toggle("d3",dp>=3&&dp<99); });
  svg.querySelectorAll(".e").forEach(e=>{
    const p=e.dataset.p, c=e.dataset.c;
    const a = showA && ancV.has(p) && (c===id||ancV.has(c));
    const d = showD && descV.has(c) && (p===id||descV.has(p));
    e.classList.toggle("on",a||d);
    e.classList.toggle("dir",(a&&c===id)||(d&&p===id));
    const ed = a ? ancV.get(p) : d ? descV.get(c) : 0;
    e.classList.toggle("d2",ed===2); e.classList.toggle("d3",ed>=3);
  });
  const cur=svg.querySelector(`.n[data-id="${id}"]`); if(cur) cur.parentNode.appendChild(cur);
  const fams=new Set([...on].map(k=>byId[k].fam));
  // [data-fam], so the filler above the first family is never dimmed along with them
  $("lanes").querySelectorAll(".lane[data-fam]").forEach(l=>l.classList.toggle("dim",!fams.has(l.dataset.fam)));
  const fromNote=n.note.replace(/^[^:]{0,40}:\s*/,"").split(/;|\s·\s/)[0].replace(/\s*\([^)]*\)/g,"").replace(/'[^']*'/g,"").replace(/\s+,/g,",").replace(/,\s*,/g,",").trim().replace(/^,|,$/g,"");
  // a note that is just a list of names becomes the artist list; prose stays a note
  const JOIN=new Set(["in","the","of","and","a","an","on","at","for","to","de","la","le","du","des","el","y"]);
  const titleish = s=>{ const w=s.split(/\s+/); return w.length<=6 && w.every(x=> x==="&" || x==="+" || /^[("\u2018\u201c]*[A-Z0-9]/.test(x) || JOIN.has(x.toLowerCase().replace(/[^a-z]/g,""))); };
  const items = fromNote ? fromNote.split(",").map(s=>s.trim()).filter(Boolean) : [];
  const prose = /(?:^|\s)[a-z]+ed\b.*\bin\b/.test(fromNote||"")            // lowercase verb: prose, not a name
    || /\bvia\b|\bfrom\b|\bscene\b|\bera\b|\bstyle\b|\bmusic\b/i.test(fromNote||"");
  const looksLikeArtists = items.length>=1 && !prose && items.every(titleish);
  // Notes often open with where a style came from: "UK; named by Whistla 2009" or
  // "Johannesburg; three kicks per bar". The head before the semicolon is usually the
  // artist list, so that is what this reads, and a place at the front was being drawn as
  // a key artist. A single-word rule would have been wrong: Nirvana, Prince, Chic, Burial
  // and 240 others are one word. So the places are named instead.
  const PLACE=/^(UK|US|USA|US\/UK|Japan|Ghana|Trinidad|Jamaica|Dominican|Rotterdam|Durban|Johannesburg|Lagos|Medellín|Berlin\/Milan|Goa|India|South Africa|1080p)$|-led$/i;
  n.noteNames = looksLikeArtists ? fromNote.split(",").map(s=>s.trim()).filter(x=>x&&!PLACE.test(x)) : [];
  n.prose = looksLikeArtists ? "" : (n.note||"");
  const whoList = [...new Set([...n.noteNames,...n.artists])];
  n.whoList = whoList;
  // back on the left, the two lineage menus paired on the right. Back used to float over
  // the map beside the root pill, where it sat next to a From button that also pointed
  // left and meant something else entirely.
  PHEAD = `<div class="pcard"><div class="navrow">`
    + `<button id="panelBack" class="navback" type="button" hidden aria-label="Back" title="Back">`
    + `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 10H4.6"/><path d="M9.4 4.6L4 10l5.4 5.4"/></svg>`
    + `<span class="bklbl"></span>`
    + `<svg class="bkmap" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.8 5.6 7.4 3.6v10.8l-4.6 2z"/><path d="M7.4 3.6 12.6 5.6v10.8L7.4 14.4z"/><path d="M12.6 5.6 17.2 3.6v10.8l-4.6 2z"/></svg></button>`
    + lineageTitle(n)
    + CLOSEBTN
    + `</div>`;                       // .pcard stays open: .more goes inside it, so the
                                      // sticky header has the whole card to stick within
  setExpandLabel("", `${n.parents.length} from · ${n.children.length} led to`, `${n.parents.length} from · ${n.children.length} led to`);
  if(repaint){
    panel(n,anc,desc); amUpgrade();
    setPbar(n.name, n.year<1950?n.disp:"c. "+n.year);
  }
  sizeCard();
  setTint(n.fam);
  setHash(id); syncShare(); syncBack();
  if(scroll) centerOn(n,smooth,keepPlace);
}

// ---------- panel open / close ----------
let OPEN=false;
function ICONSRC(){const l=document.querySelector('link[rel="apple-touch-icon"]')||document.querySelector('link[rel="icon"]');return l?l.href:"";}
function setExpandLabel(name,tail,shortTail){ const b=$("expand"); b.dataset.name=name; b.dataset.tail=tail||""; b.dataset.stail=shortTail===undefined?(tail||""):shortTail; b.title=(name+(tail?" · "+tail:"")); if(!OPEN) paintExpand(); }
function paintExpand(){ const b=$("expand"), l=b.querySelector(".lbl"); if(!l) return;
  if(OPEN){ l.innerHTML="Close"; return; }
  const n0=b.dataset.name||"", nm=n0?`<b>${esc(n0)}</b>`:"", sep=n0?" · ":"", t=b.dataset.tail, s=b.dataset.stail;
  l.innerHTML = `<span class="long">${nm}${t?`<span class="ct">${sep}${esc(t)}</span>`:""}</span>`
              + `<span class="short">${nm}${s?`<span class="ct">${sep}${esc(s)}</span>`:""}</span>`; }
// The sheet's two states are height:auto and height:70vh, and no browser interpolates
// to or from auto, so the CSS transition never ran and the change read as a jump. Measure
// both ends in pixels, animate between them, then hand the height back to the stylesheet
// so later content changes still size it.
let GLIDING=false;
function glideSheet(from){
  const el=$("panel"); if(!el) return;
  el.style.transition="none";
  el.style.maxHeight=""; el.style.height="";   // let the stylesheet state its target
  const to=el.offsetHeight;
  if(Math.abs(to-from)<2){ el.style.transition=""; GLIDING=false; return; }
  GLIDING=true;
  // the minimised state caps the sheet at 46vh, which would clamp the open height away
  // before the first frame and leave nothing to animate. The cap is off for the duration.
  el.style.maxHeight="none";
  el.style.height=from+"px";
  el.getBoundingClientRect();               // flush, so the next value is a change to animate
  el.style.transition="";
  requestAnimationFrame(()=>{
    el.style.height=to+"px";
    const done=e=>{ if(e.target!==el||e.propertyName!=="height") return;
      el.removeEventListener("transitionend",done); GLIDING=false; el.style.height=""; el.style.maxHeight=""; };
    el.addEventListener("transitionend",done);
    setTimeout(()=>{ el.removeEventListener("transitionend",done); GLIDING=false; el.style.height=""; el.style.maxHeight=""; },600);
  });
}
function setOpen(v){
  const glide = OVERLAY && !reduce;
  const from = glide ? Math.round($("panel").getBoundingClientRect().height) : 0;
  setOpenNow(v);
  if(glide) glideSheet(from);
}
function setOpenNow(v){ closeNav(); OPEN=v; setTimeout(sizeCard,0); setTimeout(syncMapPad,0); setTimeout(syncMapPad,380); if(OVERLAY && state.sel) setTimeout(()=>{ if(state.sel) select(state.sel,{scroll:true,smooth:!reduce,repaint:false}) },260); $("panel").classList.toggle("open",v); document.body.classList.toggle("open",v); $("expand").setAttribute("aria-expanded",v); $("expand").setAttribute("aria-label",v?"Hide details":"Show details"); $("pclose").setAttribute("aria-label",v?"Collapse details":"Expand details"); { const g=$("grab"); if(g){ g.setAttribute("aria-expanded",String(v)); g.setAttribute("aria-label",v?"Collapse details":"Expand details"); } } paintExpand(); if(v) $("panel").scrollTop=0; }
function openPanel(){ setOpen(true); }
function closePanel(){ setOpen(false); }
function syncPeek(){}
$("expand").onclick=()=>setOpen(!OPEN);
// on phones the sheet reacts to scrolling: swipe up to open it, pull down past the top to put it away
(function(){
  const el=$("panel"), body=$("panelBody"); if(!el||!body) return;
  let y0=0, x0=0;
  const atTop=()=> body.scrollTop<=0;
  el.addEventListener("touchstart",e=>{ y0=e.touches[0].clientY; x0=e.touches[0].clientX; },{passive:true});
  el.addEventListener("touchmove",e=>{
    if(!OVERLAY || DRAGGING || e.target.closest("#grab")) return;
    const t=e.touches[0], dy=t.clientY-y0;            // positive = finger moving down
    if(!OPEN){ if(dy<-20){ setOpen(true); y0=t.clientY; } return; }
    // a sideways swipe over a row of chips is not a pull
    if(Math.abs(t.clientX-x0) > Math.abs(dy)) return;
    // while there is still content above, the pull scrolls instead: keep the reference under
    // the finger so the distance is measured from the moment the top is actually reached,
    // and one continuous pull from halfway down the sheet still closes it
    if(!atTop()){ y0=t.clientY; return; }
    if(dy>44){ setOpen(false); y0=t.clientY; }
  },{passive:true});
  // trackpads and mice get the same behaviour in a narrow window
  let acc=0, t=0;
  el.addEventListener("wheel",e=>{
    if(!OVERLAY || DRAGGING) return;
    const now=Date.now(); if(now-t>400) acc=0; t=now; acc+=e.deltaY;
    if(!OPEN && acc>24){ setOpen(true); acc=0; }
    else if(OPEN && atTop() && acc<-80){ setOpen(false); acc=0; }
  },{passive:true});
})();
// once the panel scrolls, swap the search field for an icon and keep the style's name in view
let PBAR={t:"",s:""};
function setPbar(t,s){ PBAR={t:t||"",s:s||""}; const a1=$("pbarTitle"), a2=$("pbarSub"); if(a1) a1.textContent=PBAR.t; if(a2) a2.textContent=PBAR.s; }
(function(){
  const body=$("panelBody"), bar=$("pbar"), btn=$("mapSearch"); if(!body||!bar) return;
  // the big title scrolling under the bar is what brings the compact one in, the way a
  // phone app hands a screen's name to its header. Measured rather than guessed at a
  // pixel count, since the title is one line on some pages and three on others.
  const sync=()=>{
    document.body.classList.toggle("pscrolled", body.scrollTop>2);
    const pages=[...body.querySelectorAll(".ppage")].filter(x=>!x.hidden);
    const big=(pages[0]||body).querySelector(".bigttl");
    const nav=body.querySelector(".pcard .navrow");
    let under=false;
    if(big&&nav) under = big.getBoundingClientRect().bottom <= nav.getBoundingClientRect().bottom + 2;
    document.body.classList.toggle("pttl", under);
    const slot=nav&&nav.querySelector(".navttl.ovttl .mn");
    if(slot&&big){ const t=(big.querySelector(".mn")||big).textContent.trim();
      if(slot.textContent!==t) slot.textContent=t; }
  };
  body.addEventListener("scroll",sync,{passive:true});
  addEventListener("resize",sync);
  if(btn){
    btn.addEventListener("click",openSearch);
    // iOS needs focus inside the gesture, but only treat it as a tap: a touch that
    // moves (the start of a scroll) must not open search
    let tp=null;
    btn.addEventListener("touchstart",e=>{ const t=e.touches[0]; tp=t?{x:t.clientX,y:t.clientY}:null; },{passive:true});
    btn.addEventListener("touchmove",e=>{ const t=e.touches[0]; if(tp&&t&&(Math.abs(t.clientX-tp.x)>8||Math.abs(t.clientY-tp.y)>8)) tp=null; },{passive:true});
    btn.addEventListener("touchcancel",()=>{ tp=null; },{passive:true});
    btn.addEventListener("touchend",e=>{ if(!tp) return; tp=null; e.preventDefault(); openSearch(); },{passive:false});
  }
  setTimeout(sync,200);
})();
// the sheet's grab handle: tap toggles, a vertical drag resizes and snaps to the nearer state
let MINH=0, DRAGGING=false;
const dismissable = ()=> OVERLAY && !OPEN;
// closing remembers whether the sheet was open or peeking, so reopening gives back the
// state it was put away in rather than always the smallest one
let WASOPEN=false;
function dismissSheet(){ WASOPEN=OPEN; syncPull(); document.body.classList.add("sheetgone"); setOpen(false); }
function restoreSheet(){ document.body.classList.remove("sheetgone"); if(WASOPEN) setOpen(true); }
function syncPull(){ const el=$("sheetpull"); if(!el) return; const l=el.querySelector(".plbl"); if(!l) return;
  const n=state.sel&&byId[state.sel];
  l.textContent = n ? n.name : "Offshoots";
  el.setAttribute("aria-label", n ? "Show details for "+n.name : "Show the map details");
  el.setAttribute("title", l.textContent);
  // wear the family ground the panel is painted with; its inline vars survive display:none
  const pan=$("panel");
  const tint=pan?pan.style.getPropertyValue("--tint").trim():"";
  const ink=pan?pan.style.getPropertyValue("--ink").trim():"";
  if(tint&&ink){ el.style.setProperty("--pullbg",tint); el.style.setProperty("--pullfg",ink); }
  else { el.style.removeProperty("--pullbg"); el.style.removeProperty("--pullfg"); } }
function sheetMin(){ return MINH || 170; }
// the ceiling has to be the height the open state actually uses, or dragging up from an
// open sheet pulls it down to the ceiling instead
function sheetMax(){ return Math.round(innerHeight*0.7); }
(function(){
  const g=$("grab"), el=$("panel"); if(!el) return;
  let y0=0, h0=0, t0=0, active=false, tapToggles=false;
  const measureMin=()=>{ if(!OPEN && OVERLAY) MINH=el.offsetHeight; };
  addEventListener("load",measureMin); setTimeout(measureMin,300);

  // one gesture, two places to start it: the handle, and the card's header, which is the
  // part of an open sheet a thumb lands on. A drag from the header must not also fire the
  // share button underneath it, so the click after a real drag is swallowed.
  function begin(e,toggles){
    if(!OVERLAY || active) return;
    active=true; DRAGGING=false; tapToggles=toggles;
    y0=e.clientY; h0=el.offsetHeight; t0=Date.now();
    addEventListener("pointermove",move,{passive:false});
    addEventListener("pointerup",end); addEventListener("pointercancel",end);
  }
  function move(e){
    if(!active) return;
    const dy=y0-e.clientY;
    if(!DRAGGING && Math.abs(dy)<4) return;
    if(!DRAGGING){ DRAGGING=true; document.body.classList.add("dragging"); }
    if(e.cancelable) e.preventDefault();
    const floor = dismissable() ? 0 : sheetMin();
    el.style.height=Math.max(floor, Math.min(sheetMax(), h0+dy))+"px";
    syncMapPad();
  }
  function end(e){
    if(!active) return; active=false;
    removeEventListener("pointermove",move); removeEventListener("pointerup",end); removeEventListener("pointercancel",end);
    const dt=Date.now()-t0, dy=y0-e.clientY;
    const hNow=el.offsetHeight;
    document.body.classList.remove("dragging");
    if(!DRAGGING){                                   // a tap, not a drag
      el.style.height="";
      if(tapToggles) setOpen(!OPEN);                 // the header lets its own click through
      DRAGGING=false; return;
    }
    DRAGGING=false;
    swallowClick();
    const flick = dt<260 && Math.abs(dy)>24;                   // quick flick wins over position
    // the inline height stays on until setOpen has read it, so the snap continues
    // from where the finger let go instead of starting over from the CSS value
    if(dismissable() && (flick ? dy<0 : hNow < sheetMin()*0.62)){ el.style.height=""; dismissSheet(); return; }
    const open = flick ? dy>0 : hNow > (sheetMin()+sheetMax())/2;
    setOpen(open);
  }
  function swallowClick(){
    const eat=ev=>{ ev.preventDefault(); ev.stopPropagation(); };
    addEventListener("click",eat,true);
    setTimeout(()=>removeEventListener("click",eat,true),0);
  }
  if(g){
    g.addEventListener("pointerdown",e=>{ begin(e,true); });
    g.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); setOpen(!OPEN); } });
  }
  // delegated, because the card is rebuilt on every selection
  el.addEventListener("pointerdown",e=>{
    if(!OPEN || e.target.closest("#grab")) return;
    // the overview used to be the only card with a .phead, so this gesture lived there
    // alone. Both cards carry the same .navrow now, so it works on either. The root's row
    // holds no controls any more and is 13px tall, so its large title is part of the grip.
    if(!e.target.closest(".pcard .navrow") && !e.target.closest(".ovcard .bigttl")) return;
    begin(e,false);
  });
})();
document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ if(!$("wikiwrap").hidden){ closeWiki(); return; } if(popPage()) return; if(OPEN) closePanel(); else if(state.sel&&document.activeElement!==$("q")) clearSel(); } });

const chip = (id,extra)=>{ const n=byId[id]; const yr=n.year<1950?n.disp:n.year;
  const tip=esc(n.name+" · "+yr+(extra?" · "+extra:"")+(n.done?" · playlist":""));
  return `<button class="chip c" style="--c:${FAM[n.fam].c}" data-go="${n.id}" title="${tip}" aria-label="${tip}"><i class="nm">${esc(n.name)}</i><span title="Styles it led to">${n.children.length}</span></button>`; };
// a small mark on the year line: enough to read as tappable without pulling the
// style name off centre, which the grid works hard to keep it on
const SHAREGLYPH='<svg class="shg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13V3"/><path d="M6.5 6.5L10 3l3.5 3.5"/><path d="M5 11v5.5h10V11"/></svg>';
const CHEV={from:'<svg class="cv" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.4L5.4 8l4.6 4.6"/></svg>',
             led:'<svg class="cv" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.4L10.6 8 6 12.6"/></svg>'};
function navBtn(kind,ids){
  const label = kind==="from" ? "From" : kind==="roots" ? "Roots" : "Led to";
  const n=ids.length;
  const title = kind==="roots" ? `Roots: ${n} styles with nothing before them here`
    : n ? `${label}: ${n} ${n===1?"style":"styles"}` : (kind==="from"?"A root style: nothing before it here":"Nothing grew out of this one here");
  const items = ids.map(id=>{ const x=byId[id];
    return `<button type="button" role="menuitem" data-go="${x.id}"><i class="dot" style="background:${FAM[x.fam].c}"></i><span class="nm">${esc(x.name)}</span><small>${x.year<1950?esc(x.disp):x.year}</small></button>`;
  }).join("");
  return `<div class="navwrap nav-${kind}">`
    + `<button type="button" class="navbtn" data-menu="${kind}" aria-haspopup="menu" aria-expanded="false"`
    + ` title="${esc(title)}" aria-label="${esc(title)}"${n?"":" disabled"}>`
    + (kind==="from"?CHEV.from:"")
    + `<em class="ct">${n}</em>`
    + (kind==="led"||kind==="roots"?CHEV.led:"")
    + `</button>`
    + (n?`<div class="navmenu" role="menu" hidden><div class="navhd">${label}</div>${items}</div>`:"")
    + `</div>`;
}
const chips = ids=> ids.length ? `<div class="chips">${ids.map(id=>chip(id)).join("")}</div>` : `<p class="empty">None in this map.</p>`;
const byYear = (a,b)=>byId[a].year-byId[b].year||byId[a].name.localeCompare(byId[b].name);

function noteHtml(n){
  const names=[...new Set([...(n.noteNames||[]),...n.artists])].filter(x=>x.length>2).sort((a,b)=>b.length-a.length);
  if(!names.length) return esc(n.note);
  const re=new RegExp("(?<!\\w)("+names.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")+")(?!\\w)","g");
  return n.note.split(re).map((s,i)=>i%2?am(s):esc(s)).join("");
}
// playlist and key artists are two subdivisions of one Listen section, with the
// service switch in its header governing both
const SVCCHEV='<svg class="svcchev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6.5L8 10.5l4-4"/></svg>';
function svcPicker(kind){ return `<span class="svc${kind==="inline"?" svcinline":""}">`
  + `<span class="svctx">${esc(svcName())}</span>${SVCCHEV}`
  + `<select class="svcsel" aria-label="Streaming service">`
  + `<option value="apple"${SVC==="apple"?" selected":""}>Apple Music</option>`
  + `<option value="spotify"${SVC==="spotify"?" selected":""}>Spotify</option>`
  + `<option value="qobuz"${SVC==="qobuz"?" selected":""}>Qobuz</option>`
  + `</select></span>`; }
// one control at the top right of every panel: it puts the card away and leaves the map
// whole. The pull tab at the bottom of the screen brings it back.
const CLOSEBTN=`<button type="button" class="pmin" data-dismiss aria-label="Close this panel" title="Close this panel"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5.5 5.5l9 9"/><path d="M14.5 5.5l-9 9"/></svg></button>`;

// From and Led to were a segmented pill in the header, which gave the two directions of
// the whole map less room than the playlist row. They are the same grouped list the
// panel uses for its other collections, in the body, under the thing you can listen to.
function lineageRow(kind,ids){
  const n=ids.length, label = kind==="from" ? "Came from" : "Led to";
  const title = n ? `${label}: ${n} ${n===1?"style":"styles"}`
    : (kind==="from" ? "A root style: nothing before it here" : "Nothing grew out of this one here");
  const items=ids.map(id=>{ const x=byId[id];
    return `<button type="button" role="menuitem" data-go="${x.id}"><i class="dot" style="background:${FAM[x.fam].c}"></i><span class="nm">${esc(x.name)}</span><small>${x.year<1950?esc(x.disp):x.year}</small></button>`; }).join("");
  return `<div class="navwrap nav-${kind}">`
    + `<button type="button" class="listrow" data-menu="${kind}" aria-haspopup="menu" aria-expanded="false"`
    + ` title="${esc(title)}" aria-label="${esc(title)}"${n?"":" disabled"}>`
    + `<i class="lrico"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LINICON[kind]}</svg></i>`
    + `<span class="lrlbl">${label}</span><em class="lrct">${n}</em>${n?LRCHEV:""}</button>`
    + (n?`<div class="navmenu" role="menu" hidden>${items}</div>`:"")
    + `</div>`;
}
const LINICON={"from": "<path d=\"M10 16.8V9.2\"/><path d=\"M10 9.2L5.2 4.4\"/><path d=\"M10 9.2l4.8-4.8\"/><circle cx=\"5.2\" cy=\"3.8\" r=\"1.3\"/><circle cx=\"14.8\" cy=\"3.8\" r=\"1.3\"/>", "led": "<path d=\"M10 3.2v7.6\"/><path d=\"M10 10.8l-4.8 4.8\"/><path d=\"M10 10.8l4.8 4.8\"/><circle cx=\"5.2\" cy=\"16.2\" r=\"1.3\"/><circle cx=\"14.8\" cy=\"16.2\" r=\"1.3\"/>"};
function lineageSect(n){
  // one row, two halves: the directions are a pair and read as one control that way
  return sect("lineage","",`<div class="listgrp two">`
    + lineageRow("from",[...n.parents].sort(byYear))
    + lineageRow("led",[...n.children].sort(byYear))
    + `</div>`);
}
// The name is the lineage control. From and Led to were a segmented pill, then a pair of
// rows in the card; both spent a line of the panel on something the title can carry,
// since what a style came from and led to is what its name means here. One tap opens
// both lists at once, parents on the left and children on the right, which is also how
// they sit on the map.
function lineageCol(kind,ids){
  const label = kind==="from" ? "Came from" : "Led to";
  const items = ids.length
    ? ids.map(id=>{ const x=byId[id];
        return `<button type="button" role="menuitem" data-go="${x.id}"><i class="dot" style="background:${FAM[x.fam].c}"></i><span class="nm">${esc(x.name)}</span><small>${x.year<1950?esc(x.disp):x.year}</small></button>`; }).join("")
    : `<p class="lnone">${kind==="from"?"Nothing before it here":"Nothing out of it here"}</p>`;
  return `<div class="lcol lcol-${kind}"><div class="navhd">${label} <em>${ids.length}</em></div>${items}</div>`;
}
function lineageTitle(n){
  const from=[...n.parents].sort(byYear), led=[...n.children].sort(byYear);
  const t=`${from.length} came from \u00b7 ${led.length} led to`;
  return `<div class="navwrap nav-lineage">`
    + `<button type="button" class="navttl" data-menu="lineage" aria-haspopup="menu" aria-expanded="false" title="${esc(t)}" aria-label="${esc(n.name)}. ${esc(t)}">`
    + `<span class="mn">${esc(n.name)}</span>`
    + `<span class="my"><span class="yr">${n.year<1950?esc(n.disp):"c. "+n.year}</span>${LRCHEV}</span>`
    + `</button>`
    + `<div class="navmenu lineagemenu" role="menu" hidden><div class="twocol">`
    + lineageCol("from",from) + lineageCol("led",led)
    + `</div></div></div>`;
}
function listenSect(n,who,artistsHtml){
  const pb=plist(n);
  if(!pb && !who.length) return "";
  const body = (pb||"")
             + (who.length?`<h4 class="subh${pb?" gap":""}">Key artists</h4>${artistsHtml}`:"");
  const head = `<div class="secthead"><h3 class="secttl">Listen on ${svcPicker("inline")}</h3></div>`;
  return `<div class="sect sect-listen">${head}<div class="secbody">${body}</div></div>`;
}
// the share control at the foot of a style panel: in the flow under the text, not pinned
// over it, so it scrolls away with everything else rather than sitting on the content
function shareBtn(n){
  return `<button type="button" class="shbtn wide" data-share aria-label="Share ${esc(n.name)}" title="Share ${esc(n.name)}">`
    + SHAREGLYPH + `<svg class="tick" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 10.5l3.6 3.6L15.5 6.6"/></svg><span class="shlbl">Share this style</span></button>`;
}
function panel(n,anc,desc){
  const dfams=new Set([...desc.keys()].map(k=>byId[k].fam));
  const who=n.whoList||[];
  const artistsHtml = `<div class="who">${who.map(am).join("")}</div>`;
  resetPages();
  $("panelBody").innerHTML = PHEAD + `<div class="more">
    ${listenSect(n,who,artistsHtml)}
    ${sect("about","What it is",
      `<p class="note lede wikiline">${about(n)?esc(about(n))+" ":""}${wikiTxt(n)}</p>`
      + `<p class="tally">${anc.size} ancestor styles · ${desc.size} descendant styles${desc.size?` across ${dfams.size} ${dfams.size===1?"family":"families"}`:""}</p>`)}
    ${readSect(n)}
    ${shareBtn(n)}</div></div>`;
  wrapStack(panelCard());
  paintPlay();
}
$("panel").addEventListener("change",e=>{ if(e.target&&e.target.classList.contains("svcsel")) setSvc(e.target.value); });
function clearNav(m){
  if(m._home){ m._home.appendChild(m); m._home=null; }
  m.style.cssText="";
}
function placeNav(btn,m){
  if(!m._home){ m._home=m.parentNode; document.body.appendChild(m); }
  // outside the panel it would lose the family tint, so carry those values across
  const pan=$("panel");
  if(pan){ const cs=getComputedStyle(pan);
    ["--panel","--fg","--muted","--line","--ink","--tint","--acc"].forEach(v=>{
      const val=cs.getPropertyValue(v); if(val) m.style.setProperty(v,val.trim()); }); }
  const b=btn.getBoundingClientRect();
  const led=!!(m._home&&m._home.classList.contains("nav-led"));
  const gap=6, edge=10;
  const below=innerHeight-b.bottom-gap-edge, above=b.top-gap-edge;
  // a bottom sheet leaves no room beneath it, so flip the menu over the map
  const up = below<220 && above>below;
  m.style.position="fixed";
  if(up){ m.style.bottom=Math.round(innerHeight-b.top+gap)+"px"; m.style.top="auto";
          m.style.maxHeight=Math.max(150,Math.round(above))+"px"; }
  else  { m.style.top=Math.round(b.bottom+gap)+"px"; m.style.bottom="auto";
          m.style.maxHeight=Math.max(150,Math.round(below))+"px"; }
  m.style.right="auto";
  m.style.left="0px";                       // measure at a known origin before placing
  // a menu hanging off a full-width list row looked detached at its own natural width:
  // it takes the row's instead, so it reads as that row opening rather than as a popup
  // .navmenu caps itself at 300px for a pill-sized button; a list row is wider than that,
  // so the cap has to come off with the width
  // a row's menu takes the row's width; the title's takes the card's, since two columns
  // need more than the name is wide
  const card=btn.closest(".pcard");
  const w0 = btn.classList.contains("listrow") ? Math.round(b.width)
    : btn.classList.contains("navttl") && card ? Math.round(card.getBoundingClientRect().width)
    : 0;
  m.style.width = w0 ? w0+"px" : "";
  m.style.maxWidth = w0 ? "none" : "";
  const w=m.offsetWidth;
  const cb = btn.classList.contains("navttl") && card ? card.getBoundingClientRect() : null;
  const want = cb ? cb.left : led ? b.right-w : b.left;
  const max = innerWidth-edge-w, min = edge;
  m.style.left=Math.round(max<min ? min : Math.min(Math.max(want,min),max))+"px";
}
function closeNav(except){
  document.querySelectorAll(".navmenu").forEach(m=>{
    const w=m._home||m.parentNode;
    if(w===except) return;
    if(m.parentNode===document.body && w && !w.isConnected){ m.remove(); return; }
    const b=w&&w.querySelector("[data-menu]");   // .navbtn, .listrow or the title
    m.hidden=true; if(b) b.setAttribute("aria-expanded","false");
    clearNav(m);
  });
}
document.addEventListener("click",e=>{ if(!e.target.closest(".navwrap") && !e.target.closest(".navmenu")) closeNav(); });
// menu items no longer sit inside #panel, so they need their own handler
document.addEventListener("click",e=>{
  const pb=e.target.closest(".navmenu [data-plbr]");
  if(pb){ const m=pb.closest(".navmenu"); m.innerHTML=plStylesHtml(pb.dataset.plbr); m.scrollTop=0; return; }
  const pk=e.target.closest(".navmenu [data-plback]");
  if(pk){ const m=pk.closest(".navmenu"); m.innerHTML=plMenuHtml(); m.scrollTop=0; return; }
  const fb=e.target.closest(".navmenu [data-fambr]");
  if(fb){ const m=fb.closest(".navmenu"); m.innerHTML=famStylesHtml(fb.dataset.fambr); m.scrollTop=0; return; }
  const bk=e.target.closest(".navmenu [data-brback]");
  if(bk){ const m=bk.closest(".navmenu"); m.innerHTML=famMenuHtml(); m.scrollTop=0; return; }
});
document.addEventListener("click",e=>{
  const g=e.target.closest(".navmenu [data-go]"); if(!g) return;
  e.preventDefault(); closeNav(); select(g.dataset.go); panelTop();
});
addEventListener("keydown",e=>{ if(e.key==="Escape") closeNav(); });
addEventListener("resize",()=>closeNav());
$("panel").addEventListener("click",e=>{
  const mb=e.target.closest("[data-menu]");
  if(mb){ const w=mb.closest(".navwrap");
    // while open the menu lives on <body>, so it is not under its wrapper any more
    const m=w&&(w.querySelector(".navmenu")
      || [...document.querySelectorAll("body > .navmenu")].find(x=>x._home===w));
    if(!m) return;
    const open=m.hidden;
    if(open && m.dataset.br==="fams") m.innerHTML=famMenuHtml();   // never reopen mid-drill
    if(open && m.dataset.br==="pl") m.innerHTML=plMenuHtml();
    closeNav(open?w:null);
    m.hidden=!open; mb.setAttribute("aria-expanded",String(open));
    if(open) placeNav(mb,m); else clearNav(m);
    return; }
  if(e.target.closest("#ptoggle")||e.target.closest("#grab")) return;   // the handle runs its own tap/drag logic
  const sv=e.target.closest("[data-svc]"); if(sv){ setSvc(sv.dataset.svc); return; }
  { const pg=e.target.closest("[data-page]");
    if(pg){ e.preventDefault(); pushPage(pg.dataset.page); return; } }
  { const rr=e.target.closest("[data-random]");
    if(rr){ const pool=nodes.filter(n=>n.id!==state.sel);
      const pick=pool[Math.floor(Math.random()*pool.length)];
      if(pick){ closeNav(); select(pick.id); panelTop(); } return; } }
  { const md=e.target.closest("[data-mode]");
    if(md){ e.preventDefault(); pushPage("mode:"+md.dataset.mode); return; } }
  const fm=e.target.closest("[data-fam]");
  if(fm){ // jump to the family by selecting its most influential style, so the map centres and its lineage draws
    const k=fm.dataset.fam;
    const pick=nodes.filter(x=>x.fam===k).sort((x,y)=>y.children.length-x.children.length||x.year-y.year)[0];
    if(pick){ select(pick.id,{scroll:true,smooth:!reduce}); panelTop(); }
    return; }
  // a row that names a style navigates to it even on a minimised sheet, which is
  // otherwise tap-anywhere-to-open: the mode picks sit there, and expanding the panel
  // is not what tapping a named style asks for
  const g0=e.target.closest("[data-go]");
  if(g0){ closeNav(); select(g0.dataset.go); panelTop(); return; }
  // before tap-anywhere-to-open, or closing a minimised sheet opens it instead
  if(e.target.closest("[data-dismiss]")){ dismissSheet(); return; }
  if(!OPEN && OVERLAY){ if(!e.target.closest("a")) setOpen(true); return; }   // only the minimised sheet is tap-to-open
  { const ac=e.target.closest("[data-aboutcopy]");
    if(ac){ copyAbout(ac); return; } }
  { const ss=e.target.closest("[data-sharesheet]");
    if(ss){ openShareSheet(ss); return; } }
  if(e.target.closest("[data-share]")){ shareSel(); return; }
  if(e.target.closest("[data-close]")){ closePanel(); return; }
  const m=e.target.closest("[data-mode]"); if(m){ state.mode=m.dataset.mode; select(state.sel,{scroll:false}); }
});
$("lanes").addEventListener("click",e=>{ const l=e.target.closest(".lane"); if(!l) return; const lane=lanes.find(x=>x.k===l.dataset.fam); if(lane) scroller.scrollTo({top:Math.max(0,lane.y0-8),behavior:reduce?"auto":"smooth"}); });
// picking another style keeps the card as it is; empty space collapses it, then clears the selection
$("chart").addEventListener("click",e=>{
  const g=e.target.closest(".n");
  if(g){ select(g.dataset.id,{scroll:true,smooth:!reduce,keepPlace:true}); if(OPEN) $("panel").scrollTop=0; return; }
  if(OPEN){ closePanel(); return; }
  if(state.sel) clearSel();
});
function clearSel(){
  closeNav();
  if(state.sel && !GOINGBACK) pushTrail();
  state.sel=null;
  const svg=$("chart"); svg.classList.remove("sel");
  svg.querySelectorAll(".n.on,.n.cur").forEach(g=>g.classList.remove("on","cur"));
  svg.querySelectorAll(".e.on,.e.dir").forEach(e=>e.classList.remove("on","dir"));
  $("lanes").querySelectorAll(".lane.dim").forEach(l=>l.classList.remove("dim"));
  setHash(""); syncShare();
  emptyPanel(); syncBack();
}
// ---------- "open in Safari" ----------
// Add to Home Screen exists in Safari and nowhere else on iOS, so someone reading the
// install steps from Chrome, or from the browser inside Instagram or Slack, cannot follow
// them. A web page cannot choose a browser on a desktop, but both phone platforms have a
// scheme that can, so offer it to the people the steps do not work for.
function hereURL(){ return location.origin + location.pathname + location.search; }
const UA = navigator.userAgent;
function isiOS(){ return /iPad|iPhone|iPod/.test(UA) ||
  (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1); }   // iPadOS claims to be a Mac
function isAndroid(){ return /Android/.test(UA); }
// every iOS browser is WebKit, so Safari is told apart by what it is not: the other
// browsers' own tokens, and the in-app views, which carry no Version/ at all
function isSafari(){ return /Version\/[\d.]+/.test(UA) && /Safari/.test(UA) &&
  !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|YaBrowser|DuckDuckGo|Instagram|FBAN|FBAV|FBIOS|Line\/|MicroMessenger|Snapchat/.test(UA); }
function isChrome(){ return /Chrome\//.test(UA) && !/EdgA?\/|OPR\/|SamsungBrowser|YaBrowser|DuckDuckGo/.test(UA); }
function installed(){ try{ return navigator.standalone===true ||
  matchMedia("(display-mode: standalone)").matches; }catch(e){ return false; } }
// the HTML for the row, or "" when the reader is already where they need to be
function openInRow(){
  const u=hereURL();
  // the schemes take the page's own protocol, but a file:// copy has no browser to open
  if(!/^https?:/.test(u) || installed()) return "";          // nothing to offer, or already added
  let href="", app="", note="";
  if(isiOS() && !isSafari()){
    href="x-safari-"+u; app="Safari";
    // on iOS this is not a preference: no other browser has the item at all
    note="You are not in Safari, and Add to Home Screen exists nowhere else on iOS. "
       + "If the button does nothing, tap <b>Share</b> and choose <b>Open in Safari</b>, which always works.";
  } else if(isAndroid() && !isChrome()){
    href="intent://"+u.replace(/^https?:\/\//,"")+"#Intent;scheme="+location.protocol.replace(":","")+";package=com.android.chrome;"
       + "S.browser_fallback_url="+encodeURIComponent(u)+";end";
    app="Chrome";
    // unlike iOS, the browser you are in can almost certainly do this itself
    note="Your own browser can install this too, under its own menu. The steps below describe Chrome, "
       + "which is the one most people have.";
  } else return "";
  return '<p class="openin"><a href="'+href+'" rel="nofollow"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 3h6v6"/><path d="M17 3l-8 8"/><path d="M15 12v4.2A1.8 1.8 0 0 1 13.2 18H4.8A1.8 1.8 0 0 1 3 16.2V7.8A1.8 1.8 0 0 1 4.8 6H9"/></svg><span>Open this page in '+app+'</span></a></p>'
   + '<p class="opennote">'+note+'</p>';
}

// the Share sheet is where Add to Home Screen lives, so on a browser that can open it
// from script there is no reason to send anyone off to find the button themselves
function canShareSheet(){ return !!(navigator.share && isiOS()); }
function shareStep(){ return canShareSheet()
  ? '<button type="button" class="sheetbtn" data-sharesheet>'+SHAREGLYPH+'<span>Open the Share sheet</span></button>'
  : ""; }
function openShareSheet(btn){
  const lbl=btn.querySelector("span");
  navigator.share({title:"Offshoots", url:hereURL()}).catch(()=>{
    // a dismissed sheet rejects exactly like a refused one, so only say something
    // if it is still here to be said to
    if(lbl) lbl.textContent="Use the Share button at the bottom of the screen";
  });
}

// ---------- sharing ----------
// every style has a URL: the page plus #id, which boot() already reads back
function styleURL(id){ return location.origin + location.pathname + location.search + "#" + encodeURIComponent(id); }
// "about" is the one hash that is not a style id
const ABOUT_HASH="about", INSTALL_HASH="install";
const FOLDS={[ABOUT_HASH]:".aboutwrap", [INSTALL_HASH]:".installwrap"};
function foldURL(hash){ return location.origin + location.pathname + location.search + "#" + hash; }
function openAbout(scroll,hash){
  // these two used to be folds on the root panel; they are pages now, so the hash that
  // deep-links them pushes one
  return pushPage(hash||ABOUT_HASH);
}
function setHash(id){
  const want = id ? "#"+encodeURIComponent(id) : "";
  if((location.hash||"") === want) return;
  // replace, not push: selecting styles shouldn't fill the back button
  try{ history.replaceState(null,"",want || location.pathname+location.search); }catch(e){ if(id) location.hash=want; }
}
function copyAbout(btn){
  const url=foldURL(btn.dataset.aboutcopy||ABOUT_HASH), lbl=btn.querySelector(".lbl");
  const flash=t=>{ if(!lbl) return; if(btn._was==null) btn._was=lbl.textContent;
    btn.classList.add("done"); lbl.textContent=t;
    clearTimeout(btn._t); btn._t=setTimeout(()=>{ btn.classList.remove("done");
      if(btn._was!=null){ lbl.textContent=btn._was; btn._was=null; } },1600); };
  const fallback=()=>{ const ta=document.createElement("textarea"); ta.value=url; ta.setAttribute("readonly","");
    ta.style.cssText="position:fixed;top:0;left:0;opacity:0"; document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); flash("Link copied"); }catch(e){ flash("Copy failed"); } ta.remove(); };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(()=>flash("Link copied"),fallback);
  else fallback();
}
function shareSel(){
  const id=state.sel, n=id?byId[id]:null;
  // nothing selected: share the map itself rather than doing nothing
  const url = n ? styleURL(id) : location.origin+location.pathname+location.search;
  const title = n ? "Offshoots · "+n.name : "Offshoots";
  const text  = n ? n.name+" on Offshoots" : "Offshoots — what grew out of what in North American music";
  const btn=document.querySelector("#panel [data-share]");
  // the wide button says what happened in words; the round one has no room for words, so
  // .done swaps its glyph for a tick and that is the whole message
  const flash=t=>{ if(!btn) return; const nm=btn.querySelector(".shlbl");
    if(nm && btn._was==null) btn._was=nm.textContent;
    btn.classList.add("done"); if(nm) nm.textContent=t;
    clearTimeout(btn._t); btn._t=setTimeout(()=>{ btn.classList.remove("done");
      if(nm && btn._was!=null){ nm.textContent=btn._was; btn._was=null; } },1600); };
  const copy=()=>{ const done=()=>flash("Link copied");
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done,()=>fallback());
    else fallback();
    function fallback(){ const ta=document.createElement("textarea"); ta.value=url; ta.setAttribute("readonly","");
      ta.style.cssText="position:fixed;top:0;left:0;opacity:0"; document.body.appendChild(ta); ta.select();
      try{ document.execCommand("copy"); done(); }catch(e){ flash("Copy failed"); } ta.remove(); } };
  // the share sheet hands it to Messages, Mail and the rest; clipboard is the fallback
  if(navigator.share){
    navigator.share({title, text, url}).catch(err=>{
      if(err && (err.name==="AbortError"||err.name==="NotAllowedError")) return; copy(); });
  } else copy();
}
{ const sp=$("sheetpull"); if(sp) sp.addEventListener("click",()=>{ restoreSheet(); }); }
{ const pn=$("panel"); if(pn) pn.addEventListener("click",e=>{ if(e.target.closest("#panelBack")){ e.preventDefault(); e.stopPropagation(); if(!popPage()) goBack(); } },true); }
{ const hb=$("mapHome"); if(hb) hb.addEventListener("click",e=>{ e.preventDefault(); goHome(); }); }
// the hardware/browser back gesture should feel the same as the button
addEventListener("keydown",e=>{
  if(e.key==="Backspace" && !/^(INPUT|TEXTAREA)$/.test((e.target.tagName||""))){ e.preventDefault(); goBack(); }
});
// the title carries the label now; it is rebuilt on every select, so this only has
// to catch the case where the panel is left standing
function syncShare(){
  const b=document.querySelector("#panel [data-share]"); if(!b) return;
  const l=state.sel?"Share this style":"Share this app";
  if(!b.classList.contains("done")){ b.setAttribute("aria-label",l); b.setAttribute("title",l);
    const t=b.querySelector(".shlbl"); if(t) t.textContent=l; }
}

// the panel takes a wash of the family's cover-art ground; strength lives in CSS
function setTint(fam){
  const s=(typeof FAMSKIN!=="undefined"&&FAMSKIN[fam])||null;
  const el=$("panel"); if(!el) return;
  if(s){ el.style.setProperty("--tint",s[0]); el.style.setProperty("--ink",s[1]); el.style.setProperty("--acc",s[2]); }
  else { el.style.removeProperty("--tint"); el.style.removeProperty("--ink"); el.style.removeProperty("--acc"); }
  el.classList.toggle("tinted",!!s);
}
// ---------- listening modes ----------
// a way in for people who know what they want the music to DO but not what to call it
let MODE=null;
function modePicks(m){
  return m[4].map(([id,why])=>{
    const n=byId[id]; if(!n) return "";
    const play=(typeof PLAY!=="undefined"&&PLAY[id])||(typeof SPLAY!=="undefined"&&SPLAY[id]);
    // the playlist's own cover, which is the thing you would recognise before you
    // recognised the name. Where there is no file the shared handler swaps in the tile
    // it uses on the playlist row: family colour, initials, same square.
    return `<button type="button" class="pick c withart" style="--c:${FAM[n.fam].c}" data-go="${esc(id)}" title="Show ${esc(n.name)} on the map">`
      + cover(id,n)
      + `<span class="pknm">${esc(n.name)}${play?`<i class="pkgo" aria-label="has a playlist">${PLAYGO}</i>`:""}</span>`
      + `<span class="pkwhy">${esc(why)}</span>`
      + `<span class="pkfam">${esc(FAM[n.fam].short)} · ${n.year}</span></button>`;
  }).join("");
}
// twelve chips fill a phone screen, so the picks can open out of sight below them
// Bring the chosen mode's list to the top of the sheet. #panel is overflow:hidden and
// never scrolled, which is why the earlier version of this moved nothing at all: the
// scroller is #panelBody.
function showMode(){
  const body=$("panelBody"), o=body&&body.querySelector(".modeout");
  if(!o) return;
  const br=body.getBoundingClientRect(), or=o.getBoundingClientRect();
  body.scrollTo({top: body.scrollTop + (or.top-br.top) - 8, behavior: reduce?"auto":"smooth"});
}
// the way back: the chips' own section heading, not the chip row, so "What do you need
// it to do?" is on screen and the list reads as one thing you stepped into
function showChips(){
  const body=$("panelBody"), s=body&&body.querySelector(".modechips");
  if(!s) return;
  const head=s.closest(".sect")||s;
  const br=body.getBoundingClientRect(), hr=head.getBoundingClientRect();
  body.scrollTo({top: Math.max(0, body.scrollTop + (hr.top-br.top) - 8), behavior: reduce?"auto":"smooth"});
}
// About is the last thing in the panel, so opening it laid the text out below the fold
// and the tap looked like it had done nothing. Bring the row up to the top of the panel
// so the text you just asked for is the text you are looking at.
// toggle does not bubble, so this has to listen on the capture phase.
document.addEventListener("toggle",e=>{
  const d=e.target;
  if(!d.classList || !d.classList.contains("fold") || !d.open) return;
  const body=$("panelBody"); if(!body) return;
  requestAnimationFrame(()=>{
    const br=body.getBoundingClientRect(), dr=d.getBoundingClientRect();
    body.scrollTo({top: Math.max(0, body.scrollTop + (dr.top-br.top) - 8), behavior: reduce?"auto":"smooth"});
  });
},true);

// Families and influence as menus rather than two walls of chips. Same navwrap/navmenu
// machinery as the From and Led to buttons, so they portal, flip and close identically.
const TOPN=24;
function famCount(k){ return nodes.filter(n=>n.fam===k).length; }
function famMenuHtml(){
  const rows=[...FAMS].sort((x,y)=>famCount(y[0])-famCount(x[0])).map(([k,name])=>
    `<button type="button" role="menuitem" data-fambr="${k}" title="${esc(name)}: ${famCount(k)} styles"><i class="dot" style="background:${FAM[k].c}"></i><span class="nm">${esc(name)}</span><small>${famCount(k)}</small></button>`).join("");
  return `<div class="navhd">Families by size</div>${rows}`;
}
function famStylesHtml(k){
  const rows=nodes.filter(n=>n.fam===k).sort((x,y)=>x.year-y.year||x.name.localeCompare(y.name)).map(x=>
    `<button type="button" role="menuitem" data-go="${x.id}"><i class="dot" style="background:${FAM[x.fam].c}"></i><span class="nm">${esc(x.name)}</span><small>${x.year<1950?esc(x.disp):x.year}</small></button>`).join("");
  return `<button type="button" class="brback" data-brback="1"><i class="bk">${CHEV.from}</i><span class="nm">${esc(FAM[k].name)}</span><small>${famCount(k)}</small></button>${rows}`;
}
function topMenuHtml(){
  const rows=[...nodes].sort((x,y)=>y.children.length-x.children.length||x.year-y.year).slice(0,TOPN).map(x=>
    `<button type="button" role="menuitem" data-go="${x.id}" title="${esc(x.name)} led to ${x.children.length} styles"><i class="dot" style="background:${FAM[x.fam].c}"></i><span class="nm">${esc(x.name)}</span><small>${x.children.length}</small></button>`).join("");
  return `<div class="navhd">Most led to</div>${rows}`;
}
const hasPlay=id=>!!((typeof PLAY!=="undefined"&&PLAY[id])||(typeof SPLAY!=="undefined"&&SPLAY[id]));
const playable=()=>nodes.filter(n=>hasPlay(n.id));
// the first level: the styles nothing in this map leads to. The panel's forward button at
// the root points at these, so the map can be walked from its beginning as well as searched.
const firstLevel=()=>nodes.filter(n=>!n.parents.length).map(n=>n.id).sort(byYear);
function plCount(k){ return nodes.filter(n=>n.fam===k&&hasPlay(n.id)).length; }
// the catalog is 233 deep, so it drills by family rather than scrolling as one list
function plMenuHtml(){
  const rows=[...FAMS].filter(([k])=>plCount(k)).sort((x,y)=>plCount(y[0])-plCount(x[0])).map(([k,name])=>
    `<button type="button" role="menuitem" data-plbr="${k}" title="${esc(name)}: ${plCount(k)} playlists"><i class="dot" style="background:${FAM[k].c}"></i><span class="nm">${esc(name)}</span><small>${plCount(k)}</small></button>`).join("");
  return `<div class="navhd">Playlists by family</div>${rows}`;
}
function plStylesHtml(k){
  const rows=nodes.filter(n=>n.fam===k&&hasPlay(n.id)).sort((x,y)=>x.year-y.year).map(x=>
    `<button type="button" role="menuitem" data-go="${x.id}"><i class="dot" style="background:${FAM[x.fam].c}"></i><span class="nm">${esc(x.name)}</span><small>${x.year<1950?esc(x.disp):x.year}</small></button>`).join("");
  return `<button type="button" class="brback" data-plback="${k}"><i class="bk">${CHEV.from}</i><span class="nm">${esc(FAM[k].name)}</span><small>${plCount(k)}</small></button>${rows}`;
}

const LRICON={"roots": "<path d=\"M10 17V7\"/><path d=\"M10 11C10 8.5 8 6.5 5.5 6.5\"/><path d=\"M10 13.5c0-2 1.7-3.6 3.7-3.6\"/><path d=\"M10 7a2.6 2.6 0 1 0 0-5.2A2.6 2.6 0 0 0 10 7z\"/>", "fams": "<path d=\"M3.2 6.6L10 3.2l6.8 3.4L10 10z\"/><path d=\"M3.2 10L10 13.4 16.8 10\"/><path d=\"M3.2 13.4L10 16.8l6.8-3.4\"/>", "pl": "<path d=\"M4 5.5h8\"/><path d=\"M4 10h8\"/><path d=\"M4 14.5h5\"/><path d=\"M15.2 13.6V6.2l2.3-.7\"/><circle cx=\"13.8\" cy=\"14\" r=\"1.6\"/>", "top": "<path d=\"M3 13.5l4-4.2 3.1 2.8L17 5.5\"/><path d=\"M13.2 5.5H17V9\"/>"};
// a row that takes you somewhere points that way; the down chevron means unfold
const GOCHEV="<svg class=\"lrcv lrgov\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6 3l5 5-5 5\"/></svg>";
const LRCHEV="<svg class=\"lrcv\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 6l5 5 5-5\"/></svg>";
// every way of browsing the map is a collection you open, so they are one grouped list:
// icon, name, how many, chevron, hairlines starting at the name. They used to be three
// chips in a row, and the roots were a pill up in the header.
function browseBtn(key,label,count,title,inner){
  return `<div class="navwrap nav-br">`
    + `<button type="button" class="listrow" data-menu="${key}" aria-haspopup="menu" aria-expanded="false" title="${esc(title)}" aria-label="${esc(title)}">`
    + `<i class="lrico"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LRICON[key]||""}</svg></i>`
    + `<span class="lrlbl">${esc(label)}</span><em class="lrct">${count}</em>${LRCHEV}</button>`
    + `<div class="navmenu brmenu" role="menu" data-br="${key}" hidden>${inner}</div></div>`;
}
function rootsRow(){
  const ids=firstLevel(), n=ids.length;
  const items=ids.map(id=>{ const x=byId[id];
    return `<button type="button" role="menuitem" data-go="${x.id}"><i class="dot" style="background:${FAM[x.fam].c}"></i><span class="nm">${esc(x.name)}</span><small>${x.year<1950?esc(x.disp):x.year}</small></button>`; }).join("");
  // no heading on the menu: the row it opens from is directly above it and says Roots
  return browseBtn("roots","Roots",n,`Roots: ${n} styles with nothing before them here`,items);
}
const RANDICON="<path d=\"M3 5.6h2.8L13 14.4h4\"/><path d=\"M3 14.4h2.8l2.6-3.2\"/><path d=\"M11.2 8.1l1.8-2.5H17\"/><path d=\"M15.2 3.6L17 5.6l-1.8 2\"/><path d=\"M15.2 12.4L17 14.4l-1.8 2\"/>";
// not a collection to open but a place to go, so it carries no count and no chevron
function randomRow(){
  return `<div class="navwrap nav-br">`
    + `<button type="button" class="listrow lrgo" data-random title="Open any style, chosen at random" aria-label="Open any style, chosen at random">`
    + `<i class="lrico"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${RANDICON}</svg></i>`
    + `<span class="lrlbl">Surprise me</span><em class="lrct">any of ${nodes.length}</em></button></div>`;
}
// the same button a style panel ends with, naming the thing it hands over
function appShareBtn(){
  return `<button type="button" class="shbtn wide" data-share aria-label="Share this app" title="Share this app">`
    + SHAREGLYPH + `<svg class="tick" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 10.5l3.6 3.6L15.5 6.6"/></svg>`
    + `<span class="shlbl">Share this app</span></button>`;
}
function browseRow(){
  const nr=firstLevel().length;
  return sect("browse","",`<div class="listgrp sep">`
    + pageRow("roots","Roots",nr,`Roots: ${nr} styles with nothing before them here`)
    + pageRow("top","Most influential",TOPN,`The ${TOPN} styles that led to the most`)
    + randomRow()+`</div>`);
}
const MODEICON={"morning":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M2.6 15.4h14.8\"/><path d=\"M5.6 15.4a4.4 4.4 0 0 1 8.8 0\"/><path d=\"M10 3.4v2.1\"/><path d=\"M4.3 5.8l1.5 1.5\"/><path d=\"M15.7 5.8l-1.5 1.5\"/><path d=\"M5 11.2H2.9\"/><path d=\"M17.1 11.2H15\"/></svg>","showkid":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M10 2.4a4.7 4.7 0 0 0-2.8 8.5c.5.4.8 1 .8 1.6v.2h4v-.2c0-.6.3-1.2.8-1.6A4.7 4.7 0 0 0 10 2.4z\"/><path d=\"M8.2 15.2h3.6\"/><path d=\"M8.8 17.4h2.4\"/></svg>","sleep":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M11.9 2.8h5.3l-5.3 5.6h5.3\"/><path d=\"M6.9 9.1h4.3l-4.3 4.5h4.3\"/><path d=\"M2.8 14.2h3.1l-3.1 3.2h3.1\"/></svg>","coding":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M7 6.2 3.2 10 7 13.8\"/><path d=\"M13 6.2 16.8 10 13 13.8\"/><path d=\"M11.3 4.4 8.7 15.6\"/></svg>","focus":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"10\" cy=\"10\" r=\"6.8\"/><circle cx=\"10\" cy=\"10\" r=\"2.4\"/></svg>","workout":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4.4 7.4v5.2\"/><path d=\"M15.6 7.4v5.2\"/><path d=\"M7 6v8\"/><path d=\"M13 6v8\"/><path d=\"M7 10h6\"/></svg>","miles":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M2.4 10.4h3.1l1.7-4.6 2.9 9.1 2-4.5h5.5\"/></svg>","winddown":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M16.2 12.3A6.7 6.7 0 0 1 7.7 3.8a6.9 6.9 0 1 0 8.5 8.5z\"/></svg>","party":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"10\" cy=\"11.6\" r=\"5.4\"/><path d=\"M10 6.2V3\"/><path d=\"M4.7 10.4h10.6\"/><path d=\"M10 6.2V17\"/></svg>","houseparty":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5.1 4.4h9.8l-1.2 12.1a.9.9 0 0 1-.9.8H7.2a.9.9 0 0 1-.9-.8z\"/><path d=\"M5.6 9.2h8.8\"/></svg>","driving":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3.2 12.6h13.6\"/><path d=\"M4.8 12.6l1.3-4.1a1.7 1.7 0 0 1 1.6-1.2h4.6a1.7 1.7 0 0 1 1.6 1.2l1.3 4.1\"/><circle cx=\"6.6\" cy=\"14\" r=\"1.5\"/><circle cx=\"13.4\" cy=\"14\" r=\"1.5\"/></svg>","dinner":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6.4 3v4.6\"/><path d=\"M9.1 3v4.6\"/><path d=\"M7.75 7.6V17\"/><path d=\"M14.4 3c1.5 1.7 1.5 5.3 0 6.6V17\"/></svg>","coffee":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4.2 6.4h9.4v4.8a3.5 3.5 0 0 1-3.5 3.5H7.7a3.5 3.5 0 0 1-3.5-3.5z\"/><path d=\"M13.6 7.6h1.2a2 2 0 0 1 0 4h-1.2\"/><path d=\"M5.6 16.8h7.6\"/></svg>","cocktails":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3.6 4.4h12.8L10 10.9z\"/><path d=\"M10 10.9v5.1\"/><path d=\"M7.2 16h5.6\"/></svg>","nightcap":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4.8 5.2h10.4l-1 10.1a1 1 0 0 1-1 .9H6.8a1 1 0 0 1-1-.9z\"/><path d=\"M5.4 10.6h9.2\"/></svg>","gaming":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"2.6\" y=\"6.6\" width=\"14.8\" height=\"8.8\" rx=\"4.1\"/><path d=\"M6.6 9.8v2.4\"/><path d=\"M5.4 11h2.4\"/><circle cx=\"13.4\" cy=\"10.5\" r=\".95\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"15.1\" cy=\"12.4\" r=\".95\" fill=\"currentColor\" stroke=\"none\"/></svg>","lift":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"10\" cy=\"10\" r=\"3.5\"/><path d=\"M10 2.4v1.7\"/><path d=\"M10 15.9v1.7\"/><path d=\"M2.4 10h1.7\"/><path d=\"M15.9 10h1.7\"/><path d=\"M4.6 4.6l1.2 1.2\"/><path d=\"M14.2 14.2l1.2 1.2\"/><path d=\"M15.4 4.6l-1.2 1.2\"/><path d=\"M5.8 14.2l-1.2 1.2\"/></svg>","burn":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M10 2.6c3 3.4 5.1 5.6 5.1 8.5a5.1 5.1 0 0 1-10.2 0c0-1.6.6-2.9 1.7-4.1.5 1.1 1.2 1.7 2 1.9C8.2 6.7 8.8 4.7 10 2.6z\"/></svg>","sit":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6.4 12.3a3.2 3.2 0 0 1 .4-6.4 4.3 4.3 0 0 1 8.1 1.4 2.7 2.7 0 0 1-.5 5\"/><path d=\"M7.6 14.8v2.1\"/><path d=\"M11 14.8v2.7\"/><path d=\"M14.3 14.8v2.1\"/></svg>","together":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"7.3\" cy=\"7.4\" r=\"2.4\"/><circle cx=\"13.5\" cy=\"8.3\" r=\"2\"/><path d=\"M3 16.6a4.4 4.4 0 0 1 8.7 0\"/><path d=\"M12.7 12.7a3.8 3.8 0 0 1 4.3 3.9\"/></svg>","family":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M2.6 10.2 10 4.1l7.4 6.1\"/><path d=\"M4.6 9v7.3h10.8V9\"/><path d=\"M8.3 16.3v-3.5h3.4v3.5\"/></svg>","deep":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4.2 13v-2.6a5.8 5.8 0 0 1 11.6 0V13\"/><path d=\"M4.2 12.3h1.5a1.4 1.4 0 0 1 1.4 1.4v1.6a1.4 1.4 0 0 1-1.4 1.4h-.9a.6.6 0 0 1-.6-.6z\"/><path d=\"M15.8 12.3h-1.5a1.4 1.4 0 0 0-1.4 1.4v1.6a1.4 1.4 0 0 0 1.4 1.4h.9a.6.6 0 0 0 .6-.6z\"/></svg>","restless":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M7.6 2.8h4.8l3.1 14.4H4.5z\"/><path d=\"M4.9 13.9h10.2\"/><path d=\"M10 14.2 13 4.6\"/></svg>","chores":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M7.3 3.1l1.15 3.05L11.5 7.3 8.45 8.45 7.3 11.5 6.15 8.45 3.1 7.3l3.05-1.15z\"/><path d=\"M14.1 10.6l.72 1.9 1.9.72-1.9.72-.72 1.9-.72-1.9-1.9-.72 1.9-.72z\"/></svg>","hype":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M11.6 2.4L5.2 11h4.1l-.9 6.6L14.8 9h-4.1z\"/></svg>","onmind":"<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M16.6 10.9a2.9 2.9 0 0 1-2.9 2.9H8.4l-3.9 3.1V6.4a2.9 2.9 0 0 1 2.9-2.9h6.3a2.9 2.9 0 0 1 2.9 2.9z\"/><circle cx=\"7.6\" cy=\"8.6\" r=\".85\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"10.5\" cy=\"8.6\" r=\".85\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"13.4\" cy=\"8.6\" r=\".85\" fill=\"currentColor\" stroke=\"none\"/></svg>"};
function modeSect(){
  if(typeof MODES==="undefined") return "";
  // these were chips, twenty-five of them wrapped across ten ragged rows. A list reads
  // top to bottom in one column, keeps the energy colour on each icon, and gives every
  // one of them the same width instead of sizing them by the length of their name.
  const rows=MODES.slice().sort((a,b)=>(b[5]||3)-(a[5]||3)).map(m=>
    `<button type="button" class="listrow moderow lv${m[5]||3}" data-mode="${esc(m[0])}"`
    + ` title="${esc(m[2])}" aria-label="${esc(m[1])}. ${esc(m[2])}">`
    + `<i class="lrico mi">${MODEICON[m[0]]||""}</i>`
    + `<span class="lrlbl">${esc(m[1])}</span>${GOCHEV}</button>`).join("");
  // Apple Maps puts its Places on a row of filled circles you swipe through, with the
  // whole set one tap away behind the heading. Twenty-six modes suit that exactly: the
  // loudest few are in reach, the heading opens the lot, and nothing is buried under a
  // scroll of its own.
  const circles=MODES.slice().sort((a,b)=>(b[5]||3)-(a[5]||3)).map(m=>
    `<button type="button" class="mcirc lv${m[5]||3}" data-mode="${esc(m[0])}"`
    + ` title="${esc(m[2])}" aria-label="${esc(m[1])}. ${esc(m[2])}">`
    + `<i class="mco mi">${MODEICON[m[0]]||""}</i>`
    + `<span class="mclbl">${esc(m[1])}</span></button>`).join("");
  return sect("modes","Browse by mood, place or task",
    `<div class="mrow" role="list">${circles}</div>`,
    "", "modes");
}
// the same twenty-six as a page you can read down, which is what the row's heading opens
function modeListHtml(){
  if(typeof MODES==="undefined") return "";
  const rows=MODES.slice().sort((a,b)=>(b[5]||3)-(a[5]||3)).map(m=>
    `<button type="button" class="listrow moderow lv${m[5]||3}" data-mode="${esc(m[0])}"`
    + ` title="${esc(m[2])}" aria-label="${esc(m[1])}. ${esc(m[2])}">`
    + `<i class="lrico mi">${MODEICON[m[0]]||""}</i>`
    + `<span class="lrlbl">${esc(m[1])}</span>${GOCHEV}</button>`).join("");
  return `<div class="listgrp modelist two">${rows}</div>`;
}

// ---------- the panel as a stack of pages ----------
// Pushing slides the new page in from the right and the old one a little to the left,
// and the panel's own back button pops it. The alternative was a menu thrown over the
// top of the panel, which told you nothing about where you had been.
let PSTACK=[];
function panelCard(){ return $("panelBody").querySelector(".pcard"); }
function wrapStack(card){
  if(!card || card.querySelector(":scope > .pstack")) return null;
  const nav=card.querySelector(":scope > .navrow");
  const stack=document.createElement("div"); stack.className="pstack";
  const page=document.createElement("div"); page.className="ppage"; page.dataset.p="root";
  [...card.children].forEach(k=>{ if(k!==nav) page.appendChild(k); });
  stack.appendChild(page); card.appendChild(stack);
  return stack;
}
function resetPages(){ PSTACK=[]; }
function modePage(k){
  const m=typeof MODES!=="undefined" && MODES.find(x=>x[0]===k);
  if(!m) return null;
  return {title:m[2], icon:MODEICON[m[0]]||"", lv:m[5]||3, lede:m[3], html:`<div class="picks">${modePicks(m)}</div>`};
}
function pushPage(key){
  const def = key.indexOf("mode:")===0 ? (()=>modePage(key.slice(5))) : PAGES_DEF[key];
  if(!def) return false;
  const card=panelCard(); if(!card) return false;
  const stack=card.querySelector(":scope > .pstack") || wrapStack(card);
  if(!stack) return false;
  if(PSTACK.length && PSTACK[PSTACK.length-1].key===key) return true;
  const d=def(); if(!d) return false;
  const body=$("panelBody"), cur=stack.lastElementChild;
  const page=document.createElement("div");
  page.className="ppage pgin"; page.dataset.p=key;
  if(d.lv) page.classList.add("lv"+d.lv);
  page.innerHTML=`<h1 class="bigttl${d.icon?" withi":""}">${d.icon?`<i class="pgi mi">${d.icon}</i>`:""}<span class="mn">${esc(d.title)}</span></h1>`
    + (d.lede?`<p class="note pglede">${esc(d.lede)}</p>`:"")
    + `<div class="more pgbody">${d.html}</div>`;
  PSTACK.push({key,title:d.title,scroll:body.scrollTop});
  stack.appendChild(page);
  if(reduce){ cur.hidden=true; page.classList.remove("pgin"); }
  else {
    cur.classList.add("pgout");
    requestAnimationFrame(()=>page.classList.remove("pgin"));
    setTimeout(()=>{ cur.hidden=true; cur.classList.remove("pgout"); },240);
  }
  body.scrollTop=0; setOpen(true); syncBack(); closeNav();
  body.dispatchEvent(new Event("scroll"));
  return true;
}
function popPage(){
  if(!PSTACK.length) return false;
  const card=panelCard(), stack=card&&card.querySelector(":scope > .pstack");
  if(!stack){ PSTACK=[]; syncBack(); return false; }
  const body=$("panelBody"), cur=stack.lastElementChild, prev=cur.previousElementSibling;
  const was=PSTACK.pop();
  if(prev){ prev.hidden=false; if(!reduce){ prev.classList.add("pgout");
    requestAnimationFrame(()=>prev.classList.remove("pgout")); } }
  if(reduce) cur.remove();
  else { cur.classList.add("pgin");
    setTimeout(()=>{ cur.remove(); if(prev) body.scrollTop=was.scroll||0;
      body.dispatchEvent(new Event("scroll")); },240); }
  if(reduce && prev) body.scrollTop=was.scroll||0;
  syncBack();
  body.dispatchEvent(new Event("scroll"));
  return true;
}

// ---------- pages inside the panel ----------
// A panel is a stack. Tapping a row pushes a page in from the right and the back button
// pops it, rather than unfolding a block under your thumb or throwing a menu over the
// top: a list of seventeen styles is a place you go, not a thing that drops down.
function styleRows(ids,detail){
  return `<div class="listgrp plist">` + ids.map(id=>{ const x=byId[id];
    return `<button type="button" class="listrow" data-go="${x.id}">`
      + `<i class="dot" style="background:${FAM[x.fam].c}"></i>`
      + `<span class="lrlbl">${esc(x.name)}</span>`
      + `<em class="lrct">${detail(x)}</em>${GOCHEV}</button>`; }).join("") + `</div>`;
}
const PAGES_DEF={
  modes:()=>({title:"Ways in",
    lede:"Twenty-six moods, places and tasks, loudest first. Each one opens a dozen styles that suit it.",
    html:modeListHtml()}),
  roots:()=>({title:"Roots",
    lede:"Styles with nothing before them here. Everything else on the map descends from these.",
    html:styleRows(firstLevel(),x=>x.year<1950?x.disp:x.year)}),
  top:()=>({title:"Most influential",
    lede:"The styles that led to the most, counted by what came directly out of them.",
    html:styleRows([...nodes].sort((a,b)=>b.children.length-a.children.length||a.year-b.year)
      .slice(0,TOPN).map(x=>x.id), x=>x.children.length)}),
  about:()=>{ const np=playable().length,
      withSrc=DATA.filter(r=>Array.isArray(r[7])&&r[7].length).length;
    return {title:"About this map", html:`
    <div class="about"><div class="abouthd"><img class="appicon" alt="" src="${ICONSRC()}"><p class="stats">${$("stats").textContent} · ${np} with a playlist</p></div>
    <h4 class="subh">What it is for</h4>
    <p>Every style here is placed at the year it cohered into a named, recorded scene, and joined to the styles it grew out of. Time runs left to right, so following a line backwards shows you what a sound is made of.</p>
    <p>It is not trying to settle anything. It is trying to make the inheritance visible, so you can get from a record you already love to the thing it came out of, and hear why they are related.</p>
    <h4 class="subh">Where it comes from</h4>
    <p>This was compiled by hand, not pulled from a database. Styles, years and parentage come from the general music-historical record: scene histories, discographies, reference works and critical writing, cross-checked where accounts disagree. ${withSrc} entries carry a Sources list naming the pages they were checked against. The others stand on that general reading and are not individually cited.</p>
    <p>A link means one style is a direct stylistic parent of another, not every influence on it and not merely something it shared a decade with. Years mark when a scene cohered, not its earliest precursor. Styles from elsewhere appear when they charted here or seeded scenes here.</p>
    <p>Boundaries, dates and parentage are all contested, and a lineage is a reading rather than a fact. Take each link as the consensus view and the map as an argument you are free to disagree with.</p>
    <h4 class="subh">The playlists</h4>
    <p>Each playlist runs in chronological order, and the first few tracks are deliberately not the style proper. They are the records that pushed it into being, or the earliest examples of it, cut before anyone had a name for it.</p>
    <p>So a playlist starts just outside its own style and arrives at it, which is the same move the map makes. If the opening tracks sound like something else, that is the point: that is what it grew out of.</p>
    <h4 class="subh">Reading the map</h4>
    <p>A play triangle inside a dot marks a style with a playlist, linked in its panel. The bigger the name, the more styles grew out of it. Everything before 1950 sits left of the divider, on its own compressed scale, and is set in italic. Zoomed out, the styles that led nowhere show as plain dots.</p>
    <button type="button" class="aboutcopy" data-aboutcopy="about"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.4 11.6a3.2 3.2 0 0 0 4.6 0l2.6-2.6a3.2 3.2 0 0 0-4.6-4.6l-1 1"/><path d="M11.6 8.4a3.2 3.2 0 0 0-4.6 0L4.4 11a3.2 3.2 0 0 0 4.6 4.6l1-1"/></svg><span class="lbl">Copy a link to this</span></button></div>`}; },
  install:()=>({title:"How to install it", html:`<div class="about">${openInRow()}<p>Offshoots is a web page, so there is nothing to download and no app store. Every platform below can pin it to a home screen or dock, where it opens full screen with no browser chrome around it.</p><h4 class="subh">iPhone and iPad</h4><ol class="steps"><li>Open this page in <b>Safari</b>. Chrome and Firefox on iOS cannot do this.</li><li>Tap the <b>Share</b> button, the square with an arrow coming out of it: ${SHAREGLYPH}${shareStep()}</li><li>Scroll down the list and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol><h4 class="subh">Android</h4><ol class="steps"><li>Open this page in <b>Chrome</b>.</li><li>Tap the <b>three dots</b> at the top right.</li><li>Tap <b>Add to Home screen</b>, then <b>Install</b> or <b>Add</b>. Samsung Internet and Firefox have the same item in their own menus.</li></ol><h4 class="subh">Mac</h4><ol class="steps"><li>In <b>Safari</b>, choose <b>File &rsaquo; Add to Dock</b>, then <b>Add</b>. It lands in the Dock and opens in its own window.</li><li>In <b>Chrome</b>, the same thing is under the three dots at <b>Cast, Save and Share &rsaquo; Install page as app</b>.</li></ol><h4 class="subh">Windows</h4><ol class="steps"><li>In <b>Edge</b> or <b>Chrome</b>, look for the <b>install icon</b> at the right-hand end of the address bar, a monitor with an arrow in it, and click it.</li><li>No icon there? Open the <b>three dots</b> menu and choose <b>Apps &rsaquo; Install this site as an app</b> in Edge, or <b>Cast, Save and Share &rsaquo; Install page as app</b> in Chrome.</li><li>Tick <b>Pin to taskbar</b> when it offers, and it behaves like any other app.</li></ol><h4 class="subh">What you get</h4><p>The whole map is a single file, so once it has loaded it keeps working without a connection. The playlist links still need one, since those open Apple Music or Spotify.</p><button type="button" class="aboutcopy" data-aboutcopy="install"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.4 11.6a3.2 3.2 0 0 0 4.6 0l2.6-2.6a3.2 3.2 0 0 0-4.6-4.6l-1 1"/><path d="M11.6 8.4a3.2 3.2 0 0 0-4.6 0L4.4 11a3.2 3.2 0 0 0 4.6 4.6l1-1"/></svg><span class="lbl">Copy a link to this</span></button></div>`})
};
const PAGEICON={roots:LRICON.roots,top:LRICON.top,about:"<circle cx=\"10\" cy=\"10\" r=\"7.4\"/><path d=\"M10 9.2v4.4\"/><path d=\"M10 6.5h.01\"/>",install:"<path d=\"M10 3v8.6\"/><path d=\"M6.4 8.4L10 12l3.6-3.6\"/><path d=\"M4.2 14.2v1.4a1.4 1.4 0 0 0 1.4 1.4h8.8a1.4 1.4 0 0 0 1.4-1.4v-1.4\"/>"};
function pageRow(key,label,count,title){
  return `<button type="button" class="listrow" data-page="${key}"${title?` title="${esc(title)}" aria-label="${esc(title)}"`:""}>`
    + `<i class="lrico"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PAGEICON[key]||""}</svg></i>`
    + `<span class="lrlbl">${esc(label)}</span>${count!=null?`<em class="lrct">${count}</em>`:""}${GOCHEV}</button>`;
}
function emptyPanel(){
  setTint("");
  syncBack();                      // so the map pill is in its home state from the first paint
  setExpandLabel("", "About this map", "About");
  setPbar("Offshoots", FAMS.length+" families · "+nodes.length+" styles");
  syncPull();
  const top=[...nodes].sort((a,b)=>b.children.length-a.children.length||a.year-b.year).slice(0,12);
  const np=playable().length;
  const withSrc=DATA.filter(r=>Array.isArray(r[7])&&r[7].length).length;
  resetPages();
  $("panelBody").innerHTML=`<div class="pcard ovcard"><div class="navrow"><div class="navleft"><button id="panelBack" class="navback" type="button" hidden aria-label="Back" title="Back"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 10H4.6"/><path d="M9.4 4.6L4 10l5.4 5.4"/></svg><span class="bklbl"></span><svg class="bkmap" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.8 5.4L7.4 3.4v11.2L2.8 16.6z"/><path d="M7.4 3.4l5.2 2v11.2l-5.2-2z"/><path d="M12.6 5.4l4.6-2v11.2l-4.6 2z"/></svg></button></div><div class="navttl navgap ovttl"><span class="mn">Explore</span></div>${CLOSEBTN}</div><h1 class="bigttl"><span class="mn">Explore</span></h1><div class="more">
    ${browseRow()}
    ${modeSect()}
    <p class="note ovhint">Or tap any style on the map to trace where it came from and what it led to.</p>
    <div class="sect sect-learn nohead"><div class="secbody"><div class="colrows">
    ${pageRow("about","About this map")}
    ${pageRow("install","How to install it")}
    </div></div>${appShareBtn()}</div></div>`;
  wrapStack(panelCard());
}



// ---------- floating Wikipedia reader ----------
const wrap=$("wikiwrap"), wframe=$("wikiframe"), wfail=$("wikifail");
let wtimer=0;
function mobileWiki(u){ return u.replace("://en.wikipedia.org","://en.m.wikipedia.org"); }
function openWiki(url,title){
  $("wikittl").textContent=title; $("wikiout").href=url; wfail.querySelector(".go").href=url; $("wikihintlink").href=url;
  wfail.hidden=true; wframe.hidden=false; wframe.src=mobileWiki(url);
  wrap.hidden=false; document.body.style.overflow="hidden";
  clearTimeout(wtimer); wtimer=setTimeout(()=>{ if(!wframe.dataset.ok) wikiFail(); },3500);
}
function wikiBlocked(){ // a refused frame sits on about:blank (readable); a real article is cross-origin and throws
  try{ const h=wframe.contentWindow && wframe.contentWindow.location.href; return !h || h==="about:blank"; }catch(e){ return false; }
}
function wikiFail(){ clearTimeout(wtimer); wfail.hidden=false; wframe.hidden=true; }
wframe.addEventListener("load",()=>{ if(wikiBlocked()){ wikiFail(); return; } wframe.dataset.ok="1"; clearTimeout(wtimer); wfail.hidden=true; });
wframe.addEventListener("error",wikiFail);
function closeWiki(){ wrap.hidden=true; wframe.removeAttribute("src"); delete wframe.dataset.ok; clearTimeout(wtimer); document.body.style.overflow=""; }
wrap.addEventListener("click",e=>{ if(e.target.closest("[data-wclose]")) closeWiki(); });
document.addEventListener("click",e=>{ const a=e.target.closest("a.wk:not(.pl):not(.sp)"); if(!a) return; e.preventDefault(); openWiki(a.href, a.dataset.name||"Wikipedia"); });

// ---------- search ----------
const q=$("q"), res=$("res"); let hits=[], act=0;
function find(t){
  t=t.trim().toLowerCase(); if(!t) return [];
  // a title match is worth less than a name, a note or an artist, and is not tried at all
  // on a short query, where a word like "you" would match most of the playlists at once
  const score=n=>{ const nm=n.name.toLowerCase(); if(nm.startsWith(t)) return 0; if(nm.includes(t)) return 1;
    if(n.search.includes(t)) return 2; if(t.length>=4 && n.songsearch.includes(t)) return 3; return 9; };
  return nodes.map(n=>[score(n),n]).filter(a=>a[0]<9).sort((a,b)=>a[0]-b[0]||a[1].year-b[1].year).slice(0,8).map(a=>a[1]);
}
function hitLine(n){ const t=q.value.trim().toLowerCase(), has=x=>x.toLowerCase().includes(t);
  // name the artist that matched, whether it is one of the three on the panel or
  // one of the deeper playlist names, so the row says why it is in the list
  const m=n.artists.find(has)||n.roster.find(has);
  if(m && !n.note.toLowerCase().includes(t)) return m+" · "+n.note;
  // nothing else matched, so it was a track title: quote it, since a bare title reads as a note
  const sg = t.length>=4 && !n.note.toLowerCase().includes(t) && n.songs.find(has);
  return sg ? "\u201c"+sg+"\u201d · "+n.note : n.note; }
function renderHits(){
  if(!hits.length){ res.hidden=true; return; }
  res.innerHTML = hits.map((n,i)=>`<li><button class="${i===act?"act":""}" data-go="${n.id}" role="option"><span>${esc(n.name)}</span><small>${n.year<1950?esc(n.disp):n.year} · ${esc(hitLine(n))}</small></button></li>`).join("");
  res.hidden=false;
}
(function(){ const f=q.closest("form"); if(f) f.addEventListener("submit",e=>e.preventDefault()); })();
q.addEventListener("input",()=>{ hits=find(q.value); act=0; renderHits(); qsync(); });
q.addEventListener("keydown",e=>{
  if(e.key==="ArrowDown"){ act=Math.min(act+1,hits.length-1); renderHits(); e.preventDefault(); }
  else if(e.key==="ArrowUp"){ act=Math.max(act-1,0); renderHits(); e.preventDefault(); }
  else if(e.key==="Enter"&&hits[act]){ go(hits[act].id); q.blur(); }
  else if(e.key==="Escape"){ res.hidden=true; }
});
res.addEventListener("click",e=>{ const b=e.target.closest("[data-go]"); if(b){ go(b.dataset.go); q.blur(); } });
document.addEventListener("click",e=>{ if(!e.target.closest(".search")) res.hidden=true; });
function go(id){ res.hidden=true; q.value=""; qsync(); document.body.classList.remove("searching"); select(id);
  panelTop(); }
// a cover that isn't there just disappears; error doesn't bubble, so listen on the capture phase
// a cover that fails once is usually a hiccup; only a second failure means there is no file,
// and then a tile keeps the row the same shape instead of collapsing it
$("panelBody").addEventListener("error",e=>{
  const t=e.target; if(!t||t.tagName!=="IMG"||!t.classList.contains("pcov")) return;
  if(!t.dataset.retried){
    t.dataset.retried="1";
    const src=(t.getAttribute("src")||"").split("?")[0];
    setTimeout(()=>{ if(t.isConnected) t.src=src+"?r=1"; },500);
    return;
  }
  const ph=document.createElement("span");
  ph.className="pcov pcovph"; ph.setAttribute("aria-hidden","true");
  if(t.dataset.c) ph.style.setProperty("--c",t.dataset.c);
  ph.innerHTML="<b></b>"; ph.firstChild.textContent=t.dataset.ini||"";
  t.replaceWith(ph);
},true);

function panelTop(){ const pb=$("panelBody"); if(!pb) return; pb.scrollTop=0; document.body.classList.remove("pscrolled"); setTimeout(()=>{ pb.scrollTop=0; document.body.classList.remove("pscrolled"); },60); }
function qsync(){ const b=$("qclear"); if(b) b.hidden = !q.value; }
function openSearch(){
  // iOS only raises the keyboard if focus happens inside the tap itself, so do it first and synchronously
  document.body.classList.add("searching");
  q.focus({preventScroll:true});

  qsync();
}
function closeSearch(){
  document.body.classList.remove("searching");
  q.value=""; hits=[]; act=0; res.hidden=true; qsync();
}
q.addEventListener("blur",()=>setTimeout(()=>{ if(!q.value && !res.matches(":hover")) closeSearch(); },180));
q.addEventListener("keydown",e=>{ if(e.key==="Escape"){ e.stopPropagation(); closeSearch(); } });
(function(){
  const b=$("qclear"); if(!b) return;
  b.addEventListener("click",()=>{ q.value=""; hits=[]; act=0; res.hidden=true; qsync(); q.focus(); });
})();

// ---------- zoom ----------
function updZoom(){ const pct=Math.round(Z*100)+"%"; $("zreset").textContent=pct; $("zin").disabled=Z>=ZMAX; $("zout").disabled=Z<=ZMIN; $("zreset2").hidden = Math.abs(Z-1)<.001; $("zpct").textContent=pct; }
function setZoom(z){
  z=Math.min(ZMAX,Math.max(ZMIN,Math.round(z*10)/10)); if(z===Z) return;
  const fx=(scroller.scrollLeft+scroller.clientWidth/2)/W, fy=(scroller.scrollTop+scroller.clientHeight/2)/(H+AXH+BAR());
  Z=z; render(); if(state.sel) select(state.sel,{scroll:false,repaint:false});
  scroller.scrollLeft=fx*W-scroller.clientWidth/2; scroller.scrollTop=fy*(H+AXH+BAR())-scroller.clientHeight/2;
  updZoom();
}
$("zin").onclick=()=>setZoom(Z+.1);
$("zout").onclick=()=>setZoom(Z-.1);
$("zreset").onclick=()=>setZoom(1);
$("zreset2").onclick=()=>setZoom(1);
scroller.addEventListener("keydown",e=>{ if(e.key==="+"||e.key==="="){setZoom(Z+.1);e.preventDefault();} else if(e.key==="-"){setZoom(Z-.1);e.preventDefault();} else if(e.key==="0"){setZoom(1);e.preventDefault();} });
scroller.addEventListener("wheel",e=>{ if(e.ctrlKey){ e.preventDefault(); setZoom(Z+(e.deltaY<0?.1:-.1)); } },{passive:false});
// pinch-to-zoom (touch): scale about the midpoint, snapping to 5% steps
let pinch=null;
const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
// Drag the map with a mouse. A trackpad pans on its own and a phone has fingers;
// a mouse has a wheel and nothing else, so the map is grabbed from empty space and
// pushed. Anything that already answers a click is left alone, and the pan only
// starts after a few pixels, so clicking the background still clears the selection.
let pan=null;
const PANSLOP=3, PANSKIP=".n,a,button,input,select,textarea,[data-go],[data-menu]";
function endPan(){
  if(!pan) return;
  const moved=pan.on;
  try{ scroller.releasePointerCapture(pan.id); }catch(_){}
  pan=null; document.body.classList.remove("panning");
  // the drag ends over whatever it ends over, and that would read as a click on it
  if(moved){ const eat=ev=>{ ev.preventDefault(); ev.stopPropagation(); };
    addEventListener("click",eat,true); setTimeout(()=>removeEventListener("click",eat,true),0); }
}
scroller.addEventListener("pointerdown",e=>{
  if(e.pointerType!=="mouse"||e.button!==0) return;
  if(e.target.closest&&e.target.closest(PANSKIP)) return;
  pan={id:e.pointerId,x:e.clientX,y:e.clientY,l:scroller.scrollLeft,t:scroller.scrollTop,on:false};
});
scroller.addEventListener("pointermove",e=>{
  if(!pan||e.pointerId!==pan.id) return;
  const dx=e.clientX-pan.x, dy=e.clientY-pan.y;
  if(!pan.on){
    if(Math.abs(dx)<PANSLOP&&Math.abs(dy)<PANSLOP) return;
    pan.on=true; document.body.classList.add("panning");
    try{ scroller.setPointerCapture(pan.id); }catch(_){}
  }
  scroller.scrollLeft=pan.l-dx; scroller.scrollTop=pan.t-dy;
  e.preventDefault();
});
scroller.addEventListener("pointerup",endPan);
scroller.addEventListener("pointercancel",endPan);
addEventListener("blur",endPan);

scroller.addEventListener("touchstart",e=>{ if(e.touches.length===2){ const r=scroller.getBoundingClientRect(); const mx=(e.touches[0].clientX+e.touches[1].clientX)/2-r.left, my=(e.touches[0].clientY+e.touches[1].clientY)/2-r.top; pinch={d0:dist(e.touches),z0:Z,fx:(scroller.scrollLeft+mx)/W,fy:(scroller.scrollTop+my)/(H+AXH+BAR()),mx,my}; e.preventDefault(); } },{passive:false});
scroller.addEventListener("touchmove",e=>{ if(!pinch||e.touches.length!==2) return; e.preventDefault(); const z=Math.min(ZMAX,Math.max(ZMIN,Math.round(pinch.z0*dist(e.touches)/pinch.d0*10)/10)); if(z!==Z){ Z=z; render(); if(state.sel) select(state.sel,{scroll:false,repaint:false}); scroller.scrollLeft=pinch.fx*W-pinch.mx; scroller.scrollTop=pinch.fy*(H+AXH+BAR())-pinch.my; updZoom(); } },{passive:false});
scroller.addEventListener("touchend",e=>{ if(e.touches.length<2) pinch=null; });
scroller.addEventListener("touchcancel",()=>{ pinch=null; });
// iOS Safari fires gesture events for pinch; stop the page itself from zooming
["gesturestart","gesturechange","gestureend"].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));


// ---------- boot & resize ----------
let RENDERED=false;
// space the floating search bar covers at the bottom, so the last lanes can always be scrolled clear of it
// GLIDING guards the inline max-height the sheet animation needs: this runs on a zero
// timeout from setOpen and would otherwise restore the 46vh cap before the first frame,
// clamping the closing animation to its end state instantly.
function sizeCard(){ const el=$("panel"); if(el && !GLIDING) el.style.maxHeight=""; }
// Breathing room under the map, plus whatever the floating sheet covers, so the lowest
// styles can still be scrolled up into the open band. The room has to clear the sheet's
// shadow as well as the sheet: that shadow reaches 30px up, so 24px of clearance left the
// last lane sitting in it and reading as stuck underneath.
function SRES(){ return (OVERLAY?56:24) + sheetCover(); }
// the map used to be resized by the sheet, so its ResizeObserver kept this honest. Now
// that the sheet floats, nothing observes the change and the padding has to be told.
function syncMapPad(){ const i=$("inner"); if(i) i.style.paddingBottom=SRES()+"px"; }
// The map used to be resized by the sheet, so one ResizeObserver on the scroller kept
// everything in step. The sheet floats now and the scroller never changes, so watch the
// sheet itself: this covers the first paint, a drag to a height of its own, a rotation
// and a mobile toolbar sliding away.
if(window.ResizeObserver){
  const pel=$("panel");
  if(pel) new ResizeObserver(()=>{ syncMapPad(); }).observe(pel);
}
function render(){ RENDERED=true; dims(); LOD = Z<0.9; $("chart").classList.toggle("lod",LOD); fit();
  const res=SRES(); $("inner").style.paddingBottom=res+"px"; measureHead();
  layout(scroller.clientHeight-AXH-BAR()-res-HEADH); draw(); }
let lastW=0,lastH=0,rt;
// the panel is docked, so opening or closing it changes the map viewport: re-lay out when that happens
let ro;
if(window.ResizeObserver){ let rot; ro=new ResizeObserver(()=>{ clearTimeout(rot); rot=setTimeout(()=>{ if(!RENDERED||DRAGGING) return; render(); if(state.sel) select(state.sel,{scroll:false,repaint:false}); },120); }); ro.observe(scroller); }
addEventListener("resize",()=>{ clearTimeout(rt); rt=setTimeout(()=>{
  if(innerWidth===lastW && Math.abs(innerHeight-lastH)<120) return; // ignore mobile toolbar jitter
  lastW=innerWidth; lastH=innerHeight;
  const wasOverlay=OVERLAY; render(); if(state.sel) select(state.sel,{scroll:false});

},150); });
function boot(){
  lastW=innerWidth; lastH=innerHeight; render(); updZoom();
  const h=(location.hash||"").slice(1);
  if(FOLDS[h]){
    emptyPanel(); scroller.scrollLeft=0; scroller.scrollTop=0; syncPeek();
    setOpen(true);                         // the sheet is closed on a phone by default
    setTimeout(()=>openAbout(true,h),420); // after the sheet has finished opening
  }
  else if(byId[h]) select(h,{smooth:false});
  else { emptyPanel(); scroller.scrollLeft = 0; scroller.scrollTop = 0; syncPeek(); }
}
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(boot,boot);
function kb(){
  sizeCard();
  const vv = window.visualViewport;
  const vh = vv ? vv.height : innerHeight;
  res.style.maxHeight = Math.max(120, Math.round(vh - 150)) + "px";
}
if(window.visualViewport){ visualViewport.addEventListener("resize",()=>{ kb(); clearTimeout(rt); rt=setTimeout(()=>{ fit(); },150); }); visualViewport.addEventListener("scroll",kb); }
q.addEventListener("focus",()=>{ setTimeout(kb,50); setTimeout(kb,350); });
q.addEventListener("blur",()=>{ setTimeout(kb,100); });
})();
