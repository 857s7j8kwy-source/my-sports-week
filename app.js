'use strict';
const names = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];
const base = [
  ['Силовая А','40–50 мин'], ['Интенсивный бег','40–55 мин'],
  ['Лёгкая аэробная','40–50 мин'], ['Силовая Б','35–45 мин'],
  ['Отдых + баня','Восстановление'], ['Длительный лесной бег','60–90 мин'],
  ['Отдых','По желанию']
];
const get = id => document.getElementById(id);
const key = 'my-sports-week-v1';
const empty = () => ({weeks:{}, templates:{}});
const valid = d => d && d.weeks && d.templates &&
  Object.entries(d.weeks).every(([k,w]) => /^\d{4}-\d\d-\d\d$/.test(k) &&
    !Number.isNaN(Date.parse(k)) && w && Number.isInteger(w.mask) && w.mask >= 0 && w.mask < 8 &&
    Array.isArray(w.done) && w.done.every(x => typeof x === 'string')) &&
  Object.entries(d.templates).every(([k,v]) => /^[0-7]$/.test(k) && Array.isArray(v) &&
    v.length === 7 && v.every(row => Array.isArray(row) && row.length === 3 &&
      row.every(s => typeof s === 'string') && row[0].trim()));
let data = empty();
try {
  const raw = localStorage.getItem(key);
  if (raw) {
    const stored = JSON.parse(raw);
    if (!valid(stored)) throw Error();
    data = stored;
  }
} catch { get('status').textContent = 'Не удалось прочитать сохранённые данные.'; }
function save() {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch { get('status').textContent = 'Данные не сохранились. Скачай резервную копию.'; }
}
function monday() {
  const now = new Date();
  now.setHours(12,0,0,0);
  now.setDate(now.getDate() - (now.getDay()+6)%7);
  return now;
}
function dateKey(date) {
  return [date.getFullYear(), date.getMonth()+1, date.getDate()]
    .map(n => String(n).padStart(2,'0')).join('-');
}
const format = date => date.toLocaleDateString('ru', {day:'numeric',month:'short',year:'numeric'});
let date = monday();
const week = () => data.weeks[dateKey(date)] || {mask:0,done:[]};
function plan(mask) {
  if (data.templates[mask]) return data.templates[mask];
  if (!mask) return base;
  return names.map((_,i) => i >= 4 && (mask & (1 << (i-4)))
    ? ['Соревнования','Старт'] : ['План не внесён','']);
}
const rowId = (i,row) => JSON.stringify([i,row[0],row[1]]);
function editWeek(update) {
  const record = week();
  update(record);
  data.weeks[dateKey(date)] = record;
  save();
}
function append(parent,tag,content) {
  const el = document.createElement(tag);
  if (content != null) el.textContent = content;
  parent.append(el);
  return el;
}
function render() {
  const {mask,done} = week();
  const rows = plan(mask);
  get('current').textContent = format(date);
  get('current').title = 'Перейти к текущей неделе';
  get('starts').replaceChildren();
  ['Пятница','Суббота','Воскресенье'].forEach((name,i) => {
    const btn = append(get('starts'),'button',name);
    btn.setAttribute('aria-pressed',String(Boolean(mask & (1<<i))));
    btn.onclick = () => { editWeek(w => {w.mask ^= 1<<i;}); render(); };
  });
  get('notice').hidden = !mask || Boolean(data.templates[mask]);
  get('notice').textContent = 'Для этого сочетания есть только дни стартов. Готовое расписание можно внести в «Шаблоны и данные».';
  get('days').replaceChildren();
  let progress = 0;
  rows.forEach((row,i) => {
    const [title,meta,detail] = row;
    const id = rowId(i,row);
    const box = append(get('days'),'div');
    box.className = 'day';
    const check = append(box,'input');
    check.type = 'checkbox';
    check.disabled = title === 'План не внесён';
    check.checked = done.includes(id);
    if (check.checked) progress++;
    check.setAttribute('aria-label',names[i]+' — '+title);
    check.onchange = () => {
      editWeek(w => {w.done = check.checked ? [...w.done,id] : w.done.filter(x => x !== id);});
      render();
      get('days').querySelectorAll('input')[i].focus();
    };
    const details = append(box,'details');
    const summary = append(details,'summary');
    append(summary,'span',names[i]).className = 'meta';
    const content = append(summary,'span',title);
    if (meta) append(content,'span',meta).className = 'meta';
    append(details,'p',detail || 'Подробности можно добавить в шаблон.').className = 'detail';
  });
  get('count').textContent = progress+'/7 выполнено';
  document.querySelector('progress').value = progress;
  get('history').replaceChildren();
  for (const k of Object.keys(data.weeks).sort().reverse()) {
    const w = data.weeks[k];
    const total = plan(w.mask).filter((row,i) => w.done.includes(rowId(i,row))).length;
    const btn = append(get('history'),'button',format(new Date(k+'T12:00:00'))+' · '+total+'/7');
    btn.onclick = () => { date = new Date(k+'T12:00:00'); render(); };
  }
  if (!get('history').children.length) append(get('history'),'p','Здесь появятся недели с отметками или выбранными стартами.');
}
function shift(days) { date.setDate(date.getDate()+days); render(); }
get('prev').onclick = () => shift(-7);
get('next').onclick = () => shift(7);
get('current').onclick = () => { date = monday(); render(); };
get('copy').onclick = async () => {
  const content = [format(date),...plan(week().mask).map(([t,m,d],i) =>
    [names[i]+' — '+t,m,d].filter(Boolean).join('\n'))].join('\n\n');
  try { await navigator.clipboard.writeText(content); get('status').textContent = 'Расписание скопировано.'; }
  catch { window.prompt('Скопируй расписание',content); }
};
get('edit').onclick = () => {
  if (document.querySelector('#editor')) return;
  const mask = week().mask;
  const form = append(get('edit').parentElement,'form');
  form.id = 'editor';
  append(form,'p','Шаблон: '+(['Пт','Сб','Вс'].filter((_,i) => mask & (1<<i)).join(' + ') || 'Без стартов'));
  const fields = plan(mask).map(([title,meta,detail],i) => {
    const field = append(form,'fieldset');
    append(field,'legend',names[i]);
    return ['Занятие','Длительность или пометка','Подробности'].map((name,j) => {
      const el = append(append(field,'label',name), j === 2 ? 'textarea' : 'input');
      el.value = [title,meta,detail || ''][j];
      el.required = j === 0;
      return el;
    });
  });
  append(form,'button','Сохранить шаблон');
  const cancel = append(form,'button','Закрыть');
  cancel.type = 'button';
  cancel.onclick = () => form.remove();
  form.onsubmit = event => {
    event.preventDefault();
    const rows = fields.map(row => row.map(el => el.value.trim()));
    if (rows.some(row => !row[0])) return;
    data.templates[mask] = rows;
    save();
    form.remove();
    render();
  };
  form.scrollIntoView();
};
get('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sports-week-'+dateKey(new Date())+'.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};
get('import').onchange = async event => {
  const [file] = event.target.files;
  event.target.value = '';
  if (!file) return;
  try {
    const restored = JSON.parse(await file.text());
    if (!valid(restored)) throw Error();
    if (!window.confirm('Заменить текущие шаблоны и историю данными из копии?')) return;
    data = restored;
    get('status').textContent = 'Копия восстановлена.';
    save();
    render();
  } catch { get('status').textContent = 'Не удалось прочитать резервную копию.'; }
};
render();
if ('serviceWorker' in navigator) {
  const showReady = () => {
    if (navigator.serviceWorker.controller) get('offline').textContent = 'Готово к работе без интернета';
  };
  navigator.serviceWorker.addEventListener('controllerchange',showReady);
  navigator.serviceWorker.register('./sw.js').then(showReady).catch(() => {
    get('offline').textContent = 'Не удалось подготовить офлайн-режим. Открой приложение через HTTPS.';
  });
} else get('offline').textContent = 'Для офлайн-режима открой приложение через HTTPS.';
