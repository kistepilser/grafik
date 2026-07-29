/* Страница «Общая база» */
var SQL_TEXT=[
'create table if not exists public.grafik_state (',
'  id int primary key,',
'  data jsonb not null default \'{}\'::jsonb,',
'  updated_at timestamptz not null default now()',
');',
'',
'insert into public.grafik_state (id, data) values (1, \'{}\'::jsonb)',
'on conflict (id) do nothing;',
'',
'alter table public.grafik_state enable row level security;',
'',
'create policy "grafik read"   on public.grafik_state for select to anon, authenticated using (true);',
'create policy "grafik insert" on public.grafik_state for insert to anon, authenticated with check (true);',
'create policy "grafik write"  on public.grafik_state for update to anon, authenticated using (true) with check (true);'
].join('\n');

function renderDatabase(){
  var c=syncCfg(),g=window.GRAFIK_CONFIG||{};
  var fromFile=!!(g.url&&g.key), st=syncState.status;
  var status=!syncOn()?'<span class="tag red">не подключено</span>'
    :st==='error'?'<span class="tag red">ошибка связи</span>'
    :st==='empty'?'<span class="tag">подключено, база пустая</span>'
    :'<span class="tag green">подключено</span>';
  document.getElementById('view').innerHTML=
    '<div class="pagehead"><h1>Общая база данных</h1>'+
      '<p class="muted">Одна база для всех компьютеров. Главное — один раз вписать адрес и ключ в файл <code>assets/config.js</code> — тогда настройки больше не слетают ни на одном компьютере.</p></div>'+

    '<div class="card"><div class="row between"><h3>Состояние</h3>'+status+'</div>'+
      '<p class="muted" style="font-size:13.5px">'+(fromFile
        ?'Настройки взяты из файла <code>assets/config.js</code> — сайт сразу открывает общую базу на любом новом компьютере.'
        :'Файл <code>assets/config.js</code> пока не заполнен. Заполните его — иначе настройки будут жить только в браузере этого компьютера.')+'</p>'+
      (syncState.at?'<p class="muted" style="font-size:12.5px">Последний обмен: '+syncState.at.toLocaleString('ru-RU')+'</p>':'')+'</div>'+

    '<div class="card"><h3>Подключение (Supabase)</h3>'+
      '<div class="field"><label class="f">Project URL</label><input id="s-url" value="'+esc(c.url)+'" placeholder="https://xxxx.supabase.co"></div>'+
      '<div class="field"><label class="f">anon public key</label><input id="s-key" value="'+esc(c.key)+'" placeholder="eyJhbGciOi..."></div>'+
      '<div class="grid2"><div><label class="f">№ записи</label><input id="s-row" type="number" min="1" value="'+esc(c.row||1)+'"></div>'+
        '<div><label class="f">Таблица</label><input id="s-table" value="'+esc(c.table||'grafik_state')+'"></div></div>'+
      '<div class="row" style="margin-top:14px;flex-wrap:wrap">'+
        '<button class="btn primary" onclick="saveSync()">Сохранить и проверить</button>'+
        '<button class="btn" onclick="pullRemote(false)">Загрузить из базы</button>'+
        '<button class="btn" onclick="pushRemote(false)">Выгрузить в базу</button>'+
        '<button class="btn ok" onclick="downloadConfig()">Скачать config.js</button>'+
        '<button class="btn ghost" onclick="copyLink()">Скопировать ссылку с настройками</button>'+
      '</div>'+
      '<p class="muted" style="font-size:12.5px">Кнопка «Скачать config.js» даёт готовый файл — положите его в папку <code>assets/</code> вместо пустого. '+
        'После этого любой человек просто открывает сайт и сразу видит общий график.</p></div>'+

    '<div class="card"><h3>Как создать базу за 5 минут</h3>'+
      '<ol class="steps"><li>Зарегистрируйтесь на supabase.com и создайте проект (бесплатно).</li>'+
      '<li>Откройте SQL Editor и выполните скрипт ниже.</li>'+
      '<li>Settings → API: скопируйте Project URL и anon public key.</li>'+
      '<li>Вставьте их выше, нажмите «Сохранить и проверить», затем «Выгрузить в базу».</li>'+
      '<li>Скачайте config.js и замените им файл в папке assets на хостинге.</li></ol>'+
      '<pre class="code">'+esc(SQL_TEXT)+'</pre>'+
      '<div class="row"><button class="btn sm" onclick="copySql()">Скопировать SQL</button></div></div>';
}
function saveSync(){
  var c={url:document.getElementById('s-url').value.trim().replace(/\/$/,''),
    key:document.getElementById('s-key').value.trim(),
    row:Number(document.getElementById('s-row').value)||1,
    table:document.getElementById('s-table').value.trim()||'grafik_state'};
  saveSyncCfg(c);renderSyncChip();
  if(!c.url||!c.key){toast('Заполните адрес и ключ');PAGE_RENDER();return;}
  pullRemote(false);
}
function configText(){
  var c=syncCfg();
  return '/* Настройки общей базы. Файл лежит рядом с сайтом — настройки одинаковы для всех компьютеров. */\n'+
    'window.GRAFIK_CONFIG = {\n'+
    '  url: '+JSON.stringify(c.url)+',\n'+
    '  key: '+JSON.stringify(c.key)+',\n'+
    '  row: '+(c.row||1)+',\n'+
    '  table: '+JSON.stringify(c.table||'grafik_state')+',\n'+
    '  title: '+JSON.stringify((window.GRAFIK_CONFIG&&window.GRAFIK_CONFIG.title)||'График смен')+',\n'+
    '  subtitle: '+JSON.stringify((window.GRAFIK_CONFIG&&window.GRAFIK_CONFIG.subtitle)||'Смены 11 часов · филиалы и замены')+'\n};\n';
}
function downloadConfig(){
  var c=syncCfg();
  if(!c.url||!c.key){toast('Сначала впишите адрес и ключ');return;}
  dl('config.js',configText(),'application/javascript');
  toast('config.js скачан — положите его в папку assets');
}
function copySql(){
  navigator.clipboard.writeText(SQL_TEXT).then(function(){toast('SQL скопирован');},function(){toast('Скопируйте вручную');});
}
function copyLink(){
  var c=syncCfg();
  if(!c.url||!c.key){toast('Сначала подключите базу');return;}
  var code=btoa(unescape(encodeURIComponent(JSON.stringify({url:c.url,key:c.key,row:c.row,table:c.table}))));
  var link=location.href.split('#')[0]+'#db='+code;
  navigator.clipboard.writeText(link).then(function(){toast('Ссылка скопирована');},function(){toast(link);});
}

boot('database',renderDatabase);
