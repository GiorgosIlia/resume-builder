"use strict";
/* ================= Reading an existing CV (on this device only) =================
   1) Get the text out of the file (PDF, Word .docx, plain text) as lines.
   2) Rule-based reader: decide what each line is and where it belongs. No AI, nothing is uploaded. */

const FCCV=(()=>{
"use strict";
const CV_MAX_BYTES=15*1024*1024;
const CV_LIB=(window.FC_PDFJS&&typeof window.FC_PDFJS==="object")?window.FC_PDFJS:{main:"pdfjs.js",worker:"pdfjs.worker.js"};
const loaded={};
function loadScriptOnce(src){
  if(!loaded[src])loaded[src]=new Promise((res,rej)=>{const sc=document.createElement("script");sc.src=src;sc.onload=res;sc.onerror=()=>{delete loaded[src];rej(new Error("load"))};document.head.appendChild(sc)});
  return loaded[src];
}
// keeps one \t where the CV had a wide gap (columns, right-aligned dates); everything else becomes single spaces
const cleanText=t=>String(t||"").replace(/[   ]/g," ").replace(/[​-‍﻿]/g,"").replace(/[^\S\t]+/g," ").replace(/ *\t\s*/g,"\t").replace(/^\t+|\t+$/g,"").trim();
// "T E C H N I C A L" (letter-spaced headings) -> "TECHNICAL"
const unspace=s=>{const w=s.trim().split(" ");if(!(w.length>=4&&w.filter(x=>x.length===1).length>=w.length*0.7))return s;
  return s.trim().split(/ {2,}/).map(part=>segment(part.replace(/ /g,""))).join(" ")};
// letter-spaced text loses its word breaks; put them back with a small CV vocabulary ("RESTAURANTMANAGER" -> "RESTAURANT MANAGER")
const VOCAB=new Set(("about account accountant accounting additional administrator analyst and architect area assistant associate at backend bar barista bartender business care career certifications "+
  "certificates chef chief clinical communication competencies consultant contact core courses creative critical customer data design designer details developer development digital director "+
  "education employment engineer engineering executive experience finance financial front frontend full guest head history hospitality hotel information intensive interests junior key lead "+
  "languages legal licenses manager marketing me medical nurse objective of office officer operations personal product professional profile projects receptionist registered relations restaurant sales "+
  "senior service services skills software specialist stack staff summary support teacher technical tools training waiter web work worker "+
  "εμπειρια επαγγελματικη εκπαιδευση δεξιοτητεσ γλωσσεσ ξενεσ πιστοποιησεισ προφιλ στοιχεια επικοινωνιασ προσωπικα σπουδεσ υπευθυνοσ υπευθυνη διευθυντησ μηχανικοσ").split(" "));
function segment(word){
  const f=fold(word),n=f.length;if(n<=10)return word;
  const best=new Array(n+1).fill(null);best[0]=[];
  for(let i=1;i<=n;i++)for(let k=Math.max(0,i-16);k<i;k++)if(best[k]&&VOCAB.has(f.slice(k,i))&&(!best[i]||best[k].length+1<best[i].length))best[i]=[...best[k],i];
  if(!best[n])return word;
  let out="",prev=0;for(const cut of best[n]){out+=(prev?" ":"")+word.slice(prev,cut);prev=cut}
  return out;
}

/* ---- PDF: rebuild lines from positioned text, and keep side columns apart ---- */
async function pdfLines(buf){
  if(!window.pdfjsLib){await loadScriptOnce(CV_LIB.main);await loadScriptOnce(CV_LIB.worker)}  // worker code runs in the page: no extra permissions needed
  const lib=window.pdfjsLib;lib.GlobalWorkerOptions.workerSrc=CV_LIB.worker;
  let doc;
  try{doc=await lib.getDocument({data:new Uint8Array(buf),isEvalSupported:false,disableFontFace:true,useSystemFonts:false}).promise}
  catch(e){throw new Error(e&&e.name==="PasswordException"?"locked":"pdf")}
  const out=[];
  for(let p=1;p<=Math.min(doc.numPages,8);p++){
    const page=await doc.getPage(p),tc=await page.getTextContent(),W=page.view[2]||600;
    const items=tc.items.filter(i=>i.str&&i.str.length).map(i=>({s:i.str.trim()?unspace(i.str):" ",x:i.transform[4],y:i.transform[5],w:i.width||0,h:Math.abs(i.transform[3])||Math.abs(i.transform[0])||10}));
    const ink=items.filter(i=>i.s!==" ");
    if(!ink.length)continue;
    // a side column: a vertical gap that no text crosses, with plenty of text on both sides
    let split=null;
    for(let s=W*0.22;s<=W*0.7;s+=4){
      const cross=ink.filter(i=>i.x<s-1&&i.x+i.w>s+1).length;
      const left=ink.filter(i=>i.x+i.w<=s).length,right=ink.filter(i=>i.x>=s).length;
      if(!cross&&left>=ink.length*0.15&&right>=ink.length*0.15){split=s;break}
    }
    const cols=split?[items.filter(i=>i.x<split),items.filter(i=>i.x>=split)]:[items];
    // the column that holds the name (biggest text) goes first
    if(cols.length===2){const big=c=>Math.max(0,...c.filter(i=>i.s!==" ").map(i=>i.h));if(big(cols[1])>big(cols[0]))cols.reverse()}
    for(const col of cols){
      col.sort((a,b)=>b.y-a.y||a.x-b.x);
      const rows=[];
      for(const it of col){const r=rows.find(r=>Math.abs(r.y-it.y)<Math.max(2,(it.h||10)*0.45));if(r){r.items.push(it);if(it.s!==" ")r.h=Math.max(r.h,it.h)}else rows.push({y:it.y,h:it.s===" "?0:it.h,items:[it]})}
      rows.sort((a,b)=>b.y-a.y);
      // each row -> chunks separated by wide gaps
      for(const r of rows){
        r.h=r.h||10;r.items.sort((a,b)=>a.x-b.x);
        const ch=[];let cur=null,end=null;
        for(const it of r.items){
          if(it.s===" "){if(cur){if(it.w>r.h*1.2)cur.brk=true;else if(!/ $/.test(cur.t))cur.t+=" "}end=it.x+it.w;continue}
          const wide=end!==null&&it.x-end>r.h*1.2;
          if(!cur||cur.brk||wide){cur={x:it.x,t:it.s};ch.push(cur)}
          else cur.t+=(end!==null&&it.x-end>r.h*0.15&&!/\s$/.test(cur.t)&&!/^\s/.test(it.s))?" "+it.s:it.s;
          end=it.x+it.w;
        }
        r.chunks=ch.map(c=>({x:c.x,t:cleanText(c.t)})).filter(c=>c.t);
      }
      // two headings side by side ("Certifications   Languages"): read the left block, then the right block
      const lines=[];
      for(let i=0;i<rows.length;i++){
        const r=rows[i];
        const nx=rows[i+1],dateish=t=>!!findRange(t)||/^(19|20)\d{2}$/.test(t)||isPlace(t);
        const pair=r.chunks.length===2&&(r.chunks.every(c=>sectionOf({t:c.t}))||
          (nx&&nx.chunks.length===2&&Math.abs(nx.chunks[0].x-r.chunks[0].x)<6&&Math.abs(nx.chunks[1].x-r.chunks[1].x)<6&&r.chunks[1].x>W*0.3&&![...r.chunks,...nx.chunks].some(c=>dateish(c.t))));
        if(pair){
          const L=r.chunks[0].x,R=r.chunks[1].x,left=[{t:r.chunks[0].t,y:r.y,h:r.h}],right=[{t:r.chunks[1].t,y:r.y,h:r.h}];let j=i+1;
          for(;j<rows.length;j++){
            const q=rows[j];if(!q.chunks.length)continue;
            if(rows[j-1].y-q.y>Math.max(q.h,rows[j-1].h)*5)break;
            if(q.chunks.some(c=>c.x<L-6)||(q.chunks.length===1&&q.chunks[0].x<R-6&&q.chunks[0].t.length>60))break;
            if(q.chunks.length===1&&sectionOf({t:q.chunks[0].t}))break;
            const lt=q.chunks.filter(c=>c.x<R-6).map(c=>c.t).join(" "),rt=q.chunks.filter(c=>c.x>=R-6).map(c=>c.t).join("\t");
            if(lt)left.push({t:lt,y:q.y,h:q.h});if(rt)right.push({t:rt,y:q.y,h:q.h});
          }
          lines.push(...left,{gap:true},...right,{gap:true});i=j-1;continue;
        }
        lines.push({t:r.chunks.map(c=>c.t).join("\t"),y:r.y,h:r.h});
      }
      let prevY=null;
      for(const l of lines){
        if(l.gap){out.push({t:"",gap:true});prevY=null;continue}
        if(!l.t)continue;
        if(prevY!==null&&prevY-l.y>l.h*2.2)out.push({t:"",gap:true});
        out.push({t:l.t,size:l.h});prevY=l.y;
      }
      out.push({t:"",gap:true});
    }
  }
  return out;
}

/* ---- Word .docx: a .docx is a zip file; read word/document.xml with the browser's own unzip ---- */
async function docxLines(buf){
  const u8=new Uint8Array(buf),dv=new DataView(buf);
  let eocd=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-65557);i--)if(dv.getUint32(i,true)===0x06054b50){eocd=i;break}
  if(eocd<0)throw new Error("docx");
  const count=dv.getUint16(eocd+10,true);let off=dv.getUint32(eocd+16,true);
  for(let k=0;k<count&&off+46<=u8.length;k++){
    if(dv.getUint32(off,true)!==0x02014b50)break;
    const method=dv.getUint16(off+10,true),csize=dv.getUint32(off+20,true),nlen=dv.getUint16(off+28,true),xlen=dv.getUint16(off+30,true),clen=dv.getUint16(off+32,true),lho=dv.getUint32(off+42,true);
    const name=new TextDecoder().decode(u8.subarray(off+46,off+46+nlen));
    if(name==="word/document.xml"){
      if(csize>40*1024*1024)throw new Error("docx");
      const start=lho+30+dv.getUint16(lho+26,true)+dv.getUint16(lho+28,true),data=u8.subarray(start,start+csize);
      let xml;
      if(method===0)xml=new TextDecoder().decode(data);
      else if(method===8&&typeof DecompressionStream==="function"){
        // unzip with a size cap, so a booby-trapped file can't fill the memory
        const rd=new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader(),parts=[];let total=0;
        for(;;){const {done,value}=await rd.read();if(done)break;total+=value.length;if(total>25*1024*1024){rd.cancel();throw new Error("docx")}parts.push(value)}
        const all=new Uint8Array(total);let o=0;for(const p of parts){all.set(p,o);o+=p.length}
        xml=new TextDecoder().decode(all);
      }
      else throw new Error("docx");
      return wordXmlLines(xml);
    }
    off+=46+nlen+xlen+clen;
  }
  throw new Error("docx");
}
function wordXmlLines(xml){
  const d=new DOMParser().parseFromString(xml,"application/xml");
  if(d.getElementsByTagName("parsererror").length)throw new Error("docx");
  let out=[];
  const para=p=>{
    let t="",size=0,heading=false,bullet=false,bold=true,any=false;
    const ln=()=>{const c=cleanText(t);if(c)out.push({t:c,size:size||null,heading,bullet:bullet&&!heading,bold:bold&&any});t=""};
    const walk=n=>{
      for(const c of n.childNodes){
        const nm=c.localName;
        if(!nm)continue;
        if(nm==="txbxContent"){[...c.childNodes].filter(x=>x.localName==="p").forEach(para);continue}   // text boxes become their own lines
        if(nm==="p"&&c!==p){para(c);continue}
        if(nm==="pStyle"){const v=(c.getAttribute("w:val")||"").toLowerCase();if(/heading|title|berschrift|kefalida|επικεφαλ/.test(v))heading=true;if(/list/.test(v))bullet=true}
        if(nm==="numPr")bullet=true;
        if(nm==="sz"){const v=+(c.getAttribute("w:val")||0)/2;if(v>size)size=v}
        if(nm==="r"){const rp=[...c.childNodes].find(x=>x.localName==="rPr");const hasT=[...c.childNodes].some(x=>x.localName==="t"&&x.textContent.trim());if(hasT){any=true;if(!rp||![...rp.childNodes].some(x=>x.localName==="b"&&x.getAttribute("w:val")!=="0"))bold=false}}
        if(nm==="t"){t+=c.textContent;continue}
        if(nm==="tab"){t+=" \t ";continue}
        if(nm==="br"||nm==="cr"){ln();continue}
        walk(c);
      }
    };
    walk(p);ln();
  };
  const body=d.getElementsByTagNameNS("*","body")[0]||d.documentElement;
  const visit=n=>{for(const c of n.childNodes){
    if(c.localName==="p")para(c);
    else if(c.localName==="tr")row(c);
    else if(c.localName==="tbl"||c.localName==="sdt"||c.localName==="sdtContent")visit(c)}};
  // a table row ("01/2019 – today | Cook, Restaurant…") becomes one line, cells joined by a wide gap
  const row=tr=>{
    const keep=out,cells=[];
    for(const tc of [...tr.childNodes].filter(x=>x.localName==="tc")){out=[];visit(tc);cells.push(out)}
    out=keep;
    const first=cells.map(c=>c[0]).filter(Boolean);
    if(!first.length)return;
    out.push({t:first.map(x=>x.t).join("\t"),size:Math.max(0,...first.map(x=>x.size||0))||null,heading:first.length===1&&first[0].heading,bullet:false,bold:first.every(x=>x.bold)});
    cells.forEach(c=>c.slice(1).forEach(x=>out.push(x)));
  };
  visit(body);
  return out;
}

async function fileToLines(file){
  const n=(file.name||"").toLowerCase();
  if(file.size>CV_MAX_BYTES)throw new Error("big");
  if(/\.doc$/.test(n))throw new Error("doc");
  const buf=await file.arrayBuffer();
  const head=new Uint8Array(buf.slice(0,5));
  if(head[0]===0x25&&head[1]===0x50&&head[2]===0x44&&head[3]===0x46)return pdfLines(buf);   // %PDF
  if(head[0]===0x50&&head[1]===0x4b)return docxLines(buf);                                      // PK (zip)
  if(/\.(txt|md|text)$/.test(n)||/^text\//.test(file.type)){const t=new TextDecoder().decode(buf);return t.split(/\r?\n/).map(x=>({t:cleanText(x)}))}
  throw new Error("type");
}

/* ================= The rule-based reader ================= */
const fold=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ς/g,"σ");
const SECTIONS={
  summary:["summary","profile","professional summary","personal statement","personal profile","about me","about","objective","career objective","professional profile","profil","προφιλ","συνοψη","περιληψη","σχετικα με εμενα","στοχοσ","επαγγελματικο προφιλ","ατομικο προφιλ","λιγα λογια για μενα"],
  experience:["experience","work experience","professional experience","employment","employment history","work history","career history","relevant experience","volunteer experience","volunteering","internships","internship","εμπειρια","επαγγελματικη εμπειρια","εργασιακη εμπειρια","προυπηρεσια","εθελοντισμοσ","εθελοντικη εργασια","πρακτικη ασκηση"],
  education:["education","education and training","academic background","academic qualifications","studies","εκπαιδευση","σπουδεσ","εκπαιδευση και καταρτιση","ακαδημαικη καταρτιση","ακαδημαικα προσοντα","ακαδημαικεσ σπουδεσ"],
  skills:["skills","technical skills","core skills","key skills","core competencies","competencies","skills and competencies","skills & competencies","digital skills","computer skills","it skills","tools","technologies","tech stack","soft skills","δεξιοτητεσ","ικανοτητεσ","τεχνικεσ δεξιοτητεσ","ψηφιακεσ δεξιοτητεσ","γνωσεισ η/υ","γνωσεισ υπολογιστων","δεξιοτητεσ και ικανοτητεσ","δεξιοτητεσ & ικανοτητεσ"],
  languages:["languages","language","language skills","foreign languages","γλωσσεσ","ξενεσ γλωσσεσ","γλωσσικεσ δεξιοτητεσ"],
  certs:["certifications","certificates","certification","credentials","qualifications","licenses","licences","licenses and certifications","licenses & certifications","courses","training","seminars","awards","honors","honours","achievements","recognition","awards & recognition","awards and recognition","honors & awards","awards and honors","πιστοποιησεισ","πιστοποιητικα","σεμιναρια","αδειεσ","βραβεια","διακρισεισ","επιμορφωση","αδειεσ και πιστοποιησεισ"],
  projects:["projects","personal projects","selected projects","side projects","portfolio","selected work","εργα","εργασιεσ"],
  contact:["contact","contact details","contact information","contacts","personal details","personal information","personal info","details","επικοινωνια","στοιχεια επικοινωνιασ","προσωπικα στοιχεια"],
  ignore:["references","references available upon request","interests","hobbies","hobbies and interests","other","additional information","publications","συστασεισ","ενδιαφεροντα","χομπυ","χομπι","λοιπα","αλλεσ πληροφοριεσ","δημοσιευσεισ"]
};
const SEC_INDEX=(()=>{const m=new Map();for(const[k,arr]of Object.entries(SECTIONS))for(const w of arr)m.set(w,k);return m})();
function sectionOf(line){
  if(!line.t||line.t.includes("\t"))return null;
  const m=line.t.match(/^([^:]{2,40}):\s*(.*)$/);
  if(!m&&line.t.length>60)return null;
  const head=m?m[1]:line.t,rest=m?m[2]:"";
  const k=fold(head).replace(/[^a-zα-ω&/ ]/g," ").replace(/\s+/g," ").trim();
  let sec=SEC_INDEX.get(k)||null;
  if(!sec&&!rest&&/[,&]/.test(head)&&head===head.toUpperCase()&&k.split(" ").length<=6&&/(skills|δεξιοτητεσ)/.test(k))sec="skills";
  if(!sec&&!rest&&!/[,.]/.test(head)&&k.split(" ").length<=4){
    const last=k.split(" ").pop();
    sec={skills:"skills",competencies:"skills",experience:"experience",employment:"experience",education:"education",languages:"languages",certifications:"certs",certificates:"certs",projects:"projects",profile:"summary",summary:"summary",
      δεξιοτητεσ:"skills",εμπειρια:"experience",εκπαιδευση:"education",σπουδεσ:"education",γλωσσεσ:"languages",πιστοποιησεισ:"certs",προφιλ:"summary"}[last]||null;
    if(sec&&!(line.t===line.t.toUpperCase()||line.heading||line.bold||(line.size&&line.size>=12)||k.split(" ").length<=2))sec=null;
  }
  return sec?{sec,rest}:null;
}
const MONTHS="jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|ιαν|φεβ|μαρ|απρ|μαι|ιουν|ιουλ|αυγ|σεπ|οκτ|νοε|δεκ|ιανουαριοσ|φεβρουαριοσ|μαρτιοσ|απριλιοσ|μαιοσ|ιουνιοσ|ιουλιοσ|αυγουστοσ|σεπτεμβριοσ|οκτωβριοσ|νοεμβριοσ|δεκεμβριοσ|ιανουαριου|φεβρουαριου|μαρτιου|απριλιου|μαιου|ιουνιου|ιουλιου|αυγουστου|σεπτεμβριου|οκτωβριου|νοεμβριου|δεκεμβριου";
const NOW_W="present|current|currently|now|today|ongoing|to date|σημερα|τωρα|παρον|μεχρι σημερα|εωσ σημερα";
const DATE_PART=`(?:(?:${MONTHS})\\.?\\s*)?(?:\\d{1,2}\\s*[/.\\-]\\s*){0,2}((?:19|20)\\d{2})`;
const RANGE_RE=new RegExp(`${DATE_PART}\\s*(?:[-–—]|to|until|εωσ|μεχρι|εως)\\s*(?:${DATE_PART}|(${NOW_W}))`,"i");
const YEAR_RE=/\b((?:19|20)\d{2})\b/g;
function findRange(t){
  const f=fold(t),m=f.match(RANGE_RE);
  if(!m)return null;
  const greek=/[α-ωΑ-Ω]/.test(t);
  return {start:m[1],end:m[2]||(greek?"Σήμερα":"Present"),raw:m[0],idx:m.index};
}
const BULLET_RE=/^[••▪●◦‣·►✓➢➤○■□\-–*>]\s*/;
const isSentence=t=>/[.!;]$/.test(t)&&t.trim().split(/\s+/).length>=6;
const isBullet=l=>l.bullet||BULLET_RE.test(l.t);
const stripBullet=t=>t.replace(BULLET_RE,"").trim();
const EMAIL_RE=/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;
const URL_RE=/\b(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9\-]+\.)+[a-z]{2,}(?:\/[^\s|,;]*)?/gi;
const PHONE_RE=/(?:\+|00)\d[\d\s().\-\/]{7,18}\d|\b(?:69\d|2\d{2})[\d\s.\-]{6,11}\d\b/g;
const CITIES=["athens","αθηνα","thessaloniki","θεσσαλονικη","patras","πατρα","heraklion","ηρακλειο","larissa","λαρισα","volos","βολοσ","ioannina","ιωαννινα","chania","χανια","rhodes","ροδοσ","piraeus","πειραιασ","kalamata","καλαματα","kavala","καβαλα","corfu","κερκυρα","greece","ελλαδα","cyprus","κυπροσ","nicosia","λευκωσια","limassol","λεμεσοσ","london","berlin","paris","remote","glyfada","γλυφαδα","marousi","μαρουσι","kifisia","κηφισια","chalandri","χαλανδρι","peristeri","περιστερι","naxos","ναξοσ","crete","κρητη","germany","uk","united kingdom","cyprus"];
const isPlace=t=>{const f=fold(t);return f.length<40&&CITIES.some(c=>new RegExp(`(^|[^a-zα-ω])${c}([^a-zα-ω]|$)`).test(f))};
const ORG_RE=/\b(ltd|llc|inc|plc|spa|srl|s\.r\.l|gmbh|ag|bv|sarl|sas|s\.?a\.?|a\.?e\.?|gmbh|group|hotels?|resorts?|restaurants?|hospital|clinic|bank|university|college|school|agency|studio|company|corp|corporation|consulting|technologies|solutions|software|labs?|foundation|ministry|municipality)\b|(α\.ε\.|ε\.π\.ε\.|ι\.κ\.ε\.|ο\.ε\.|ξενοδοχει|νοσοκομει|τραπεζα|πανεπιστημι|εταιρει|ομιλοσ|κλινικ|δημοσ |υπουργει|σχολη|εστιατορι)/i;
const ROLE_RE=/(manager|engineer|developer|programmer|assistant|nurse|analyst|designer|chef|cook|waiter|waitress|bartender|barista|receptionist|director|intern|specialist|consultant|coordinator|officer|lead|head of|supervisor|representative|accountant|teacher|associate|administrator|technician|architect|executive|clerk|owner|founder|cashier|driver|sales|marketing|υπαλληλ|διευθυντ|μηχανικ|προγραμματιστ|βοηθ|νοσηλευτ|σερβιτορ|μαγειρ|ρεσεψιονιστ|συμβουλ|λογιστ|πωλητ|εκπαιδευτ|καθηγητ|ασκουμεν|υπευθυν|προισταμεν|ταμι|οδηγ|σεφ)/i;
const DEGREE_RE=/\b(b\.?sc|m\.?sc|b\.?a|m\.?a|mba|ph\.?d|bachelor|master|masters|diploma|degree|bsc|msc|meng|beng|high school|certificate|associate)\b|(πτυχιο|μεταπτυχιακ|διδακτορικ|διπλωμα|απολυτηριο|λυκει|ιεκ|ι\.ε\.κ|τει|μsc|bsc)/i;
const DEGREE_STRONG=/(πτυχιο|απολυτηριο|μεταπτυχ|διδακτορ|bachelor|master|\bb\.?sc\b|\bm\.?sc\b|\bb\.?a\b|\bm\.?a\b|\bmba\b|ph\.?d|diploma|διπλωμα|degree)/i;
const SCHOOL_RE=/((?:^|[^a-zα-ω])(?:γελ|επαλ|ιεκ)(?:[^a-zα-ω]|$)|γυμνασιο|university|universit|college|school|institute|academy|polytechnic|πανεπιστημι|πολυτεχνει|σχολη|ινστιτουτ|κολλεγι|λυκει|ιεκ|ακαδημια|τει|γυμνασι)/i;
const FIELD_WORDS={
  hospitality:/(hotel|restaurant|guest|waiter|waitress|chef|cook|bartender|barista|front office|reception|housekeeping|f&b|food and beverage|tourism|ξενοδοχ|εστιατορ|σερβιτορ|μαγειρ|ρεσεψιον|τουρισμ|μπαρ)/g,
  it:/(developer|software|engineer|python|javascript|typescript|java\b|react|node|sql|aws|docker|kubernetes|devops|backend|frontend|full.?stack|api|git\b|linux|programmer|προγραμματιστ|λογισμικ|πληροφορικ)/g,
  healthcare:/(nurse|nursing|hospital|patient|clinical|icu|doctor|physician|pharmac|physio|medical|health|νοσηλευτ|νοσοκομει|ασθεν|ιατρ|κλινικ|φαρμακ|φυσικοθεραπ)/g,
  finance:/(finance|financial|accounting|accountant|audit|bank|banking|investment|tax|lawyer|legal|law\b|attorney|cfa|acca|valuation|λογιστ|οικονομ|τραπεζ|ελεγκτ|φορολογ|δικηγορ|νομικ)/g,
  creative:/(design|designer|figma|photoshop|illustrator|indesign|art director|creative|branding|typography|photograph|video|γραφιστ|σχεδιασ|φωτογραφ|δημιουργ)/g,
  marketing:/(marketing|sales|seo|sem|campaign|social media|brand manager|growth|crm|hubspot|salesforce|lead generation|πωλησ|μαρκετινγκ|διαφημισ|προωθησ)/g
};
const titleCase=s=>s.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase());
const looksLikeName=t=>{const w=t.split(/\s+/);return w.length>=2&&w.length<=5&&t.length<=50&&/^[\p{L}][\p{L}.'’\- ,]+$/u.test(t)&&!EMAIL_RE.test(t)&&!/\d/.test(t)&&!sectionOf({t})};

function splitItems(t){
  const out=[];let cur="",depth=0;
  for(const ch of t){
    if(ch==="("||ch==="[")depth++;else if((ch===")"||ch==="]")&&depth)depth--;
    if(!depth&&/[,;|•·\t]/.test(ch)){out.push(cur);cur="";continue}
    cur+=ch;
  }
  out.push(cur);return out.map(x=>x.trim()).filter(Boolean);
}
function readCV(lines){
  lines=lines.filter(l=>l.gap||!/^(curriculum vitae|resume|résumé|cv|βιογραφικο σημειωμα|βιογραφικο)$/.test(fold(l.t).replace(/[^a-zα-ω ]/g,"").trim()));
  lines=lines.filter(l=>l.gap||!/^(page|σελιδα)\s*\d+(\s*(of|από|απο|\/)\s*\d+)?$/i.test(fold(l.t))&&!/^\d+\s*\/\s*\d+$/.test(l.t));
  const all=lines.filter(l=>!l.gap).map(l=>l.t).join("\n");
  const out={},found=[];
  /* contacts, wherever they are */
  const email=(all.match(EMAIL_RE)||[])[0];if(email){out.email=email.toLowerCase();found.push("email")}
  const phones=(all.match(PHONE_RE)||[]).map(p=>p.trim()).filter(p=>{const d=p.replace(/\D/g,"");return d.length>=10&&d.length<=15&&!/^(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}$/.test(p)});
  if(phones.length){out.phone=phones[0].replace(/\s+/g," ");found.push("phone")}
  const urls=(all.replace(new RegExp(EMAIL_RE.source,"g")," ").match(URL_RE)||[]).map(u=>u.replace(/^https?:\/\//i,"").replace(/^www\./i,"").replace(/[.)]+$/,"")).filter(u=>/\.[a-z]{2,}/i.test(u)&&!/^\d/.test(u));
  const pick=re=>urls.find(u=>re.test(u));
  out._links={linkedin:pick(/linkedin\.com/i),github:pick(/github\.com|gitlab\.com/i),other:urls.find(u=>!/linkedin|github|gitlab|facebook|instagram|twitter|x\.com/i.test(u))};
  /* split into sections */
  const buckets={top:[]};let cur="top";
  for(const l of lines){
    if(l.gap){(buckets[cur]=buckets[cur]||[]).push(l);continue}
    const s=sectionOf(l);
    if(s&&s.rest&&cur==="skills"&&s.sec==="languages"&&!/(english|greek|german|french|italian|spanish|ελληνικ|αγγλικ)/i.test(fold(s.rest)))s=null;
    if(s){cur=s.sec;buckets[cur]=buckets[cur]||[];if(s.rest)buckets[cur].push({...l,t:s.rest});continue}
    (buckets[cur]=buckets[cur]||[]).push(l);
  }
  const textOf=b=>(buckets[b]||[]).filter(l=>!l.gap);
  const isContact=t=>EMAIL_RE.test(t)||(t.match(PHONE_RE)||[]).some(p=>p.replace(/\D/g,"").length>=10)||/linkedin\.com|github\.com|https?:\/\//i.test(t)||/^(tel|phone|mobile|email|e-mail|address|location|τηλ|κιν|διευθυνση|email)\b/i.test(fold(t));
  /* location: a labelled line, or a place in the header/contact lines */
  const headLines=[...textOf("top"),...textOf("contact")];
  for(const l of headLines){
    const lab=l.t.match(/^(?:address|location|city|διευθυνση|τοποθεσια|πολη|κατοικια)\s*:\s*(.+)$/i)||fold(l.t).match(/^(?:address|location|city|διευθυνση|τοποθεσια|πολη|κατοικια)\s*:\s*(.+)$/);
    if(lab){let v=l.t.split(":").slice(1).join(":").trim().split(/\s*,\s*/);
      if(v.length>1&&/\d/.test(v[0]))v=v.slice(1);   // keep the town, not the street address
      out.location=v.join(", ");break}
    const seg=l.t.split(/\s*[|•·]\s*|\s{3,}|\t/).find(x=>isPlace(x)&&!EMAIL_RE.test(x)&&!(x.match(PHONE_RE)||[]).length);
    if(seg){out.location=seg.replace(/^[^\p{L}]+/u,"").trim();break}
  }
  if(out.location)found.push("location");
  /* name: the biggest (or first) name-like line near the top */
  const top=textOf("top");
  const labelled=headLines.find(l=>/^(name|full name|first name|ονομα|ονοματεπωνυμο)\s*:/i.test(fold(l.t))&&l.t.split(":").slice(1).join(":").trim());
  let nameLine=labelled?{t:labelled.t.split(":").slice(1).join(":").trim()}:null;
  if(!nameLine){
    const mail=(email||"").split("@")[0],slug=((out._links.linkedin||"").match(/\/in\/([^/?#]+)/)||[])[1]||"";
    for(const l of top.slice(0,4)){
      const w=l.t.trim();if(!/^\p{L}{4,30}$/u.test(w))continue;
      for(const src of [mail,slug]){
        const parts=src.split(/[._\-]+/).filter(Boolean);
        if(parts.length>=2&&fold(parts.join(""))===fold(w)){let k=0;nameLine={t:parts.map(p=>{const x=w.slice(k,k+p.length);k+=p.length;return x}).join(" "),src:l};break}
      }
      if(nameLine)break;
    }
  }
  if(!nameLine){
    const cands=top.slice(0,8).filter(l=>looksLikeName(l.t)&&!isContact(l.t)&&!isPlace(l.t));
    const sized=cands.filter(l=>l.size);
    nameLine=sized.length?sized.reduce((a,b)=>b.size>a.size?b:a):cands[0];
    if(!nameLine){const any=[...textOf("contact"),...lines.filter(l=>!l.gap).slice(0,12)].find(l=>looksLikeName(l.t)&&!isContact(l.t)&&!isPlace(l.t));nameLine=any}
  }
  if(nameLine){out.name=nameLine.t===nameLine.t.toUpperCase()?titleCase(nameLine.t):nameLine.t;found.push("name")}
  /* job title: the short line right under the name */
  if(nameLine){
    const i=top.findIndex(l=>l===nameLine.src||l.t===nameLine.t);
    const next=top.slice(i+1,i+3).find(l=>!isContact(l.t)&&!isPlace(l.t)&&l.t.length<=70&&!/\d{4}/.test(l.t)&&l.t.split(" ").length<=9&&!/[.!]$/.test(l.t));
    if(next){out.title=next.t===next.t.toUpperCase()&&/\p{L}{3}/u.test(next.t)?titleCase(next.t):next.t;found.push("title")}
  }
  /* summary: its own section, or a paragraph in the header */
  let summ=textOf("summary").map(l=>l.t).join(" ");
  if(!summ)summ=top.filter(l=>l.t.length>=70&&!isContact(l.t)).slice(0,4).map(l=>l.t).join(" ");
  if(summ){out.summary=summ.slice(0,700);found.push("summary")}
  /* experience and education: entries are built around their dates */
  out.experience=entries(buckets.experience||[],"job").slice(0,8);
  if(out.experience.length)found.push(`${out.experience.length} job${out.experience.length>1?"s":""}`);
  out.education=entries(buckets.education||[],"edu").slice(0,8);
  if(out.education.length)found.push(`${out.education.length} school${out.education.length>1?"s":""}`);
  /* skills, languages, certificates */
  const items=(b,max)=>{const res=[];for(const l of textOf(b)){const t=stripBullet(l.t);if(!t)continue;
      const tb=t.split("\t");
      if(tb.length===2&&tb[0].split(" ").length<=3&&!tb[0].includes(":")&&tb[1].includes(","))res.push(tb[0]+": "+tb[1]);
      else if(/^[^:]{2,25}:\s*\S/.test(t)&&t.includes(","))res.push(t);
      else splitItems(t).map(x=>stripBullet(x)).filter(x=>x.length>=2&&x.length<=70).forEach(x=>res.push(x))}
    return [...new Set(res)].slice(0,max)};
  let skills=items("skills",40),langs=items("languages",12);
  const inSkills=skills.findIndex(x=>/^(languages|γλωσσεσ)\s*:/i.test(fold(x)));
  const HUMAN=/(english|greek|german|french|italian|spanish|russian|turkish|arabic|chinese|albanian|bulgarian|romanian|dutch|portuguese|ελληνικ|αγγλικ|γερμανικ|γαλλικ|ιταλικ|ισπανικ|ρωσικ)/i;
  if(!langs.length&&inSkills>=0&&HUMAN.test(fold(skills[inSkills]))){langs=skills[inSkills].split(":")[1].split(/,\s*/).map(x=>x.trim()).filter(Boolean);skills.splice(inSkills,1)}
  for(let i=skills.length-1;i>=0;i--){const m=skills[i].match(/^(mother tongue\(?s?\)?|native language|other language\(?s?\)?|μητρικη γλωσσα|αλλεσ γλωσσεσ)\s*:\s*(.+)$/i)||fold(skills[i]).match(/^(μητρικη γλωσσα|αλλεσ γλωσσεσ)\s*:\s*(.+)$/);
    if(m){const v=skills[i].split(":").slice(1).join(":").trim(),nat=/mother|native|μητρικ/i.test(fold(m[1]));splitItems(v).forEach(x=>langs.push(nat&&!/\(/.test(x)?x+(/[α-ω]/i.test(fold(x))&&/[α-ω]/.test(fold(x))?" (μητρική)":" (native)"):x));skills.splice(i,1)}}
  if(skills.length){out.skills=skills.join("\n");found.push(`${skills.length} skills`)}
  if(langs.length){out.languages=langs.join("\n");found.push("languages")}
  // lines that wrapped onto the next line belong together ("Design award, Brands &" + "Communication 2024")
  const certs=[];
  for(const l of textOf("certs")){const t=stripBullet(l.t);if(!t)continue;
    const prev=certs[certs.length-1];
    if(prev&&!isBullet(l)&&(/[&,(\-–]$/.test(prev)||/^\p{Ll}/u.test(t)||/^\(?(19|20)\d{2}\)?$/.test(t)))certs[certs.length-1]=prev+" "+t;
    else certs.push(...t.split(/\s*;\s*|\t/).filter(Boolean));
  }
  certs.splice(15);
  for(let i=certs.length-1;i>=0;i--)if(certs[i].length<3)certs.splice(i,1);
  if(certs.length){out.certs=certs.join("\n");found.push("certifications")}
  /* projects */
  const proj=[];let p=null,gapBefore=true,descSize=0;
  for(const l of buckets.projects||[]){
    if(l.gap||!l.t){gapBefore=true;continue}
    const t=stripBullet(l.t).replace(/\t/g," · "),after=gapBefore;gapBefore=false;
    const link=(t.match(URL_RE)||[])[0],bare=t.replace(URL_RE,"").replace(/[\s—–|·:-]+$/,"").replace(/^[\s—–|·:-]+/,"").trim();
    const tm=t.match(/^(tech|technologies|stack|tools|built with|τεχνολογιεσ|τεχνολογίες)\s*:\s*(.+)$/i);
    if(tm&&p){p.tech=tm[2];continue}
    if(p&&p.desc&&!p.tech&&!isBullet(l)&&t.length<=80&&!/[.]$/.test(t)&&(
        (/,/.test(t)&&t.split(/\s*,\s*/).every(x=>x.split(" ").length<=3))||(l.size&&descSize&&l.size<descSize-0.5&&t.split(" ").length<=4))){p.tech=t;continue}
    if(!bare&&link){if(p&&!p.link)p.link=link.replace(/^https?:\/\//,"");continue}
    const starts=!isBullet(l)&&bare.length<=60&&!isSentence(bare)&&(!p||after||(p.desc&&/[.!]$/.test(p.desc))||(!p.desc&&false));
    if(starts){p={name:bare,link:link?link.replace(/^https?:\/\//,""):"",desc:"",tech:""};proj.push(p);continue}
    if(!p){p={name:bare.slice(0,60),link:"",desc:"",tech:""};proj.push(p);continue}
    if(link&&!p.link)p.link=link.replace(/^https?:\/\//,"");
    if(bare){p.desc=(p.desc?p.desc+" ":"")+bare;descSize=l.size||descSize}
  }
  if(proj.length&&proj.some(x=>x.desc||x.tech)){out.projects=proj.slice(0,8).map(x=>({...x,desc:x.desc.slice(0,200)}));found.push(`${proj.length} project${proj.length>1?"s":""}`)}
  /* which field does this CV look like? */
  const f=fold(all),score={};
  for(const[k,re]of Object.entries(FIELD_WORDS))score[k]=(f.match(re)||[]).length;
  const best=Object.entries(score).sort((a,b)=>b[1]-a[1])[0];
  out._field=best&&best[1]>=3?best[0]:null;
  for(const[k,v]of Object.entries(out))if(typeof v==="string")out[k]=v.replace(/\s*\t\s*/g,k==="skills"||k==="languages"||k==="certs"?"\n":" ");
  for(const arr of [out.experience,out.education,out.projects||[]])for(const it of arr)for(const k in it)if(typeof it[k]==="string")it[k]=it[k].replace(/\s*\t\s*/g," ");
  out._found=found;
  out._textLength=all.length;
  return out;
}

// Group lines into entries around their dates, then decide which part is the title, the place, the organisation
function entries(raw,kind){
  const lines=[];let gap=true;
  for(const l of raw){if(l.gap||!l.t){gap=true;continue}lines.push({...l,afterGap:gap});gap=false}
  if(!lines.length)return [];
  const groups=[];
  if(kind==="edu"){
    // fill an entry until a line brings something it already has (a second degree, school or year)
    let cur=null;
    for(const l of lines){
      const f=fold(l.t),k=new Set();
      const sch=SCHOOL_RE.test(f);if(DEGREE_RE.test(f)&&(!sch||DEGREE_STRONG.test(f)))k.add("degree");if(sch)k.add("school");if(/\b(19|20)\d{2}\b/.test(l.t))k.add("year");
      if(!cur||[...k].some(x=>cur.k.has(x))||(isBullet(l)&&!cur.k.size)){cur={k:new Set(),lines:[]};groups.push(cur)}
      k.forEach(x=>cur.k.add(x));cur.lines.push(l);
    }
    return groups.map(g=>eduFrom(g.lines)).filter(Boolean);
  }
  const hasDate=l=>!!findRange(l.t);
  const anchors=lines.map((l,i)=>hasDate(l)?i:-1).filter(i=>i>=0);
  if(anchors.length){
    const starts=anchors.map((a,k)=>{
      const floor=k?anchors[k-1]+1:0,r=findRange(lines[a].t);
      const rest=foldKeep(lines[a].t).replace(new RegExp(RANGE_RE.source,"i"),"").replace(/[\s|·•—–\-,()]+/g,"");
      const ok=p=>p>=floor&&!isBullet(lines[p])&&lines[p].t.length<=90&&!isSentence(lines[p].t)&&!hasDate(lines[p]);
      let s=a;
      if(rest.length<3){   // the date is on its own line: the title lines are just above it
        while(s-1>=floor&&a-s<2&&!lines[s].afterGap&&ok(s-1))s--;
      }else if(s-1>=floor&&!lines[a].afterGap&&ok(s-1)&&lines[s-1].t.length<=60){
        const p=lines[s-1];   // "Company · City" above "Role · dates"
        if(p.afterGap||p.t.includes("\t")||/^(org|place)$/.test(kindOf(p.t.split(/\s+[|·•—–]\s+|\t/)[0])))s--;
      }
      return s;
    });
    starts.forEach((s,k)=>groups.push(lines.slice(s,k+1<starts.length?starts[k+1]:lines.length)));
    if(starts[0]>0)groups[0]=lines.slice(0,starts[1]||lines.length);
  }else{
    // no dates at all: a short line that isn't a bullet starts a new entry
    let g=null;for(const l of lines){if(!isBullet(l)&&l.t.length<=80&&(!g||g.some(x=>isBullet(x)||x.t.length>80))){g=[l];groups.push(g)}else if(g)g.push(l);else{g=[l];groups.push(g)}}
  }
  return groups.map(jobFrom).filter(Boolean);
}
const SPLIT_RE=/\s+[|—–·•]\s+|\s+-\s+|\s+@\s+|\s+at\s+|\s+στην?\s+|\s+στο\s+|\s*\t\s*/i;
const foldKeep=t=>t.split("").map(c=>fold(c)||c).join("");   // same length as t, so positions still match
const kindOf=t=>{const f=fold(t),last=f.split(/\s+/).pop();return isPlace(t)&&t.split(" ").length<=3?"place":ROLE_RE.test(last)&&!ORG_RE.test(last)?"role":ORG_RE.test(f)||ORG_RE.test(t)?"org":DEGREE_STRONG.test(f)?"degree":SCHOOL_RE.test(f)?"school":DEGREE_RE.test(f)?"degree":ROLE_RE.test(f)?"role":""};
// "Restaurant Manager, Grand Harbour Hotel" is two things; "Registered Nurse, ICU" is one
function commaSplit(t){
  const p=t.split(/\s*,\s+/);if(p.length<2)return [t];
  const out=[];
  for(const x of p){
    let k=kindOf(x);const prev=out[out.length-1];
    // "Assistant Manager, Bistro Example": an unknown capitalised name after a role is the employer
    if(!k&&prev&&prev.k==="org"&&/^\p{Lu}/u.test(x)&&x.split(" ").length<=2)k="place";
    if(!k&&prev&&prev.k==="role"&&/^\p{Lu}/u.test(x)&&!/^[\p{Lu}\d]{1,5}$/u.test(x)&&!/\b(ward|unit|department|team|division|desk|shift|τμημα|μοναδα)\b/i.test(fold(x)))k="org";
    if(!prev||(k&&k!==prev.k))out.push({t:x,k});else prev.t+=", "+x}
  return out.map(x=>x.t);
}
function headerParts(heads){
  let range=null;const parts=[];
  for(const l of heads){
    let t=l.t;const r=findRange(t);
    if(r&&!range){range=r;
      const m=foldKeep(t).match(new RegExp(RANGE_RE.source,"i"));
      if(m)t=(t.slice(0,m.index)+"\t"+t.slice(m.index+m[0].length)).trim();
    }
    t=t.replace(/\s*\(([^()]{2,30})\)/g,", $1").replace(/[()[\]]/g," ").replace(/ {2,}/g," ").replace(/^[\s|—–\-,:]+|[\s|—–\-,:]+$/g,"").trim();
    if(!t)continue;
    const atOrg=/\s(at|@|στην?|στο)\s/i.test(t);
    t.split(SPLIT_RE).map(x=>x.replace(/^[\s,;:]+|[\s,;:]+$/g,"").trim()).filter(x=>x&&!/^[|—–\-]+$/.test(x)).flatMap(commaSplit).forEach((x,i)=>parts.push({t:x,afterAt:atOrg&&i>0}));
  }
  return {range,parts};
}
function jobFrom(g){
  const heads=[],body=[];let inBody=false;
  let dated=false,after=0;
  for(const l of g){
    if(inBody||isBullet(l)||heads.length>=4){inBody=true;body.push(l);continue}
    const r=!!findRange(l.t);
    if(!dated&&(r||(l.t.length<=90&&!isSentence(l.t)))){heads.push(l);if(r)dated=true;continue}
    if(dated&&!after&&l.t.length<=60&&!isSentence(l.t)&&(isPlace(l.t)||ORG_RE.test(fold(l.t))||ORG_RE.test(l.t)||(/^\p{Lu}/u.test(l.t)&&/,/.test(l.t)&&!/[.!]$/.test(l.t)&&l.t.split(/\s+/).length<=6))){heads.push(l);after=1;continue}
    inBody=true;body.push(l);
  }
  const {range,parts}=headerParts(heads);
  const job={role:"",org:"",place:"",start:range?range.start:"",end:range?range.end:"",bullets:""};
  const left=[];
  for(const p of parts){
    if(!job.place&&isPlace(p.t)&&p.t.split(" ").length<=4){job.place=p.t;continue}
    if(!job.org&&(p.afterAt||ORG_RE.test(fold(p.t))||ORG_RE.test(p.t))&&!ROLE_RE.test(fold(p.t))){job.org=p.t;continue}
    if(!job.role&&ROLE_RE.test(fold(p.t))){job.role=p.t;continue}
    left.push(p.t);
  }
  if(!job.role&&left.length)job.role=left.shift();
  if(!job.org&&left.length)job.org=left.shift();
  if(!job.place&&left.length&&left[0].split(" ").length<=3)job.place=left.shift();
  job.bullets=body.map(l=>stripBullet(l.t)).filter(Boolean).join("\n").slice(0,1500);
  return (job.role||job.org||job.bullets)?job:null;
}
function eduFrom(g){
  const heads=g.filter(l=>!isBullet(l)).slice(0,4);
  const {range,parts}=headerParts(heads);
  const years=(g.map(l=>l.t).join(" ").match(YEAR_RE)||[]);
  const e={degree:"",school:"",year:range?(/^(19|20)\d{2}$/.test(range.end)?range.end:range.start):(years.length?years[years.length-1]:"")};
  const left=[];
  for(const p of parts){
    const t=p.t.replace(YEAR_RE,"").replace(/^[\s|—–\-,:]+|[\s|—–\-,:]+$/g,"").trim();if(!t)continue;
    if(isPlace(t)&&!SCHOOL_RE.test(fold(t))&&!DEGREE_RE.test(fold(t)))continue;
    if(!e.degree&&DEGREE_RE.test(fold(t))&&!(SCHOOL_RE.test(fold(t))&&!DEGREE_STRONG.test(fold(t)))){e.degree=t;continue}
    if(!e.school&&SCHOOL_RE.test(fold(t))){e.school=t;continue}
    if(e.degree&&!e.school&&!left.length&&t.split(" ").length<=3&&!DEGREE_RE.test(fold(t))){e.degree+=" "+t;continue}
    left.push(t);
  }
  if(!e.degree&&left.length)e.degree=left.shift();
  if(!e.school&&left.length)e.school=left.shift();
  return (e.degree||e.school)?e:null;
}
return {fileToLines,readCV};
})();

"use strict";
(function(){
const failBox=document.getElementById("startfail");
function showFail(msg){if(failBox){failBox.hidden=false;const d=document.getElementById("startfail-detail");if(d)d.textContent="Details: "+msg}}
window.addEventListener("error",e=>{if(!started)showFail(e.message||"script error")});
let started=false;
try{
/* ---------- field definitions (from the research) ---------- */
const FIELDS = {
  hospitality:{label:"Hospitality",tpl:"Concierge",cls:"t-hosp",maxPages:2,
    bullets:["Reverse-chronological work history","Summary and skills near the top","Numbers: covers, ratings, revenue"],
    research:"Chronological is the standard hospitality format. Recruiters want summary, skills and experience at the top, plus certifications, and they respond to measurable results such as guest scores. Keep it to two pages at most.",
    summaryHint:"Two or three sentences: years in service, the venues you know, what guests remember you for.",
    summaryPh:"Restaurant manager with 8 years in fine dining…",
    bulletHint:"One achievement per line. Put a number on it: covers served, guest rating, upsell revenue, team size.",
    bulletPh:"Raised guest rating from 4.3 to 4.8\nTrained 12 new waiters",
    skills:["Guest relations","Opera PMS","Upselling","Wine service","HACCP","Event coordination","Complaint resolution","Cash handling"],
    certLabel:"Certifications (food safety, sommelier, first aid)",
    tips:["Keep it to 1–2 pages.","Send it as a PDF unless the ad asks otherwise.","List every language you speak; guests notice."]},
  it:{label:"IT & Software",tpl:"Stack",cls:"t-it",maxPages:1,
    bullets:["Single column, plain headings (ATS-safe)","Tech stack block first","Named projects with impact"],
    research:"Tech resumes are filtered by applicant tracking software more than most, so a single-column, reverse-chronological layout parses best. Lead with a grouped tech stack, then three to five named projects.",
    summaryHint:"Optional for engineers. One or two lines on your focus area and the scale you work at.",
    summaryPh:"Backend engineer focused on payment APIs…",
    bulletHint:"Start with a verb, end with a result: 'Cut API latency 30% by…'. One per line.",
    bulletPh:"Cut API latency 30% by adding a Redis cache\nBuilt the billing module used by 120 clients",
    skills:["Languages: TypeScript, Python, Go","Frameworks: React, Node.js, Django","Cloud: AWS, Docker, Kubernetes","Data: PostgreSQL, Redis","Tools: Git, CI/CD, Terraform"],
    skillHint:"Group them as 'Group: item, item' on each line so recruiters scan by category. Tap a suggestion to start.",
    certLabel:"Certifications (AWS, Azure, CKA…)",projects:true,
    tips:["One page if under 10 years' experience.","Use 'Save as PDF' so tracking systems can read your text.","Link GitHub or a portfolio in the header."]},
  healthcare:{label:"Healthcare",tpl:"Clinical",cls:"t-med",maxPages:1,
    bullets:["Licenses and certifications up front","Plain fonts (Arial, Calibri style)","White space, clear section headers"],
    research:"Hospitals prefer reverse-chronological resumes because they show clinical progression; hybrid suits new grads. Use simple fonts at 11–12pt, visible headers and plenty of white space, and make licenses easy to find.",
    summaryHint:"Your specialty, years in practice and care setting (ICU, ward, outpatient).",
    summaryPh:"ICU nurse with 6 years of critical-care experience…",
    bulletHint:"Patient load, outcomes and protocols: 'Reduced patient falls 25% by…'.",
    bulletPh:"Care for 3 ventilated patients per shift\nReduced patient falls 25%",
    skills:["Patient assessment","IV therapy","Medication administration","EHR (Epic)","Wound care","Triage","Patient education","Infection control"],
    certLabel:"Licenses & certifications (RN license, BLS, ACLS)",
    tips:["Put license numbers and expiry dates where they're easy to find.","Keep to one page if possible.","Check whether the posting wants .docx or PDF."]},
  finance:{label:"Finance & Law",tpl:"Ledger",cls:"t-fin",maxPages:1,
    bullets:["Conservative, black and white","Serif type, single column","Education and credentials first"],
    research:"Finance, law and government favour traditional layouts: black and white, serif type such as Garamond, one column, and credentials presented first. Creative designs read as a misjudgement here.",
    summaryHint:"Usually left out in finance and law. Leave it blank unless you are changing careers.",
    summaryPh:"(optional)",
    bulletHint:"Deal sizes, portfolio values, cases, accuracy. Keep each line tight.",
    bulletPh:"Built DCF models for 5 M&A deals (€40–220M)",
    skills:["Financial modelling","Excel (VBA)","Bloomberg","Valuation (DCF, comps)","Due diligence","IFRS","Contract review"],
    certLabel:"Licenses & certifications (CFA, ACCA, bar admission)",
    tips:["One page, strictly.","Education goes above experience early in your career.","No colour, no photo, no icons."]},
  creative:{label:"Creative & Design",tpl:"Portfolio",cls:"t-cre",maxPages:1,
    bullets:["Design-forward, two columns","Portfolio link given prime position","Selected work section"],
    research:"For designers, writers and photographers the resume is itself a sample of work. Place the portfolio URL prominently in the header area, use colour and hierarchy deliberately, and keep fonts standard enough to stay readable.",
    summaryHint:"Your discipline, the kind of brands or clients you've worked for, and your point of view.",
    summaryPh:"Brand designer for food and culture brands…",
    bulletHint:"Launches, campaigns, results: 'Rebrand lifted sign-ups 40%'.",
    bulletPh:"Art-directed 9 rebrands\nPackaging redesign lifted sales 22%",
    skills:["Brand identity","Art direction","Figma","Adobe CC","Typography","Motion design","Print production"],
    certLabel:"Awards or certifications",projects:true,projectLabel:"Selected work",
    tips:["Keep a plain version too, for large companies.","Make sure the portfolio link works and shows your best 6–10 pieces.","Match the resume's colours to your portfolio."]},
  marketing:{label:"Marketing & Sales",tpl:"Impact",cls:"t-mkt",maxPages:2,
    bullets:["Modern, one touch of colour","Headline numbers up top","Campaign and quota results"],
    research:"Marketing and sales resumes are read for results. A modern template with restrained colour works, and a strip of headline figures (quota, growth, ROI) lets a recruiter see your impact in seconds.",
    summaryHint:"Your channel or market, and the result you're best known for.",
    summaryPh:"Growth marketer for B2B software…",
    bulletHint:"Revenue, conversion, growth, quota attainment. One per line.",
    bulletPh:"Grew pipeline 140% in two years\nCut cost per lead 35%",
    skills:["SEO / SEM","Google Analytics","HubSpot","Salesforce","Content strategy","Paid social","A/B testing","Negotiation"],
    certLabel:"Certifications (Google Ads, HubSpot)",highlights:true,
    tips:["Pick your three strongest numbers for the headline strip.","1–2 pages.","Tailor keywords to each job ad."]}
};

const SAMPLES = {
  hospitality:{name:"John Doe",title:"Restaurant Manager",email:"john.doe@example.com",phone:"+30 210 123 4567",location:"Athens, Greece",link:"",summary:"Restaurant manager with 8 years in fine dining and boutique hotels. Known for raising guest satisfaction scores and training front-of-house teams that stay.",
    experience:[{role:"Restaurant Manager",org:"Grand Harbour Hotel",place:"Athens",start:"2021",end:"Present",bullets:"Lead a 22-person team across breakfast, à la carte and events\nRaised TripAdvisor rating from 4.3 to 4.8 in 18 months\nGrew wine revenue 31% through staff upselling training"},
      {role:"Assistant Manager",org:"Bistro Example",place:"Athens",start:"2017",end:"2021",bullets:"Managed 180 covers per night on peak weekends\nCut food waste 18% with a new prep-forecasting routine"}],
    education:[{degree:"BA Hospitality Management",school:"Example School of Tourism",year:"2017"}],
    certs:"HACCP Level 3\nWSET Level 2 in Wines\nFirst Aid at Work",languages:"Greek (native)\nEnglish (fluent)\nGerman (conversational)",
    skills:"Guest relations\nStaff training\nOpera PMS\nWine service\nEvent coordination\nHACCP\nRota planning\nComplaint resolution\nCost control",projects:[],highlights:""},
  it:{name:"Jane Doe",title:"Senior Backend Engineer",email:"jane.doe@example.com",phone:"+30 210 123 4567",location:"Athens, Greece",link:"github.com/janedoe",summary:"Backend engineer focused on payment systems and APIs that handle millions of requests a day.",
    experience:[{role:"Senior Backend Engineer",org:"Acme Software",place:"Remote",start:"2022",end:"Present",bullets:"Cut p95 API latency 38% by moving hot paths to Go and Redis\nDesigned the retry service that now processes 40M messages/day\nMentor 4 engineers; run the team's design reviews"},
      {role:"Software Engineer",org:"Example Tech",place:"Athens",start:"2019",end:"2022",bullets:"Built a Django billing module used by 120 enterprise clients\nIntroduced CI test gates that dropped production incidents by half"}],
    education:[{degree:"MSc Computer Science",school:"Example Technical University",year:"2019"}],
    certs:"AWS Certified Solutions Architect – Associate",languages:"Greek (native)\nEnglish (fluent)",
    skills:"Languages: Go, Python, TypeScript\nFrameworks: Django, FastAPI, Node.js\nCloud: AWS, Docker, Kubernetes\nData: PostgreSQL, Redis, Kafka",
    projects:[{name:"ratelimitd",link:"github.com/janedoe/ratelimitd",desc:"Open-source distributed rate limiter, 1.2k GitHub stars.",tech:"Go, Redis"},{name:"Ledger sync",link:"",desc:"Event-sourced reconciliation tool for payment ledgers.",tech:"Python, Kafka"}],highlights:""},
  healthcare:{name:"Alex Smith, RN, BSN",title:"Registered Nurse · Intensive Care",email:"alex.smith@example.com",phone:"+30 210 123 4567",location:"Athens, Greece",link:"",summary:"ICU nurse with 6 years of critical-care experience in a 30-bed adult unit. Calm under pressure and committed to clear communication with patients and families.",
    experience:[{role:"Registered Nurse, ICU",org:"City General Hospital",place:"Athens",start:"2020",end:"Present",bullets:"Care for 2–3 critically ill patients per shift, incl. ventilated patients\nLed a falls-prevention project that cut patient falls 25%\nPrecept new graduate nurses through 12-week orientation"},
      {role:"Staff Nurse, Medical Ward",org:"Regional Hospital",place:"Patras",start:"2018",end:"2020",bullets:"Managed a 6-patient caseload on a 40-bed ward\nImproved patient satisfaction scores 15% through bedside handovers"}],
    education:[{degree:"BSc Nursing",school:"Example University, School of Health Sciences",year:"2018"}],
    certs:"RN License – exp. 2028\nBLS (Basic Life Support) – exp. 2027\nACLS – exp. 2027\nCritical Care Certificate",languages:"Greek (native)\nEnglish (fluent)\nItalian (good)",
    skills:"Patient assessment\nMechanical ventilation\nIV therapy\nMedication administration\nEHR documentation\nInfection control\nWound care\nFamily communication",projects:[],highlights:""},
  finance:{name:"John Smith",title:"Investment Banking Analyst",email:"john.smith@example.com",phone:"+30 210 123 4567",location:"Athens, Greece",link:"linkedin.com/in/johnsmith",summary:"",
    experience:[{role:"Investment Banking Analyst",org:"Example Capital",place:"Athens",start:"2023",end:"Present",bullets:"Built DCF and comparable-company models for 5 mid-market M&A deals (€40–220M)\nDrafted CIMs and management presentations for sell-side mandates\nCoordinated due diligence data rooms with legal and audit teams"},
      {role:"Summer Analyst",org:"Example Advisory",place:"Athens",start:"2022",end:"2022",bullets:"Supported valuation of a €75M renewable energy portfolio"}],
    education:[{degree:"MSc Finance, summa cum laude",school:"Example School of Economics",year:"2023"},{degree:"BSc Economics",school:"Example University",year:"2021"}],
    certs:"CFA Level II Candidate\nBloomberg Market Concepts",languages:"Greek (native), English (fluent), German (good)",
    skills:"Financial modelling\nValuation (DCF, LBO, comps)\nExcel (VBA)\nBloomberg\nCapIQ\nPowerPoint",projects:[],highlights:""},
  creative:{name:"Jane Smith",title:"Brand & Visual Designer",email:"jane.smith@example.com",phone:"+30 210 123 4567",location:"Athens, Greece",link:"janesmith.example.com",summary:"Brand designer who builds identities for food, culture and hospitality brands. I care about type, colour and systems that still work three years later.",
    experience:[{role:"Senior Designer",org:"Acme Agency",place:"Athens",start:"2021",end:"Present",bullets:"Art-directed rebrands for 9 clients across food and tourism\nLed packaging redesign that lifted retail sell-through 22%\nRun the studio's monthly type crit"},
      {role:"Designer",org:"Studio Example",place:"Thessaloniki",start:"2018",end:"2021",bullets:"Designed festival identities seen by 60k visitors a year"}],
    education:[{degree:"BA Visual Communication Design",school:"Example School of Fine Arts",year:"2018"}],
    certs:"Design award, Brands & Communication 2024\nBronze, Regional Design Awards 2023",languages:"Greek, English, Spanish",
    skills:"Brand identity\nArt direction\nTypography\nPackaging\nFigma\nAdobe CC\nMotion (After Effects)",
    projects:[{name:"Olive Grove Co.",link:"",desc:"Identity and packaging for a family olive oil brand.",tech:"Branding"},{name:"City Film Nights",link:"",desc:"Festival system across 40 touchpoints.",tech:"Identity"}],highlights:""},
  marketing:{name:"Sam Doe",title:"Growth Marketing Lead",email:"sam.doe@example.com",phone:"+30 210 123 4567",location:"Athens, Greece",link:"linkedin.com/in/samdoe",summary:"Growth marketer for B2B software. I build paid and lifecycle programmes that turn trial users into paying customers.",
    experience:[{role:"Growth Marketing Lead",org:"Acme Corp",place:"Athens",start:"2022",end:"Present",bullets:"Grew inbound pipeline 140% in two years across 6 markets\nCut cost per lead 35% by rebuilding paid search structure\nLaunched lifecycle emails that raised trial-to-paid conversion from 9% to 14%"},
      {role:"Digital Marketing Specialist",org:"Example Digital",place:"Athens",start:"2019",end:"2022",bullets:"Managed €400k annual ad budget across Google and LinkedIn\nRan 60+ A/B tests on landing pages"}],
    education:[{degree:"BA Marketing",school:"Example University of Business",year:"2019"}],
    certs:"Google Ads Search Certification\nHubSpot Inbound Marketing",languages:"Greek (native)\nEnglish (fluent)",
    skills:"Paid search\nLinkedIn Ads\nHubSpot\nGoogle Analytics 4\nA/B testing\nLifecycle email\nSEO\nLooker Studio",projects:[],highlights:"+140% | inbound pipeline growth\n−35% | cost per lead\n14% | trial-to-paid conversion"}
};

/* ---------- limits and sanitising (protects layout and stored data) ---------- */
const LIM={name:80,title:90,email:120,phone:40,location:80,link:120,summary:700,highlights:200,certs:800,languages:300,skills:1200,
  role:90,org:90,place:60,start:20,end:20,bullets:1500,degree:120,school:120,year:20,desc:200,tech:120};
const MAX_ITEMS=8;
const TOP=["name","title","email","phone","location","link","summary","highlights","certs","languages","skills"];
const SUB={experience:["role","org","place","start","end","bullets"],education:["degree","school","year"],projects:["name","link","desc","tech"]};
const str=(v,k)=>(typeof v==="string"||typeof v==="number"?String(v):"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").slice(0,LIM[k]||200);
function sanitize(d){
  const o={};d=(d&&typeof d==="object")?d:{};
  TOP.forEach(k=>o[k]=str(d[k],k));
  Object.entries(SUB).forEach(([arr,keys])=>{
    o[arr]=(Array.isArray(d[arr])?d[arr]:[]).slice(0,MAX_ITEMS).map(it=>{const x={};keys.forEach(k=>x[k]=str(it&&it[k],k==="name"?"role":k));return x});
  });
  return o;
}
const blank=()=>sanitize({experience:[{}],education:[{}],projects:[]});
const clone=o=>JSON.parse(JSON.stringify(o));

/* ---------- state + storage ---------- */
const KEY="fieldcraft-draft-v3",REMEMBER="fieldcraft-remember";
let state={field:"hospitality",step:0,example:true,data:sanitize(SAMPLES.hospitality)};
let remember=true;
try{remember=localStorage.getItem(REMEMBER)!=="off"}catch(e){}
try{
  const raw=localStorage.getItem(KEY);
  if(remember&&raw&&raw.length<60000){const s=JSON.parse(raw);
    if(s&&FIELDS.hasOwnProperty(s.field)){state={field:s.field,step:0,example:!!s.example,data:sanitize(s.data)}}}
}catch(e){}
let saveTimer;
function save(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    const el=$("savestate");
    if(!remember){el.textContent="Not saved on this device (Remember my answers is off)";return}
    try{localStorage.setItem(KEY,JSON.stringify({field:state.field,example:state.example,data:state.data}));el.textContent="✓ Saved on this device"}
    catch(e){el.textContent="Your browser isn't letting us save. Download your PDF before closing this page."}
  },300);
}
function wipe(){try{localStorage.removeItem(KEY)}catch(e){}}

/* ---------- helpers ---------- */
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const stripBullet=x=>x.replace(/^[\s•·\-–—*●▪►✓>]+/,"").trim();
const lines=s=>String(s||"").split(/\n|;/).map(stripBullet).filter(Boolean);
const cleanLink=s=>String(s||"").trim().replace(/^https?:\/\//i,"").replace(/^www\./i,"").replace(/\/+$/,"");
const isEmail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim());
const isPhone=s=>/^[0-9+()\-\s./]{6,}$/.test(String(s).trim())&&(String(s).match(/\d/g)||[]).length>=6;
const yr=s=>{const m=String(s).match(/(19|20)\d{2}/);return m?+m[0]:null};
function skillList(s){return lines(s).flatMap(x=>x.includes(":")?[x]:x.split(",").map(y=>y.trim()).filter(Boolean))}

/* turn raw answers into clean render data: trims, drops empty items */
function prepare(raw){
  const d=sanitize(raw);
  TOP.forEach(k=>d[k]=d[k].trim());
  d.email=d.email.toLowerCase();d.link=cleanLink(d.link);
  d.experience=d.experience.filter(j=>(j.role+j.org+j.bullets).trim());
  d.education=d.education.filter(e=>(e.degree+e.school).trim());
  d.projects=d.projects.filter(p=>(p.name+p.desc).trim()).map(p=>({...p,link:cleanLink(p.link)}));
  d.skills=skillList(d.skills).join("\n");
  return d;
}
const dates=j=>[j.start.trim(),j.end.trim()].filter(Boolean).join(" – ");
const contact=(d,sep)=>[d.location,d.phone,d.email,d.link].filter(Boolean).map(esc).join(sep);
const ul=(arr,cls)=>arr.length?`<ul${cls?` class="${cls}"`:""}>${arr.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:"";
const has=a=>a&&a.length;

/* ---------- templates ---------- */
const R={
 hospitality(d){return `<header><h1>${esc(d.name)}</h1><div class="role">${esc(d.title)}</div><div class="contact">${contact(d," &nbsp;·&nbsp; ")}</div></header>
  ${d.summary?`<section><h2>Profile</h2><p>${esc(d.summary)}</p></section>`:""}
  ${lines(d.skills).length?`<section><h2>Core skills</h2>${ul(lines(d.skills),"grid3")}</section>`:""}
  ${has(d.experience)?`<section><h2>Experience</h2>${d.experience.map(j=>`<div class="job"><div class="jh"><span><b>${esc(j.role)}</b>${j.org?`, ${esc(j.org)}`:""}${j.place?` · ${esc(j.place)}`:""}</span><span class="dates">${esc(dates(j))}</span></div>${ul(lines(j.bullets))}</div>`).join("")}</section>`:""}
  ${has(d.education)?`<section><h2>Education</h2>${d.education.map(e=>`<div class="jh"><span><b>${esc(e.degree)}</b>${e.school?`, ${esc(e.school)}`:""}</span><span>${esc(e.year)}</span></div>`).join("")}</section>`:""}
  <section class="duo">${lines(d.certs).length?`<div><h2>Certifications</h2>${ul(lines(d.certs))}</div>`:""}${lines(d.languages).length?`<div><h2>Languages</h2>${ul(lines(d.languages))}</div>`:""}</section>`},
 it(d){const sk=lines(d.skills);const grouped=sk.length&&sk.every(x=>x.includes(":"));
  return `<header><h1>${esc(d.name)}</h1><div class="role">${esc(d.title)}</div><div class="contact">${contact(d,"  |  ")}</div></header>
  ${d.summary?`<section><p>${esc(d.summary)}</p></section>`:""}
  ${sk.length?`<section><h2>Technical skills</h2>${grouped?`<dl class="stack">${sk.map(x=>{const[i,...r]=x.split(":");return `<dt>${esc(i)}</dt><dd>${esc(r.join(":").trim())}</dd>`}).join("")}</dl>`:`<p>${esc(sk.join(", "))}</p>`}</section>`:""}
  ${has(d.experience)?`<section><h2>Experience</h2>${d.experience.map(j=>`<div class="job"><div class="jh"><span><b>${esc(j.role)}</b>${j.org?` · ${esc(j.org)}`:""}${j.place?` · ${esc(j.place)}`:""}</span><span class="dates">${esc(dates(j))}</span></div>${ul(lines(j.bullets))}</div>`).join("")}</section>`:""}
  ${has(d.projects)?`<section><h2>Projects</h2>${d.projects.map(p=>`<div class="proj job"><b>${esc(p.name)}</b>${p.link?` — ${esc(p.link)}`:""}<div>${esc(p.desc)}</div>${p.tech?`<div class="tech">${esc(p.tech)}</div>`:""}</div>`).join("")}</section>`:""}
  ${has(d.education)?`<section><h2>Education</h2>${d.education.map(e=>`<div class="jh"><span><b>${esc(e.degree)}</b>${e.school?` · ${esc(e.school)}`:""}</span><span class="dates">${esc(e.year)}</span></div>`).join("")}</section>`:""}
  ${lines(d.certs).length?`<section><h2>Certifications</h2>${ul(lines(d.certs))}</section>`:""}`},
 healthcare(d){return `<header><h1>${esc(d.name)}</h1><div class="role">${esc(d.title)}</div><div class="contact">${contact(d," • ")}</div></header>
  ${lines(d.certs).length?`<section class="lic"><h2>Licenses &amp; certifications</h2>${ul(lines(d.certs))}</section>`:""}
  ${d.summary?`<section><h2>Professional summary</h2><p>${esc(d.summary)}</p></section>`:""}
  ${lines(d.skills).length?`<section><h2>Clinical skills</h2>${ul(lines(d.skills),"grid2")}</section>`:""}
  ${has(d.experience)?`<section><h2>Clinical experience</h2>${d.experience.map(j=>`<div class="job"><div class="jh"><span><b>${esc(j.role)}</b></span><span class="dates">${esc(dates(j))}</span></div><div>${esc([j.org,j.place].filter(Boolean).join(", "))}</div>${ul(lines(j.bullets))}</div>`).join("")}</section>`:""}
  ${has(d.education)?`<section><h2>Education</h2>${d.education.map(e=>`<div class="jh"><span><b>${esc(e.degree)}</b>${e.school?` — ${esc(e.school)}`:""}</span><span>${esc(e.year)}</span></div>`).join("")}</section>`:""}
  ${lines(d.languages).length?`<section><h2>Languages</h2><p>${esc(lines(d.languages).join(" · "))}</p></section>`:""}`},
 finance(d){return `<header><h1>${esc(d.name)}</h1><div class="contact">${contact(d," | ")}</div></header>
  ${d.summary?`<section><p>${esc(d.summary)}</p></section>`:""}
  ${has(d.education)?`<section><h2>Education</h2>${d.education.map(e=>`<div class="job"><div class="jh"><b>${esc(e.school)}</b><span>${esc(e.year)}</span></div><div class="sub"><span>${esc(e.degree)}</span></div></div>`).join("")}</section>`:""}
  ${has(d.experience)?`<section><h2>Experience</h2>${d.experience.map(j=>`<div class="job"><div class="jh"><b>${esc(j.org)}</b><span>${esc(j.place)}</span></div><div class="sub"><span>${esc(j.role)}</span><span class="dates">${esc(dates(j))}</span></div>${ul(lines(j.bullets))}</div>`).join("")}</section>`:""}
  ${(lines(d.certs).length||lines(d.skills).length||lines(d.languages).length)?`<section class="lines"><h2>Credentials, skills &amp; languages</h2>
  ${lines(d.certs).length?`<p><b>Credentials:</b> ${esc(lines(d.certs).join("; "))}</p>`:""}
  ${lines(d.skills).length?`<p><b>Skills:</b> ${esc(lines(d.skills).join("; "))}</p>`:""}
  ${lines(d.languages).length?`<p><b>Languages:</b> ${esc(lines(d.languages).join("; "))}</p>`:""}</section>`:""}`},
 creative(d){return `<aside>
   ${d.link?`<section><h2>Portfolio</h2><div class="pf">${esc(d.link)}</div></section>`:""}
   <section><h2>Contact</h2><ul>${[d.email,d.phone,d.location].filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>
   ${lines(d.skills).length?`<section><h2>Skills &amp; tools</h2>${ul(lines(d.skills))}</section>`:""}
   ${has(d.education)?`<section><h2>Education</h2>${d.education.map(e=>`<p><b>${esc(e.degree)}</b><br>${esc([e.school,e.year].filter(Boolean).join(", "))}</p>`).join("")}</section>`:""}
   ${lines(d.certs).length?`<section><h2>Recognition</h2>${ul(lines(d.certs))}</section>`:""}
   ${lines(d.languages).length?`<section><h2>Languages</h2>${ul(lines(d.languages))}</section>`:""}
  </aside><main><h1>${esc(d.name)}</h1><div class="role">${esc(d.title)}</div>
   ${d.summary?`<section><p>${esc(d.summary)}</p></section>`:""}
   ${has(d.experience)?`<section><h2>Experience</h2>${d.experience.map(j=>`<div class="job"><div class="jh"><b>${esc(j.role)}</b><div class="meta">${esc([j.org,j.place,dates(j)].filter(Boolean).join(" · "))}</div></div>${ul(lines(j.bullets))}</div>`).join("")}</section>`:""}
   ${has(d.projects)?`<section><h2>Selected work</h2><div class="work">${d.projects.map(p=>`<div><b>${esc(p.name)}</b><br>${esc(p.desc)}${p.tech?`<br><small>${esc(p.tech)}</small>`:""}</div>`).join("")}</div></section>`:""}
  </main>`},
 marketing(d){const k=lines(d.highlights).slice(0,3).map(x=>x.split("|"));
  return `<header><h1>${esc(d.name)}</h1><div class="role">${esc(d.title)}</div><div class="contact">${contact(d," · ")}</div></header><div class="body">
  ${k.length?`<div class="kpis">${k.map(([v,l])=>`<div class="kpi"><b>${esc((v||"").trim())}</b><span>${esc((l||"").trim())}</span></div>`).join("")}</div>`:""}
  ${d.summary?`<section><h2>Summary</h2><p>${esc(d.summary)}</p></section>`:""}
  ${has(d.experience)?`<section><h2>Experience</h2>${d.experience.map(j=>`<div class="job"><div class="jh"><span><b>${esc(j.role)}</b>${j.org?`, ${esc(j.org)}`:""}${j.place?` — ${esc(j.place)}`:""}</span><span class="dates">${esc(dates(j))}</span></div>${ul(lines(j.bullets))}</div>`).join("")}</section>`:""}
  ${lines(d.skills).length?`<section><h2>Skills</h2>${ul(lines(d.skills),"tags")}</section>`:""}
  ${has(d.education)?`<section><h2>Education</h2>${d.education.map(e=>`<div class="jh"><span><b>${esc(e.degree)}</b>${e.school?`, ${esc(e.school)}`:""}</span><span>${esc(e.year)}</span></div>`).join("")}</section>`:""}
  ${lines(d.certs).length?`<section><h2>Certifications</h2>${ul(lines(d.certs))}</section>`:""}
  ${lines(d.languages).length?`<section><h2>Languages</h2><p>${esc(lines(d.languages).join(" · "))}</p></section>`:""}</div>`}
};
const paperHTML=(field,raw)=>`<div class="paper ${FIELDS[field].cls}">${R[field](prepare(raw))}</div>`;

/* ---------- checks ---------- */
const AUTO=new Set();   // boxes filled from an uploaded CV, until the person edits them
const STEPS=["About you","Experience","Education","Skills","Finish"];
function checks(){
  const d=state.data,f=FIELDS[state.field],out=[];
  const add=(step,id,msg,level)=>out.push({step,id,msg,level});
  if(!d.name.trim())add(0,"name","Add your full name.","error");
  if(!d.email.trim())add(0,"email","Add an email address so employers can reply.","error");
  else if(!isEmail(d.email))add(0,"email","This email looks incomplete. It should look like name@example.com.","error");
  if(!d.title.trim())add(0,"title","Add the job title you're aiming for. It sits under your name.","warn");
  if(!d.phone.trim())add(0,"phone","Most employers expect a phone number.","warn");
  else if(!isPhone(d.phone))add(0,"phone","This phone number looks wrong. Use digits, spaces and + only.","warn");
  if(state.field==="creative"&&!d.link.trim())add(0,"link","Creative recruiters expect a portfolio link.","warn");
  if(d.summary.length>450)add(0,"summary","Your summary is long. Aim for 2–3 sentences.","warn");
  const jobs=d.experience.filter(j=>(j.role+j.org+j.bullets).trim());
  if(!jobs.length)add(1,null,"Add at least one job. Internships, volunteering and part-time work count.","warn");
  d.experience.forEach((j,i)=>{
    if(!(j.role+j.org+j.bullets).trim())return;
    if(!j.role.trim())add(1,`exp-${i}-role`,`Job ${i+1}: add the job title.`,"warn");
    if(!j.org.trim())add(1,`exp-${i}-org`,`Job ${i+1}: add the employer's name.`,"warn");
    const a=yr(j.start),b=yr(j.end);if(a&&b&&b<a)add(1,`exp-${i}-end`,`Job ${i+1}: the end year is before the start year.`,"warn");
  });
  if(!d.education.some(e=>(e.degree+e.school).trim()))add(2,null,"Add your highest education, even if it's secondary school.","warn");
  if(!skillList(d.skills).length)add(3,"skills","Add a few skills. Tap the suggestions to add them quickly.","warn");
  if(pageCount>f.maxPages)add(4,null,`Your resume is ${pageCount} pages. ${f.label} recruiters expect ${f.maxPages===1?"one page":"no more than two"}. Shorten the longest bullets.`,"warn");
  return out;
}

/* ---------- step 1: field gallery ---------- */
const ro=new ResizeObserver(es=>es.forEach(e=>fit(e.target)));
let pageCount=1;
function fit(sheet){const p=sheet.querySelector(".paper");if(!p)return;const s=sheet.clientWidth/794;if(!s)return;p.style.transform=`scale(${s})`;if(!sheet.closest(".thumb"))sheet.style.height=Math.max(1123,p.offsetHeight)*s+"px"}
function renderFields(){
  const el=$("fields");
  el.innerHTML=Object.entries(FIELDS).map(([k,f])=>`<button type="button" class="fcard" data-field="${k}" aria-pressed="${state.field===k}">
    <div class="thumb"><div class="sheet">${paperHTML(k,SAMPLES[k])}</div></div>
    <div class="fhead"><b>${esc(f.label)}</b><span>${esc(f.tpl)} template</span></div>
    <ul>${f.bullets.map(b=>`<li>${esc(b)}</li>`).join("")}</ul>
    <div class="chip-sel">${state.field===k?"✓ Selected":"Choose this field"}</div></button>`).join("");
  el.querySelectorAll(".sheet").forEach(s=>{ro.observe(s);fit(s)});
  el.querySelectorAll(".fcard").forEach(b=>b.addEventListener("click",()=>chooseField(b.dataset.field)));
  $("rgrid").innerHTML=Object.values(FIELDS).map(f=>`<div><h3>${esc(f.label)} → ${esc(f.tpl)}</h3><p>${esc(f.research)}</p></div>`).join("");
}
function chooseField(k){
  if(!FIELDS.hasOwnProperty(k))return;
  const changed=state.field!==k;state.field=k;
  if(state.example)state.data=sanitize(SAMPLES[k]);
  if(FIELDS[k].projects&&!state.data.projects.length)state.data.projects.push(sanitize({projects:[{}]}).projects[0]);
  document.querySelectorAll(".fcard").forEach(b=>{const on=b.dataset.field===k;b.setAttribute("aria-pressed",on);b.querySelector(".chip-sel").textContent=on?"✓ Selected":"Choose this field"});
  renderStep();renderPreview();save();
  if(changed&&!state.example)notify(`Design changed to ${FIELDS[k].tpl}. Your answers were kept.`);
  $("step2").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
}

/* ---------- step 2: questions ---------- */
function q(id,label,val,o={}){
  const lim=LIM[o.lim||id.replace(/^(exp|edu|proj)-\d+-/,"")]||200;
  const req=o.req?` <span class="req">required</span>`:o.opt?` <span class="opt">optional</span>`:"";
  const common=`id="${id}" data-k="${id}" maxlength="${lim}" placeholder="${esc(o.ph||"")}" ${o.type?`type="${o.type}"`:""} ${o.auto?`autocomplete="${o.auto}"`:""} ${o.req?'aria-required="true"':""} aria-describedby="${id}-err"`;
  const au=AUTO.has(id);
  return `<div class="q${au?" auto":""}"><label for="${id}">${label}${req}${au?` <span class="autochip">From your CV · check this</span>`:""}</label>${o.area?`<textarea ${common} rows="${o.rows||4}">${esc(val)}</textarea>`:`<input ${common} value="${esc(val)}">`}${o.hint?`<small>${o.hint}</small>`:""}${o.count?`<small class="count" id="${id}-count"></small>`:""}<small class="err" id="${id}-err"></small></div>`;
}
function renderStep(){
  const f=FIELDS[state.field],d=state.data,s=state.step,iss=checks();
  $("progress").style.width=((s+1)/STEPS.length*100)+"%";
  $("tabs").innerHTML=STEPS.map((t,i)=>{const e=iss.some(x=>x.step===i&&x.level==="error"),w=iss.some(x=>x.step===i);
    return `<button type="button" role="listitem" class="tab${e?" bad":""}" data-i="${i}" ${i===s?'aria-current="step"':""}>${e?"! ":w?"":"✓ "}${i+1}. ${t}</button>`}).join("");
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{state.step=+b.dataset.i;renderStep();$("stepbody").focus()}));
  $("examplebar").innerHTML=state.example
    ?`<span>These are <b>example answers</b>. Type over them, or start with empty boxes.</span><button class="btn small ghost" id="clear" type="button">Start with empty boxes</button>`
    :`<span>Your answers for <b>${esc(f.label)}</b></span><span class="ebtns"><button class="btn small quiet" id="loadex" type="button">Show example</button></span>`;
  const c=$("clear");if(c)confirmClick(c,"Yes, clear the examples",()=>{AUTO.clear();state.example=false;state.data=blank();if(f.projects)state.data.projects=sanitize({projects:[{}]}).projects;state.step=0;renderStep();renderPreview();save();focusFirst()});
  const l=$("loadex");if(l)confirmClick(l,"Replace my answers?",()=>{AUTO.clear();state.example=true;state.data=sanitize(SAMPLES[state.field]);renderStep();renderPreview();save()});

  let h=`<p class="stepname">Step ${s+1} of ${STEPS.length}: ${STEPS[s]}</p>`;
  if(s===0){
    h+=`<div class="note"><b>${esc(f.label)} recruiters look for</b>${f.bullets.map(esc).join(" · ")}</div>
    ${q("name","Full name",d.name,{req:1,auto:"name",ph:"e.g. John Doe"})}
    ${q("title","Job title you want",d.title,{ph:"e.g. Front Office Manager",hint:"Write the job you're applying for, not necessarily your current one."})}
    <div class="row2">${q("email","Email",d.email,{req:1,type:"email",auto:"email",ph:"name@example.com"})}${q("phone","Phone",d.phone,{type:"tel",auto:"tel",ph:"+30 210 123 4567"})}</div>
    <div class="row2">${q("location","City, country",d.location,{opt:1,ph:"Athens, Greece",hint:"No street address needed."})}${q("link",state.field==="creative"?"Portfolio link":state.field==="it"?"GitHub or website":"LinkedIn or website",d.link,{opt:state.field!=="creative",ph:state.field==="it"?"github.com/yourname":"linkedin.com/in/yourname",hint:state.field==="creative"?"This gets the most prominent spot on your resume.":""})}</div>
    ${q("summary","Short summary",d.summary,{area:1,opt:1,hint:f.summaryHint,ph:f.summaryPh,count:1})}
    ${f.highlights?q("highlights","Your three best numbers",d.highlights,{area:1,rows:3,opt:1,hint:"One per line as <b>number | what it measures</b>, e.g. <i>+140% | pipeline growth</i>",ph:"+140% | pipeline growth"}):""}`;
  }else if(s===1){
    h+=`<p class="help">${f.bulletHint} Put your most recent job first. Empty boxes are left off your resume.</p>`+d.experience.map((j,i)=>`<div class="item"><div class="item-h">Job ${i+1}<button class="btn small quiet" type="button" data-del="experience" data-i="${i}">Remove job ${i+1}</button></div>
      ${q(`exp-${i}-role`,"Job title",j.role,{ph:"e.g. Receptionist"})}<div class="row2">${q(`exp-${i}-org`,"Employer",j.org,{ph:"Company name"})}${q(`exp-${i}-place`,"City",j.place,{opt:1})}</div>
      <div class="row2">${q(`exp-${i}-start`,"Started",j.start,{ph:"2021"})}${q(`exp-${i}-end`,"Ended",j.end,{ph:"Present",hint:"Still there? Write Present."})}</div>
      ${q(`exp-${i}-bullets`,"What did you do well? (one per line)",j.bullets,{area:1,ph:f.bulletPh})}</div>`).join("")+
      (d.experience.length<MAX_ITEMS?`<button class="btn ghost small" type="button" data-add="experience">+ Add another job</button>`:`<p class="help">That's the maximum of ${MAX_ITEMS} jobs. Recruiters rarely read further back.</p>`);
    if(f.projects)h+=`<h3 class="subhead">${f.projectLabel||"Projects"} <span class="opt">optional</span></h3>`+d.projects.map((p,i)=>`<div class="item"><div class="item-h">${f.projectLabel?"Piece":"Project"} ${i+1}<button class="btn small quiet" type="button" data-del="projects" data-i="${i}">Remove</button></div>
      <div class="row2">${q(`proj-${i}-name`,"Name",p.name,{lim:"role"})}${q(`proj-${i}-link`,"Link",p.link,{opt:1})}</div>${q(`proj-${i}-desc`,"One-line description",p.desc)}${q(`proj-${i}-tech`,state.field==="it"?"Tech used":"Type of work",p.tech,{opt:1})}</div>`).join("")+
      (d.projects.length<MAX_ITEMS?`<button class="btn ghost small" type="button" data-add="projects">+ Add ${f.projectLabel?"a piece":"a project"}</button>`:"");
  }else if(s===2){
    h+=`<p class="help">Highest or most recent first.</p>`+d.education.map((e,i)=>`<div class="item"><div class="item-h">Education ${i+1}<button class="btn small quiet" type="button" data-del="education" data-i="${i}">Remove</button></div>
      ${q(`edu-${i}-degree`,"Degree or qualification",e.degree,{ph:"e.g. BA Hospitality Management"})}<div class="row2">${q(`edu-${i}-school`,"School",e.school)}${q(`edu-${i}-year`,"Year finished",e.year,{ph:"2019"})}</div></div>`).join("")+
      (d.education.length<MAX_ITEMS?`<button class="btn ghost small" type="button" data-add="education">+ Add education</button>`:"")+`<div class="spacer"></div>
      ${q("certs",f.certLabel,d.certs,{area:1,opt:1,hint:"One per line."})}${q("languages","Languages",d.languages,{area:1,rows:3,opt:1,hint:"One per line, with your level, e.g. English (fluent)."})}`;
  }else if(s===3){
    h+=q("skills","Your skills",d.skills,{area:1,rows:6,hint:f.skillHint||"One per line, or separated by commas. Tap a suggestion to add it."})+`<div class="chips">${f.skills.map(x=>`<button type="button" class="chip" data-skill="${esc(x)}">+ ${esc(x)}</button>`).join("")}</div>`;
  }else{
    const errs=iss.filter(x=>x.level==="error"),warns=iss.filter(x=>x.level==="warn");
    h+=(errs.length?`<div class="alert bad"><b>Fix ${errs.length===1?"this":"these"} before downloading</b><ul>${errs.map(x=>`<li><button type="button" class="linkbtn" data-go="${x.step}" data-focus="${x.id||""}">${esc(x.msg)}</button></li>`).join("")}</ul></div>`:"")+
      (warns.length?`<div class="alert warn"><b>Worth a look (you can still download)</b><ul>${warns.map(x=>`<li><button type="button" class="linkbtn" data-go="${x.step}" data-focus="${x.id||""}">${esc(x.msg)}</button></li>`).join("")}</ul></div>`:"")+
      (!iss.length?`<div class="alert good"><b>Looks good. Your resume is ready.</b></div>`:"")+
      `<div class="pdfrow"><button class="btn big" type="button" id="dl" ${errs.length?"disabled":""}>Download PDF</button><button class="btn ghost" type="button" id="print" ${errs.length?"disabled":""}>Save as PDF (text-readable)</button></div>
      <p class="pdfnote"><b>Not sure which?</b> Use <b>Download PDF</b>. Choose <b>Save as PDF</b> when applying to large companies${state.field==="it"?" or tech jobs":""}: it opens your print window, where you pick "Save as PDF", and the text stays readable by hiring software.</p>
      <div class="pdfnote" id="embednote"></div><div class="toast" id="toast" role="status"></div>
      <div class="note tips"><b>Checklist for ${esc(f.label)}</b><ul class="checklist">${f.tips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>
      <div class="pdfrow"><button class="btn quiet small" type="button" id="copy">Copy as plain text</button></div><div id="fallback"></div>
      <div class="privbox"><label class="switch"><input type="checkbox" id="remember" ${remember?"checked":""}> Remember my answers on this device</label>
      <button class="btn small quiet danger" type="button" id="wipe">Delete my answers</button></div>`;
  }
  const body=$("stepbody");body.innerHTML=h;body.tabIndex=-1;

  body.querySelectorAll("[data-k]").forEach(inp=>{
    inp.addEventListener("input",()=>{
      const k=inp.dataset.k,m=k.match(/^(exp|edu|proj)-(\d+)-(\w+)$/);
      const v=str(inp.value,m?m[3]==="name"?"role":m[3]:k);
      if(m){const arr={exp:"experience",edu:"education",proj:"projects"}[m[1]];const it=state.data[arr][+m[2]];if(it&&it.hasOwnProperty(m[3]))it[m[3]]=v}
      else if(TOP.includes(k))state.data[k]=v;
      if(state.example){state.example=false;$("examplebar").innerHTML=`<span>Your answers for <b>${esc(f.label)}</b></span>`}
      if(AUTO.delete(k)){const qd=inp.closest(".q");qd.classList.remove("auto");const ch=qd.querySelector(".autochip");if(ch)ch.remove()}
      updateCount(k);clearErr(k);renderPreview();save();
    });
    inp.addEventListener("blur",()=>showErr(inp.dataset.k));
    updateCount(inp.dataset.k);
  });
  body.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>{
    const t=b.dataset.add;if(state.data[t].length>=MAX_ITEMS)return;
    state.data[t].push(sanitize({[t]:[{}]})[t][0]);state.example=false;renderStep();renderPreview();save();
    const pre={experience:"exp",education:"edu",projects:"proj"}[t],first={experience:"role",education:"degree",projects:"name"}[t];
    const el=$(`${pre}-${state.data[t].length-1}-${first}`);if(el)el.focus();
  }));
  body.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>{
    const t=b.dataset.del,i=+b.dataset.i,item=state.data[t].splice(i,1)[0];state.example=false;
    renderStep();renderPreview();save();
    notify("Removed.",()=>{state.data[t].splice(i,0,item);renderStep();renderPreview();save()});
  }));
  body.querySelectorAll("[data-skill]").forEach(b=>b.addEventListener("click",()=>{
    const cur=lines(state.data.skills);if(!cur.includes(b.dataset.skill))state.data.skills=str([...cur,b.dataset.skill].join("\n"),"skills");
    state.example=false;b.disabled=true;b.textContent="✓ "+b.dataset.skill;const ta=$("skills");if(ta)ta.value=state.data.skills;renderPreview();save();
  }));
  body.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>{
    state.step=+b.dataset.go;renderStep();const el=b.dataset.focus&&$(b.dataset.focus);
    if(el){el.focus();showErr(b.dataset.focus)}else $("stepbody").focus();
  }));
  if(s===4){
    $("copy").addEventListener("click",copyText);
    $("dl").addEventListener("click",downloadPDF);
    $("print").addEventListener("click",printPDF);
    if(embedded)$("embednote").textContent="You're viewing a preview inside Claude, where downloads are switched off. The PDF buttons work on your own server, such as CasaOS.";
    $("remember").addEventListener("change",e=>{remember=e.target.checked;try{localStorage.setItem(REMEMBER,remember?"on":"off")}catch(_){}
      if(!remember)wipe();save();});
    confirmClick($("wipe"),"Yes, delete everything",()=>{wipe();AUTO.clear();state={field:state.field,step:0,example:true,data:sanitize(SAMPLES[state.field])};renderStep();renderPreview();notify("Your answers were deleted from this device.");});
  }
  $("back").hidden=s===0;
  const nx=$("next");nx.hidden=s===STEPS.length-1;nx.textContent=s===STEPS.length-2?"Next: Finish & download →":`Next: ${STEPS[s+1]||""} →`;
}
function errFor(k){return checks().find(x=>x.id===k)}
function showErr(k){const e=$(k+"-err"),x=errFor(k),inp=$(k);if(!e)return;e.textContent=x?x.msg:"";if(inp)inp.setAttribute("aria-invalid",x&&x.level==="error"?"true":"false");e.className="err"+(x?" "+x.level:"")}
function clearErr(k){const e=$(k+"-err");if(e&&e.textContent&&!errFor(k)){e.textContent="";const i=$(k);if(i)i.setAttribute("aria-invalid","false")}}
function updateCount(k){const c=$(k+"-count");if(!c)return;const n=(state.data[k]||"").length;c.textContent=`${n} characters${n>450?" · a bit long, aim for under 450":""}`}
function focusFirst(){const el=$("stepbody").querySelector("input,textarea");if(el)el.focus()}
$("back").addEventListener("click",()=>{if(state.step>0){state.step--;renderStep();scrollPanel()}});
$("next").addEventListener("click",()=>{if(state.step<STEPS.length-1){state.step++;renderStep();scrollPanel()}});
function scrollPanel(){const p=document.querySelector(".panel");if(p.getBoundingClientRect().top<0)p.scrollIntoView({block:"start"});$("stepbody").focus({preventScroll:true})}
$("jump").addEventListener("click",()=>$("previewbox").scrollIntoView({block:"start"}));

/* two-tap confirm instead of dialogs */
function confirmClick(btn,ask,action){
  let armed=false,t;const label=btn.textContent;
  btn.addEventListener("click",()=>{
    if(!armed){armed=true;btn.textContent=ask;btn.classList.add("armed");t=setTimeout(()=>{armed=false;btn.textContent=label;btn.classList.remove("armed")},4000);return}
    clearTimeout(t);action();
  });
}
/* small toast with optional undo */
let undoTimer;
function notify(msg,undo){
  const u=$("undo");u.innerHTML=`<span>${esc(msg)}</span>${undo?'<button type="button" class="btn small" id="undobtn">Undo</button>':""}<button type="button" class="x" id="undox" aria-label="Close">×</button>`;
  u.hidden=false;clearTimeout(undoTimer);undoTimer=setTimeout(()=>u.hidden=true,undo?9000:4000);
  if(undo)$("undobtn").addEventListener("click",()=>{undo();u.hidden=true});
  $("undox").addEventListener("click",()=>u.hidden=true);
}

/* ---------- preview ---------- */
function renderPreview(){
  const f=FIELDS[state.field],live=$("live");
  live.innerHTML=paperHTML(state.field,state.data);fit(live);
  const p=live.querySelector(".paper");pageCount=Math.max(1,Math.ceil((p.offsetHeight-8)/1123));
  $("prevtitle").textContent=`${f.tpl} · ${f.label}`;
  $("prevsub").textContent=`A4 · ${pageCount} page${pageCount>1?"s":""} · updates as you type`;
  $("pagewarn").textContent=pageCount>f.maxPages?`⚠ ${pageCount} pages. ${f.label} recruiters expect ${f.maxPages===1?"one":"at most two"}.`:"";
}
ro.observe($("live"));

/* ---------- export ---------- */
function plainText(){
  const d=prepare(state.data),o=[];
  o.push(d.name,d.title,[d.location,d.phone,d.email,d.link].filter(Boolean).join(" | "),"");
  if(d.highlights)o.push("HIGHLIGHTS",...lines(d.highlights).map(x=>"• "+x.replace("|"," ")),"");
  if(d.summary)o.push("SUMMARY",d.summary,"");
  if(lines(d.skills).length)o.push("SKILLS",...lines(d.skills).map(x=>"• "+x),"");
  if(has(d.experience)){o.push("EXPERIENCE");d.experience.forEach(j=>o.push([j.role,j.org].filter(Boolean).join(" — ")+(j.place?", "+j.place:"")+(dates(j)?` (${dates(j)})`:""),...lines(j.bullets).map(x=>"• "+x),""))}
  if(has(d.projects)){o.push((FIELDS[state.field].projectLabel||"Projects").toUpperCase());d.projects.forEach(p=>o.push(`${p.name}${p.link?" — "+p.link:""}: ${p.desc}${p.tech?" ("+p.tech+")":""}`));o.push("")}
  if(has(d.education)){o.push("EDUCATION");d.education.forEach(e=>o.push([e.degree,e.school].filter(Boolean).join(", ")+(e.year?` (${e.year})`:"")));o.push("")}
  if(lines(d.certs).length)o.push("CERTIFICATIONS",...lines(d.certs).map(x=>"• "+x),"");
  if(lines(d.languages).length)o.push("LANGUAGES",lines(d.languages).join(", "));
  return o.join("\n");
}
function copyText(){
  const t=plainText();
  const fallback=()=>{$("fallback").innerHTML=`<p class="help">Your browser blocked copying. Select the text below and copy it.</p><textarea id="fbtext" class="copyfallback" readonly></textarea>`;const ta=$("fbtext");ta.value=t;ta.select()};
  try{navigator.clipboard.writeText(t).then(()=>setToast("✓ Copied. Paste it into Word or Google Docs."),fallback)}catch(e){fallback()}
}
let embedded=false;try{embedded=window.self!==window.top}catch(e){embedded=true}
function fileName(){const n=prepare(state.data).name.split(",")[0].trim().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50);return (n||"My")+"-Resume.pdf"}
function freshPaper(){const w=document.createElement("div");w.innerHTML=paperHTML(state.field,state.data);const p=w.firstElementChild;p.style.position="relative";p.style.transform="none";p.style.boxShadow="none";return p}
function setToast(t){const el=$("toast");if(el)el.textContent=t}
function blocked(){const e=checks().filter(x=>x.level==="error");if(e.length){state.step=4;renderStep();$("stepbody").scrollIntoView({block:"start"});setToast("Fix the red items first, then download.");return true}return false}
let busy=false,pdfLoading=null;
function loadPDFTool(){
  if(pdfLoading)return pdfLoading;
  pdfLoading=new Promise((res,rej)=>{const sc=document.createElement("script");sc.src=window.FIELDCRAFT_PDF_SRC||"pdf.js";sc.onload=()=>typeof window.html2pdf==="function"?res():rej();sc.onerror=()=>{pdfLoading=null;rej()};document.head.appendChild(sc)});
  return pdfLoading;
}
async function downloadPDF(){
  if(busy||blocked())return;
  if(typeof window.html2pdf!=="function"){
    setToast("Getting the PDF maker ready…");
    try{await loadPDFTool()}catch(e){setToast("The PDF maker couldn't load. Check that pdf.js is uploaded next to index.html, or use 'Save as PDF'.");return}
  }
  busy=true;const btns=[$("dl"),$("dl-top")].filter(Boolean);
  btns.forEach(b=>{b.disabled=true;b.dataset.t=b.textContent;b.textContent="Making your PDF…"});
  try{
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    await window.html2pdf().set({margin:0,filename:fileName(),image:{type:"jpeg",quality:0.98},
      html2canvas:{scale:2,useCORS:false,backgroundColor:"#ffffff",windowWidth:794,scrollX:0,scrollY:0,x:0,y:0,logging:false},
      jsPDF:{unit:"px",format:[794,1123],orientation:"portrait",hotfixes:["px_scaling"]},
      pagebreak:{mode:["css","legacy"],avoid:[".job","li","h2"]}}).from(freshPaper()).save();
    setToast(`✓ Downloaded ${fileName()}. Check your Downloads folder.`);
  }catch(e){setToast("Something went wrong making the PDF. Try 'Save as PDF' instead.")}
  btns.forEach(b=>{b.disabled=false;b.textContent=b.dataset.t});busy=false;
}
function printPDF(){
  if(blocked())return;
  const root=$("printroot");root.innerHTML="";root.appendChild(freshPaper());
  const old=document.title;document.title=fileName().replace(/\.pdf$/,"");
  setToast('In the print window, set Destination to "Save as PDF", then press Save.');
  window.print();setTimeout(()=>{document.title=old},800);
}
$("dl-top").addEventListener("click",()=>{if(checks().some(x=>x.level==="error")){blocked();return}downloadPDF()});
window.addEventListener("beforeprint",()=>{if(!$("printroot").firstChild)$("printroot").appendChild(freshPaper())});
window.addEventListener("afterprint",()=>{$("printroot").innerHTML=""});


/* ---------- fill the form from an existing CV ---------- */
const CV_ERR={big:"That file is over 15 MB. Save a smaller copy, or a PDF without photos.",doc:"Old Word files (.doc) can't be read. In Word, choose File → Save As → Word Document (.docx) or PDF, then upload that.",
  type:"We can read PDF, Word (.docx) and text files. Save your CV as one of those and try again.",locked:"This PDF is password-protected. Save a copy without a password and try again.",
  pdf:"This PDF couldn't be opened. It may be damaged. Try saving it again as PDF.",docx:"This Word file couldn't be read. Try saving it again as .docx or PDF.",
  load:"The CV reader couldn't load. Check your connection, or that pdfjs.js and pdfjs.worker.js are uploaded next to index.html.",
  notcv:"This file doesn't look like a CV: we couldn't find a name, contact details, jobs or education in it. Check you picked the right file.",
  empty:"We couldn't find any text in this file. It's probably a scanned image or a photo of your CV, so there's nothing to read. Type your answers instead, or upload the Word version."};
function impMsg(html){const r=$("impresult");r.innerHTML=html;r.hidden=false}
async function importCV(file){
  if(!file)return;
  const btn=$("impbtn");btn.classList.add("busy");btn.textContent="Reading…";
  impMsg(`<span>Reading <b>${esc(file.name)}</b>…</span>`);
  try{
    let ln;
    try{ln=await FCCV.fileToLines(file)}catch(e){throw new Error(CV_ERR[e.message]?e.message:"load")}
    const r=FCCV.readCV(ln);
    if(r._textLength<40)throw new Error("empty");
    const core=["name","email","phone"].filter(k=>r[k]).length+(r.experience.length?1:0)+(r.education.length?1:0);
    if(core<2)throw new Error("notcv");
    applyCV(r,file.name);
  }catch(e){impMsg(`<span class="bad">✗ ${esc(CV_ERR[e.message]||CV_ERR.pdf)}</span>`)}
  finally{btn.classList.remove("busy");btn.textContent="Upload my CV";$("cvfile").value=""}
}
function applyCV(r,fname){
  const before={data:clone(state.data),example:state.example,field:state.field,auto:new Set(AUTO),step:state.step};
  const base=blank();base.experience=[];base.education=[];   // a new CV replaces everything; Undo brings the old answers back
  const filled=new Set();
  const put=(k,v)=>{v=str(v||"",k).trim();if(v){base[k]=v;filled.add(k)}};
  ["name","title","email","phone","location","summary","skills","languages","certs"].forEach(k=>put(k,r[k]));
  const L=r._links||{};put("link",state.field==="it"?(L.github||L.linkedin||L.other):state.field==="creative"?(L.other||L.linkedin):(L.linkedin||L.other||L.github));
  const list=(arr,key,pre,keys)=>{if(!arr||!arr.length)return;base[key]=sanitize({[key]:arr})[key];
    base[key].forEach((it,i)=>keys.forEach(k=>{if(String(it[k]||"").trim())filled.add(`${pre}-${i}-${k}`)}))};
  list(r.experience,"experience","exp",SUB.experience);
  list(r.education,"education","edu",SUB.education);
  list(r.projects,"projects","proj",SUB.projects);
  if(!base.experience.length)base.experience=sanitize({experience:[{}]}).experience;
  if(!base.education.length)base.education=sanitize({education:[{}]}).education;
  if(!filled.size){impMsg(`<span class="bad">✗ We opened ${esc(fname)} but couldn't tell which part is which. Type your answers in the boxes below instead.</span>`);return}
  AUTO.clear();filled.forEach(k=>AUTO.add(k));
  state.example=false;state.data=sanitize(base);state.step=0;
  if(FIELDS[state.field].projects&&!state.data.projects.length)state.data.projects=sanitize({projects:[{}]}).projects;
  renderStep();renderPreview();save();
  const missing=[!filled.has("name")&&"your name",!filled.has("email")&&"email",!filled.has("phone")&&"phone",!r.experience.length&&"jobs",!r.education.length&&"education"].filter(Boolean);
  const sug=r._field&&r._field!==state.field&&FIELDS[r._field]?r._field:null;
  impMsg(`<span>✓ Filled <b>${filled.size} boxes</b> from ${esc(fname)}: ${esc(r._found.join(", "))}.</span>
    <span>Boxes marked <span class="autochip">From your CV · check this</span> were filled automatically. Read each one: the reader follows rules and can put something in the wrong box.${missing.length?` We couldn't find ${esc(missing.join(", "))}, so please add ${missing.length>1?"them":"it"} yourself.`:""}</span>
    ${sug?`<span>Your CV looks like <b>${esc(FIELDS[sug].label)}</b>. That field's recruiters prefer the <b>${esc(FIELDS[sug].tpl)}</b> design.</span>`:""}
    <span class="row">${sug?`<button class="btn small" type="button" id="impfield">Use the ${esc(FIELDS[sug].tpl)} design</button>`:""}<button class="btn small quiet" type="button" id="impundo">Undo, put back my previous answers</button></span>`);
  if(sug)$("impfield").addEventListener("click",e=>{e.target.disabled=true;e.target.textContent="✓ Design changed";chooseField(sug)});
  $("impundo").addEventListener("click",()=>{state.data=before.data;state.example=before.example;state.step=before.step;AUTO.clear();before.auto.forEach(k=>AUTO.add(k));
    if(state.field!==before.field)chooseField(before.field);else{renderStep();renderPreview();save()}
    impMsg(`<span>Your previous answers are back.</span>`)});
}
(function setupImport(){
  const bar=$("importbar"),inp=$("cvfile");if(!bar)return;
  if(typeof FCCV!=="object"){bar.hidden=true;return}
  inp.addEventListener("change",()=>importCV(inp.files[0]));
  $("impbtn").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();inp.click()}});
  $("impbtn").tabIndex=0;$("impbtn").setAttribute("role","button");
  ["dragenter","dragover"].forEach(t=>bar.addEventListener(t,e=>{e.preventDefault();bar.classList.add("drag")}));
  ["dragleave","drop"].forEach(t=>bar.addEventListener(t,e=>{e.preventDefault();bar.classList.remove("drag")}));
  bar.addEventListener("drop",e=>{const f=e.dataTransfer&&e.dataTransfer.files[0];if(f)importCV(f)});
})();

renderFields();renderStep();renderPreview();save();
started=true;if(failBox)failBox.hidden=true;
}catch(err){showFail(err&&err.message?err.message:String(err))}
})();

