/* =========================================================
   Страница «График»
   ========================================================= */
var FREEKEY='grafik_showfree';
var showFree=localStorage.getItem(FREEKEY)==='1';
function toggleFree(v){showFree=!!v;localStorage.setItem(FREEKEY,showFree?'1':'0');render();}

function renderSched(){
  var host=document.getElementById('view');
  if(!db.objects.length){host.innerHTML='<div class="card empty">Сначала добавьте объект (филиал) на странице «Объекты».</div>';return;}
  if(!ui.objectId||!objById(ui.objectId))ui.objectId=db.objects[0].id;
  var y=ui.year,m=ui.month,obj=objById(ui.objectId),dim=daysInMonth(y,m);
  var emps=empsFor(obj.id);

  var head='<div class="toolbar">'+
    '<div><label class="f">Год</label><div class="yearpick"><button onclick="stepYear(-1)">‹</button>'+
      '<span class="y">'+y+'</span><button onclick="stepYear(1)">›</button></div></div>'+
    '<div style="min-width:260px;flex:1"><label class="f">Объект (филиал)</label><select onchange="setObject(this.value)">'+
      db.objects.map(function(o){return '<option value="'+o.id+'"'+(o.id===obj.id?' selected':'')+'>'+esc(o.name)+' — '+esc(o.code)+'</option>';}).join('')+
    '</select></div>'+
    '<label class="btn" style="cursor:pointer"><input type="checkbox" style="width:16px;min-height:0" '+(showFree?'checked':'')+' onchange="toggleFree(this.checked)"> Свободные с других объектов и дивизионов</label>'+
    (isAdmin()?'<button class="btn primary" onclick="openPeriodModal()">Отпуск / замена за период</button>':'')+
  '</div>'+
  '<div class="months">'+MONTHS.map(function(n,i){return '<button class="'+(i+1===m?'active':'')+'" onclick="setMonth('+(i+1)+')">'+n+'</button>';}).join('')+'</div>';

  var ths='';
  for(var d=1;d<=dim;d++){
    var wd=new Date(y,m-1,d).getDay(),w=(wd===0||wd===6);
    ths+='<th class="day'+(w?' wknd':'')+'"><div style="font-weight:700">'+d+'</div><div style="font-size:10px;font-weight:500;opacity:.7">'+WD[wd]+'</div></th>';
  }

  /* --- свои сотрудники --- */
  var rows='',coverDays={},totalCover=0;
  emps.forEach(function(e,i){
    var tds='',days=0,cover=0;
    for(var d=1;d<=dim;d++){
      var st=cellState(e,y,m,d),wd=new Date(y,m-1,d).getDay(),wknd=(wd===0||wd===6);
      var cls='cell',txt='';
      if(st.type==='sub'){var o=objById(st.objId);txt=o?o.code:'ЗМ';cls+=' s-sub';}
      else{txt=STATES[st.type].txt;cls+=' '+STATES[st.type].cls;}
      if(e.vacancy&&st.base&&st.type!=='sub'){cls='cell s-vacancy';txt='11';}
      if(needsCover(e,st)){cover++;totalCover++;coverDays[d]=(coverDays[d]||0)+1;}
      if(['work','extra'].indexOf(st.type)>=0&&!e.vacancy)days++;
      var title=(e.vacancy&&st.base?'Вакансия — нужно перекрыть':STATES[st.type].label)+(st.type==='sub'?': '+txt:'');
      tds+='<td class="day'+(wknd?' wkndcol':'')+'"><button class="'+cls+'" title="'+esc(title)+'" onclick="openCell(&#39;'+e.id+'&#39;,'+d+')">'+esc(txt)+'</button></td>';
    }
    rows+='<tr class="'+(e.vacancy?'vacancy':'')+'">'+
      '<td class="c-num sticky1">'+(i+1)+'</td>'+
      '<td class="c-fio sticky2">'+esc(empName(e))+'<span class="pos">'+esc(e.position||'')+(cover?' · перекрыть: '+cover:'')+'</span></td>'+
      '<td class="c-tel">'+esc(e.phone||'—')+'</td><td class="c-gr">№'+esc(e.graph)+'</td>'+tds+
      '<td class="tot">'+days+'</td><td class="tot">'+(days*HOURS)+'</td></tr>';
  });

  /* --- замены с других объектов (автоматические строки) --- */
  var guests=guestsFor(obj.id,y,m),guestRows='',coveredDays={},totalCovered=0;
  guests.forEach(function(g){
    var home=empHome(g.emp),tds='',cnt=0;
    for(var d=1;d<=dim;d++){
      var wd=new Date(y,m-1,d).getDay(),wknd=(wd===0||wd===6),on=g.days.indexOf(d)>=0;
      if(on){cnt++;coveredDays[d]=(coveredDays[d]||0)+1;totalCovered++;}
      tds+='<td class="day'+(wknd?' wkndcol':'')+'">'+(on
        ?'<button class="cell s-guest" title="Замена: '+esc(g.emp.fio)+' — '+esc(home.ext?home.name+' (другой дивизион)':'с объекта '+home.name)+'" onclick="openCell(&#39;'+g.emp.id+'&#39;,'+d+')">11</button>'
        :'<span class="cell off">·</span>')+'</td>';
    }
    guestRows+='<tr class="guest"><td class="c-num sticky1">↦</td>'+
      '<td class="c-fio sticky2">'+esc(g.emp.fio)+' <span class="tag green">замена</span>'+
        (home.ext?' <span class="tag violet">другой дивизион</span>':'')+
        '<span class="pos">'+esc(home.ext?home.name:'с объекта '+home.code)+(g.emp.position?' · '+esc(g.emp.position):'')+'</span></td>'+
      '<td class="c-tel">'+esc(g.emp.phone||'—')+'</td><td class="c-gr">'+esc(graphLabel(g.emp))+'</td>'+tds+
      '<td class="tot">'+cnt+'</td><td class="tot">'+(cnt*HOURS)+'</td></tr>';
  });

  /* --- сколько осталось перекрыть --- */
  var remainDays={},totalRemain=0;
  for(var d2=1;d2<=dim;d2++){
    var r=Math.max(0,(coverDays[d2]||0)-(coveredDays[d2]||0));
    if(r){remainDays[d2]=r;totalRemain+=r;}
  }

  /* --- свободные сотрудники других объектов (подсветка) --- */
  var freeRows='';
  if(showFree){
    var guestIds=guests.map(function(g){return g.emp.id;});
    db.employees.filter(function(e){return e.objectId!==obj.id&&!e.vacancy&&e.fio;})
      .sort(function(a,b){return ((isExternal(a)?1:0)-(isExternal(b)?1:0))||a.fio.localeCompare(b.fio,'ru');})
      .forEach(function(e){
      var home=empHome(e),tds='',freeCnt=0,useful=0;
      for(var d=1;d<=dim;d++){
        var wd=new Date(y,m-1,d).getDay(),wknd=(wd===0||wd===6);
        var a=availability(e,y,m,d),need=(remainDays[d]||0)>0;
        var inner;
        if(a.free){
          freeCnt++;if(need)useful++;
          inner='<button class="cell '+(need?'s-extra':'s-free')+'" title="'+esc(e.fio)+' свободен ('+esc(a.why)+')'+(need?' — можно взять на замену':'')+'" onclick="assignSub(&#39;'+e.id+'&#39;,'+d+')">'+(need?'+':'·')+'</button>';
        }else{
          inner='<span class="cell off" title="'+esc(a.why)+'">—</span>';
        }
        tds+='<td class="day'+(wknd?' wkndcol':'')+'">'+inner+'</td>';
      }
      freeRows+='<tr class="freerow"><td class="c-num sticky1">✧</td>'+
        '<td class="c-fio sticky2">'+esc(e.fio)+' <span class="tag '+(useful?'green':'')+'">'+(useful?'можно взять: '+useful:'свободных: '+freeCnt)+'</span>'+
        (home.ext?' <span class="tag violet">другой дивизион</span>':'')+
          '<span class="pos">'+esc(home.ext?home.name:'с объекта '+home.code)+' · '+esc(graphLabel(e))+(guestIds.indexOf(e.id)>=0?' · уже в заменах':'')+'</span></td>'+
        '<td class="c-tel">'+esc(e.phone||'—')+'</td><td class="c-gr">'+esc(graphLabel(e))+'</td>'+tds+
        '<td class="tot">'+freeCnt+'</td><td class="tot">—</td></tr>';
    });
  }

  if(!emps.length&&!guests.length)rows='<tr><td colspan="'+(dim+6)+'" class="empty">В этом объекте нет сотрудников. Добавьте их на странице «Сотрудники».</td></tr>';

  var coverTds='';
  for(var d3=1;d3<=dim;d3++){
    var c=remainDays[d3]||0;
    coverTds+='<td class="day" style="'+(c?'background:var(--red-soft);color:#B0392E':'color:var(--border)')+';font-weight:700">'+(c||'')+'</td>';
  }
  var covRow=(emps.length||guests.length)?'<tr class="totrow"><td class="c-num sticky1"></td><td class="c-fio sticky2">Нужно перекрыть (смен)</td>'+
    '<td class="c-tel"></td><td class="c-gr"></td>'+coverTds+'<td class="tot">'+totalRemain+'</td><td class="tot">'+(totalRemain*HOURS)+'</td></tr>':'';

  var legend='<div class="legend">'+
    kk('s-work','11 — смена 11 ч')+kk('s-extra','11 — доп. смена / можно взять')+kk('s-vac','О — отпуск')+
    kk('s-sick','Б — больничный')+kk('s-need','РВ — нужна замена')+kk('s-sub','Ф2 — замена на другом объекте')+
    kk('s-guest','11 — с другого объекта / дивизиона')+kk('s-free','· — свободен на другом объекте')+
    kk('s-vacancy','Вакансия — смена не закрыта')+'</div>';

  var bar='<div class="coverbar">'+
    '<span class="pill '+(totalRemain?'warn':'ok')+'">'+(totalRemain?'Нужно перекрыть: '+totalRemain+' смен · '+(totalRemain*HOURS)+' ч':'Все смены закрыты')+'</span>'+
    (totalCovered?'<span class="pill ok">Перекрыто заменами: '+totalCovered+' смен</span>':'')+
    '<span class="pill">Сотрудников: '+emps.filter(function(e){return !e.vacancy;}).length+'</span>'+
    '<span class="pill">Вакансий: '+emps.filter(function(e){return e.vacancy;}).length+'</span>'+
    (totalRemain?'<div class="coverlist">Даты для перекрытия: '+Object.keys(remainDays).map(function(d){return d+' '+MON_SHORT[m-1]+' ('+remainDays[d]+')';}).join(', ')+'</div>':'')+
  '</div>';

  host.innerHTML=head+'<div class="sheet">'+
    '<div class="sheet-head"><div><h2>'+esc(obj.name)+'</h2>'+
      '<div class="sub">'+MONTHS[m-1]+' '+y+' · смены по 11 часов · короткое обозначение объекта: <b>'+esc(obj.code)+'</b></div></div></div>'+
    '<div class="tablewrap"><table class="sch"><thead><tr>'+
      '<th class="c-num sticky1">№</th><th class="c-fio sticky2">ФИО</th><th class="c-tel">Телефон</th><th class="c-gr">№ гр.</th>'+ths+
      '<th class="tot">Дней</th><th class="tot">Часов</th></tr></thead>'+
      '<tbody>'+rows+guestRows+freeRows+covRow+'</tbody></table></div>'+legend+bar+'</div>'+
    renderCandidates(obj,y,m,remainDays);
}
function kk(cls,t){return '<span class="k"><i class="sw '+cls+'"></i>'+t+'</span>';}

/* =========================================================
   Кого можно взять на замену
   ========================================================= */
var CMODE='grafik_candmode';
var candMode=localStorage.getItem(CMODE)||'all';   /* all | near */
var candQuery='';
var candCtx=null;
var candOpen={};

function setCandMode(v){candMode=v;localStorage.setItem(CMODE,v);paintCands();}
function setCandQuery(v){candQuery=v;paintCands();focusEnd('cand-q');}
function toggleDay(d){candOpen[d]=!candOpen[d];paintCands();}
function paintCands(){
  var box=document.getElementById('candbox');
  if(box&&candCtx)box.innerHTML=candCardHtml();
}

function renderCandidates(obj,y,m,remainDays){
  candCtx={obj:obj,y:y,m:m,remain:remainDays};
  return '<div id="candbox">'+candCardHtml()+'</div>';
}

function candCardHtml(){
  var obj=candCtx.obj,y=candCtx.y,m=candCtx.m,remainDays=candCtx.remain;
  var days=Object.keys(remainDays).map(Number).sort(function(a,b){return a-b;});
  if(!days.length)return '';
  var q=candQuery.trim().toLowerCase();

  /* ближайшие объекты — подсказка сверху */
  var near=nearObjects(obj.id);
  var chips=near.length?'<div class="nearbar"><span class="nb-t">Ближайшие объекты:</span>'+
    near.slice(0,6).map(function(n){
      return '<span class="nchip'+(n.km!=null&&n.km<=5?' close':'')+'" title="'+esc(n.obj.address||'')+'">'+
        '<b>'+esc(n.obj.code)+'</b> '+esc(n.obj.name)+'<i>'+esc(n.label)+'</i></span>';
    }).join('')+'</div>':'';

  var blocks=days.map(function(d){return dayBlockHtml(obj,y,m,d,remainDays[d],q);}).join('');

  return '<div class="card cands-card">'+
    '<div class="row between wrap"><h3 style="margin:0">Кого можно взять на замену</h3>'+
      '<div class="row wrap">'+
        '<span class="seg">'+
          '<button class="'+(candMode==='all'?'on':'')+'" onclick="setCandMode(&#39;all&#39;)">Все кандидаты</button>'+
          '<button class="'+(candMode==='near'?'on':'')+'" onclick="setCandMode(&#39;near&#39;)">Близко к объекту</button>'+
        '</span>'+
        '<input id="cand-q" class="csearch" value="'+esc(candQuery)+'" placeholder="Поиск по адресу, объекту или ФИО" oninput="setCandQuery(this.value)">'+
      '</div></div>'+
    '<p class="muted" style="font-size:13px;margin:6px 0 0">'+
      (candMode==='near'
        ? 'Показаны только люди с ближайших объектов — сначала самые близкие по адресу или координатам.'
        : 'Список отсортирован по близости: сначала ближайшие объекты, потом остальные и люди из других дивизионов.')+'</p>'+
    chips+blocks+'</div>';
}

function dayBlockHtml(obj,y,m,d,need,q){
  var c=candidatesFor(obj.id,y,m,d);
  var items=c.free.map(function(x){
    var pr=empProximity(obj.id,x.emp),home=empHome(x.emp);
    return {emp:x.emp,why:x.why,pr:pr,home:home,
      addr:(isExternal(x.emp)?(x.emp.address||''):((objById(x.emp.objectId)||{}).address||''))};
  });
  if(candMode==='near')items=items.filter(function(it){return it.pr.rank<5000;});
  if(q)items=items.filter(function(it){
    return (it.emp.fio||'').toLowerCase().indexOf(q)>=0||it.home.name.toLowerCase().indexOf(q)>=0||
      (it.addr||'').toLowerCase().indexOf(q)>=0||it.home.code.toLowerCase().indexOf(q)>=0;
  });
  items.sort(function(a,b){return a.pr.rank-b.pr.rank||a.emp.fio.localeCompare(b.emp.fio,'ru');});

  var open=!!candOpen[d],limit=open?items.length:4;
  var rows=items.slice(0,limit).map(function(it){
    var ext=it.home.ext;
    return '<div class="crow'+(ext?' ext':'')+'">'+
      '<span class="cav'+(ext?' ext':'')+'">'+esc(initials(it.emp.fio))+'</span>'+
      '<span class="cmain"><span class="cname">'+esc(it.emp.fio)+
        (ext?' <span class="tag violet">другой дивизион</span>':' <span class="tag">'+esc(it.home.code)+'</span>')+'</span>'+
        '<span class="cmeta">'+esc(it.home.name)+(it.addr?' · '+esc(it.addr):'')+'</span></span>'+
      '<span class="cdist'+(it.pr.km!=null&&it.pr.km<=5?' close':'')+'">'+esc(it.pr.label)+'</span>'+
      '<span class="cwhy">'+esc(graphLabel(it.emp))+' · '+esc(it.why)+'</span>'+
      (isAdmin()?'<button class="btn ok sm" onclick="assignSub(&#39;'+it.emp.id+'&#39;,'+d+')">Назначить</button>':'<span></span>')+
    '</div>';
  }).join('');
  var more=items.length>4?'<button class="btn ghost sm morebtn" onclick="toggleDay('+d+')">'+
    (open?'Свернуть':'Показать всех — ещё '+(items.length-4))+'</button>':'';
  var empty='<div class="crow empty">'+(candMode==='near'
      ? 'Рядом свободных нет — переключите на «Все кандидаты»'
      : 'Свободных нет — нужна доп. смена своих сотрудников')+'</div>';

  return '<div class="dayblock">'+
    '<div class="dbh"><span class="dbd">'+d+' '+MONTHS[m-1]+' '+y+'</span>'+
      '<span class="tag red">нужно перекрыть: '+need+'</span>'+
      '<span class="tag green">подходят: '+items.length+'</span>'+
      '<span class="muted" style="font-size:12.5px">заняты: '+c.busy.length+'</span></div>'+
    '<div class="crows">'+(rows||empty)+'</div>'+more+'</div>';
}

/* --- назначить замену на текущий объект --- */
function assignSub(empId,d){
  if(!needAdmin())return;
  var e=empById(empId);if(!e)return;
  var a=availability(e,ui.year,ui.month,d);
  if(!a.free&&!confirm(e.fio+' в этот день — '+a.why+'. Всё равно назначить замену?'))return;
  db.marks[key(empId,ui.year,ui.month,d)]={type:'sub',objId:ui.objectId};
  save();render();
  toast(e.fio+' → замена '+d+' '+MON_SHORT[ui.month-1]+' на '+((objById(ui.objectId)||{}).code||''));
}

/* --- редактор ячейки --- */
var cellCtx=null;
function openCell(empId,d){
  if(!needAdmin())return;
  var e=empById(empId);if(!e)return;
  cellCtx={empId:empId,d:d};
  var st=cellState(e,ui.year,ui.month,d);
  var opts=[['work','Смена 11 ч'],['off','Выходной'],['vac','Отпуск'],['sick','Больничный'],
    ['need','Нужна замена (РВ)'],['sub','Замена на другом объекте']];
  var others=db.objects.filter(function(o){return o.id!==e.objectId;});
  modal(esc(empName(e))+' · '+d+' '+MONTHS[ui.month-1],
    '<p class="muted" style="font-size:13px;margin-top:0">По графику №'+esc(e.graph)+' этот день — <b>'+(st.base?'рабочий (11 ч)':'выходной')+'</b>.</p>'+
    '<div class="choice">'+opts.map(function(o){return '<button class="'+(st.type===o[0]||(o[0]==='work'&&st.type==='extra')?'on':'')+'" onclick="setCell(&#39;'+o[0]+'&#39;)">'+o[1]+'</button>';}).join('')+'</div>'+
    '<div id="subwrap" class="hidden"><label class="f">Объект замены (в графике встанет короткое обозначение)</label>'+
      '<select id="subobj">'+(others.length?others.map(function(o){return '<option value="'+o.id+'">'+esc(o.name)+' — '+esc(o.code)+'</option>';}).join(''):'<option value="">нет других объектов</option>')+'</select>'+
      '<div class="row" style="margin-top:12px"><button class="btn primary" onclick="applySub()">Назначить замену</button></div></div>',
    '<button class="btn" onclick="clearCell()">Сбросить к графику</button>');
}
function setCell(v){
  if(v==='sub'){document.getElementById('subwrap').classList.remove('hidden');return;}
  db.marks[key(cellCtx.empId,ui.year,ui.month,cellCtx.d)]={type:v};save();closeModal();render();
}
function applySub(){
  var o=document.getElementById('subobj').value;
  if(!o){toast('Добавьте второй объект');return;}
  db.marks[key(cellCtx.empId,ui.year,ui.month,cellCtx.d)]={type:'sub',objId:o};
  save();closeModal();render();
  toast('Замена назначена и добавлена в график объекта '+((objById(o)||{}).code||''));
}
function clearCell(){delete db.marks[key(cellCtx.empId,ui.year,ui.month,cellCtx.d)];save();closeModal();render();}

/* --- отпуск / замена за период --- */
function openPeriodModal(){
  if(!needAdmin())return;
  var emps=db.employees.filter(function(e){return !e.vacancy;});
  if(!emps.length){toast('Сначала добавьте сотрудников');return;}
  var d1=ui.year+'-'+String(ui.month).padStart(2,'0')+'-01';
  modal('Отпуск / замена за период',
    '<div class="field"><label class="f">Сотрудник</label><select id="p-emp">'+
      emps.map(function(e){return '<option value="'+e.id+'">'+esc(e.fio)+' — '+esc(objById(e.objectId)?objById(e.objectId).name:'')+'</option>';}).join('')+'</select></div>'+
    '<div class="field"><label class="f">Тип</label><select id="p-type" onchange="document.getElementById(&#39;p-objwrap&#39;).classList.toggle(&#39;hidden&#39;,this.value!==&#39;sub&#39;)">'+
      '<option value="vac">Отпуск</option><option value="sick">Больничный</option>'+
      '<option value="need">Нужна замена (РВ)</option><option value="sub">Замена на другом объекте</option></select></div>'+
    '<div class="field hidden" id="p-objwrap"><label class="f">Объект замены</label><select id="p-obj">'+
      db.objects.map(function(o){return '<option value="'+o.id+'">'+esc(o.name)+' — '+esc(o.code)+'</option>';}).join('')+'</select></div>'+
    '<div class="grid2"><div><label class="f">С даты</label><input type="date" id="p-from" value="'+d1+'"></div>'+
      '<div><label class="f">По дату</label><input type="date" id="p-to" value="'+d1+'"></div></div>'+
    '<p class="muted" style="font-size:12.5px">Отметка ставится на каждый день периода.</p>',
    '<button class="btn" onclick="applyPeriod(true)">Очистить период</button>'+
    '<button class="btn primary" onclick="applyPeriod(false)">Применить</button>');
}
function applyPeriod(clear){
  var id=document.getElementById('p-emp').value,t=document.getElementById('p-type').value;
  var f=document.getElementById('p-from').value,to=document.getElementById('p-to').value;
  if(!f||!to){toast('Укажите даты');return;}
  var objId=t==='sub'?document.getElementById('p-obj').value:undefined;
  var a=new Date(f+'T00:00:00'),b=new Date(to+'T00:00:00'),n=0;
  if(b<a){toast('Дата «по» раньше даты «с»');return;}
  while(a<=b){
    var k=key(id,a.getFullYear(),a.getMonth()+1,a.getDate());
    if(clear)delete db.marks[k];else db.marks[k]=objId?{type:t,objId:objId}:{type:t};
    n++;a.setDate(a.getDate()+1);
  }
  save();closeModal();render();toast((clear?'Очищено дней: ':'Отмечено дней: ')+n);
}

boot('sched',renderSched);
