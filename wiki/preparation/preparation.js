'use strict';
(async function () {
  const root = document.querySelector('#preparation-app');
  const el = (tag, value, parent=root) => {const n=document.createElement(tag);if(value!==undefined)n.textContent=value;parent.append(n);return n;};
  const normalize=value=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replaceAll('ø','o');
  const readable=value=>String(value).replaceAll('_',' ');
  const status=c=>c.id==='artmusic'?'Existing class: reconcile map link':c.id==='jangle'?'Existing private playlist: reconcile contents':c.id==='ukgarage'?'Existing class: reconcile catalog copy and links':'Prepared, unpublished';
  const paragraphs=(values,parent)=>{for(const v of values){if(typeof v==='string'&&v)el('p',readable(v),parent);}};
  try {
    const data = await (await fetch('/wiki/preparation/preparation.json')).json();
    root.textContent='';
    const indexPanel=el('div');
    const label=el('label','Search classes, artists or songs',indexPanel);label.htmlFor='prep-search';
    const input=el('input',undefined,indexPanel);input.id='prep-search';input.type='search';input.placeholder='Class, course, artist or song';
    const batchlabel=el('label','Proposed batch',indexPanel);batchlabel.htmlFor='prep-batch';
    const select=el('select',undefined,indexPanel);select.id='prep-batch';
    const all=el('option','All batches',select);all.value='';
    for(const b of data.batches){const o=el('option',`${b.batch}: ${b.title}`,select);o.value=b.batch;}
    const count=el('p',undefined,indexPanel);count.setAttribute('aria-live','polite');
    const layout=el('div',undefined,indexPanel);const list=el('div',undefined,layout);list.className='cards';list.id='prep-results';
    const detail=el('section');detail.id='detail';
    function show(c){
      detail.textContent='';indexPanel.hidden=true;const back=el('button','Back to prepared classes',detail);back.id='prep-back';back.addEventListener('click',()=>{detail.textContent='';indexPanel.hidden=false;const url=new URL(location.href);url.searchParams.delete('class');history.replaceState(null,'',url);input.focus();indexPanel.scrollIntoView({block:'start'});});
      el('h2',c.title,detail);el('p',`${status(c)} · Number ${readable(c.numberStatus)} · Proposed batch ${c.batch}`,detail);const atlas=el('a','View this style in Music Atlas',detail);atlas.href=c.nodeUrl;
      el('p','Preparation only. Publication is not authorized. Catalog matches confirm artist and song names; selected recording versions still need review. Spotify availability has not been checked.',detail).className='note';
      el('h3','Description',detail);el('p',c.description,detail);el('p',`${c.descriptionCharacters} characters`,detail);
      for(const [heading,value] of [['Listening question',c.listeningQuestion],['Listening revelation',c.revelation],['Contradiction',c.contradiction],['Musical argument',c.musicalArgument]]){el('h3',heading,detail);el('p',value,detail);}
      el('h3','Readiness and review issues',detail);paragraphs([c.readiness.research,c.readiness.catalog,c.readiness.chronology],detail);const issues=el('ul',undefined,detail);for(const issue of [...(c.readiness.issues||[]),...(c.readiness.chronologyNotes||[]),...(c.readiness.integrationReviewIssues||[]).map(x=>x.issue)])el('li',readable(issue),issues);
      el('h3',c.id==='artmusic'?'Existing reference sequence':'Ordered candidate sequence',detail);
      const ol=el('ol',undefined,detail);
      for(const t of c.tracks){const k=t.catalog||{};const li=el('li',`${k.artistName||t.artist} - ${k.name||t.title}`,ol);el('p',t.job,li);const dates=[];for(const [key,label] of [['originalYear','Proposed original year'],['originalYearRange','Original year range'],['sequenceYear','Sequence year'],['textYear','Text'],['tuneYear','Tune'],['compositionYear','Composition'],['recordingYear','Recording']])if(t[key]!==null&&t[key]!==undefined)dates.push(label+': '+(Array.isArray(t[key])?t[key].join('–'):t[key]));if(k.releaseDate)dates.push('Catalog carrier: '+k.releaseDate.slice(0,10));el('p',dates.join(' · '),li);el('p',t.versionNotes||t.originalYearStatus||'',li);if(k.url){const a=el('a','Catalog identity',li);a.href=k.url;} const e=el('details',undefined,li);el('summary','Full date and recording evidence',e);el('pre',JSON.stringify(Object.fromEntries(Object.entries(t).filter(([key])=>/year|date|evidence|recording|chronology/i.test(key))),null,2),e);}
      el('h3','Copy candidate import list',detail);
      el('p',c.id==='artmusic'?'No import list: the 24 preserved performance references require exact recording reconciliation.':c.id==='jangle'?'Proposed enrichment for an existing private playlist. Current contents have not been audited.':c.id==='ukgarage'?'Reconcile the existing playlist, including the Streets catalog copy at position 14. Do not create a duplicate.':'Only retained US catalog identity candidates appear below; exclusions remain separate.',detail);
      if(c.importText){const box=el('textarea',undefined,detail);box.id='prep-import';box.readOnly=true;box.value=c.importText;box.rows=Math.min(22,c.importText.split("\n").length+1);box.style.width='100%';const copy=el('button','Copy import list',detail);copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(box.value);copy.textContent='Copied';}catch{box.select();copy.textContent='Select and copy the list';}});}
      el('h3','Excluded essentials and alternates',detail);const decisions=el('ul',undefined,detail);for(const item of [...c.exclusions,...c.alternates]){const li=el('li',`${item.artist} - ${item.title}`,decisions);paragraphs([item.reason,item.decisionReason,item.versionNotes],li);}if(!decisions.children.length)el('p','No additional excluded essentials recorded.',detail);
      el('h3','Cover prompt',detail);el('p',`Expected filename: ${c.art.filename}. ${c.art.exists?'Existing file recorded; no image created this session.':'Image not generated.'}`,detail);const cover=el('textarea',undefined,detail);cover.readOnly=true;cover.rows=14;cover.style.width='100%';cover.value=c.coverPrompt;
      el('h3','Research notes',detail);const notes=el('details',undefined,detail);el('summary','Read detailed teaching notes',notes);el('pre',c.researchNotesText,notes);
      el('h3','Sources',detail);const ul=el('ul',undefined,detail);for(const url of c.sourceURLs){const li=el('li',undefined,ul);const a=el('a',url,li);a.href=url;}
      const url=new URL(location.href);url.searchParams.set('class',c.id);history.replaceState(null,'',url);detail.scrollIntoView({block:'start'});
    }
    const index=data.classes.map(c=>({c,search:normalize([c.title,c.styleName,c.id,...c.distinctArtistCredits,...c.tracks.flatMap(t=>[t.artist,t.title,t.catalog?.artistName,t.catalog?.name])].join(' '))}));
    function render(){const words=normalize(input.value).trim().split(/\s+/).filter(Boolean);const rows=index.filter(x=>(!select.value||String(x.c.batch)===select.value)&&words.every(word=>x.search.includes(word)));list.textContent='';count.textContent=`${rows.length} prepared class${rows.length===1?'':'es'}`;for(const {c} of rows){const button=el('button',undefined,list);button.className='card';el('strong',c.title,button);el('p',`${status(c)} · ${c.tracks.length} candidate/reference rows · Batch ${c.batch}`,button);button.addEventListener('click',()=>show(c));}}
    input.addEventListener('input',render);select.addEventListener('change',render);render();const selected=data.classes.find(c=>c.id===new URL(location.href).searchParams.get('class'));if(selected)show(selected);
  } catch(e) {root.textContent='Preparation data could not be loaded. Please reload this page.';console.error(e);}
})();
