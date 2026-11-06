'use strict';
const $=id=>document.getElementById(id);
let S,tab='play',busy=false,sel=null;

/* ===== 1. СОХРАНЕНИЕ ===== */
function save(){try{localStorage.setItem('fc3',JSON.stringify(S))}catch(e){}}
function load(){
  try{S=JSON.parse(localStorage.getItem('fc3'))}catch(e){S=null}
  if(!S||!S.team)S={coins:300,season:1,team:makeTeam(4),bench:BENCH.map(p=>makePlayer(p,3.5)),wins:0,draws:0,losses:0,goals:0,cs:0,streak:0,best:0,
    cups:{},awards:{},t:null,lg:null,mood:1,tick:0,market:[],news:'Добро пожаловать в Football Champs. Сыграй матч, вступи в турнир или чемпионат.'};
  while(S.market.length<8)S.market.push(listing());
}
function say(t){S.news=t;save();renderAll()}

/* ===== 2. РЕЙТИНГИ (травмированный игрок играет вполсилы) ===== */
const WT={DEF:{def:.5,sta:.2,spd:.15,pas:.15},MID:{pas:.4,sta:.3,spd:.15,def:.15},FWD:{pow:.4,spd:.3,pas:.2,sta:.1}};
const ageF=a=>a<21?.94:a<=30?1:a<=33?.95:.88;
function abil(p){
  const q=p.inj>0?.5:1;
  if(p.pos==='GK')return q*(p.spd*.15+p.dive*.35+p.rea*.35+p.def*.15);
  let s=0;for(const k in WT[p.pos])s+=p[k]*WT[p.pos][k];
  return q*s*ageF(p.age);
}
const avg=(t,pos)=>{const a=t.filter(p=>p.pos===pos);return a.reduce((s,p)=>s+abil(p),0)/a.length};
function rating(t){
  const gk=avg(t,'GK'),d=avg(t,'DEF'),m=avg(t,'MID'),f=avg(t,'FWD');
  return{gk,mid:m,atk:f*.6+m*.4,dfn:d*.6+m*.4,sta:t.reduce((s,p)=>s+(p.sta||p.spd),0)/t.length,ovr:(gk+d*4+m*4+f*2)/11};
}

/* ===== 3. МАТЧ ===== */
function simulate(A,B){
  const T=[A,B],R=[rating(A),rating(B)],ev=[],g=[0,0],scorers=[];
  for(let i=1;i<=30;i++){
    const s=Math.random()<R[0].mid/(R[0].mid+R[1].mid)?0:1,o=1-s,f=k=>i>18?.85+.15*R[k].sta/10:1;
    if(Math.random()>.2)continue;
    const shot=R[s].atk*f(s)*rnd(.7,1.3),save=(R[o].dfn*.4+R[o].gk*.6)*f(o)*rnd(.7,1.3);
    if(shot>save){
      const pool=T[s].filter(p=>p.pos!=='GK'),ws=pool.map(p=>({FWD:3,MID:2,DEF:.5}[p.pos]));
      let r=Math.random()*ws.reduce((a,b)=>a+b),k=0;
      while(k<pool.length-1&&(r-=ws[k])>0)k++;
      g[s]++;if(s===0)scorers.push(pool[k]);
      ev.push({i,min:i*3,side:s,goal:1,text:'Гол! '+pool[k].name+(s?' (соперник)':'')});
    }else if(Math.random()<.6)ev.push({i,min:i*3,side:s,goal:0,text:s?'Соперник бьёт, вратарь спасает':'Удар твоей команды отбит'});
  }
  return{g,ev,scorers,ovr:[R[0].ovr,R[1].ovr]};
}
function record(r,ko){
  const[a,b]=r.g;let win=a>b,loss=a<b,pen='';
  if(ko&&a===b){win=Math.random()<.5+(r.ovr[0]-r.ovr[1])/20;loss=!win;pen=' (по пенальти)'}
  S.goals+=a;r.scorers.forEach(p=>p.goals++);if(b===0)S.cs++;
  if(win){S.wins++;S.streak++;S.best=Math.max(S.best,S.streak)}else{S.streak=0;loss?S.losses++:S.draws++}
  return{win,loss,pen,a,b};
}
function wear(){                              // лечение и новые травмы после матча
  [...S.team,...S.bench].forEach(p=>{if(p.inj>0)p.inj--});
  const h=S.team.filter(p=>Math.random()<.06);h.forEach(p=>p.inj=2);
  if(h.length)S.news+=' Травма: '+h.map(p=>p.name).join(', ')+'. Замени игрока.';
}
function playMatch(opp,label,ko,cb){
  if(busy)return;busy=true;
  const r=simulate(S.team,opp),box=$('match'),log=[],g=[0,0];let i=0;box.hidden=false;
  const draw=(m,x='')=>box.innerHTML='<h3>'+label+'</h3><div class="score">Ты '+g[0]+' : '+g[1]+' Соперник</div><div>'+m+' мин.</div><ul>'+log.map(l=>'<li>'+l+'</li>').join('')+'</ul>'+x;
  draw(0);
  const t=setInterval(()=>{
    i++;r.ev.filter(e=>e.i===i).forEach(e=>{if(e.goal)g[e.side]++;log.unshift(e.min+' мин. '+e.text)});
    if(i<30)return draw(i*3);
    clearInterval(t);busy=false;
    const o=record(r,ko);cb(o);wear();checkAwards();save();
    draw(90,'<p><b>'+(o.win?'Победа':o.loss?'Поражение':'Ничья')+' '+o.a+':'+o.b+o.pen+'</b></p>');renderAll();
  },300);
}

/* ===== 4. ТОВАРИЩЕСКИЕ, ТУРНИРЫ, ЧЕМПИОНАТ ===== */
function friendly(k){
  playMatch(makeTeam([3,5,7][k]),'Товарищеский матч',false,o=>{
    const c=(o.win?[50,90,150][k]:o.loss?10:[20,35,60][k])+o.a*5;S.coins+=c;S.news='Награда за матч: '+c+' монет.';
  });
}
function joinT(id){
  const T=TOURN.find(x=>x.id===id);if(S.t||S.coins<T.fee)return;
  S.coins-=T.fee;S.t={id,round:0};say('Ты вступил в турнир «'+T.name+'».');
}
function playRound(){
  const T=TOURN.find(x=>x.id===S.t.id),rd=S.t.round;
  playMatch(makeTeam(T.lvl+rd*.5),T.name+': '+ROUNDS[rd],true,o=>{
    if(!o.win){S.t=null;S.news='Вылет из турнира «'+T.name+'».';return endSeason()}
    if(rd===ROUNDS.length-1){S.coins+=T.prize;S.cups[T.id]=(S.cups[T.id]||0)+1;S.t=null;S.news='Кубок «'+T.name+'» твой! Приз: '+T.prize+' монет.';endSeason()}
    else{const pr=Math.round(T.prize*.12);S.coins+=pr;S.t.round++;S.news='Раунд выигран. Бонус: '+pr+' монет.'}
  });
}
const tadd=(t,a,b)=>{t.gf+=a;t.ga+=b;if(a>b){t.w++;t.p+=3}else if(a<b)t.l++;else{t.d++;t.p++}};
const rank=L=>L.tbl.map((t,i)=>({i,t})).sort((x,y)=>y.t.p-x.t.p||(y.t.gf-y.t.ga)-(x.t.gf-x.t.ga)||y.t.gf-x.t.gf);
function startLeague(){
  if(S.lg||S.coins<LEAGUE.fee)return;
  const b=4+(S.season-1)*.3,a=[0,1,2,3,4,5],rounds=[];
  for(let r=0;r<5;r++){rounds.push([[a[0],a[5]],[a[1],a[4]],[a[2],a[3]]]);a.splice(1,0,a.pop())}   // каждый играет с каждым
  S.coins-=LEAGUE.fee;
  S.lg={day:0,rounds,names:['Твоя команда',...CLUBS],teams:[null,...CLUBS.map(()=>makeTeam(b+rnd(-1,1.5)))],tbl:Array.from({length:6},()=>({p:0,w:0,d:0,l:0,gf:0,ga:0}))};
  say('Чемпионат начался: 5 туров, 6 команд.');
}
function playDay(){
  const L=S.lg,pairs=L.rounds[L.day],mine=pairs.find(p=>p[0]===0);
  playMatch(L.teams[mine[1]],'Чемпионат: тур '+(L.day+1)+' из 5',false,o=>{
    tadd(L.tbl[0],o.a,o.b);tadd(L.tbl[mine[1]],o.b,o.a);
    pairs.forEach(p=>{if(p!==mine){const r=simulate(L.teams[p[0]],L.teams[p[1]]);tadd(L.tbl[p[0]],r.g[0],r.g[1]);tadd(L.tbl[p[1]],r.g[1],r.g[0])}});
    L.day++;S.coins+=o.win?60:o.loss?10:25;
    if(L.day<5)return;
    const pos=rank(L).findIndex(x=>x.i===0),pr=[1500,700,300,150,100,100][pos];
    S.coins+=pr;if(pos===0)S.cups.league=(S.cups.league||0)+1;
    S.news='Чемпионат завершён: '+(pos+1)+' место, приз '+pr+' монет.';S.lg=null;endSeason();
  });
}
function endSeason(){                         // конец сезона: молодые растут, ветераны слабеют
  S.season++;
  [...S.team,...S.bench].forEach(p=>{
    if(p.age==null)return;p.age++;
    const ks=STATS.field.map(s=>s[0]),k=ks[Math.random()*ks.length|0];
    if(p.age<24&&p[k]<10)p[k]++;else if(p.age>32&&p[k]>1)p[k]--;
  });
}
function checkAwards(){
  AWARDS.forEach(a=>{if(!S.awards[a.id]&&a.ok(S)){S.awards[a.id]=1;S.coins+=a.coins;S.news='Награда «'+a.name+'»: +'+a.coins+' монет.'}});
}

/* ===== 5. СОСТАВ: прокачка и замены ===== */
function up(b,i,k){
  const p=(b?S.bench:S.team)[i],c=(p[k]+1)*25;if(p[k]>=10||S.coins<c)return;
  S.coins-=c;p[k]++;say(p.name+' прокачан.');
}
function pick(i){sel=sel===i?null:i;renderTeam()}
function swap(j){const i=sel,t=S.team[i];S.team[i]=S.bench[j];S.bench[j]=t;sel=null;say(S.team[i].name+' выходит вместо '+t.name+'.')}

/* ===== 6. ТРАНСФЕРНЫЙ РЫНОК: цена = стоимость × спрос × настроение рынка ===== */
const val=p=>{const s=(p.pos==='GK'?STATS.gk:STATS.field).reduce((a,[k])=>a+p[k],0);return Math.round(s*14*(p.age==null?1:p.age<24?1.2:p.age>31?.7:1))};
const price=l=>Math.round(val(l.p)*l.m*S.mood);
const sellPrice=p=>Math.round(val(p)*S.mood*.85);
function listing(){
  const pos=['GK','DEF','DEF','MID','MID','FWD'][Math.random()*6|0],l={p:makePlayer(pos,rnd(3,8.5)),m:rnd(.85,1.15)};
  l.h=[price(l)];return l;
}
const EVENTS=[['Трансферное окно открыто: спрос растёт.',1.1],['Кризис: клубы экономят, цены падают.',.9],['Звёздный турнир: болельщики скупают игроков.',1.07],['Налог на трансферы: рынок остывает.',.94]];
function tickMarket(){
  S.tick++;S.mood+=(1-S.mood)*.08+rnd(-.025,.025);
  if(S.tick%6===0){const e=EVENTS[Math.random()*4|0];S.mood*=e[1];S.news=e[0]}
  S.mood=clamp(S.mood,.7,1.4);
  S.market.forEach(l=>{l.m=clamp(l.m+(1-l.m)*.05+rnd(-.05,.05),.6,1.6);l.h.push(price(l));if(l.h.length>24)l.h.shift()});
  if(S.tick%10===0)S.market[Math.random()*S.market.length|0]=listing();
  save();renderAll();
}
function buy(i){
  const l=S.market[i],pr=price(l);
  if(S.coins<pr)return say('Не хватает монет.');
  if(S.bench.length>=8)return say('Скамейка заполнена: продай кого-нибудь.');
  S.coins-=pr;S.bench.push(l.p);S.market.splice(i,1);S.market.push(listing());
  S.market.forEach(o=>{if(o.p.pos===l.p.pos)o.m*=1.03});
  say('Куплен '+l.p.name+' за '+pr+'. Он на скамейке.');
}
function sell(j){
  const p=S.bench[j],pr=sellPrice(p);S.coins+=pr;S.bench.splice(j,1);
  S.market.forEach(o=>{if(o.p.pos===p.pos)o.m*=.97});
  say('Продан '+p.name+' за '+pr+'.');
}

/* ===== 7. ИНТЕРФЕЙС ===== */
function spark(h){
  const mn=Math.min(...h),mx=Math.max(...h),r=mx-mn||1,n=Math.max(h.length-1,1);
  return'<svg viewBox="0 0 100 28" width="100%" height="28" role="img" aria-label="График цены"><polyline points="'+h.map((v,i)=>(i*100/n).toFixed(1)+','+(26-(v-mn)/r*24).toFixed(1)).join(' ')+'" fill="none" stroke="'+(h[h.length-1]>=h[0]?'#1d8a3a':'#c0392b')+'" stroke-width="2"/></svg>';
}
function renderPlay(){
  const t=S.t,T=t&&TOURN.find(x=>x.id===t.id),L=S.lg;
  $('play').innerHTML=(L
    ?'<div class="card gold"><b>'+LEAGUE.name+': тур '+(L.day+1)+' из 5</b><table><tr><th>#</th><th>Клуб</th><th>И</th><th>О</th><th>РМ</th></tr>'
      +rank(L).map((x,k)=>'<tr'+(x.i?'':' class="me"')+'><td>'+(k+1)+'</td><td>'+L.names[x.i]+'</td><td>'+(x.t.w+x.t.d+x.t.l)+'</td><td>'+x.t.p+'</td><td>'+(x.t.gf-x.t.ga)+'</td></tr>').join('')
      +'</table><button onclick="playDay()">Сыграть тур</button></div>'
    :'<div class="card gold"><b>'+LEAGUE.name+'</b><div>6 команд, 5 туров, взнос '+LEAGUE.fee+'. Приз за 1 место: 1500 и кубок.</div><button '+(S.coins<LEAGUE.fee?'disabled':'')+' onclick="startLeague()">Начать чемпионат</button></div>')
  +(t?'<div class="card gold"><b>'+T.name+'</b><div>Следующий раунд: '+ROUNDS[t.round]+'</div><button onclick="playRound()">Играть</button></div>'
    :TOURN.map(T=>'<div class="card gold"><b>'+T.name+'</b><div>Взнос '+T.fee+', приз '+T.prize+' и кубок. Сила соперников: '+T.lvl+'</div><button '+(S.coins<T.fee?'disabled':'')+' onclick="joinT(\''+T.id+'\')">Вступить</button></div>').join(''))
  +'<div class="card"><b>Товарищеский матч</b><div class="row">'+['Лёгкий','Средний','Сильный'].map((n,k)=>'<button onclick="friendly('+k+')">'+n+'</button>').join('')+'</div></div>';
}
function card(p,b,i){
  const st=p.pos==='GK'?STATS.gk:STATS.field,can=b&&sel!=null&&S.team[sel].pos===p.pos;
  return'<div class="card'+(!b&&sel===i?' sel':'')+'"><b>'+p.name+'</b><small>'+POS[p.pos]+(p.age==null?'':', '+p.age+' лет')+', голы: '+p.goals+(p.inj>0?', травма: ещё '+p.inj+' матч.':'')+'</small><div class="row">'
    +st.map(([k,n])=>'<button '+(p[k]>=10||S.coins<(p[k]+1)*25?'disabled':'')+' onclick="up('+(b?1:0)+','+i+',\''+k+'\')">'+n+' '+p[k]+(p[k]<10?' (+'+(p[k]+1)*25+')':'')+'</button>').join('')+'</div><div class="row">'
    +(b?(can?'<button onclick="swap('+i+')">Выпустить на поле</button>':'')+'<button onclick="sell('+i+')">Продать за '+sellPrice(p)+'</button>'
       :'<button onclick="pick('+i+')">'+(sel===i?'Отмена':'Заменить')+'</button>')+'</div></div>';
}
function renderTeam(){
  $('team').innerHTML='<h3>Стартовый состав</h3><p>Нажми «Заменить» у игрока, затем выбери запасного той же позиции.</p><div class="grid">'+S.team.map((p,i)=>card(p,0,i)).join('')
    +'</div><h3>Скамейка ('+S.bench.length+' из 8)</h3><div class="grid">'+S.bench.map((p,i)=>card(p,1,i)).join('')+'</div>';
}
function renderMarket(){
  $('market').innerHTML='<p>Настроение рынка: '+Math.round(S.mood*100)+'%. Цены меняются каждые 6 секунд, комиссия продажи 15%. Купленные игроки идут на скамейку.</p><div class="grid">'
    +S.market.map((l,i)=>{const p=l.p,st=p.pos==='GK'?STATS.gk:STATS.field;
      return'<div class="card"><b>'+p.name+'</b><small>'+POS[p.pos]+(p.age==null?'':', '+p.age+' лет')+'</small><div>'+st.map(([k,n])=>n+' '+p[k]).join(', ')+'</div>'+spark(l.h)
        +'<button '+(S.coins<price(l)?'disabled':'')+' onclick="buy('+i+')">Купить за '+price(l)+'</button></div>'}).join('')+'</div>';
}
function renderCups(){
  const C=[...TOURN,{id:'league',name:LEAGUE.name}];
  $('cups').innerHTML='<p>Победы '+S.wins+', ничьи '+S.draws+', поражения '+S.losses+'. Голов '+S.goals+', матчей без пропущенных '+S.cs+', лучшая серия побед '+S.best+'.</p>'
    +'<h3>Кубки</h3><div class="grid">'+C.map(T=>'<div class="card gold"><b>'+T.name+'</b><div>Выиграно: '+(S.cups[T.id]||0)+'</div></div>').join('')+'</div>'
    +'<h3>Награды</h3><div class="grid">'+AWARDS.map(a=>'<div class="card '+(S.awards[a.id]?'':'lock')+'"><b>'+a.name+'</b><small>'+a.desc+'</small><div>'+(S.awards[a.id]?'Получено: +':'Награда: ')+a.coins+'</div></div>').join('')+'</div>';
}
function renderAll(){
  $('coins').textContent=S.coins;$('season').textContent=S.season;$('ovr').textContent=Math.round(rating(S.team).ovr*10);$('news').textContent=S.news;
  renderPlay();renderTeam();renderMarket();renderCups();
}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{
  tab=b.dataset.t;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===b));
  ['play','team','market','cups'].forEach(t=>$('p-'+t).classList.toggle('on',t===tab));
});
load();renderAll();setInterval(tickMarket,6000);
