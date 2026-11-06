'use strict';
/* ===== ДАННЫЕ: позиции, характеристики, турниры, награды ===== */
const POS={GK:'Вратарь',DEF:'Защитник',MID:'Полузащитник',FWD:'Нападающий'};
const FORMATION=['GK','DEF','DEF','DEF','DEF','MID','MID','MID','MID','FWD','FWD']; // 11 игроков, схема 4-4-2
const STATS={
  field:[['spd','Скорость'],['pow','Сила удара'],['def','Защита'],['sta','Выносливость'],['pas','Пас']], // плюс возраст
  gk:[['spd','Скорость'],['dive','Нырок'],['rea','Реакция'],['def','Защита']]
};
const FIRST=['Артём','Лука','Ян','Дамир','Матео','Оскар','Тимур','Эрик','Диего','Никита','Бруно','Руслан','Феликс','Марко'];
const LAST=['Волков','Ферро','Крафт','Сайфи','Рейес','Линдберг','Орлов','Бауман','Мало','Громов','Алмейда','Карим','Нор','Дрейк'];
const ROUNDS=['1/4 финала','Полуфинал','Финал'];
const TOURN=[
  {id:'city',name:'Кубок города',lvl:3,fee:0,prize:300},
  {id:'country',name:'Кубок страны',lvl:5,fee:150,prize:900},
  {id:'champions',name:'Лига чемпионов',lvl:7.5,fee:400,prize:2600}
];
const AWARDS=[
  {id:'w1',name:'Первая победа',desc:'Выиграй любой матч',coins:50,ok:s=>s.wins>=1},
  {id:'w10',name:'Десять побед',desc:'Одержи 10 побед',coins:200,ok:s=>s.wins>=10},
  {id:'g25',name:'Бомбардир',desc:'Забей 25 голов',coins:150,ok:s=>s.goals>=25},
  {id:'cs5',name:'Стена',desc:'Сыграй 5 матчей без пропущенных',coins:150,ok:s=>s.cs>=5},
  {id:'st5',name:'Серия',desc:'Выиграй 5 матчей подряд',coins:200,ok:s=>s.best>=5},
  {id:'cup1',name:'Первый кубок',desc:'Выиграй любой турнир',coins:300,ok:s=>Object.values(s.cups).reduce((a,b)=>a+b,0)>=1},
  {id:'champ',name:'Чемпион лиги',desc:'Выиграй чемпионат',coins:800,ok:s=>(s.cups.league||0)>=1},
  {id:'ucl',name:'Король Европы',desc:'Выиграй Лигу чемпионов',coins:1000,ok:s=>(s.cups.champions||0)>=1}
];
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let uid=1;
function makePlayer(pos,base){
  const p={id:Date.now()+'_'+(uid++),pos,goals:0,
    name:FIRST[Math.random()*FIRST.length|0]+' '+LAST[Math.random()*LAST.length|0]};
  if(pos!=='GK')p.age=Math.round(rnd(18,34));
  (pos==='GK'?STATS.gk:STATS.field).forEach(([k])=>p[k]=clamp(Math.round(base+rnd(-1.5,1.5)),1,10));
  return p;
}
const makeTeam=base=>FORMATION.map(pos=>makePlayer(pos,base));
const BENCH=['GK','DEF','MID','MID','FWD'];   // запасные в начале игры
const LEAGUE={name:'Чемпионат',fee:100};
const CLUBS=['Северные Волки','Красные Орлы','Синие Ястребы','Золотые Львы','Чёрные Медведи'];
