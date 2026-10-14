(function(){
"use strict";
var G=window.GYM, EX=G.EX, DAYS=G.DAYS, W=G.W, C=G.C;
var START=new Date(G.START+"T00:00:00").getTime();
var DAY_ORDER=["P","U","L","D","C"];
var DAY_COLOR={P:"var(--P)",U:"var(--U)",L:"var(--L)",D:"var(--D)",C:"var(--C)"};
var CARDIO=[{k:"ellip",n:"أوربيتراك",met:5},{k:"recumb",n:"عجلة بمسند",met:4.8},{k:"tread",n:"مشي على السير بميل خفيف",met:4.5},{k:"upright",n:"عجلة عادية",met:5.5},{k:"walk",n:"مشي برا",met:3.5}];
var ART={
 P:'<svg viewBox="0 0 100 100" fill="#fff"><rect x="8" y="38" width="10" height="24" rx="3"/><rect x="20" y="30" width="10" height="40" rx="3"/><rect x="30" y="46" width="40" height="8" rx="3"/><rect x="70" y="30" width="10" height="40" rx="3"/><rect x="82" y="38" width="10" height="24" rx="3"/></svg>',
 U:'<svg viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"><path d="M10 18h80"/><path d="M30 18v14M70 18v14"/><circle cx="50" cy="44" r="9" fill="#fff"/><path d="M30 32l20 24 20-24M50 56v24M38 92l12-12 12 12"/></svg>',
 L:'<svg viewBox="0 0 100 100" fill="#fff"><path d="M50 14a10 10 0 1 1 0 20 10 10 0 0 1 0-20z"/><path d="M34 26h32a14 14 0 0 1 13 9l6 20c3 10-4 20-15 20H30c-11 0-18-10-15-20l6-20a14 14 0 0 1 13-9z" opacity=".9"/><rect x="40" y="76" width="20" height="14" rx="3"/></svg>',
 D:'<svg viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="7"><circle cx="50" cy="50" r="38"/><circle cx="50" cy="50" r="22"/><circle cx="50" cy="50" r="7" fill="#fff"/></svg>',
 C:'<svg viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"><path d="M50 86S12 62 12 36a19 19 0 0 1 38-6 19 19 0 0 1 38 6c0 26-38 50-38 50z"/><path d="M20 50h18l6-12 10 24 6-12h20"/></svg>'
};
var FEEL=[["😌","سهل جدًا"],["🙂","سهل"],["💪","مظبوط"],["😤","صعب"],["🥵","صعب جدًا"]];
var LS="ahmed-gym-app-v1";

/* ---------- state ---------- */
var S={sessions:[],profile:{weight:"",wlog:[],bp:[]},view:"home",open:null,reportId:null,lib:"P",confirm:null};
try{var o=JSON.parse(localStorage.getItem(LS)||"null");if(o){S.sessions=o.sessions||[];S.profile=Object.assign(S.profile,o.profile||{});}}catch(e){}
function save(){try{localStorage.setItem(LS,JSON.stringify({sessions:S.sessions,profile:S.profile}));}catch(e){}}

/* ---------- helpers ---------- */
function $(s){return document.querySelector(s);}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function rng(s){return esc(s).replace(/(\d+(?:[.,]\d+)?)(?:–(\d+))?/g,function(m){return '<span class="n">'+m+'</span>';});}
function num(v){var x=parseFloat(String(v).replace(",","."));return isFinite(x)?x:0;}
function r0(x){return Math.round(x);}
function r1(x){return Math.round(x*10)/10;}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function week(t){return Math.max(1,Math.floor((t-START)/(7*864e5))+1);}
function phase(wk){return wk<=4?0:wk<=8?1:2;}
function repsOf(e,wk){return e.ph?e.ph[phase(wk)]:e.reps;}
function weekStart(t){var d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+1)%7));return d.getTime();}
function fmtDate(t,o){try{return new Date(t).toLocaleDateString("ar-EG-u-nu-latn",o||{weekday:"long",day:"numeric",month:"long"});}catch(e){return new Date(t).toDateString();}}
function fmtTime(t){try{return new Date(t).toLocaleTimeString("ar-EG-u-nu-latn",{hour:"numeric",minute:"2-digit"});}catch(e){return "";}}
function clock(ms){var s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+":"+String(m).padStart(2,"0"):m)+":"+String(x).padStart(2,"0");}
function done(){return S.sessions.filter(function(s){return s.status==="done";}).sort(function(a,b){return b.startedAt-a.startedAt;});}
function active(){return S.sessions.find(function(s){return s.status==="active";})||null;}
function byId(id){return S.sessions.find(function(s){return s.id===id;});}
function isStr(d){return d==="P"||d==="U"||d==="L";}
function bw(){return num(S.profile.weight)||90;}
function thumb(e){return e&&e.gal&&e.gal.length?e.gal[0].src:"";}
function img(src,cls){return src?'<img class="'+(cls||"")+'" src="'+src+'" alt="" loading="lazy">':'<span class="ph0 '+(cls||"")+'">🏋️</span>';}
function chip(d){return '<span class="chip" style="--c:'+DAY_COLOR[d]+'">'+esc(DAYS[d].t)+'</span>';}

/* ---------- next day ---------- */
function nextDay(){
  var d=done(),t=Date.now(),dow=new Date(t).getDay(),t0=new Date(t);t0.setHours(0,0,0,0);
  var coreToday=d.some(function(x){return x.day==="D"&&x.startedAt>=t0.getTime();});
  if((dow===1||dow===4)&&!coreToday)return "D";
  var last=d.find(function(x){return isStr(x.day);});
  return last?({P:"U",U:"L",L:"P"})[last.day]:"P";
}

/* ---------- metrics ---------- */
function cardioMin(s){var c=s.cardio||{};var m=num(c.min);if(c.since)m+=(Date.now()-c.since)/60000;return m;}
function metrics(s){
  var end=s.endedAt||Date.now(),dur=(end-s.startedAt)/60000,cm=Math.min(cardioMin(s),dur),w=num(s.bw)||bw();
  var met=(CARDIO.find(function(c){return c.k===(s.cardio&&s.cardio.m);})||{met:5}).met;
  var kcal=3.5*w*Math.max(0,dur-cm)/60+met*w*cm/60;
  var vol=0,sd=0,sa=0,exd=0,best={};
  (s.items||[]).forEach(function(it){var e=EX[it.k];if(!e)return;var all=it.sets.length>0;
    it.sets.forEach(function(st){sa++;if(st.done){sd++;var Wt=num(st.w);if(e.kind==="w"&&!it.alt)vol+=Wt*num(st.r);if(Wt>(best[it.k]||0))best[it.k]=Wt;}else all=false;});
    if(all&&!it.skipped)exd++;});
  var wd=Object.keys(s.warm||{}).filter(function(k){return s.warm[k];}).length,cd=Object.keys(s.cool||{}).filter(function(k){return s.cool[k];}).length;
  return {dur:dur,cm:cm,kcal:kcal,vol:vol,sd:sd,sa:sa,exd:exd,exa:(s.items||[]).length,best:best,wd:wd,cd:cd};
}
function lastSets(k,before){var xs=done().filter(function(x){return x.startedAt<before;});for(var i=0;i<xs.length;i++){var it=(xs[i].items||[]).find(function(y){return y.k===k;});if(it){var d=it.sets.filter(function(s){return s.done;});if(d.length)return{sets:d,alt:it.alt,t:xs[i].startedAt};}}return null;}
function bestBefore(k,before){var b=0;done().forEach(function(x){if(x.startedAt>=before)return;(x.items||[]).forEach(function(it){if(it.k!==k||it.alt)return;it.sets.forEach(function(st){if(st.done&&num(st.w)>b)b=num(st.w);});});});return b;}
function streak(){var n=0,ws=weekStart(Date.now()),d=done();for(var i=0;i<60;i++){var a=ws-i*7*864e5,b=a+7*864e5;var c=d.filter(function(x){return x.startedAt>=a&&x.startedAt<b;}).length;if(c>=3)n++;else if(i>0)break;}return n;}
function weekStats(){var ws=weekStart(Date.now());var xs=done().filter(function(x){return x.startedAt>=ws;});var k=0,cm=0;xs.forEach(function(x){var m=metrics(x);k+=m.kcal;cm+=m.cm;});
  return{str:xs.filter(function(x){return isStr(x.day);}).length,core:xs.filter(function(x){return x.day==="D";}).length,kcal:k,cardio:cm};}

/* ---------- session ---------- */
function newSession(day){
  var t=Date.now(),wk=week(t);
  var items=DAYS[day].keys.map(function(k){var e=EX[k];var n=e.ph?(phase(wk)===0?2:3):e.sets;if(k==="wallSit")n=wk>=8?4:3;
    var last=lastSets(k,t),sets=[];for(var i=0;i<n;i++){var ls=last&&!last.alt&&last.sets[Math.min(i,last.sets.length-1)];sets.push({w:ls&&e.kind==="w"?ls.w:"",r:"",done:false});}
    return{k:k,alt:false,skipped:false,sets:sets};});
  var s={id:"s"+uid(),day:day,status:"active",startedAt:t,endedAt:null,week:wk,bw:bw(),pre:{sys:"",dia:"",pulse:"",back:"",neck:""},warm:{},items:items,
    cardio:{m:"ellip",min:0,since:null},cool:{},post:{back:"",neck:"",feel:null,note:""}};
  S.sessions.push(s);S.view="workout";S.open="warm";S.confirm=null;save();wakeOn();render();window.scrollTo(0,0);
}
function finish(s){
  if(s.cardio.since){s.cardio.min=r1(cardioMin(s));s.cardio.since=null;}
  s.endedAt=Date.now();s.status="done";
  if(num(s.pre.sys)&&num(s.pre.dia)){S.profile.bp.push({t:s.startedAt,s:num(s.pre.sys),d:num(s.pre.dia),p:num(s.pre.pulse),src:"قبل التمرين"});}
  save();stopRest();wakeOff();S.view="report";S.reportId=s.id;S.fresh=s.id;S.confirm=null;render();window.scrollTo(0,0);confetti();buzz();
}
function toast(msg){var el=document.createElement("div");el.className="toast";el.textContent=msg;document.body.appendChild(el);setTimeout(function(){el.remove();},1800);}
function confetti(){try{var c=document.createElement("canvas");c.id="confetti";c.width=innerWidth;c.height=innerHeight;document.body.appendChild(c);var x=c.getContext("2d"),cols=["#c6ff3d","#ff6a2b","#4da3ff","#3ddc97","#ffc53d","#a98bff"],ps=[];
  for(var i=0;i<160;i++)ps.push({x:Math.random()*c.width,y:-20-Math.random()*c.height*.5,vx:(Math.random()-.5)*4,vy:2+Math.random()*4,r:Math.random()*6.28,s:5+Math.random()*7,c:cols[i%cols.length]});
  var t0=performance.now();(function f(tt){x.clearRect(0,0,c.width,c.height);ps.forEach(function(p){p.x+=p.vx;p.y+=p.vy;p.vy+=.06;p.r+=.1;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore();});if(tt-t0<3200)requestAnimationFrame(f);else c.remove();})(t0);}catch(e){}}
function bpLevel(s){var a=num(s.pre.sys),b=num(s.pre.dia);if(!a||!b)return 0;if(a>=180||b>=110)return 3;if(a>=160||b>=100)return 2;if(a>=140||b>=90)return 1;return 0;}

/* ---------- rest timer ---------- */
var restEnd=0,restLen=0,restT=null;
function startRest(sec){restLen=sec*1000;restEnd=Date.now()+restLen;$("#rest").hidden=false;$("#tabs").hidden=true;tickRest();clearInterval(restT);restT=setInterval(tickRest,250);}
function stopRest(){clearInterval(restT);restT=null;$("#rest").hidden=true;syncTabs();}
function tickRest(){var left=restEnd-Date.now();if(left<=0){stopRest();beep();buzz();return;}$("#resttime").textContent=clock(left+999);$("#restbar").style.width=(100*left/restLen)+"%";}
$("#rest-skip").onclick=stopRest;$("#rest-plus").onclick=function(){restEnd+=15000;restLen+=15000;};
var AC=null;
function beep(){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();[0,.25,.5].forEach(function(d){var o=AC.createOscillator(),g=AC.createGain();o.frequency.value=880;g.gain.value=.18;o.connect(g);g.connect(AC.destination);o.start(AC.currentTime+d);o.stop(AC.currentTime+d+.15);});}catch(e){}}
function buzz(){try{navigator.vibrate&&navigator.vibrate([250,120,250]);}catch(e){}}
/* item countdown (warm-up / stretch) */
var itemT=null,itemEnd=0,itemKey=null;
function startItemTimer(key,sec){clearInterval(itemT);itemKey=key;itemEnd=Date.now()+sec*1000;itemT=setInterval(function(){var el=document.getElementById("tm-"+key);var left=itemEnd-Date.now();if(left<=0){clearInterval(itemT);itemT=null;itemKey=null;beep();buzz();var s=active();if(s){var g=key.split(":");(g[0]==="w"?s.warm:s.cool)[g[1]]=true;save();render();}return;}if(el)el.textContent="⏱ "+clock(left+999);},250);render();}

/* ---------- wake lock ---------- */
var wake=null;
function wakeOn(){try{navigator.wakeLock&&navigator.wakeLock.request("screen").then(function(w){wake=w;}).catch(function(){});}catch(e){}}
function wakeOff(){try{wake&&wake.release();}catch(e){}wake=null;}
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible"&&active()&&S.view==="workout")wakeOn();});

/* ---------- views ---------- */
function syncTabs(){var inW=S.view==="workout";$("#tabs").hidden=inW||!$("#rest").hidden;
  document.querySelectorAll("nav.tabs button").forEach(function(b){var t=b.dataset.tab;b.classList.toggle("on",S.view===t||(t==="history"&&S.view==="report"));});}

function ring(p,color){var r=26,c=2*Math.PI*r,o=c*(1-Math.min(1,p));return '<svg class="ring" viewBox="0 0 64 64"><circle class="bgc" cx="32" cy="32" r="'+r+'"/><circle class="fgc" cx="32" cy="32" r="'+r+'" stroke="'+color+'" stroke-dasharray="'+c+'" stroke-dashoffset="'+o+'"/></svg>';}

function vHome(){
  var a=active(),d=done(),t=Date.now(),wk=week(t),nx=nextDay(),D=DAYS[nx],ws=weekStats();
  var h='<div class="top"><div class="brand">AHMED GYM<small>'+esc(fmtDate(t))+'</small></div><span class="wk">الأسبوع <span class="n">'+Math.min(wk,12)+'/12</span></span></div>';
  if(a){
    h+='<div class="hero" style="--hc:'+DAY_COLOR[a.day]+'"><span class="art">'+ART[a.day]+'</span><span class="tag">تمرين شغال</span><div class="ttl">'+esc(DAYS[a.day].t)+'</div><div class="lst">بدأ الساعة '+esc(fmtTime(a.startedAt))+'</div><button class="primary big" data-act="resume">كمّل التمرين ▶</button></div>';
  }else{
    var nEx=D.keys.length,mins=nEx*8+D.cardio+10;
    h+='<div class="hero" style="--hc:'+DAY_COLOR[nx]+'"><span class="art">'+ART[nx]+'</span><span class="tag">تمرين النهارده'+(new Date(t).getDay()===5?' · الجمعة يوم راحة، بس لو حابب':'')+'</span><div class="ttl">'+esc(D.t)+'</div><div class="ar">'+esc(D.ar)+' · '+esc(D.d)+'</div>'+
      '<div class="meta"><span><b>'+D.warm.length+'</b>إحماء</span><span><b>'+nEx+'</b>تمارين</span><span><b>'+D.cardio+'</b>د كارديو</span><span><b>'+D.cool.length+'</b>إطالات</span><span><b>~'+mins+'</b>دقيقة</span></div>'+
      '<button class="primary big" data-act="start" data-day="'+nx+'">ابدأ '+esc(D.t)+' ▶</button></div>';
    h+='<div class="daybtns">'+DAY_ORDER.map(function(x){return '<button data-act="start" data-day="'+x+'" class="'+(x===nx?"on":"")+'" style="border-color:'+DAY_COLOR[x]+'"><b style="color:'+DAY_COLOR[x]+'">'+esc(DAYS[x].t)+'</b>'+esc(DAYS[x].ar)+'</button>';}).join("")+'</div>';
  }
  h+='<div class="stats">'+
    '<div class="stat">'+ring(ws.str/4,"var(--lime)")+'<span class="v"><span class="n">'+ws.str+'/4</span></span><span class="l">حصص حديد</span></div>'+
    '<div class="stat">'+ring(ws.core/2,"var(--D)")+'<span class="v"><span class="n">'+ws.core+'/2</span></span><span class="l">حصص كور</span></div>'+
    '<div class="stat">'+ring(ws.cardio/150,"var(--C)")+'<span class="v"><span class="n">'+r0(ws.cardio)+'</span></span><span class="l">دقيقة كارديو / 150</span></div></div>';
  var ws0=weekStart(t),names=["سبت","أحد","إتنين","تلات","أربع","خميس","جمعة"];
  h+='<div class="card"><div class="row between"><h3>أسبوعك</h3><span class="small muted">اضغط على يوم تشوف تقريره</span></div><div class="weekdots">'+names.map(function(nm,i){var a0=ws0+i*864e5,a1=a0+864e5;var xs=d.filter(function(x){return x.startedAt>=a0&&x.startedAt<a1;});var x=xs[0];var today=t>=a0&&t<a1;
    return '<div class="'+(today?"today":"")+'"'+(x?' data-act="report" data-id="'+x.id+'"':'')+'><i style="'+(x?'background:'+DAY_COLOR[x.day]+';border-color:transparent':'')+'">'+(x?esc(DAYS[x.day].t[0]):"")+'</i>'+nm+'</div>';}).join("")+'</div></div>';
  var stk=streak();if(stk>0)h+='<div class="streak"><b>'+stk+'</b><div><div style="font-weight:900">🔥 أسابيع ورا بعض</div><div class="small muted">كل أسبوع فيه 3 تمارين أو أكتر بيزوّد السلسلة</div></div></div>';
  var lb=S.profile.bp[S.profile.bp.length-1];
  if(lb){var ok=lb.s<135&&lb.d<85;h+='<div class="alert '+(ok?"green":"yellow")+'">آخر ضغط: <span class="n">'+lb.s+'/'+lb.d+'</span> · '+esc(fmtDate(lb.t,{day:"numeric",month:"short"}))+(ok?" · في الطبيعي":" · أعلى من 135/85")+'</div>';}
  if(d.length){var L=d[0],m=metrics(L);h+='<div class="card"><h3>آخر تمرين</h3><button class="hi" data-act="report" data-id="'+L.id+'">'+chip(L.day)+'<span><span class="d">'+esc(fmtDate(L.startedAt))+'</span><br><span class="muted small"><span class="n">'+r0(m.dur)+'</span> دقيقة · <span class="n">'+r0(m.kcal)+'</span> سعر · <span class="n">'+r0(m.vol)+'</span> كجم</span></span><span class="muted">‹</span></button></div>';}
  else h+='<div class="card empty">لسه مفيش تمارين. اضغط "ابدأ" وكل حاجة هتتسجل هنا.</div>';
  h+='<div class="card"><h3>قواعد ثابتة</h3><p class="small muted">قيس الضغط قبل التمرين: لو 160/100 أو أعلى، كارديو خفيف بس. لو 180/110 أو أعلى، مفيش تمرين. طلّع النفس وإنت بتعمل المجهود، ومتكتمش نفسك. أي وجع نازل في رجلك أو دراعك: وقّف التمرين.</p></div>';
  return h;
}

function wcCard(kind,key,s){
  var it=(kind==="w"?W:C)[key],ok=s&&(kind==="w"?s.warm:s.cool)[key],id=kind+":"+key,src=it.gal&&it.gal[0]?it.gal[0].src:"";
  var sec=it.sec||(/(\d+)\s*[×x]\s*(\d+)[–-]?(\d+)?\s*ثانية/.test(it.dose)?0:(/(\d+)[–-]?(\d+)?\s*ثانية/.exec(it.dose)||[])[2]||(/(\d+)\s*ثانية/.exec(it.dose)||[])[1]||0);
  var tm=s&&sec?'<button class="tmr" data-act="itimer" data-k="'+id+'" data-sec="'+sec+'" id="tm-'+id+'">'+(itemKey===id?"⏱ …":"⏱ "+clock(sec*1000))+'</button>':"";
  return '<div class="wc'+(ok?" done":"")+'">'+(src?'<img class="th" src="'+src+'" alt="" data-act="view" data-src="'+src+'" data-cap="'+esc(it.n)+'">':'<span class="ph0">'+(kind==="w"?"🔥":"🧘")+'</span>')+
    '<div><div class="nm">'+esc(it.n)+'</div><div class="ds">'+rng(it.dose)+'</div>'+tm+'</div>'+
    (s?'<button class="ck" data-act="wc" data-k="'+id+'" aria-label="خلصت">'+(ok?"✓":"")+'</button>':'<span></span>')+
    '<div class="hw">'+esc(it.how)+'</div></div>';
}

function vWorkout(){
  var s=active();if(!s){S.view="home";return vHome();}
  var D=DAYS[s.day],m=metrics(s),lv=bpLevel(s);
  var tot=D.warm.length+m.exa+1+D.cool.length,dn=m.wd+m.exd+(cardioMin(s)>=D.cardio?1:0)+m.cd;
  var pc=dn/tot,rc=2*Math.PI*25;
  var h='<div class="wtop"><div class="row between" style="flex-wrap:nowrap"><div class="wring"><svg viewBox="0 0 62 62"><circle cx="31" cy="31" r="25" fill="none" stroke="var(--card2)" stroke-width="6"/><circle cx="31" cy="31" r="25" fill="none" stroke="var(--lime)" stroke-width="6" stroke-linecap="round" stroke-dasharray="'+rc+'" stroke-dashoffset="'+rc*(1-pc)+'" transform="rotate(-90 31 31)" style="transition:stroke-dashoffset .5s"/></svg><span>'+r0(pc*100)+'%</span></div><div style="flex:1">'+chip(s.day)+' <span class="muted small">بدأ '+esc(fmtTime(s.startedAt))+'</span><div class="small muted">خلصت <span class="n">'+dn+'</span> من <span class="n">'+tot+'</span> خطوة</div></div><div class="clock" id="clock">'+clock(Date.now()-s.startedAt)+'</div></div></div>';
  // 0: pre check
  h+='<div class="card"><div class="sec"><span class="num">0</span><div><h2>قبل ما تبدأ</h2><span class="muted">اقعد 5 دقايق وقيس الضغط</span></div></div>'+
    '<div class="grid3"><label class="f">الضغط العالي<input inputmode="numeric" data-f="pre.sys" value="'+esc(s.pre.sys)+'" placeholder="130"></label><label class="f">الواطي<input inputmode="numeric" data-f="pre.dia" value="'+esc(s.pre.dia)+'" placeholder="85"></label><label class="f">النبض<input inputmode="numeric" data-f="pre.pulse" value="'+esc(s.pre.pulse)+'" placeholder="75"></label></div>'+
    '<div class="grid2"><label class="f">وجع الضهر (0–10)<input inputmode="numeric" data-f="pre.back" value="'+esc(s.pre.back)+'" placeholder="0"></label><label class="f">وجع الرقبة (0–10)<input inputmode="numeric" data-f="pre.neck" value="'+esc(s.pre.neck)+'" placeholder="0"></label></div>'+
    (lv===3?'<div class="alert red">الضغط 180/110 أو أعلى: مفيش تمرين النهارده. استريح وقيس تاني، ولو فضل عالي كلّم الدكتور.</div>':lv===2?'<div class="alert yellow">الضغط 160/100 أو أعلى: كارديو خفيف بس النهارده من غير حديد.</div>':lv===1?'<div class="alert yellow">الضغط أعلى من الطبيعي سنة: خفّف الأوزان وطوّل الإحماء.</div>':'')+
    (num(s.pre.back)>=5||num(s.pre.neck)>=5?'<div class="alert yellow">الوجع 5 أو أكتر: شيل نص الوزن، وأي تمرين بيوجع اتخطاه.</div>':'')+'</div>';
  // 1: warm-up
  h+='<div class="sec"><span class="num">1</span><div><h2>الإحماء 🔥</h2><span class="muted">'+D.warm.length+' خطوات · حوالي 8–10 دقايق</span></div></div>'+
    '<div class="why">ليه؟ الإحماء بيرفع حرارة العضل والنبض والضغط بالتدريج، وبيقلل خطر الشد والإصابة، وده مهم أكتر مع الضهر والضغط.</div>'+
    D.warm.map(function(k){return wcCard("w",k,s);}).join("");
  // 2: exercises
  h+='<div class="sec"><span class="num">2</span><div><h2>التمارين 🏋️</h2><span class="muted">'+m.exd+' من '+m.exa+'</span></div></div>';
  s.items.forEach(function(it,i){h+=vEx(s,it,i);});
  // 3: cardio
  var c=s.cardio,cm=cardioMin(s);
  h+='<div class="sec"><span class="num">3</span><div><h2>الكارديو ❤️</h2><span class="muted">الهدف '+D.cardio+' دقيقة · نبض 110–130</span></div></div><div class="card">'+
    '<select data-f="cardio.m">'+CARDIO.map(function(x){return '<option value="'+x.k+'"'+(x.k===c.m?" selected":"")+'>'+esc(x.n)+'</option>';}).join("")+'</select>'+
    '<div class="row between"><span class="clock" id="cclock" style="font-size:32px">'+clock(cm*60000)+'</span>'+(c.since?'<button data-act="cstop">⏸ وقّف</button>':'<button class="primary" data-act="cstart">▶ ابدأ عدّاد الكارديو</button>')+'</div>'+
    '<div class="bar"><i style="width:'+Math.min(100,100*cm/D.cardio)+'%"></i></div>'+
    '<label class="f">أو اكتب الدقايق<input inputmode="decimal" data-f="cardio.min" value="'+(c.since?"":esc(c.min||""))+'" placeholder="'+D.cardio+'"></label></div>';
  // 4: cool-down
  h+='<div class="sec"><span class="num">4</span><div><h2>الإطالات 🧘</h2><span class="muted">'+D.cool.length+' خطوات · حوالي 5–7 دقايق</span></div></div>'+
    '<div class="why">ليه؟ إطالة ثابتة خفيفة في الآخر بتهدّي النبض والضغط، وبتفك الفخد الخلفي ومقدمة الورك، وشدّهم بيزوّد ضغط أسفل الضهر. اثبت من غير هزّ، ولحد شد خفيف مش وجع.</div>'+
    D.cool.map(function(k){return wcCard("c",k,s);}).join("");
  // 5: after
  h+='<div class="card"><div class="sec"><span class="num">5</span><div><h2>بعد التمرين</h2></div></div>'+
    '<div class="grid2"><label class="f">وجع الضهر دلوقتي<input inputmode="numeric" data-f="post.back" value="'+esc(s.post.back)+'" placeholder="0"></label><label class="f">وجع الرقبة دلوقتي<input inputmode="numeric" data-f="post.neck" value="'+esc(s.post.neck)+'" placeholder="0"></label></div>'+
    '<div class="feel">'+FEEL.map(function(f,i){return '<button data-act="feel" data-i="'+i+'" class="'+(s.post.feel===i?"on":"")+'"><span>'+f[0]+'</span>'+f[1]+'</button>';}).join("")+'</div>'+
    '<textarea data-f="post.note" placeholder="ملاحظة: ماكينة مشغولة، وجع، أي حاجة">'+esc(s.post.note)+'</textarea>'+
    '<button class="primary big" data-act="finish">✓ خلّصت، طلّع التقرير</button>'+
    (S.confirm==="cancel"?'<div class="alert red">متأكد إنك عايز تلغي التمرين ده؟ <div class="row" style="margin-top:8px"><button class="danger" data-act="cancel-yes">أيوه، الغيه</button><button data-act="cancel-no">لأ</button></div></div>':'<button class="ghost" data-act="cancel">إلغاء التمرين</button>')+'</div>';
  return h;
}

function vEx(s,it,i){
  var e=EX[it.k],open=S.open===it.k,cnt=it.sets.filter(function(x){return x.done;}).length,dn=cnt===it.sets.length&&cnt>0;
  var h='<div class="ex'+(dn?" done":"")+(it.skipped?" skip":"")+'" id="ex-'+it.k+'"><button class="exh" data-act="toggle" data-k="'+it.k+'" aria-expanded="'+open+'">'+img(thumb(e))+
    '<span><span class="nm">'+(i+1)+'. '+esc(e.n)+'</span><br><span class="tg"><b><span class="n">'+it.sets.length+'</span> × '+rng(repsOf(e,s.week))+'</b> · راحة <span class="n">'+e.rest+'</span>ث · '+esc(e.mus)+'</span></span>'+
    '<span class="state">'+(dn?"✓":it.skipped?"–":'<span class="n">'+cnt+'/'+it.sets.length+'</span>')+'</span></button>';
  if(open){
    var last=lastSets(it.k,s.startedAt),noW=e.kind!=="w"||(e.kind==="w"&&it.alt&&/وزن جسمك/.test(e.alt[0]||""));
    h+='<div class="exb">';
    if(e.gal.length)h+='<div class="gal">'+e.gal.map(function(g){return '<figure><img src="'+g.src+'" alt="" loading="lazy" data-act="view" data-src="'+g.src+'" data-cap="'+esc(g.cap)+'"><figcaption>'+esc(g.cap)+(g.cr?'<small>'+esc(g.cr)+'</small>':'')+'</figcaption></figure>';}).join("")+'</div>';
    if(e.gym)h+='<div class="gym"><b>في أوميغا:</b> '+esc(e.gym)+'</div>';
    h+='<div class="how"><b>إزاي تعمله</b><ol>'+e.steps.map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+'</ol></div>';
    if(e.alt.length)h+='<div class="alts"><b style="color:var(--blue)">لو الجهاز مشغول:</b> '+e.alt.map(esc).join(" · ")+'</div><label class="altchk"><input type="checkbox" data-act="alt" data-k="'+it.k+'"'+(it.alt?" checked":"")+'> عملت بديل</label>';
    if(last)h+='<div class="last">آخر مرة ('+esc(fmtDate(last.t,{day:"numeric",month:"short"}))+'): '+last.sets.map(function(x){return (num(x.w)?'<span class="n">'+esc(x.w)+'</span>×':'')+'<span class="n">'+esc(x.r)+'</span>';}).join(" · ")+'</div>';
    h+='<div class="sets"><div class="hdr"><span>#</span><span>'+(noW?"":"كجم")+'</span><span>'+(e.kind==="time"?"ثواني":"عدّات")+'</span><span></span></div>';
    it.sets.forEach(function(st,j){h+='<div class="set'+(st.done?" ok":"")+'"><span class="i">'+(j+1)+'</span>'+
      (noW?'<span></span>':'<input inputmode="decimal" data-f="w" data-k="'+it.k+'" data-i="'+j+'" value="'+esc(st.w)+'" placeholder="0">')+
      '<input inputmode="numeric" data-f="r" data-k="'+it.k+'" data-i="'+j+'" value="'+esc(st.r)+'" placeholder="'+esc(String(repsOf(e,s.week)).match(/\d+/)||"")+'">'+
      '<button class="tick" data-act="tick" data-k="'+it.k+'" data-i="'+j+'">✓</button></div>';});
    h+='</div><div class="row"><button class="ghost" data-act="addset" data-k="'+it.k+'">+ مجموعة</button><button class="ghost" data-act="skip" data-k="'+it.k+'">'+(it.skipped?"رجّعه":"تخطّي")+'</button></div></div>';
  }
  return h+'</div>';
}

function vReport(){
  var s=byId(S.reportId);if(!s){S.view="history";return vHistory();}
  var m=metrics(s),D=DAYS[s.day];
  var prs=(s.items||[]).filter(function(it){var b=m.best[it.k]||0,pb=bestBefore(it.k,s.startedAt);return b&&!it.alt&&b>pb&&pb>0;}).length;
  var h='<div class="row between"><button class="ghost" data-tab="history">‹ السجل</button>'+chip(s.day)+'</div>'+(S.fresh===s.id?'<div class="trophy">🏆</div><h2 style="text-align:center">عاش يا بطل! '+(prs?prs+' رقم جديد النهارده':'تمرين كامل اتسجل')+'</h2>':'')+'<h1>تقرير '+esc(fmtDate(s.startedAt))+'</h1><p class="muted small">من '+esc(fmtTime(s.startedAt))+' لـ '+esc(fmtTime(s.endedAt))+' · الأسبوع <span class="n">'+s.week+'</span></p>';
  h+='<div class="tiles"><div class="tile"><span class="l">المدة</span><span class="v">'+r0(m.dur)+' <small>دقيقة</small></span></div><div class="tile"><span class="l">السعرات (تقريبي)</span><span class="v">'+r0(m.kcal)+' <small>سعر</small></span></div>'+
    '<div class="tile"><span class="l">الحجم الكلي</span><span class="v">'+r0(m.vol)+' <small>كجم</small></span></div><div class="tile"><span class="l">المجموعات</span><span class="v"><span class="n">'+m.sd+'/'+m.sa+'</span></span></div>'+
    '<div class="tile"><span class="l">الإحماء</span><span class="v"><span class="n">'+m.wd+'/'+D.warm.length+'</span></span></div><div class="tile"><span class="l">الإطالات</span><span class="v"><span class="n">'+m.cd+'/'+D.cool.length+'</span></span></div></div>';
  if(num(s.pre.sys))h+='<div class="card"><h3>الضغط قبل التمرين</h3><p><span class="n" style="font-size:26px">'+esc(s.pre.sys)+'/'+esc(s.pre.dia)+'</span> '+(num(s.pre.pulse)?'· نبض <span class="n">'+esc(s.pre.pulse)+'</span>':'')+'</p></div>';
  h+='<div class="card"><h3>التمارين</h3><table><tr><th>التمرين</th><th>المجموعات</th><th></th></tr>'+(s.items||[]).map(function(it){var e=EX[it.k];var ds=it.sets.filter(function(x){return x.done;});var b=m.best[it.k]||0;var pb=bestBefore(it.k,s.startedAt);
    var tag=it.skipped?'<span class="muted">اتخطّى</span>':(b&&!it.alt&&e.kind==="w"&&b>pb&&pb>0)?'<span class="pr">🏆 رقم جديد</span>':(b&&pb===0&&!it.alt)?'<span class="muted">أول مرة</span>':'';
    return '<tr><td>'+esc(e.n)+(it.alt?' <span class="muted small">(بديل)</span>':'')+'</td><td>'+(ds.length?ds.map(function(x){return (num(x.w)?'<span class="n">'+esc(x.w)+'</span>×':'')+'<span class="n">'+esc(x.r)+'</span>';}).join(" · "):'—')+'</td><td>'+tag+'</td></tr>';}).join("")+'</table></div>';
  if(s.post.feel!=null||s.post.note||s.post.back)h+='<div class="card"><h3>بعد التمرين</h3><p>'+(s.post.feel!=null?FEEL[s.post.feel][0]+' '+FEEL[s.post.feel][1]+' · ':'')+'وجع الضهر <span class="n">'+esc(s.post.back||0)+'</span> · الرقبة <span class="n">'+esc(s.post.neck||0)+'</span></p>'+(s.post.note?'<p class="muted">'+esc(s.post.note)+'</p>':'')+'</div>';
  h+=(S.confirm==="del"?'<div class="alert red">تمسح التمرين ده نهائي؟<div class="row" style="margin-top:8px"><button class="danger" data-act="del-yes">امسح</button><button data-act="cancel-no">لأ</button></div></div>':'<button class="ghost danger" data-act="del">مسح التمرين ده</button>');
  return h;
}

function vHistory(){
  var d=done(),h='<h1>السجل</h1>';
  if(!d.length)return h+'<div class="card empty">لسه مفيش تمارين متسجلة.</div>';
  var tot=d.reduce(function(a,x){var m=metrics(x);a.k+=m.kcal;a.v+=m.vol;a.m+=m.dur;return a;},{k:0,v:0,m:0});
  h+='<div class="tiles"><div class="tile"><span class="l">عدد التمارين</span><span class="v">'+d.length+'</span></div><div class="tile"><span class="l">ساعات تمرين</span><span class="v">'+r1(tot.m/60)+'</span></div></div>';
  return h+'<div style="display:grid;gap:8px">'+d.map(function(x){var m=metrics(x);return '<button class="hi" data-act="report" data-id="'+x.id+'">'+chip(x.day)+'<span><span class="d">'+esc(fmtDate(x.startedAt))+'</span><br><span class="muted small"><span class="n">'+r0(m.dur)+'</span> د · <span class="n">'+r0(m.kcal)+'</span> سعر · <span class="n">'+m.sd+'</span> مجموعة</span></span><span class="muted">‹</span></button>';}).join("")+'</div>';
}

function vLib(){
  var d=S.lib,D=DAYS[d];
  var h='<h1>التمارين</h1><div class="libday">'+DAY_ORDER.map(function(x){return '<button data-act="lib" data-d="'+x+'" class="'+(x===d?"on":"")+'">'+esc(DAYS[x].t)+' · '+esc(DAYS[x].ar)+'</button>';}).join("")+'</div>';
  h+='<div class="sec"><span class="num">1</span><h2>الإحماء</h2></div>'+D.warm.map(function(k){return wcCard("w",k,null);}).join("");
  h+='<div class="sec"><span class="num">2</span><h2>التمارين</h2></div>';
  D.keys.forEach(function(k,i){var e=EX[k];h+='<div class="card"><div class="row" style="gap:12px;flex-wrap:nowrap">'+img(thumb(e),"th")+'<div><h3>'+(i+1)+'. '+esc(e.n)+'</h3><span class="small muted">'+esc(e.en)+' · '+esc(e.mus)+' · <b style="color:var(--lime)">'+rng(repsOf(e,week(Date.now())))+'</b></span></div></div>'+
    (e.gal.length>1?'<div class="gal">'+e.gal.map(function(g){return '<figure><img src="'+g.src+'" alt="" loading="lazy" data-act="view" data-src="'+g.src+'" data-cap="'+esc(g.cap)+'"><figcaption>'+esc(g.cap)+(g.cr?'<small>'+esc(g.cr)+'</small>':'')+'</figcaption></figure>';}).join("")+'</div>':'')+
    (e.gym?'<div class="gym"><b>في أوميغا:</b> '+esc(e.gym)+'</div>':'')+'<div class="how"><ol>'+e.steps.map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+'</ol></div>'+(e.alt.length?'<div class="alts"><b style="color:var(--blue)">البدائل:</b> '+e.alt.map(esc).join(" · ")+'</div>':'')+'</div>';});
  h+='<div class="sec"><span class="num">3</span><h2>الإطالات</h2></div>'+D.cool.map(function(k){return wcCard("c",k,null);}).join("");
  return h;
}

function spark(pts,color,lo,hi){if(pts.length<2)return "";var w=320,h=90,mn=lo!=null?lo:Math.min.apply(null,pts),mx=hi!=null?hi:Math.max.apply(null,pts);if(mx===mn)mx=mn+1;
  var p=pts.map(function(v,i){return (i*(w-10)/(pts.length-1)+5).toFixed(1)+","+(h-5-(v-mn)/(mx-mn)*(h-10)).toFixed(1);}).join(" ");
  return '<div class="chart"><svg viewBox="0 0 '+w+' '+h+'"><polyline points="'+p+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg></div>';}

function vBody(){
  var P=S.profile,wl=P.wlog.slice(-20),bp=P.bp.slice(-20);
  var h='<h1>صحتي</h1>';
  h+='<div class="card"><h3>الوزن</h3><div class="row" style="flex-wrap:nowrap"><input id="wIn" inputmode="decimal" placeholder="'+esc(P.weight)+' كجم"><button class="primary" data-act="addw">سجّل</button></div>'+
    (wl.length?spark(wl.map(function(x){return x.kg;}),"var(--lime)")+'<p class="small muted">آخر وزن: <span class="n">'+wl[wl.length-1].kg+'</span> كجم</p>':'<p class="small muted">سجّل وزنك مرة في الأسبوع الصبح على الريق.</p>')+'</div>';
  h+='<div class="card"><h3>الضغط</h3><div class="grid3"><input id="bS" inputmode="numeric" placeholder="العالي"><input id="bD" inputmode="numeric" placeholder="الواطي"><input id="bP" inputmode="numeric" placeholder="النبض"></div><button class="primary" data-act="addbp">سجّل القراية</button>'+
    (bp.length?spark(bp.map(function(x){return x.s;}),"var(--orange)",100,190)+'<table><tr><th>التاريخ</th><th>الضغط</th><th>النبض</th></tr>'+bp.slice().reverse().slice(0,10).map(function(x){return '<tr><td>'+esc(fmtDate(x.t,{day:"numeric",month:"short"}))+'</td><td><span class="n">'+x.s+'/'+x.d+'</span></td><td><span class="n">'+(x.p||"")+'</span></td></tr>';}).join("")+'</table>':'')+'</div>';
  h+='<div class="card"><h3>نسخة احتياطية</h3><p class="small muted">كل التسجيلات محفوظة على الموبايل ده بس. اعمل نسخة كل فترة وابعتها لنفسك، أو ابعتها لـ Claude عشان يراجع تقدمك.</p><div class="row"><button data-act="export">⬇ تصدير</button><button data-act="import">⬆ استيراد</button></div><input type="file" id="impF" accept="application/json,.json" hidden></div>';
  return h;
}

/* ---------- render ---------- */
var clockT=null;
function render(){
  var v=S.view,h=v==="workout"?vWorkout():v==="report"?vReport():v==="history"?vHistory():v==="lib"?vLib():v==="body"?vBody():vHome();
  var app=$("#app");var anim=window.__lastView!==v;window.__lastView=v;app.innerHTML=h;app.classList.toggle("anim",anim);syncTabs();if(v!=="report")S.fresh=null;
  clearInterval(clockT);if(S.view==="workout"){clockT=setInterval(function(){var s=active();if(!s)return;var c=$("#clock");if(c)c.textContent=clock(Date.now()-s.startedAt);var cc=$("#cclock");if(cc&&s.cardio.since)cc.textContent=clock(cardioMin(s)*60000);},1000);}
}

/* ---------- events ---------- */
document.addEventListener("click",function(ev){
  var b=ev.target.closest("[data-act],[data-tab]");if(!b)return;
  if(b.dataset.tab){S.view=b.dataset.tab;S.confirm=null;render();window.scrollTo(0,0);return;}
  var a=b.dataset.act,s=active();
  if(a==="start"){if(s){S.view="workout";render();return;}newSession(b.dataset.day);return;}
  if(a==="resume"){S.view="workout";wakeOn();render();return;}
  if(a==="report"){S.reportId=b.dataset.id;S.view="report";S.confirm=null;render();window.scrollTo(0,0);return;}
  if(a==="lib"){S.lib=b.dataset.d;render();return;}
  if(a==="view"){$("#viewer-img").src=b.dataset.src;$("#viewer-cap").textContent=b.dataset.cap||"";$("#viewer").hidden=false;return;}
  if(a==="addw"){var v=num($("#wIn").value);if(v>30&&v<300){S.profile.weight=v;S.profile.wlog.push({t:Date.now(),kg:v});save();render();}return;}
  if(a==="addbp"){var x=num($("#bS").value),y=num($("#bD").value);if(x>60&&y>30){S.profile.bp.push({t:Date.now(),s:x,d:y,p:num($("#bP").value)});save();render();}return;}
  if(a==="export"){exportData();return;}
  if(a==="import"){$("#impF").click();return;}
  if(a==="del"){S.confirm="del";render();return;}
  if(a==="del-yes"){S.sessions=S.sessions.filter(function(x){return x.id!==S.reportId;});save();S.view="history";S.confirm=null;render();return;}
  if(a==="cancel-no"){S.confirm=null;render();return;}
  if(!s)return;
  if(a==="toggle"){S.open=S.open===b.dataset.k?null:b.dataset.k;render();var el=document.getElementById("ex-"+b.dataset.k);if(el&&S.open)el.scrollIntoView({block:"start",behavior:"smooth"});return;}
  if(a==="wc"){var g=b.dataset.k.split(":"),o=g[0]==="w"?s.warm:s.cool;o[g[1]]=!o[g[1]];save();render();return;}
  if(a==="itimer"){startItemTimer(b.dataset.k,+b.dataset.sec);return;}
  var it=b.dataset.k&&s.items.find(function(x){return x.k===b.dataset.k;});
  if(a==="tick"&&it){var st=it.sets[+b.dataset.i];st.done=!st.done;if(st.done){if(!st.r){var ph=String(repsOf(EX[it.k],s.week)).match(/\d+/);st.r=ph?ph[0]:"";}
      if(+b.dataset.i<it.sets.length-1||it.sets.some(function(x){return !x.done;}))startRest(EX[it.k].rest);
      else{var nx=s.items.find(function(x){return !x.skipped&&x.sets.some(function(y){return !y.done;});});S.open=nx?nx.k:null;startRest(EX[it.k].rest);toast("✓ "+EX[it.k].n+" خلص");}
      buzz();}
    save();render();if(S.open){var el2=document.getElementById("ex-"+S.open);if(el2&&S.open!==it.k)el2.scrollIntoView({block:"start",behavior:"smooth"});}return;}
  if(a==="addset"&&it){var l=it.sets[it.sets.length-1]||{w:""};it.sets.push({w:l.w,r:"",done:false});save();render();return;}
  if(a==="skip"&&it){it.skipped=!it.skipped;save();render();return;}
  if(a==="cstart"){s.cardio.since=Date.now();save();render();return;}
  if(a==="cstop"){s.cardio.min=r1(cardioMin(s));s.cardio.since=null;save();render();return;}
  if(a==="feel"){s.post.feel=+b.dataset.i;save();render();return;}
  if(a==="finish"){finish(s);return;}
  if(a==="cancel"){S.confirm="cancel";render();return;}
  if(a==="cancel-yes"){S.sessions=S.sessions.filter(function(x){return x.id!==s.id;});save();stopRest();wakeOff();S.view="home";S.confirm=null;render();return;}
});
document.addEventListener("change",function(ev){var t=ev.target;
  if(t.dataset.act==="alt"){var s=active();var it=s&&s.items.find(function(x){return x.k===t.dataset.k;});if(it){it.alt=t.checked;save();}return;}
  if(t.id==="impF"&&t.files[0]){var fr=new FileReader();fr.onload=function(){try{var o=JSON.parse(fr.result);if(!Array.isArray(o.sessions))throw 0;var ids={};S.sessions.forEach(function(x){ids[x.id]=1;});o.sessions.forEach(function(x){if(!ids[x.id])S.sessions.push(x);});
    if(o.profile){S.profile.wlog=S.profile.wlog.concat(o.profile.wlog||[]);S.profile.bp=S.profile.bp.concat(o.profile.bp||[]);if(o.profile.weight)S.profile.weight=o.profile.weight;}save();render();alert("تم الاستيراد");}catch(e){alert("الملف ده مش نسخة من التطبيق");}};fr.readAsText(t.files[0]);}
  if(t.dataset.f&&t.tagName==="SELECT"){var s2=active();if(s2){s2.cardio.m=t.value;save();}}
});
document.addEventListener("input",function(ev){var t=ev.target,f=t.dataset.f;if(!f)return;var s=active();if(!s)return;
  if(f==="w"||f==="r"){var it=s.items.find(function(x){return x.k===t.dataset.k;});if(it)it.sets[+t.dataset.i][f]=t.value;}
  else if(f==="cardio.min"){if(!s.cardio.since)s.cardio.min=t.value;}
  else{var p=f.split(".");s[p[0]][p[1]]=t.value;}
  save();
  if(/^pre\./.test(f)){clearTimeout(window.__pr);window.__pr=setTimeout(function(){var pos=t.selectionStart,key=f;render();var el=document.querySelector('[data-f="'+key+'"]');if(el){el.focus();try{el.setSelectionRange(pos,pos);}catch(e){}}},900);}
});
$("#viewer").addEventListener("click",function(){$("#viewer").hidden=true;});

function exportData(){
  var blob=new Blob([JSON.stringify({app:"ahmed-gym",v:1,exported:new Date().toISOString(),sessions:S.sessions,profile:S.profile},null,1)],{type:"application/json"});
  var name="gym-backup-"+new Date().toISOString().slice(0,10)+".json";
  try{var file=new File([blob],name,{type:"application/json"});if(navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],title:name}).catch(function(){});return;}}catch(e){}
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
}

if(active())S.view="workout";
render();
var sp=document.getElementById("splash");if(sp)setTimeout(function(){sp.classList.add("out");setTimeout(function(){sp.remove();},450);},700);
if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){});});}
})();
