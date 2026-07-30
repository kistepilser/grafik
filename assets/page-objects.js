/* Страница «Объекты» */
var objQuery='';
function setObjQuery(v){objQuery=v;renderObjs();focusEnd('obj-q');}

function renderObjs(){
  var q=objQuery.trim().toLowerCase();
  var list=db.objects.filter(function(o){
    if(!q)return true;
    return (o.name||'').toLowerCase().indexOf(q)>=0||(o.address||'').toLowerCase().indexOf(q)>=0||(o.code||'').toLowerCase().indexOf(q)>=0;
  });
  var base=objById(ui.objectId);
  var rows=list.length?list.map(function(o,i){
    var staff=db.employees.filter(function(e){return e.objectId===o.id&&!e.external&&!e.vacancy;}).length;
    var vac=autoVacancies(o.id).length+db.employees.filter(function(e){return e.objectId===o.id&&e.vacancy;}).length;
    var pr=(base&&base.id!==o.id)?objProximity(base,o):null;
    return '<tr><td class="muted">'+(i+1)+'</td><td><b>'+esc(o.name)+'</b>'+
      '<div class="muted" style="font-size:12px">'+esc(o.address||'адрес не указан')+'</div></td>'+
      '<td><span class="tag">'+esc(o.code)+'</span></td>'+
      '<td>'+staff+' сотр. · '+vac+' вак. · '+slotsOf(o).length+' ставок</td>'+
      '<td>'+(pr?'<span class="tag '+(pr.km!=null&&pr.km<=5?'green':'')+'">'+esc(pr.label)+'</span>':'<span class="muted">текущий</span>')+'</td>'+
      '<td class="right">'+(isAdmin()
        ?'<button class="btn ghost sm" onclick="openObjModal(&#39;'+o.id+'&#39;)">Изменить</button> '+
         '<button class="btn sm danger" onclick="delObj(&#39;'+o.id+'&#39;)">Удалить</button>':'')+'</td></tr>';
  }).join(''):'<tr><td colspan="6" class="empty">Ничего не найдено</td></tr>';
  document.getElementById('view').innerHTML=
    '<div class="pagehead"><h1>Объекты (филиалы)</h1>'+
    '<p class="muted">Короткое обозначение ставится в ячейке графика при замене. Адрес и координаты нужны для подбора «близко к объекту».</p></div>'+
    '<div class="toolbar"><div style="min-width:260px;flex:1"><label class="f">Поиск по адресу или названию</label>'+
      '<input id="obj-q" value="'+esc(objQuery)+'" placeholder="например: Ленина" oninput="setObjQuery(this.value)"></div>'+
      (isAdmin()?'<button class="btn primary" onclick="openObjModal()">＋ Объект</button>':'')+'</div>'+
    '<div class="card"><h3>Список объектов</h3>'+
    '<table class="list"><thead><tr><th style="width:40px">№</th><th>Название / адрес</th>'+
    '<th style="width:110px">Обозн.</th><th style="width:220px">Состав</th>'+
    '<th style="width:170px">От текущего</th><th style="width:210px"></th></tr></thead>'+
    '<tbody>'+rows+'</tbody></table></div>';
}
function openObjModal(id){
  if(!needAdmin())return;
  var o=id?objById(id):null;
  modal(o?'Изменить объект':'Новый объект',
    '<div class="field"><label class="f">Название</label><input id="o-name" value="'+esc(o?o.name:'')+'" placeholder="Филиал №3 — Южный"></div>'+
    '<div class="grid2"><div><label class="f">Короткое обозначение</label><input id="o-code" maxlength="6" value="'+esc(o?o.code:'')+'" placeholder="Ф3"></div>'+
      '<div><label class="f">Адрес</label><input id="o-addr" value="'+esc(o?o.address:'')+'" placeholder="г. Москва, ул. Ленина, 10"></div></div>'+
    '<div class="grid2"><div><label class="f">Широта (необязательно)</label><input id="o-lat" value="'+esc(o&&o.lat?o.lat:'')+'" placeholder="55.7558"></div>'+
      '<div><label class="f">Долгота (необязательно)</label><input id="o-lng" value="'+esc(o&&o.lng?o.lng:'')+'" placeholder="37.6173"></div></div>'+
    '<div class="field"><label class="f">Графики ставок (через запятую)</label>'+
      '<input id="o-slots" value="'+esc(o?slotsOf(o).join(', '):'')+'" placeholder="1, 2"></div>'+
    '<p class="muted" style="font-size:12.5px">Ставка без сотрудника автоматически показывается в графике как «Вакансия». '+
    'Координаты можно взять из карт (правый клик по точке) — тогда расстояние считается в километрах; без них близость определяется по совпадению адресов.</p>',
    '<button class="btn primary" onclick="saveObj('+(o?'&#39;'+o.id+'&#39;':'null')+')">Сохранить</button>');
}
function saveObj(id){
  var slots=document.getElementById('o-slots').value.split(/[^0-9]+/).map(Number).filter(function(n){return n>=1&&n<=14;});
  var v={name:document.getElementById('o-name').value.trim(),code:document.getElementById('o-code').value.trim(),
    address:document.getElementById('o-addr').value.trim(),
    lat:Number(String(document.getElementById('o-lat').value).replace(',','.'))||null,
    lng:Number(String(document.getElementById('o-lng').value).replace(',','.'))||null,
    slots:slots};
  if(!v.name||!v.code){toast('Укажите название и обозначение');return;}
  if(id)Object.assign(objById(id),v);else db.objects.push(Object.assign({id:uid('o')},v));
  save();closeModal();render();toast('Объект сохранён');
}
function delObj(id){
  if(!needAdmin())return;
  var n=db.employees.filter(function(e){return e.objectId===id;}).length;
  if(!confirm('Удалить объект'+(n?' и '+n+' сотрудников в нём':'')+'?'))return;
  db.employees.filter(function(e){return e.objectId===id;}).forEach(function(e){
    Object.keys(db.marks).forEach(function(k){if(k.indexOf(e.id+'|')===0)delete db.marks[k];});
  });
  db.employees=db.employees.filter(function(e){return e.objectId!==id;});
  db.objects=db.objects.filter(function(o){return o.id!==id;});
  if(ui.objectId===id){ui.objectId=db.objects[0]&&db.objects[0].id;saveUI();}
  save();closeModal();render();toast('Объект удалён');
}

boot('objs',renderObjs);
