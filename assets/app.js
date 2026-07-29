/* =========================================================
   Общее ядро сайта: база, графики, вход, шапка, синхронизация
   ========================================================= */
var KEY='grafik_db_v3', SKEY='grafik_sync', UIKEY='grafik_ui', MEKEY='grafik_me';
var MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
var MON_SHORT=['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
var WD=['вс','пн','вт','ср','чт','пт','сб'];
var HOURS=11;
var STATES={
  work:{label:'Смена 11 ч',txt:'11',cls:'s-work'},
  extra:{label:'Доп. смена (перекрытие)',txt:'11',cls:'s-extra'},
  off:{label:'Выходной',txt:'',cls:'off'},
  vac:{label:'Отпуск',txt:'О',cls:'s-vac'},
  sick:{label:'Больничный',txt:'Б',cls:'s-sick'},
  need:{label:'Нужна замена (РВ)',txt:'РВ',cls:'s-need'},
  sub:{label:'Замена на другом объекте',txt:'',cls:'s-sub'}
};

/* ---------- Графики: 14-дневный цикл 2/2/3 ---------- */
var CYCLE=[1,1,0,0,1,1,1,0,0,1,1,0,0,0];
var BASE=Date.UTC(2026,0,1);
var PHASES=[10,3,11,4,12,5,13,6,0,7,1,8,2,9];
function phaseOf(g){g=Number(g)||1;return PHASES[((g-1)%14+14)%14];}
function isShift(graph,y,m,d){
  if(m===1&&d===1)return false;
  var diff=Math.round((Date.UTC(y,m-1,d)-BASE)/86400000);
  return CYCLE[((diff+phaseOf(graph))%14+14)%14]===1;
}
function daysInMonth(y,m){return new Date(y,m,0).getDate();}
function key(empId,y,m,d){return empId+'|'+y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');}

/* ---------- База ---------- */
function defaultDB(){
  return {
    objects:[
      {id:'o1',name:'Филиал №1 — Центральный',code:'Ф1',address:''},
      {id:'o2',name:'Филиал №2 — Северный',code:'Ф2',address:''}
    ],
    employees:[
      {id:'e1',objectId:'o1',fio:'Иванов Иван Иванович',phone:'+7 900 000-00-01',graph:1,position:'Продавец',vacancy:false},
      {id:'e2',objectId:'o1',fio:'Петрова Мария Сергеевна',phone:'+7 900 000-00-02',graph:2,position:'Продавец',vacancy:false},
      {id:'e3',objectId:'o1',fio:'',phone:'',graph:1,position:'Продавец',vacancy:true},
      {id:'e4',objectId:'o2',fio:'Сидоров Алексей Петрович',phone:'+7 900 000-00-03',graph:2,position:'Продавец',vacancy:false},
      {id:'e5',objectId:'o2',fio:'Кузнецова Ольга Викторовна',phone:'+7 900 000-00-04',graph:5,position:'Продавец',vacancy:false}
    ],
    admins:[{id:'a1',login:'admin',pass:'admin',name:'Администратор',role:'Владелец'}],
    marks:{}
  };
}
var db=loadDB();
function loadDB(){try{var r=localStorage.getItem(KEY);if(r)return Object.assign(defaultDB(),JSON.parse(r));}catch(e){}return defaultDB();}
function save(){localStorage.setItem(KEY,JSON.stringify(db));markDirty();queuePush();}
function uid(p){return p+Math.random().toString(36).slice(2,9);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function toast(t){var d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);
  setTimeout(function(){d.remove();},2600);}
function dl(name,content,type){var b=new Blob([content],{type:type});var a=document.createElement('a');
  a.href=URL.createObjectURL(b);a.download=name;a.click();URL.revokeObjectURL(a.href);}
function objById(id){return db.objects.find(function(o){return o.id===id;});}
function empById(id){return db.employees.find(function(e){return e.id===id;});}
function empName(e){return e.vacancy?'Вакансия':(e.fio||'Без имени');}
function cellState(emp,y,m,d){
  var mk=db.marks[key(emp.id,y,m,d)];
  var base=isShift(emp.graph,y,m,d);
  if(mk){
    if(mk.type==='work')return {type:base?'work':'extra',base:base};
    return {type:mk.type,base:base,objId:mk.objId};
  }
  return {type:base?'work':'off',base:base};
}
function needsCover(emp,st){
  if(emp.vacancy)return st.base;
  return st.base&&['vac','sick','need','sub'].indexOf(st.type)>=0;
}
/* сотрудники других объектов, уже назначенные сюда на замену */
function guestsFor(objId,y,m){
  var dim=daysInMonth(y,m),out=[];
  db.employees.filter(function(e){return e.objectId!==objId&&!e.vacancy;}).forEach(function(e){
    var days=[];
    for(var d=1;d<=dim;d++){var mk=db.marks[key(e.id,y,m,d)];if(mk&&mk.type==='sub'&&mk.objId===objId)days.push(d);}
    if(days.length)out.push({emp:e,days:days});
  });
  return out;
}
/* свободен ли сотрудник в этот день */
function availability(emp,y,m,d){
  var mk=db.marks[key(emp.id,y,m,d)];
  var base=isShift(emp.graph,y,m,d);
  if(mk){
    if(mk.type==='vac')return {free:false,why:'отпуск'};
    if(mk.type==='sick')return {free:false,why:'больничный'};
    if(mk.type==='need')return {free:false,why:'сам требует замены'};
    if(mk.type==='sub'){var o=objById(mk.objId);return {free:false,why:'занят на '+((o&&o.code)||'другом объекте')};}
    if(mk.type==='off')return {free:true,why:'выходной'};
    if(mk.type==='work')return {free:false,why:'смена'};
  }
  return base?{free:false,why:'смена по графику'}:{free:true,why:'выходной по графику'};
}
/* кого можно взять с других объектов на этот день */
function candidatesFor(objId,y,m,d){
  var free=[],busy=[];
  db.employees.filter(function(e){return !e.vacancy&&e.objectId!==objId&&e.fio;}).forEach(function(e){
    var a=availability(e,y,m,d);
    (a.free?free:busy).push({emp:e,why:a.why});
  });
  free.sort(function(a,b){return a.emp.fio.localeCompare(b.emp.fio,'ru');});
  return {free:free,busy:busy};
}

/* ---------- Состояние интерфейса (помнится между страницами) ---------- */
var ui={year:new Date().getFullYear(),month:new Date().getMonth()+1,objectId:null,me:null};
(function(){
  try{var s=JSON.parse(localStorage.getItem(UIKEY)||'null');if(s){ui.year=s.year||ui.year;ui.month=s.month||ui.month;ui.objectId=s.objectId||null;}}catch(e){}
  if(!ui.objectId||!objById(ui.objectId))ui.objectId=db.objects[0]?db.objects[0].id:null;
})();
function saveUI(){localStorage.setItem(UIKEY,JSON.stringify({year:ui.year,month:ui.month,objectId:ui.objectId}));}
function setMonth(m){ui.month=m;saveUI();render();}
function stepYear(n){ui.year+=n;saveUI();render();}
function setObject(id){ui.objectId=id;saveUI();render();}

/* ---------- Вход ---------- */
function isAdmin(){return !!ui.me;}
function needAdmin(){if(isAdmin())return true;toast('Только просмотр. Нажмите «Войти» вверху, чтобы редактировать');return false;}
function openLoginModal(){
  modal('Вход для администратора',
    '<div class="field"><label class="f">Логин</label><input id="lg-login" autocomplete="username"></div>'+
    '<div class="field"><label class="f">Пароль</label><input id="lg-pass" type="password" autocomplete="current-password" onkeydown="if(event.key===&#39;Enter&#39;)doLogin()"></div>'+
    '<div id="lg-err" class="muted" style="font-size:13px"></div>',
    '<button class="btn primary" onclick="doLogin()">Войти</button>');
  setTimeout(function(){var i=document.getElementById('lg-login');if(i)i.focus();},50);
}
function doLogin(){
  var l=document.getElementById('lg-login').value.trim(),p=document.getElementById('lg-pass').value;
  var a=db.admins.find(function(x){return x.login.toLowerCase()===l.toLowerCase()&&x.pass===p;});
  if(!a){document.getElementById('lg-err').innerHTML='<span style="color:var(--red)">Неверный логин или пароль</span>';return;}
  ui.me=a;localStorage.setItem(MEKEY,a.id);closeModal();render();toast('Вы вошли как '+(a.name||a.login));
}
function logout(){ui.me=null;localStorage.removeItem(MEKEY);render();toast('Режим просмотра');}

/* ---------- Шапка ---------- */
var PAGES=[
  {id:'sched',href:'index.html',label:'График',admin:false},
  {id:'emps',href:'employees.html',label:'Сотрудники',admin:false},
  {id:'objs',href:'objects.html',label:'Объекты',admin:false},
  {id:'admins',href:'admins.html',label:'Админы',admin:true},
  {id:'database',href:'database.html',label:'Общая база',admin:true},
  {id:'data',href:'data.html',label:'Данные',admin:true}
];
var PAGE_ID='sched', PAGE_RENDER=function(){};
function renderHeader(){
  var cfg=window.GRAFIK_CONFIG||{};
  var host=document.getElementById('hdr');if(!host)return;
  var nav=PAGES.filter(function(p){return !p.admin||isAdmin();}).map(function(p){
    return '<a href="'+p.href+'" class="'+(p.id===PAGE_ID?'active':'')+'">'+esc(p.label)+'</a>';
  }).join('');
  host.innerHTML='<div class="top-in">'+
    '<a class="logo" href="index.html"><div class="mark">Г</div><div>'+
      '<div style="font-weight:600;font-size:15px">'+esc(cfg.title||'График смен')+'</div>'+
      '<div class="muted" style="font-size:12px">'+esc(cfg.subtitle||'')+'</div></div></a>'+
    '<nav class="tabs">'+nav+'</nav>'+
    '<div class="userchip"><span id="syncbox"></span><span id="savebox" class="row"></span><span id="authbox" class="row"></span></div>'+
  '</div>';
  renderAuth();renderSaveBtn();renderSyncChip();
}
function renderAuth(){
  var box=document.getElementById('authbox');if(!box)return;
  if(ui.me){
    var n=(ui.me.name||ui.me.login);
    box.innerHTML='<div class="avatar">'+esc(n.trim().charAt(0).toUpperCase())+'</div><span>'+esc(n)+'</span>'+
      '<button class="btn ghost sm" onclick="logout()">Выйти</button>';
  }else{
    box.innerHTML='<span>Режим просмотра</span><button class="btn sm" onclick="openLoginModal()">Войти</button>';
  }
}
function renderSyncChip(){
  var b=document.getElementById('syncbox');if(!b)return;
  if(!syncOn()){b.innerHTML='<span class="tag red">без общей базы</span>';return;}
  b.innerHTML=syncState.status==='error'?'<span class="tag red">нет связи с базой</span>':'<span class="tag green">общая база</span>';
}
function render(){renderHeader();PAGE_RENDER();}

/* ---------- Модальные окна ---------- */
function modal(title,body,foot){
  document.getElementById('modal-root').innerHTML=
    '<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="modal">'+
    '<div class="m-head"><h3>'+title+'</h3><button class="btn ghost sm" onclick="closeModal()">✕</button></div>'+
    '<div class="m-body">'+body+'</div>'+(foot?'<div class="m-foot">'+foot+'</div>':'')+'</div></div>';
}
function closeModal(){document.getElementById('modal-root').innerHTML='';}

/* ---------- Несохранённые изменения ---------- */
var dirty=false;
function markDirty(){dirty=true;renderSaveBtn();}
function clearDirty(){dirty=false;renderSaveBtn();}
function renderSaveBtn(){
  var b=document.getElementById('savebox');if(!b)return;
  if(!isAdmin()){b.innerHTML='';return;}
  b.innerHTML=dirty
    ? '<button class="btn warn sm" onclick="saveNow()" title="Есть несохранённые изменения">● Сохранить</button>'
    : '<button class="btn ghost sm" disabled>Сохранено</button>';
}
async function saveNow(){
  localStorage.setItem(KEY,JSON.stringify(db));
  if(syncOn()){
    clearTimeout(pushTimer);
    await pushRemote(true);
    if(syncState.status==='ok'){clearDirty();toast('Сохранено в общую базу');}
    else toast('Не удалось сохранить в общую базу');
  }else{clearDirty();toast('Сохранено только на этом компьютере — подключите общую базу');}
}
window.addEventListener('beforeunload',function(e){
  if(dirty){e.preventDefault();e.returnValue='Есть несохранённые изменения';return e.returnValue;}
});

/* ---------- Общая база (Supabase REST) ---------- */
var syncState={status:'idle',at:null};
function syncCfg(){
  var ls=null;try{ls=JSON.parse(localStorage.getItem(SKEY)||'null');}catch(e){}
  if(ls&&ls.url&&ls.key)return ls;
  var c=window.GRAFIK_CONFIG||{};
  return {url:c.url||'',key:c.key||'',row:c.row||1,table:c.table||'grafik_state'};
}
function saveSyncCfg(c){localStorage.setItem(SKEY,JSON.stringify(c));}
function syncOn(){var c=syncCfg();return !!(c.url&&c.key);}
function sApi(path,opts){
  var c=syncCfg();
  return fetch(c.url.replace(/\/$/,'')+'/rest/v1/'+path,Object.assign({
    headers:{apikey:c.key,Authorization:'Bearer '+c.key,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'}
  },opts||{}));
}
async function pullRemote(silent){
  if(!syncOn())return;
  if(silent&&dirty)return;
  var c=syncCfg(),row=c.row||1,table=c.table||'grafik_state';
  try{
    var r=await sApi(table+'?id=eq.'+row+'&select=data,updated_at');
    if(!r.ok)throw new Error(r.status);
    var j=await r.json();
    if(j&&j[0]&&j[0].data&&j[0].data.objects){
      var meId=ui.me&&ui.me.id;
      db=Object.assign(defaultDB(),j[0].data);
      localStorage.setItem(KEY,JSON.stringify(db));
      ui.me=meId?db.admins.find(function(a){return a.id===meId;})||null:null;
      if(!objById(ui.objectId))ui.objectId=db.objects[0]&&db.objects[0].id;
      syncState={status:'ok',at:new Date()};clearDirty();
      render();
      if(!silent)toast('Загружено из общей базы');
    }else{syncState={status:'empty',at:new Date()};if(!silent)toast('В общей базе пока нет данных');}
  }catch(e){syncState={status:'error',at:new Date()};if(!silent)toast('Нет связи с базой');}
  renderSyncChip();
  if(PAGE_ID==='database')PAGE_RENDER();
}
async function pushRemote(silent){
  if(!syncOn()){if(!silent)toast('Сначала подключите общую базу');return;}
  var c=syncCfg(),row=c.row||1,table=c.table||'grafik_state';
  try{
    var r=await sApi(table,{method:'POST',body:JSON.stringify([{id:row,data:db,updated_at:new Date().toISOString()}])});
    if(!r.ok)throw new Error(r.status);
    syncState={status:'ok',at:new Date()};clearDirty();
    if(!silent)toast('Сохранено в общую базу');
  }catch(e){syncState={status:'error',at:new Date()};if(!silent)toast('Не удалось сохранить в общую базу');}
  renderSyncChip();
  if(PAGE_ID==='database')PAGE_RENDER();
}
var pushTimer=null;
function queuePush(){if(!syncOn()||!isAdmin())return;clearTimeout(pushTimer);pushTimer=setTimeout(function(){pushRemote(true);},700);}

/* конфиг из ссылки #db=... (резервный вариант) */
(function(){
  var m=location.hash.match(/db=([^&]+)/);
  if(m){try{var c=JSON.parse(decodeURIComponent(escape(atob(m[1]))));if(c.url&&c.key)saveSyncCfg(c);}catch(e){}}
})();

/* ---------- Загрузка страницы ---------- */
async function boot(pageId,renderFn){
  PAGE_ID=pageId;PAGE_RENDER=renderFn;
  var id=localStorage.getItem(MEKEY);
  var a=id&&db.admins.find(function(x){return x.id===id;});
  if(a)ui.me=a;
  var page=PAGES.find(function(p){return p.id===pageId;});
  if(page&&page.admin&&!isAdmin()){location.replace('index.html');return;}
  render();
  if(syncOn()){
    await pullRemote(true);
    setInterval(function(){if(!document.getElementById('modal-root').innerHTML)pullRemote(true);},20000);
  }
}

/* --- диагностика: если что-то пошло не так, показываем текст, а не белый экран --- */
window.GRAFIK_READY=true;
window.addEventListener('error',function(ev){
  var v=document.getElementById('view');if(!v)return;
  if(v.getAttribute('data-err'))return;
  v.setAttribute('data-err','1');
  v.innerHTML='<div class="card"><h3>Ошибка загрузки страницы</h3>'+
    '<p class="muted">'+String(ev.message||'')+'</p>'+
    '<p class="muted" style="font-size:12.5px">Обновите страницу (Ctrl+F5). Если не помогло — возможно, файлы из папки assets загружены не полностью.</p></div>';
});
