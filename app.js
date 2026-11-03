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
  hospitality:{name:"Marta Horvat",title:"Restaurant Manager",email:"marta.horvat@mail.com",phone:"+385 91 555 0142",location:"Zagreb, Croatia",link:"",summary:"Restaurant manager with 8 years in fine dining and boutique hotels. Known for raising guest satisfaction scores and training front-of-house teams that stay.",
    experience:[{role:"Restaurant Manager",org:"Hotel Esplanade",place:"Zagreb",start:"2021",end:"Present",bullets:"Lead a 22-person team across breakfast, à la carte and events\nRaised TripAdvisor rating from 4.3 to 4.8 in 18 months\nGrew wine revenue 31% through staff upselling training"},
      {role:"Assistant Manager",org:"Bistro Tkalča",place:"Zagreb",start:"2017",end:"2021",bullets:"Managed 180 covers per night on peak weekends\nCut food waste 18% with a new prep-forecasting routine"}],
    education:[{degree:"BA Hospitality Management",school:"University of Applied Sciences VERN'",year:"2017"}],
    certs:"HACCP Level 3\nWSET Level 2 in Wines\nFirst Aid at Work",languages:"Croatian (native)\nEnglish (fluent)\nGerman (conversational)",
    skills:"Guest relations\nStaff training\nOpera PMS\nWine service\nEvent coordination\nHACCP\nRota planning\nComplaint resolution\nCost control",projects:[],highlights:""},
  it:{name:"Luka Petrović",title:"Senior Backend Engineer",email:"luka@petrovic.dev",phone:"+385 98 555 0177",location:"Split, Croatia",link:"github.com/lukap",summary:"Backend engineer focused on payment systems and APIs that handle millions of requests a day.",
    experience:[{role:"Senior Backend Engineer",org:"Infobip",place:"Remote",start:"2022",end:"Present",bullets:"Cut p95 API latency 38% by moving hot paths to Go and Redis\nDesigned the retry service that now processes 40M messages/day\nMentor 4 engineers; run the team's design reviews"},
      {role:"Software Engineer",org:"Span",place:"Zagreb",start:"2019",end:"2022",bullets:"Built a Django billing module used by 120 enterprise clients\nIntroduced CI test gates that dropped production incidents by half"}],
    education:[{degree:"MSc Computer Science",school:"University of Zagreb, FER",year:"2019"}],
    certs:"AWS Certified Solutions Architect – Associate",languages:"Croatian (native)\nEnglish (fluent)",
    skills:"Languages: Go, Python, TypeScript\nFrameworks: Django, FastAPI, Node.js\nCloud: AWS, Docker, Kubernetes\nData: PostgreSQL, Redis, Kafka",
    projects:[{name:"ratelimitd",link:"github.com/lukap/ratelimitd",desc:"Open-source distributed rate limiter, 1.2k GitHub stars.",tech:"Go, Redis"},{name:"Ledger sync",link:"",desc:"Event-sourced reconciliation tool for payment ledgers.",tech:"Python, Kafka"}],highlights:""},
  healthcare:{name:"Ana Kovač, RN, BSN",title:"Registered Nurse · Intensive Care",email:"ana.kovac@mail.com",phone:"+385 95 555 0110",location:"Rijeka, Croatia",link:"",summary:"ICU nurse with 6 years of critical-care experience in a 30-bed adult unit. Calm under pressure and committed to clear communication with patients and families.",
    experience:[{role:"Registered Nurse, ICU",org:"Clinical Hospital Centre Rijeka",place:"Rijeka",start:"2020",end:"Present",bullets:"Care for 2–3 critically ill patients per shift, incl. ventilated patients\nLed a falls-prevention project that cut patient falls 25%\nPrecept new graduate nurses through 12-week orientation"},
      {role:"Staff Nurse, Medical Ward",org:"General Hospital Pula",place:"Pula",start:"2018",end:"2020",bullets:"Managed a 6-patient caseload on a 40-bed ward\nImproved patient satisfaction scores 15% through bedside handovers"}],
    education:[{degree:"BSc Nursing",school:"University of Rijeka, Faculty of Health Studies",year:"2018"}],
    certs:"RN License, Croatian Nursing Council – exp. 2028\nBLS (Basic Life Support) – exp. 2027\nACLS – exp. 2027\nCritical Care Certificate",languages:"Croatian (native)\nEnglish (fluent)\nItalian (good)",
    skills:"Patient assessment\nMechanical ventilation\nIV therapy\nMedication administration\nEHR documentation\nInfection control\nWound care\nFamily communication",projects:[],highlights:""},
  finance:{name:"Ivan Novak",title:"Investment Banking Analyst",email:"ivan.novak@mail.com",phone:"+385 91 555 0199",location:"Zagreb, Croatia",link:"linkedin.com/in/ivannovak",summary:"",
    experience:[{role:"Investment Banking Analyst",org:"Erste Group",place:"Zagreb",start:"2023",end:"Present",bullets:"Built DCF and comparable-company models for 5 mid-market M&A deals (€40–220M)\nDrafted CIMs and management presentations for sell-side mandates\nCoordinated due diligence data rooms with legal and audit teams"},
      {role:"Summer Analyst",org:"PwC Croatia",place:"Zagreb",start:"2022",end:"2022",bullets:"Supported valuation of a €75M renewable energy portfolio"}],
    education:[{degree:"MSc Finance, summa cum laude",school:"Zagreb School of Economics and Management",year:"2023"},{degree:"BSc Economics",school:"University of Zagreb",year:"2021"}],
    certs:"CFA Level II Candidate\nBloomberg Market Concepts",languages:"Croatian (native), English (fluent), German (good)",
    skills:"Financial modelling\nValuation (DCF, LBO, comps)\nExcel (VBA)\nBloomberg\nCapIQ\nPowerPoint",projects:[],highlights:""},
  creative:{name:"Nika Babić",title:"Brand & Visual Designer",email:"hello@nikababic.studio",phone:"+385 99 555 0123",location:"Zagreb, Croatia",link:"nikababic.studio",summary:"Brand designer who builds identities for food, culture and hospitality brands. I care about type, colour and systems that still work three years later.",
    experience:[{role:"Senior Designer",org:"Bruketa&Žinić&Grey",place:"Zagreb",start:"2021",end:"Present",bullets:"Art-directed rebrands for 9 clients across food and tourism\nLed packaging redesign that lifted retail sell-through 22%\nRun the studio's monthly type crit"},
      {role:"Designer",org:"Studio Sonda",place:"Rijeka",start:"2018",end:"2021",bullets:"Designed festival identities seen by 60k visitors a year"}],
    education:[{degree:"BA Visual Communication Design",school:"Academy of Fine Arts, Zagreb",year:"2018"}],
    certs:"Red Dot Award: Brands & Communication 2024\nADC*E Bronze 2023",languages:"Croatian, English, Spanish",
    skills:"Brand identity\nArt direction\nTypography\nPackaging\nFigma\nAdobe CC\nMotion (After Effects)",
    projects:[{name:"Kvarner Olive Co.",link:"",desc:"Identity and packaging for a family olive oil brand.",tech:"Branding"},{name:"Zagreb Film Nights",link:"",desc:"Festival system across 40 touchpoints.",tech:"Identity"}],highlights:""},
  marketing:{name:"Petra Jurić",title:"Growth Marketing Lead",email:"petra.juric@mail.com",phone:"+385 92 555 0156",location:"Osijek, Croatia",link:"linkedin.com/in/petrajuric",summary:"Growth marketer for B2B software. I build paid and lifecycle programmes that turn trial users into paying customers.",
    experience:[{role:"Growth Marketing Lead",org:"Rimac Technology",place:"Zagreb",start:"2022",end:"Present",bullets:"Grew inbound pipeline 140% in two years across 6 markets\nCut cost per lead 35% by rebuilding paid search structure\nLaunched lifecycle emails that raised trial-to-paid conversion from 9% to 14%"},
      {role:"Digital Marketing Specialist",org:"Infinum",place:"Zagreb",start:"2019",end:"2022",bullets:"Managed €400k annual ad budget across Google and LinkedIn\nRan 60+ A/B tests on landing pages"}],
    education:[{degree:"BA Marketing",school:"University of Osijek, Faculty of Economics",year:"2019"}],
    certs:"Google Ads Search Certification\nHubSpot Inbound Marketing",languages:"Croatian (native)\nEnglish (fluent)",
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
const KEY="fieldcraft-draft-v2",REMEMBER="fieldcraft-remember";
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
  return `<div class="q"><label for="${id}">${label}${req}</label>${o.area?`<textarea ${common} rows="${o.rows||4}">${esc(val)}</textarea>`:`<input ${common} value="${esc(val)}">`}${o.hint?`<small>${o.hint}</small>`:""}${o.count?`<small class="count" id="${id}-count"></small>`:""}<small class="err" id="${id}-err"></small></div>`;
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
  const c=$("clear");if(c)confirmClick(c,"Yes, clear the examples",()=>{state.example=false;state.data=blank();if(f.projects)state.data.projects=sanitize({projects:[{}]}).projects;state.step=0;renderStep();renderPreview();save();focusFirst()});
  const l=$("loadex");if(l)confirmClick(l,"Replace my answers?",()=>{state.example=true;state.data=sanitize(SAMPLES[state.field]);renderStep();renderPreview();save()});

  let h=`<p class="stepname">Step ${s+1} of ${STEPS.length}: ${STEPS[s]}</p>`;
  if(s===0){
    h+=`<div class="note"><b>${esc(f.label)} recruiters look for</b>${f.bullets.map(esc).join(" · ")}</div>
    ${q("name","Full name",d.name,{req:1,auto:"name",ph:"e.g. Marta Horvat"})}
    ${q("title","Job title you want",d.title,{ph:"e.g. Front Office Manager",hint:"Write the job you're applying for, not necessarily your current one."})}
    <div class="row2">${q("email","Email",d.email,{req:1,type:"email",auto:"email",ph:"name@example.com"})}${q("phone","Phone",d.phone,{type:"tel",auto:"tel",ph:"+385 91 234 5678"})}</div>
    <div class="row2">${q("location","City, country",d.location,{opt:1,ph:"Zagreb, Croatia",hint:"No street address needed."})}${q("link",state.field==="creative"?"Portfolio link":state.field==="it"?"GitHub or website":"LinkedIn or website",d.link,{opt:state.field!=="creative",ph:state.field==="it"?"github.com/yourname":"linkedin.com/in/yourname",hint:state.field==="creative"?"This gets the most prominent spot on your resume.":""})}</div>
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
    confirmClick($("wipe"),"Yes, delete everything",()=>{wipe();state={field:state.field,step:0,example:true,data:sanitize(SAMPLES[state.field])};renderStep();renderPreview();notify("Your answers were deleted from this device.");});
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

renderFields();renderStep();renderPreview();save();
started=true;if(failBox)failBox.hidden=true;
}catch(err){showFail(err&&err.message?err.message:String(err))}
})();
