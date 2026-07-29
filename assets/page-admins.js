/* Страница «Админы» */
function renderAdmins(){
  var rows=db.admins.map(function(a,i){
    return '<tr><td>'+(i+1)+'</td><td><b>'+esc(a.name||a.login)+'</b>'+(ui.me&&ui.me.id===a.id?' <span class="tag green">это вы</span>':'')+'</td>'+
      '<td>'+esc(a.login)+'</td><td>'+esc(a.role||'Администратор')+'</td>'+
      '<td class="right"><button class="btn ghost sm" onclick="openAdminModal(&#39;'+a.id+'&#39;)">Изменить</button> '+
      '<button class="btn sm danger" onclick="delAdmin(&#39;'+a.id+'&#39;)">Удалить</button></td></tr>';
  }).join('');
  document.getElementById('view').innerHTML=
    '<div class="pagehead"><h1>Учётные записи администраторов</h1>'+
    '<p class="muted">Администраторы могут редактировать график. Остальные видят его только для просмотра.</p></div>'+
    '<div class="card"><div class="row between"><h3>Администраторы</h3>'+
    '<button class="btn primary sm" onclick="openAdminModal()">＋ Админ</button></div>'+
    '<table class="list"><thead><tr><th style="width:40px">№</th><th>Имя</th><th style="width:170px">Логин</th>'+
    '<th style="width:150px">Роль</th><th style="width:210px"></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<div class="card"><h3>Важно о безопасности</h3>'+
    '<p class="muted">Это простая защита от случайных правок: логины и пароли хранятся в той же базе. '+
    'Не используйте важные пароли от других сервисов.</p></div>';
}
function openAdminModal(id){
  var a=id?db.admins.find(function(x){return x.id===id;}):null;
  modal(a?'Изменить администратора':'Новый администратор',
    '<div class="field"><label class="f">Имя</label><input id="a-name" value="'+esc(a?a.name:'')+'"></div>'+
    '<div class="grid2"><div><label class="f">Логин</label><input id="a-login" value="'+esc(a?a.login:'')+'"></div>'+
      '<div><label class="f">Пароль</label><input id="a-pass" value="'+esc(a?a.pass:'')+'"></div></div>'+
    '<div class="field"><label class="f">Роль</label><input id="a-role" value="'+esc(a?a.role:'Администратор')+'"></div>',
    '<button class="btn primary" onclick="saveAdmin('+(a?'&#39;'+a.id+'&#39;':'null')+')">Сохранить</button>');
}
function saveAdmin(id){
  var v={name:document.getElementById('a-name').value.trim(),login:document.getElementById('a-login').value.trim(),
    pass:document.getElementById('a-pass').value,role:document.getElementById('a-role').value.trim()};
  if(!v.login||!v.pass){toast('Логин и пароль обязательны');return;}
  if(db.admins.some(function(x){return x.login.toLowerCase()===v.login.toLowerCase()&&x.id!==id;})){toast('Такой логин уже есть');return;}
  if(id){var a=db.admins.find(function(x){return x.id===id;});Object.assign(a,v);if(ui.me&&ui.me.id===id)ui.me=a;}
  else db.admins.push(Object.assign({id:uid('a')},v));
  save();closeModal();render();toast('Сохранено');
}
function delAdmin(id){
  if(db.admins.length<2){toast('Должен остаться хотя бы один администратор');return;}
  if(!confirm('Удалить учётную запись?'))return;
  var self=ui.me&&ui.me.id===id;
  db.admins=db.admins.filter(function(x){return x.id!==id;});
  save();closeModal();
  if(self){logout();location.replace('index.html');return;}
  render();toast('Удалено');
}

boot('admins',renderAdmins);
