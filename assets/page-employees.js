/* Страница «Сотрудники» */
function renderEmps(){
  var host=document.getElementById('view');
  var byObj=db.objects.map(function(o){
    var list=db.employees.filter(function(e){return e.objectId===o.id;});
    var rows=list.length?list.map(function(e,i){
      return '<tr><td>'+(i+1)+'</td><td>'+(e.vacancy?'<span class="tag red">Вакансия</span>':'<b>'+esc(e.fio)+'</b>')+
        '<div class="muted" style="font-size:12px">'+esc(e.position||'')+'</div></td>'+
        '<td>'+esc(e.phone||'—')+'</td><td>№'+esc(e.graph)+'</td>'+
        '<td class="right">'+(isAdmin()
          ?'<button class="btn ghost sm" onclick="openEmpModal(&#39;'+e.id+'&#39;)">Изменить</button> '+
           '<button class="btn sm danger" onclick="delEmp(&#39;'+e.id+'&#39;)">Удалить</button>':'')+'</td></tr>';
    }).join(''):'<tr><td colspan="5" class="empty">Нет сотрудников</td></tr>';
    return '<div class="card"><div class="row between"><h3>'+esc(o.name)+' <span class="tag">'+esc(o.code)+'</span></h3>'+
      (isAdmin()?'<div class="row"><button class="btn sm" onclick="openEmpModal(null,&#39;'+o.id+'&#39;)">＋ Сотрудник</button>'+
        '<button class="btn sm" onclick="openVacancyModal(&#39;'+o.id+'&#39;)">＋ Вакансия</button></div>':'')+'</div>'+
      '<table class="list"><thead><tr><th style="width:40px">№</th><th>ФИО / должность</th><th style="width:170px">Телефон</th>'+
      '<th style="width:90px">График</th><th style="width:210px"></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }).join('');
  host.innerHTML='<div class="pagehead"><h1>Сотрудники</h1>'+
    '<p class="muted">ФИО, телефон и номер графика — именно в таком порядке они выводятся в графике.</p></div>'+
    (db.objects.length?byObj:'<div class="card empty">Сначала добавьте объект.</div>');
}

function openEmpModal(id,objId){
  if(!needAdmin())return;
  var e=id?empById(id):null;
  modal(e?'Изменить сотрудника':'Новый сотрудник',
    '<div class="field"><label class="f">ФИО</label><input id="e-fio" value="'+esc(e?e.fio:'')+'" placeholder="Иванов Иван Иванович"></div>'+
    '<div class="grid2"><div><label class="f">Телефон</label><input id="e-phone" value="'+esc(e?e.phone:'')+'" placeholder="+7 900 000-00-00"></div>'+
      '<div><label class="f">№ графика (1–14)</label><input id="e-graph" type="number" min="1" max="14" value="'+esc(e?e.graph:1)+'"></div></div>'+
    '<div class="grid2"><div><label class="f">Должность</label><input id="e-pos" value="'+esc(e?e.position:'Продавец')+'"></div>'+
      '<div><label class="f">Объект</label><select id="e-obj">'+db.objects.map(function(o){
        var sel=(e?e.objectId:objId)===o.id?' selected':'';
        return '<option value="'+o.id+'"'+sel+'>'+esc(o.name)+'</option>';}).join('')+'</select></div></div>'+
    '<p class="muted" style="font-size:12.5px">Номер графика задаёт сдвиг цикла 2/2/3 — как в ваших файлах Excel.</p>',
    (e?'<button class="btn danger" onclick="delEmp(&#39;'+e.id+'&#39;)">Удалить</button>':'')+
    '<button class="btn primary" onclick="saveEmp('+(e?'&#39;'+e.id+'&#39;':'null')+')">Сохранить</button>');
}
function saveEmp(id){
  var v={fio:document.getElementById('e-fio').value.trim(),phone:document.getElementById('e-phone').value.trim(),
    graph:Math.min(14,Math.max(1,Number(document.getElementById('e-graph').value)||1)),
    position:document.getElementById('e-pos').value.trim(),objectId:document.getElementById('e-obj').value};
  if(!v.fio){toast('Укажите ФИО');return;}
  if(id){Object.assign(empById(id),v,{vacancy:false});}
  else db.employees.push(Object.assign({id:uid('e'),vacancy:false},v));
  save();closeModal();render();toast('Сотрудник сохранён');
}
function delEmp(id){
  if(!needAdmin())return;
  var e=empById(id);if(!e)return;
  if(!confirm('Удалить «'+empName(e)+'» и все его отметки?'))return;
  db.employees=db.employees.filter(function(x){return x.id!==id;});
  Object.keys(db.marks).forEach(function(k){if(k.indexOf(id+'|')===0)delete db.marks[k];});
  save();closeModal();render();toast('Удалено');
}
function openVacancyModal(objId){
  if(!needAdmin())return;
  modal('Новая вакансия',
    '<div class="grid2"><div><label class="f">№ графика (1–14)</label><input id="v-graph" type="number" min="1" max="14" value="1"></div>'+
      '<div><label class="f">Должность</label><input id="v-pos" value="Продавец"></div></div>'+
    '<div class="field"><label class="f">Объект</label><select id="v-obj">'+db.objects.map(function(o){
      return '<option value="'+o.id+'"'+(o.id===objId?' selected':'')+'>'+esc(o.name)+'</option>';}).join('')+'</select></div>'+
    '<p class="muted" style="font-size:12.5px">В графике строка будет подписана «Вакансия», а все её смены попадут в «нужно перекрыть».</p>',
    '<button class="btn primary" onclick="saveVacancy()">Добавить</button>');
}
function saveVacancy(){
  db.employees.push({id:uid('e'),objectId:document.getElementById('v-obj').value,fio:'',phone:'',
    graph:Math.min(14,Math.max(1,Number(document.getElementById('v-graph').value)||1)),
    position:document.getElementById('v-pos').value.trim(),vacancy:true});
  save();closeModal();render();toast('Вакансия добавлена');
}

boot('emps',renderEmps);
