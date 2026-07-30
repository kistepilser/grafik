/* =========================================================
   Страница «Сотрудники» — раскрывающиеся отделения
   ========================================================= */
var EOPEN='grafik_emps_open', EFILT='grafik_emps_filter';
var openObjs={};try{openObjs=JSON.parse(localStorage.getItem(EOPEN)||'{}')||{};}catch(e){openObjs={};}
var empFilterObj=localStorage.getItem(EFILT)||'all';
var empQuery='';

function saveOpen(){localStorage.setItem(EOPEN,JSON.stringify(openObjs));}
function toggleObjOpen(id){openObjs[id]=!openObjs[id];saveOpen();renderEmps();}
function setEmpFilter(v){
  empFilterObj=v;localStorage.setItem(EFILT,v);
  if(v!=='all'&&v!=='ext'){openObjs[v]=true;saveOpen();}
  renderEmps();
}
function setEmpQuery(v){empQuery=v;renderEmps();focusEnd('emp-q');}
function openAllObjs(v){db.objects.forEach(function(o){openObjs[o.id]=v;});openObjs.__ext=v;saveOpen();renderEmps();}

function matchEmp(e,q){
  if(!q)return true;
  q=q.toLowerCase();
  return (e.fio||'').toLowerCase().indexOf(q)>=0||(e.phone||'').toLowerCase().indexOf(q)>=0||
    (e.position||'').toLowerCase().indexOf(q)>=0||(e.division||'').toLowerCase().indexOf(q)>=0;
}

function renderEmps(){
  var host=document.getElementById('view');
  var q=empQuery.trim();
  var objs=db.objects.filter(function(o){return empFilterObj==='all'||empFilterObj==='ext'?empFilterObj!=='ext':o.id===empFilterObj;});
  if(empFilterObj==='ext')objs=[];

  var cards=objs.map(function(o){
    var staff=db.employees.filter(function(e){return e.objectId===o.id&&!e.external&&!e.vacancy;});
    var shown=staff.filter(function(e){return matchEmp(e,q);});
    var vac=autoVacancies(o.id).length+db.employees.filter(function(e){return e.objectId===o.id&&e.vacancy;}).length;
    var slots=slotsOf(o).length;
    var open=!!openObjs[o.id]||(!!q&&shown.length>0);
    var rows=shown.length?shown.map(function(e,i){
      return '<tr><td class="muted">'+(i+1)+'</td>'+
        '<td><div class="pname"><span class="cav">'+esc(initials(e.fio))+'</span>'+
          '<span><b>'+esc(e.fio)+'</b><span class="pos">'+esc(e.position||'')+'</span></span></div></td>'+
        '<td>'+esc(e.phone||'—')+'</td><td><span class="tag">'+esc(graphLabel(e))+'</span></td>'+
        '<td class="right">'+(isAdmin()
          ?'<button class="btn ghost sm" onclick="openEmpModal(&#39;'+e.id+'&#39;)">Изменить</button> '+
           '<button class="btn sm danger" onclick="delEmp(&#39;'+e.id+'&#39;)">Удалить</button>':'')+'</td></tr>';
    }).join(''):'<tr><td colspan="5" class="empty">'+(q?'Никто не найден по запросу':'В отделении пока нет сотрудников')+'</td></tr>';

    return '<div class="acc'+(open?' open':'')+'">'+
      '<button class="acc-head" onclick="toggleObjOpen(&#39;'+o.id+'&#39;)">'+
        '<span class="chev">'+(open?'▾':'▸')+'</span>'+
        '<span class="acc-title"><b>'+esc(o.name)+'</b> <span class="tag">'+esc(o.code)+'</span>'+
          '<span class="acc-sub">'+esc(o.address||'адрес не указан')+'</span></span>'+
        '<span class="acc-stat"><span class="tag green">сотрудников: '+staff.length+'</span>'+
          (vac?'<span class="tag red">вакансий: '+vac+'</span>':'')+
          (slots?'<span class="tag">ставок: '+slots+'</span>':'')+'</span>'+
      '</button>'+
      '<div class="acc-body">'+
        (isAdmin()?'<div class="row between" style="margin-bottom:10px">'+
          '<span class="muted" style="font-size:13px">Вакансии считаются автоматически: ставки без сотрудника сразу попадают в график.</span>'+
          '<span class="row"><button class="btn sm" onclick="openEmpModal(null,&#39;'+o.id+'&#39;)">＋ Сотрудник</button>'+
          '<button class="btn ghost sm" onclick="openSlotsModal(&#39;'+o.id+'&#39;)">Штат и ставки</button></span></div>':'')+
        '<table class="list"><thead><tr><th style="width:40px">№</th><th>ФИО / должность</th>'+
        '<th style="width:170px">Телефон</th><th style="width:110px">График</th><th style="width:210px"></th></tr></thead>'+
        '<tbody>'+rows+'</tbody></table>'+
      '</div></div>';
  }).join('');

  var toolbar='<div class="toolbar">'+
    '<div style="min-width:280px;flex:1"><label class="f">Отделение</label>'+
      '<select onchange="setEmpFilter(this.value)">'+
        '<option value="all"'+(empFilterObj==='all'?' selected':'')+'>Все отделения ('+db.objects.length+')</option>'+
        db.objects.map(function(o){return '<option value="'+o.id+'"'+(empFilterObj===o.id?' selected':'')+'>'+esc(o.name)+' — '+esc(o.code)+'</option>';}).join('')+
        '<option value="ext"'+(empFilterObj==='ext'?' selected':'')+'>Только другие дивизионы</option>'+
      '</select></div>'+
    '<div style="min-width:240px;flex:1"><label class="f">Поиск</label>'+
      '<input id="emp-q" value="'+esc(empQuery)+'" placeholder="ФИО, телефон или должность" oninput="setEmpQuery(this.value)"></div>'+
    '<div class="row"><button class="btn sm" onclick="openAllObjs(true)">Раскрыть всё</button>'+
      '<button class="btn sm" onclick="openAllObjs(false)">Свернуть</button>'+
      (isAdmin()?'<button class="btn primary sm" onclick="openEmpModal()">＋ Сотрудник</button>':'')+'</div>'+
  '</div>';

  host.innerHTML='<div class="pagehead"><h1>Сотрудники</h1>'+
    '<p class="muted">Отделения свёрнуты: кликните по названию — раскроется список людей. Вакансии в списке не показываются — они считаются автоматически по штату и сразу видны в графике.</p></div>'+
    toolbar+
    (db.objects.length?cards:'<div class="card empty">Сначала добавьте объект.</div>')+
    ((empFilterObj==='all'||empFilterObj==='ext')?renderExternals(q):'');
}

/* ---------- сотрудник ---------- */
function openEmpModal(id,objId){
  if(!needAdmin())return;
  var e=id?empById(id):null;
  modal(e?'Изменить сотрудника':'Новый сотрудник',
    '<div class="field"><label class="f">ФИО</label><input id="e-fio" value="'+esc(e?e.fio:'')+'" placeholder="Иванов Иван Иванович"></div>'+
    '<div class="grid2"><div><label class="f">Телефон</label><input id="e-phone" value="'+esc(e?e.phone:'')+'" placeholder="+7 900 000-00-00"></div>'+
      '<div><label class="f">№ графика (1–14)</label><input id="e-graph" type="number" min="1" max="14" value="'+esc(e?e.graph:1)+'"></div></div>'+
    '<div class="grid2"><div><label class="f">Должность</label><input id="e-pos" value="'+esc(e?e.position:'Продавец')+'"></div>'+
      '<div><label class="f">Отделение</label><select id="e-obj">'+db.objects.map(function(o){
        var sel=(e?e.objectId:(objId||empFilterObj))===o.id?' selected':'';
        return '<option value="'+o.id+'"'+sel+'>'+esc(o.name)+'</option>';}).join('')+'</select></div></div>'+
    '<p class="muted" style="font-size:12.5px">Как только сотрудник занимает ставку, вакансия на этот график исчезает из графика автоматически.</p>',
    (e?'<button class="btn danger" onclick="delEmp(&#39;'+e.id+'&#39;)">Удалить</button>':'')+
    '<button class="btn primary" onclick="saveEmp('+(e?'&#39;'+e.id+'&#39;':'null')+')">Сохранить</button>');
}
function saveEmp(id){
  var v={fio:document.getElementById('e-fio').value.trim(),phone:document.getElementById('e-phone').value.trim(),
    graph:Math.min(14,Math.max(1,Number(document.getElementById('e-graph').value)||1)),
    position:document.getElementById('e-pos').value.trim(),objectId:document.getElementById('e-obj').value};
  if(!v.fio){toast('Укажите ФИО');return;}
  if(id){Object.assign(empById(id),v,{vacancy:false,external:false});}
  else db.employees.push(Object.assign({id:uid('e'),vacancy:false},v));
  openObjs[v.objectId]=true;saveOpen();
  save();closeModal();render();toast('Сотрудник сохранён');
}
function delEmp(id){
  if(!needAdmin())return;
  var e=empById(id);if(!e)return;
  if(e.auto){toast('Это автоматическая вакансия — измените штат объекта');return;}
  if(!confirm('Удалить «'+empName(e)+'» и все его отметки?'))return;
  db.employees=db.employees.filter(function(x){return x.id!==id;});
  Object.keys(db.marks).forEach(function(k){if(k.indexOf(id+'|')===0)delete db.marks[k];});
  save();closeModal();render();toast('Удалено');
}

/* ---------- штат объекта (автовакансии) ---------- */
function openSlotsModal(objId){
  if(!needAdmin())return;
  var o=objById(objId);if(!o)return;
  var cur=slotsOf(o).join(', ');
  var staff=db.employees.filter(function(e){return e.objectId===o.id&&!e.external&&!e.vacancy;});
  modal('Штат — '+esc(o.name),
    '<div class="field"><label class="f">Графики ставок (через запятую)</label>'+
      '<input id="sl-list" value="'+esc(cur)+'" placeholder="1, 2, 5"></div>'+
    '<p class="muted" style="font-size:13px">Сейчас в отделении <b>'+staff.length+'</b> сотрудников (графики: '+
      esc(staff.map(function(e){return e.graph;}).join(', ')||'—')+'). '+
      'Каждая ставка без сотрудника автоматически становится строкой «Вакансия» в графике, а её смены — в «нужно перекрыть».</p>',
    '<button class="btn primary" onclick="saveSlots(&#39;'+o.id+'&#39;)">Сохранить</button>');
}
function saveSlots(objId){
  var raw=document.getElementById('sl-list').value;
  var arr=raw.split(/[^0-9]+/).map(Number).filter(function(n){return n>=1&&n<=14;});
  var o=objById(objId);o.slots=arr;delete o.plan;
  save();closeModal();render();toast('Штат обновлён: ставок '+arr.length);
}

/* ---------- Сотрудники из других дивизионов (только на замены) ---------- */
function renderExternals(q){
  var all=db.employees.filter(function(e){return e.external;});
  var list=all.filter(function(e){return matchEmp(e,(q||'').toLowerCase());});
  var open=!!openObjs.__ext||(!!q&&list.length>0);
  var rows=list.length?list.map(function(e,i){
    return '<tr><td class="muted">'+(i+1)+'</td>'+
      '<td><div class="pname"><span class="cav ext">'+esc(initials(e.fio))+'</span>'+
        '<span><b>'+esc(e.fio)+'</b><span class="pos">'+esc(e.position||'')+(e.note?' · '+esc(e.note):'')+'</span></span></div></td>'+
      '<td><span class="tag violet">'+esc(e.division||'Другой дивизион')+'</span></td>'+
      '<td>'+esc(e.phone||'—')+'</td><td><span class="tag">'+esc(graphLabel(e))+'</span></td>'+
      '<td class="right">'+(isAdmin()
        ?'<button class="btn ghost sm" onclick="openExtModal(&#39;'+e.id+'&#39;)">Изменить</button> '+
         '<button class="btn sm danger" onclick="delEmp(&#39;'+e.id+'&#39;)">Удалить</button>':'')+'</td></tr>';
  }).join(''):'<tr><td colspan="6" class="empty">Пока никого нет</td></tr>';
  return '<div class="acc'+(open?' open':'')+'">'+
    '<button class="acc-head" onclick="toggleObjOpen(&#39;__ext&#39;)">'+
      '<span class="chev">'+(open?'▾':'▸')+'</span>'+
      '<span class="acc-title"><b>Из других дивизионов</b> <span class="tag violet">только на замены</span>'+
        '<span class="acc-sub">Не относятся к вашим отделениям и не занимают ставки</span></span>'+
      '<span class="acc-stat"><span class="tag violet">людей: '+all.length+'</span></span>'+
    '</button>'+
    '<div class="acc-body">'+
      (isAdmin()?'<div class="row between" style="margin-bottom:10px"><span class="muted" style="font-size:13px">Появляются только в кандидатах на замену.</span>'+
        '<button class="btn sm" onclick="openExtModal()">＋ Из другого дивизиона</button></div>':'')+
      '<table class="list"><thead><tr><th style="width:40px">№</th><th>ФИО / должность</th><th style="width:200px">Дивизион</th>'+
      '<th style="width:170px">Телефон</th><th style="width:120px">График</th><th style="width:210px"></th></tr></thead><tbody>'+rows+'</tbody></table>'+
    '</div></div>';
}
function openExtModal(id){
  if(!needAdmin())return;
  var e=id?empById(id):null;
  modal(e?'Сотрудник из другого дивизиона':'Новый сотрудник из другого дивизиона',
    '<div class="field"><label class="f">ФИО</label><input id="x-fio" value="'+esc(e?e.fio:'')+'" placeholder="Николаев Дмитрий Сергеевич"></div>'+
    '<div class="grid2"><div><label class="f">Дивизион / организация</label><input id="x-div" value="'+esc(e?e.division:'')+'" placeholder="Дивизион Юг"></div>'+
      '<div><label class="f">Короткое обозначение</label><input id="x-code" maxlength="6" value="'+esc(e?e.divCode:'')+'" placeholder="ЮГ"></div></div>'+
    '<div class="grid2"><div><label class="f">Телефон</label><input id="x-phone" value="'+esc(e?e.phone:'')+'"></div>'+
      '<div><label class="f">Должность</label><input id="x-pos" value="'+esc(e?e.position:'Продавец')+'"></div></div>'+
    '<div class="grid2"><div><label class="f">№ графика (0 — без своего графика)</label>'+
      '<input id="x-graph" type="number" min="0" max="14" value="'+esc(e?(Number(e.graph)||0):0)+'"></div>'+
      '<div><label class="f">Адрес (для поиска «близко к объекту»)</label><input id="x-addr" value="'+esc(e?e.address:'')+'" placeholder="г. Москва, ул. Южная, 5"></div></div>'+
    '<div class="field"><label class="f">Заметка</label><input id="x-note" value="'+esc(e?e.note:'')+'" placeholder="Например: выходит только по выходным"></div>'+
    '<p class="muted" style="font-size:12.5px">График 0 — человек свободен в любой день. Адрес нужен, чтобы его находил поиск ближайших.</p>',
    (e?'<button class="btn danger" onclick="delEmp(&#39;'+e.id+'&#39;)">Удалить</button>':'')+
    '<button class="btn primary" onclick="saveExt('+(e?'&#39;'+e.id+'&#39;':'null')+')">Сохранить</button>');
}
function saveExt(id){
  var v={fio:document.getElementById('x-fio').value.trim(),
    division:document.getElementById('x-div').value.trim(),
    divCode:document.getElementById('x-code').value.trim(),
    phone:document.getElementById('x-phone').value.trim(),
    position:document.getElementById('x-pos').value.trim(),
    address:document.getElementById('x-addr').value.trim(),
    note:document.getElementById('x-note').value.trim(),
    graph:Math.min(14,Math.max(0,Number(document.getElementById('x-graph').value)||0)),
    external:true,objectId:null,vacancy:false};
  if(!v.fio){toast('Укажите ФИО');return;}
  if(!v.division)v.division='Другой дивизион';
  if(!v.divCode)v.divCode='ВНЕШ';
  if(id)Object.assign(empById(id),v);else db.employees.push(Object.assign({id:uid('x')},v));
  openObjs.__ext=true;saveOpen();
  save();closeModal();render();toast('Сохранено');
}

boot('emps',renderEmps);
