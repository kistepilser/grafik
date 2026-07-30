/* Страница «Данные»: резервные копии и выгрузка */
function renderData(){
  document.getElementById('view').innerHTML=
    '<div class="pagehead"><h1>Данные</h1><p class="muted">Резервная копия всего графика и выгрузка в Excel/CSV.</p></div>'+
    '<div class="card"><h3>Копии и выгрузка</h3>'+
      '<div class="row" style="flex-wrap:wrap">'+
        '<button class="btn primary" onclick="expJSON()">Скачать копию (JSON)</button>'+
        '<label class="btn" style="cursor:pointer">Загрузить копию<input type="file" accept=".json" style="display:none" onchange="impJSON(this)"></label>'+
        '<button class="btn" onclick="expCSV()">График текущего месяца → CSV</button>'+
        '<button class="btn danger" onclick="resetAll()">Сбросить всё</button>'+
      '</div>'+
      '<p class="muted" style="font-size:12.5px">CSV открывается в Excel: ФИО, телефон, № графика и дни месяца.</p></div>'+
    '<div class="card"><h3>Сейчас в базе</h3>'+
      '<div class="stats">'+
        '<div class="stat"><b>'+db.objects.length+'</b><span>объектов</span></div>'+
        '<div class="stat"><b>'+db.employees.filter(function(e){return !e.vacancy&&!e.external;}).length+'</b><span>сотрудников</span></div>'+
        '<div class="stat"><b>'+db.employees.filter(function(e){return e.external;}).length+'</b><span>из др. дивизионов</span></div>'+
        '<div class="stat"><b>'+db.employees.filter(function(e){return e.vacancy;}).length+'</b><span>вакансий</span></div>'+
        '<div class="stat"><b>'+Object.keys(db.marks).length+'</b><span>отметок</span></div>'+
        '<div class="stat"><b>'+db.admins.length+'</b><span>админов</span></div>'+
      '</div></div>';
}
function expJSON(){dl('grafik-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(db,null,2),'application/json');}
function impJSON(inp){
  var f=inp.files[0];if(!f)return;
  var r=new FileReader();
  r.onload=function(){
    try{
      var j=JSON.parse(r.result);
      if(!j.objects||!j.employees)throw new Error('bad');
      db=Object.assign(defaultDB(),j);save();render();toast('Копия загружена');
    }catch(e){toast('Не удалось прочитать файл');}
  };
  r.readAsText(f);inp.value='';
}
function expCSV(){
  var y=ui.year,m=ui.month,dim=daysInMonth(y,m),obj=objById(ui.objectId);
  if(!obj){toast('Нет объекта');return;}
  var head=['№','ФИО','Телефон','№ графика'];
  for(var d=1;d<=dim;d++)head.push(d);
  head.push('Дней','Часов');
  var lines=[head.join(';')];
  db.employees.filter(function(e){return e.objectId===obj.id;}).forEach(function(e,i){
    var row=[i+1,empName(e),e.phone||'','№'+e.graph],days=0;
    for(var d=1;d<=dim;d++){
      var st=cellState(e,y,m,d),t='';
      if(st.type==='sub'){var o=objById(st.objId);t=o?o.code:'ЗМ';}
      else t=STATES[st.type].txt;
      if(e.vacancy&&st.base&&st.type!=='sub')t='Вак';
      if(['work','extra'].indexOf(st.type)>=0&&!e.vacancy)days++;
      row.push(t);
    }
    row.push(days,days*HOURS);lines.push(row.join(';'));
  });
  dl('grafik-'+obj.code+'-'+y+'-'+String(m).padStart(2,'0')+'.csv','\ufeff'+lines.join('\n'),'text/csv;charset=utf-8');
}
function resetAll(){
  if(!confirm('Удалить все данные и вернуть демо-пример?'))return;
  db=defaultDB();ui.objectId=db.objects[0].id;saveUI();save();render();toast('Сброшено');
}

boot('data',renderData);
