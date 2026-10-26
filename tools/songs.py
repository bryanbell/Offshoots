import re,json,collections,openpyxl,sys
s=open('/home/claude/offshoots/src/data.js').read()
def tbl(n):
    m=re.search(r'const '+n+r'\s*=\s*\{', s); i=m.end(); d=1
    while d:
        if s[i]=='{':d+=1
        elif s[i]=='}':d-=1
        i+=1
    return json.loads('{'+s[m.end():i-1]+'}')
PLAY=tbl('PLAY')
wb=openpyxl.load_workbook('/mnt/user-data/uploads/Music/curriculum/School of Listening.xlsx')
C=wb['Classes']; T=wb['Tracks']
h=[c.value for c in C[5]]
def appid(u):
    m=re.search(r'(pl\.u-[A-Za-z0-9]+|pl\.[A-Za-z0-9]+)',str(u or '')); return m.group(1) if m else None
byapp={}
for r in C.iter_rows(min_row=6,values_only=True):
    d=dict(zip(h,r)); a=appid(d.get('Apple Music URL'))
    if a: byapp[a]=str(d['Course number'])
th=[c.value for c in T[5]]
tr=collections.defaultdict(list)
for r in T.iter_rows(min_row=6,values_only=True):
    d=dict(zip(th,r))
    if d.get('Class number') and d.get('Song'): tr[str(d['Class number'])].append(str(d['Song']).strip())
out={}
for sid,p in PLAY.items():
    c=byapp.get(appid(p))
    if not c or not tr.get(c): continue
    seen=[]
    for x in tr[c]:
        if x and x not in seen: seen.append(x)
    out[sid]=seen
print('styles',len(out),'songs',sum(len(v) for v in out.values()),file=sys.stderr)
body=",".join('"%s":%s'%(k,json.dumps(v,ensure_ascii=False,separators=(',',':'))) for k,v in out.items())
print("const SONGS = {"+body+"};")
