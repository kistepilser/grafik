/* Страница «Объекты» */
function renderObjs(){
  var rows=db.objects.length?db.objects.map(function(o,i){
    var cnt=db.employees.filter(function(e){return e.objectId===o.id;});
    return '<tr><td>'+(i+1)+'</td><td><b>'+esc(o.name)+'</b><div class="muted" style="font-size:12px">'+esc(o.address||'')+'</div></td>'+
      '<td><span class="tag">'+esc(o.code)+'</span></td>'+
      '<td>'+cnt.filter(function(e){return !e.vacancy;}).length+' сотр. · '+cnt.filter(function(e){return e.vacancy;}).length+' вак.</td>'+
      '<td class="right">'+(isAdmin()
        ?'<button class="btn ghost sm" onclick="openObjModal(&#39;'+o.id+'&#39;)">Изменить</button> '+
         '<button class="btn sm danger" onclick="delObj(&#39;'+o.id+'&#39;)">Удалить</button>':'')+'</td></tr>';
  }).join(''):'<tr><td colspan="5" class="empty">Нет объектов</td></tr>';
  document.getElementById('view').innerHTML=
    '<div class="pagehead"><h1>Объекты (филиалы)</h1>'+
    '<p class="muted">Короткое обозначение — это то, что ставится в ячейке графика, когда сотрудник уезжает на замену.</p></div>'+
    '<div class="card"><div class="row between"><h3>Список объектов</h3>'+
    (isAdmin()?'<button class="btn primary sm" onclick="openObjModal()">＋ Объект</button>':'')+'</div>'+
    '<table class="list"><thead><tr><th style="width:40px">№</th><th>Название / адрес</th>'+
    '<th style="width:120px">Обозн.</th><th style="width:200px">Состав</th><th style="width:210px"></th></tr></thead>'+
    '<tbody>'+rows+'</tbody></table></div>';
}
function openObjModal(id){
  if(!needAdmin())return;
  var o=id?objById(id):null;
  modal(o?'Изменить объект':'Новый объект',
    '<div class="field"><label class="f">Название</label><input id="o-name" value="'+esc(o?o.name:'')+'" placeholder="Филиал №3 — Южный"></div>'+
    '<div class="grid2"><div><label class="f">Короткое обозначение</label><input id="o-code" maxlength="6" value="'+esc(o?o.code:'')+'" placeholder="Ф3"></div>'+
      '<div><label class="f">Адрес</label><input id="o-addr" value="'+esc(o?o.address:'')+'"></div></div>',
    '<button class="btn primary" onclick="saveObj('+(o?'&#39;'+o.id+'&#39;':'null')+')">Сохранить</button>');
}
function saveObj(id){
  var v={name:document.getElementById('o-name').value.trim(),code:document.getElementById('o-code').value.trim(),
    address:document.getElementById('o-addr').value.trim()};
  if(!v.name||!v.code){toast('Укажите название и обозначение');return;}
  if(id)Object.assign(objById(id),v);else db.objects.push(Object.assign({id:uid('o')},v));
  save();closeModal();render();toast('Объект сохранён');
}
function delObj(id){
  if(!needAdmin())return;
  var n=db.employees.filter(function(e){return e.objectId===id;}).length;
  if(!confirm('Удалить объект'+(n?' и '+n+' сотрудников(вакансий) в нём':'')+'?'))return;
  db.employees.filter(function(e){return e.objectId===id;}).forEach(function(e){
    Object.keys(db.marks).forEach(function(k){if(k.indexOf(e.id+'|')===0)delete db.marks[k];});
  });
  db.employees=db.employees.filter(function(e){return e.objectId!==id;});
  db.objects=db.objects.filter(function(o){return o.id!==id;});
  if(ui.objectId===id){ui.objectId=db.objects[0]&&db.objects[0].id;saveUI();}
  save();closeModal();render();toast('Объект удалён');
}

boot('objs',renderObjs);
