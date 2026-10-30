// Text contrast on the root panel, which is the one surface with no family tint to
// carry it. Every string is measured against the colour actually painted behind it,
// walking up for the first non-transparent background: the muted grey clears 4.5 on the
// panel but used to fail it on the raised cards, which is exactly where the longest
// passages of text sit.
//
// Tinted style panels are not covered here. They derive --muted and --fill from the
// family's own ink and ground with color-mix, so the root tokens do not reach them.
const {chromium}=require("playwright");
const skipWelcome=require("./_hello");
const {settle,until,shown,arm}=require("./_wait");
const URL="file://"+__dirname+"/../index.html";
const say=(k,v)=>console.log((v===true?"PASS ":v===false?"FAIL ":"     ")+k+(typeof v!=="boolean"?": "+v:""));
// boot runs on document.fonts.ready and draws the map, so the first node is the sign that
// boot has chosen what to show. The lane dim transitions follow it, which settle waits out.
const ready=async q=>{ await arm(q); await shown(q,"#chart .n"); await settle(q); };
// The glide drives #panel with an inline height and clears it on transitionend, so an
// inline height still on the panel means the sheet is still moving even though nothing is
// mutating. Every colour here is read off a painted ground, so the sheet has to be at rest.
const opened=async q=>{ await until(q,()=>document.body.classList.contains("open"));
  await until(q,()=>!document.getElementById("panel").style.height); await settle(q); };

const lum=c=>{const [r,g,b]=c.map(v=>{v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});
  return .2126*r+.7152*g+.0722*b;};
const ratio=(a,b)=>+(((Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05))).toFixed(2);
const parse=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);

(async()=>{
  const b=await chromium.launch(); skipWelcome(b);
  for(const [name,vp,mob] of [["mobile",{width:390,height:844},true],["desktop",{width:1440,height:900},false]]){
    const ctx=await b.newContext({viewport:vp,isMobile:mob,hasTouch:mob,deviceScaleFactor:2});
    const p=await ctx.newPage();
    await p.goto(URL); await ready(p);
    if(mob){ await p.click("#grab"); await opened(p); }
    const rows=await p.evaluate(()=>{
      const bgOf=e=>{ let n=e; while(n){ const c=getComputedStyle(n).backgroundColor;
        if(c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; n=n.parentElement; } return "rgb(0, 0, 0)"; };
      const out=[];
      // every leaf string in the root panel, rather than a list that can fall out of date
      document.querySelectorAll("#panelBody *").forEach(e=>{
        if(e.children.length || !e.textContent.trim()) return;
        const cs=getComputedStyle(e);
        if(cs.display==="none" || cs.visibility==="hidden" || !e.getClientRects().length) return;
        out.push([(e.className||e.tagName).toString().split(" ")[0], cs.color, bgOf(e),
                  parseFloat(cs.fontSize), +cs.fontWeight, e.textContent.trim().slice(0,24)]);
      });
      return out;
    });
    const bad=[];
    rows.forEach(([cls,col,bg,fs,fw,txt])=>{
      const big = fs>=24 || (fs>=18.66 && fw>=700);
      const r=ratio(parse(col),parse(bg));
      if(r < (big?3:4.5)) bad.push(cls+" "+r+" ("+txt+")");
    });
    say(name+": "+rows.length+" strings on the root panel, all at AA contrast"+(bad.length?" — "+bad.join(", "):""), bad.length===0);
    const worst=rows.map(([c,col,bg])=>ratio(parse(col),parse(bg))).sort((a,b)=>a-b)[0];
    say(name+": the faintest of them is "+worst+":1", worst>=4.5);
    await p.close();
  }
  await b.close();
})();
