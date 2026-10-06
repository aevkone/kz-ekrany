/* Контент-завод · пульт клиента (прототип экранов «завода 2.0» внутри мини-приложения).
   Без сборщиков, чистый JavaScript — как у подарка (../app.js).
   Данные — только через ZavodApi (api.js); в демо они приходят из mock.js.

   Адреса экранов (после #):
     /intro            — «Подключить завод» для нового человека (пришёл из подарка)
     /onb/1 … /onb/N   — знакомство, шаг N из 9 (из 10, если ниши нет в списке)
     /make /plan /review /stats /rivals /settings — шесть вкладок
     /socials          — «Мои соцсети»
     /set/<раздел>     — раздел настроек
   Переключатели демо: ?role=lead (новый человек), ?step=N (закончено N шагов знакомства), ?niche=none,
   ?left=5 (до конца подписки 5 дней), ?tariff=max, ?admin=1 (режим администратора),
   ?theme=light (светлая тема, как в светлом Telegram), ?demo=0 — ходить в настоящий сервер,
   ?trial=0 — без бесплатного пробного периода, ?rivals=1 — показать вкладку «Конкуренты».
   Переключатели продукта (пробный период, «Конкуренты») — в mock.js, FEATURES; сервер отдаёт их в me.features. */
(function () {
  'use strict';

  var A = window.ZavodApi;
  var Q = new URLSearchParams(location.search);
  var tg = (window.Telegram && window.Telegram.WebApp) || null;
  var IN_TG = A.IN_TG;
  var REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var body = document.body;
  var root = document.documentElement;

  function ver(v) { try { return !!(tg && tg.isVersionAtLeast && tg.isVersionAtLeast(v)); } catch (e) { return false; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtN(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  function rub(n) { return n == null ? 'цена уточняется' : fmtN(n) + ' ₽'; }

  // ---------- демо-переключатели ----------
  // ?niche=none — ниши нет в списке (+ шаг «расскажи голосом»); ?left=5 — до конца подписки 5 дней;
  // ?tariff=max — тариф «Максимум» (2 профиля, 2 бота); ?admin=1 — режим администратора
  if (A.DEMO && window.ZAVOD_MOCK) {
    if (Q.get('niche')) ZAVOD_MOCK.setNiche(Q.get('niche'));
    if (Q.get('tariff')) ZAVOD_MOCK.setTariff(Q.get('tariff'));
    if (Q.get('left')) ZAVOD_MOCK.setDaysLeft(+Q.get('left'));
    if (Q.get('admin') === '1') ZAVOD_MOCK.setAdmin(true);
    if (Q.get('trial') != null) ZAVOD_MOCK.setFeature('trial', Q.get('trial') !== '0');
    if (Q.get('rivals') != null) ZAVOD_MOCK.setFeature('rivals', Q.get('rivals') === '1');
    if (Q.get('role')) ZAVOD_MOCK.setRole(Q.get('role'));
    // пришёл из подарка кнопкой «Подключить завод» (#/intro) — в демо это новый человек, знакомство с нуля
    else if (location.hash === '#/intro' && Q.get('step') == null) ZAVOD_MOCK.setRole('lead');
    if (Q.get('step') != null) ZAVOD_MOCK.setStep(+Q.get('step'));
  }

  // ---------- тема: тёмная по умолчанию, светлая — если Telegram в светлой ----------
  function applyTheme() {
    var t = Q.get('theme') || (IN_TG && tg.colorScheme) || 'dark';
    t = t === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', t);
    var bg = t === 'light' ? '#F5F6F7' : '#0B0D0F';
    var m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', bg);
    if (IN_TG) {
      try { if (ver('6.1')) { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); } } catch (e) {}
      try { if (ver('7.10')) tg.setBottomBarColor(bg); } catch (e) {}
    }
  }
  if (IN_TG) {
    body.classList.add('tg');
    try { tg.ready(); tg.expand(); } catch (e) {}
    try { if (ver('7.7')) tg.disableVerticalSwipes(); } catch (e) {}
    try { tg.onEvent('themeChanged', applyTheme); } catch (e) {}
  }
  applyTheme();

  var HAP = IN_TG && ver('6.1') && !!tg.HapticFeedback;
  var haptic = {
    tap: function () { try { HAP && tg.HapticFeedback.impactOccurred('light'); } catch (e) {} },
    ok: function () { try { HAP && tg.HapticFeedback.notificationOccurred('success'); } catch (e) {} },
    pick: function () { try { HAP && tg.HapticFeedback.selectionChanged(); } catch (e) {} }
  };

  var toastT, toastAt = 0;
  function toast(msg, ms) {
    var el = $('#toast'); el.textContent = msg; el.classList.add('on'); toastAt = Date.now();
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, ms || 3200);
  }
  // подсказка не переезжает на другую вкладку: при переходе гасим то, что показано раньше, чем 0,3 с назад
  function toastOffOnNav() { if (Date.now() - toastAt > 300) { clearTimeout(toastT); $('#toast').classList.remove('on'); } }
  function fail(e) { toast((e && e.human && e.message) || 'Что-то пошло не так. Попробуй ещё раз.', 4200); }

  function openLink(url, what) {
    if (A.DEMO) { toast('Демо: здесь откроется ' + what + '.'); return; }
    if (IN_TG) {
      if (/^https:\/\/t\.me\//.test(url)) { try { tg.openTelegramLink(url); return; } catch (e) {} }
      try { tg.openLink(url); return; } catch (e) {}
    }
    window.open(url, '_blank', 'noopener');
  }
  function toChat(note) {
    if (A.DEMO || !IN_TG) { toast(note || 'Пришли файл в чат с ботом — завод подхватит его сам.'); return; }
    var bot = ME && ME.bot_username;
    if (bot) try { tg.openTelegramLink('https://t.me/' + bot); } catch (e) {}
    try { tg.close(); } catch (e) {}
  }

  // ---------- значки (линейные, 1.6, как в брендбуке) ----------
  var I = {
    make: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10l5-3v10l-5-3"/></svg>',
    plan: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3M8 17h6"/></svg>',
    review: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/></svg>',
    stats: '<svg viewBox="0 0 24 24"><path d="M4 20h16M7 16v-4M12 16V8M17 16v-7"/></svg>',
    rivals: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M8.5 21h7"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>',
    cut: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 7.5L20 18M8 16.5L20 6"/></svg>',
    photos: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M21 15l-5-5-8 9"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 20.5A2.5 2.5 0 016.5 23H20v-5"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M21 4L3 11l6 2 2 6 3-4 5 4 2-15z"/></svg>',
    star: '<svg class="star" viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
    pen: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>'
  };

  var TABS_ALL = [
    { id: 'make', label: 'Сделать' },
    { id: 'plan', label: 'План' },
    { id: 'review', label: 'На утверж&shy;дение' },
    { id: 'stats', label: 'Как дела' },
    { id: 'rivals', label: 'Конкуренты' },
    { id: 'settings', label: 'Настройки' }
  ];
  var TABS = TABS_ALL;
  // переключатели продукта с сервера (me.features): trial — бесплатный пробный период, rivals — «Конкуренты»
  function feat(k) { var f = ME && ME.features; return !f || !(k in f) ? k !== 'rivals' : !!f[k]; }
  function buildTabs() {
    TABS = TABS_ALL.filter(function (t) { return t.id !== 'rivals' || feat('rivals'); });
    TAB_IDS = TABS.map(function (t) { return t.id; });
    var box = $('#tabsIn');
    box.style.gridTemplateColumns = 'repeat(' + TABS.length + ',1fr)';
    box.innerHTML = TABS.map(function (t) {
      return '<button class="z-tab" type="button" data-tab="' + t.id + '" aria-label="' + t.label.replace('&shy;', '') + '">' + I[t.id] + '<span>' + t.label + '</span></button>';
    }).join('');
    $$('.z-tab').forEach(function (b) {
      b.addEventListener('click', function () { haptic.pick(); nav('/' + b.getAttribute('data-tab')); });
    });
  }
  function setBadge(n) {
    var b = $('.z-tab[data-tab="review"]'); var i = $('i', b);
    if (n > 0) { if (!i) { i = document.createElement('i'); b.appendChild(i); } i.textContent = n; }
    else if (i) i.remove();
  }

  // ---------- главная кнопка: в Telegram — MainButton, в браузере — панель снизу (как у подарка) ----------
  var primaryFn = null;
  function primary(text, fn, opt) {
    opt = opt || {};
    primaryFn = fn;
    var visible = !!text && opt.visible !== false, active = opt.active !== false;
    if (IN_TG && tg.MainButton) {
      try {
        if (visible) tg.MainButton.setParams({ text: text.toUpperCase(), color: '#E4102B', text_color: '#FFFFFF', is_active: active, is_visible: true });
        else tg.MainButton.hide();
      } catch (e) {}
    }
    if (text) $('#ctaText').textContent = text;
    $('#ctaBtn').disabled = !active;
    $('#cta').classList.toggle('hide', !visible);
  }
  function onPrimary() { if (primaryFn) { haptic.tap(); primaryFn(); } }
  $('#ctaBtn').addEventListener('click', onPrimary);
  if (IN_TG && tg.MainButton) try { tg.MainButton.onClick(onPrimary); } catch (e) {}

  // ---------- лист снизу ----------
  function sheet(html, onOpen) {
    $('#sheetCard').innerHTML = '<div class="sheet-grip" aria-hidden="true"></div>' + html;
    $('#sheet').hidden = false; body.classList.add('locked');
    syncBack();
    if (onOpen) onOpen($('#sheetCard'));
  }
  function closeSheet() { $('#sheet').hidden = true; body.classList.remove('locked'); syncBack(); }
  $('#sheetBg').addEventListener('click', closeSheet);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });

  // ---------- маршруты ----------
  var ME = null, route = null;
  var PARENT = { socials: '/settings', set: '/settings', addon: '/settings' };
  function nav(path, replace) {
    if (replace) history.replaceState(null, '', '#' + path); else location.hash = path;
    if (replace) render();
  }
  function parse() {
    var h = (location.hash || '').replace(/^#/, '') || '';
    var parts = h.split('/').filter(Boolean);
    return { name: parts[0] || '', arg: parts[1] || '' };
  }
  function backTarget() {
    if (!route) return null;
    if (route.name === 'onb') { var n = +route.arg; return n > 1 ? '/onb/' + (n - 1) : (ME && ME.role === 'lead' ? '/intro' : null); }
    if (route.name === 'set' || route.name === 'socials') return '/settings';
    if (route.name === 'addon') return +route.arg > 1 ? '/addon/' + (+route.arg - 1) : route.arg ? '/addon' : '/settings';
    return null;
  }
  function goBack() {
    if (!$('#sheet').hidden) { closeSheet(); return; }
    var t = backTarget(); if (t) { haptic.tap(); nav(t); }
  }
  function syncBack() {
    var can = !!backTarget() || !$('#sheet').hidden;
    body.classList.toggle('can-back', can);
    if (IN_TG && tg.BackButton) try { can ? tg.BackButton.show() : tg.BackButton.hide(); } catch (e) {}
  }
  $('#backBtn').addEventListener('click', goBack);
  if (IN_TG && tg.BackButton) try { tg.BackButton.onClick(goBack); } catch (e) {}

  var TAB_IDS = TABS.map(function (t) { return t.id; });
  buildTabs();

  // число шагов знакомства меняется: 9, или 10, если своей ниши в списке нет (шаг «расскажи голосом»)
  function TOTAL() { return (ONB && ONB.steps && ONB.steps.length) || ME.onboarding_total || 9; }
  function onbDone() { return ME.onboarding_step >= TOTAL(); }

  function render() {
    if (!ME) return;
    var r = parse();
    // кто куда может попасть
    if (ME.role === 'lead' && r.name !== 'intro' && r.name !== 'onb') { nav('/intro', true); return; }
    if (ME.role !== 'lead' && !onbDone() && r.name !== 'onb' && r.name !== 'resume') {
      // знакомство не закончено: напоминание «ты не закончил» вместо меню
      if (r.name && r.name !== 'intro') toast('Сначала закончим знакомство — шаг ' + (ME.onboarding_step + 1) + ' из ' + TOTAL() + '.');
      nav(ME.onboarding_step > 0 ? '/resume' : '/onb/1', true); return;
    }
    if (r.name === 'onb') {
      var n = Math.max(1, Math.min(TOTAL(), +r.arg || 1));
      var open = (ME.role === 'lead' ? 0 : ME.onboarding_step) + 1;
      if (n > open && !onbDone()) { nav('/onb/' + open, true); return; }
    }
    if (!r.name || (!SCREENS[r.name]) || (r.name === 'rivals' && !feat('rivals'))) { nav(onbDone() && ME.role !== 'lead' ? '/make' : '/intro', true); return; }

    route = r;
    closeSheetQuiet();
    var tabbed = TAB_IDS.indexOf(r.name) >= 0 || !!PARENT[r.name];
    body.classList.toggle('has-tabs', tabbed);
    body.setAttribute('data-screen', r.name);
    var activeTab = PARENT[r.name] ? PARENT[r.name].slice(1) : r.name;
    $$('.z-tab').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === activeTab); });
    $('#topR').innerHTML = r.name === 'onb' ? '<span class="z-onb-n"><b>' + (+r.arg || 1) + '</b> / ' + TOTAL() + '</span>' : '';
    primary('', null, { visible: false });
    syncBack();

    var sec = document.createElement('section');
    sec.className = 'scr active';
    var app = $('#app'); app.innerHTML = ''; app.appendChild(sec);
    adminBar(app);
    window.scrollTo(0, 0);
    SCREENS[r.name](sec, r.arg);
    if (tabbed) remindBanner(sec, r);
  }

  // ---------- режим администратора: плашка «Тестовый режим» над каждым экраном ----------
  function adminBar(app) {
    var ad = ME && ME.admin;
    if (!ad) return;
    var el = document.createElement('div');
    el.className = 'z-admin'; el.id = 'zAdmin';
    el.innerHTML = '<div class="z-admin-h"><span class="z-st red">Тестовый режим</span><small>видишь только ты</small></div>' +
      '<div class="z-admin-b">' +
      '<button type="button" class="z-mini" id="zAdReset">' + I.swap + 'Начать знакомство заново</button>' +
      '<button type="button" class="z-mini ' + (ad.no_pay ? 'on' : '') + '" id="zAdPay" aria-pressed="' + !!ad.no_pay + '">' + (ad.no_pay ? I.check : '') + 'Без оплаты</button>' +
      '<button type="button" class="z-mini ' + (ad.publish_off ? 'on' : '') + '" id="zAdPub" aria-pressed="' + !!ad.publish_off + '">' + (ad.publish_off ? I.lock + 'Публикация выключена' : 'Публикация включена') + '</button>' +
      '<span class="z-admin-days">Остаток подписки:<button type="button" class="z-chip ' + (ME.tariff.days_left === 5 ? 'on' : '') + '" data-left="5">5 дней</button><button type="button" class="z-chip ' + (ME.tariff.days_left === 25 ? 'on' : '') + '" data-left="25">25 дней</button></span>' +
      '</div>';
    app.insertBefore(el, app.firstChild);
    $('#zAdReset', el).addEventListener('click', function () {
      haptic.tap();
      A.adminReset().then(function (d) { ME.onboarding_step = 0; ME.onboarding_total = d.onboarding_total; ONB = null; toast('Знакомство сброшено — начинаем с шага 1.'); nav('/onb/1'); }).catch(fail);
    });
    function flip(key, msgOn, msgOff) {
      var v = {}; v[key] = !ad[key];
      A.adminSet(v).then(function (d) { ME.admin = d; toast(d[key] ? msgOn : msgOff); render(); }).catch(fail);
    }
    $('#zAdPay', el).addEventListener('click', function () { flip('no_pay', 'Без оплаты: тариф выбирается, но платить не нужно.', 'Оплата снова как у клиента.'); });
    $('#zAdPub', el).addEventListener('click', function () { flip('publish_off', 'Публикация выключена: утверждённое не уходит в соцсети.', 'Публикация включена — утверждённое выходит в соцсети.'); });
    $$('[data-left]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var v = +b.getAttribute('data-left');
        A.adminSet({ days_left: v }).then(function () { ME.tariff.days_left = v; toast('До конца подписки теперь ' + v + ' ' + daysWord(v) + '.'); render(); }).catch(fail);
      });
    });
  }

  // ---------- напоминание-плашка: «ждут утверждения N черновиков» и т. п. ----------
  function remindBanner(sec, r) {
    A.reminders().then(function (d) {
      if (route !== r || !d.on) return;
      var it = (d.items || []).filter(function (x) { return x.go !== '/' + r.name; })[0];
      if (!it) return;
      var el = document.createElement('button');
      el.type = 'button'; el.className = 'z-remind';
      el.innerHTML = '<span class="dot"></span><span class="z-row-t">' + esc(it.text) + '</span><span class="go">Продолжить</span>';
      el.addEventListener('click', function () { haptic.tap(); if (it.go === '/review') UI.review = 'drafts'; nav(it.go); });
      sec.insertBefore(el, sec.firstChild);
    }).catch(function () {});
  }
  function closeSheetQuiet() { if (!$('#sheet').hidden) { $('#sheet').hidden = true; body.classList.remove('locked'); } }
  window.addEventListener('hashchange', function () { toastOffOnNav(); render(); });

  function loading(sec, n) {
    sec.innerHTML = '<div class="z-skel"></div>'.repeat(n || 3);
  }
  function head(eyebrow, title, lead) {
    return '<div class="eyebrow">' + eyebrow + '</div><h2 class="title2">' + title + '</h2>' + (lead ? '<p class="lead">' + lead + '</p>' : '');
  }
  function seg(items, on) {
    return '<div class="z-seg" role="tablist">' + items.map(function (it) {
      return '<button type="button" role="tab" data-seg="' + it.id + '" class="' + (it.id === on ? 'on' : '') + '" aria-selected="' + (it.id === on) + '">' + it.label + (it.n != null ? '<b>' + it.n + '</b>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function bindSeg(sec, fn) {
    $$('[data-seg]', sec).forEach(function (b) { b.addEventListener('click', function () { haptic.pick(); fn(b.getAttribute('data-seg')); }); });
  }

  var SCREENS = {};
  var UI = { review: 'drafts', plan: 'days', stats: 'week' };

  // ---------- тарифы: считаются по ОПУБЛИКОВАННОМУ; черновики не скачиваются ----------
  function usageBar(lbl, x) {
    var pct = x.limit ? Math.min(100, Math.round(x.used / x.limit * 100)) : 0;
    return '<div class="z-bar-l"><span>' + lbl + '</span><span>' + x.used + ' из ' + x.limit + '</span></div><div class="z-bar"><u style="width:' + pct + '%"></u></div>';
  }
  function usageBlock(u, compact) {
    return '<div class="z-card z-usage z-in' + (compact ? ' compact' : '') + '"><div class="eyebrow">Опубликовано по тарифу «' + esc(u.name) + '»</div>' +
      usageBar('Рилсы', u.reels) + usageBar('Карусели', u.carousels) +
      (compact ? '' : '<p class="fine" style="margin-top:12px">Считаем только вышедшее в соцсетях. Черновики — бесплатно, сколько угодно.</p>') + '</div>';
  }
  function reelsWord(n) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'рилс' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'рилса' : 'рилсов'; }
  function carWord(n) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'карусель' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'карусели' : 'каруселей'; }
  // «Что входит» — раскрывающееся меню на каждом тарифе: ✓ входит / — не входит (пункт 1)
  var TAR_OPEN = {};
  function incRows(d, id) {
    var inc = (d.inc || {})[id] || {};
    return '<ul class="z-inc">' + (d.rows || []).map(function (r) {
      var v = inc[r.k], yes = v !== false && v != null;
      var val = typeof v === 'string' ? v : '';
      return '<li class="' + (yes ? 'y' : 'n') + '"><i aria-hidden="true">' + (yes ? '✓' : '—') + '</i><span>' + esc(r.t) + (val ? ' <b>' + esc(val) + '</b>' : '') +
        '</span><span class="sr">' + (yes ? 'входит' : 'не входит') + '</span></li>';
    }).join('') + '</ul>';
  }
  function tariffCard(t, on, attr, d) {
    var open = !!TAR_OPEN[t.id];
    return '<div class="z-tar-w z-in ' + (on ? 'on' : '') + '"><button class="z-opt z-tar ' + (on ? 'on' : '') + '" type="button" ' + attr + '="' + t.id + '"><span class="rd"></span><span class="z-tar-t">' +
      '<span class="z-tar-h"><b>' + esc(t.name) + '</b><span class="z-price">' + rub(t.price) + '<small>' + esc(t.period) + '</small></span></span>' +
      (t.reels != null ? '<span class="z-tar-inc"><span>' + t.reels + ' ' + reelsWord(t.reels) + '</span><span>' + t.carousels + ' ' + carWord(t.carousels) + '</span></span>' : '') +
      '<small>' + esc(t.text) + '</small></span></button>' +
      '<button class="z-tar-more" type="button" data-more="' + t.id + '" aria-expanded="' + open + '">Что входит<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>' +
      (open ? incRows(d, t.id) : '') + '</div>';
  }
  function tariffList(d, pick, attr) {
    return '<div class="z-tars">' + d.items.map(function (t) { return tariffCard(t, t.id === pick, attr, d); }).join('') + '</div>' +
      '<div class="eyebrow" style="margin-top:22px">Разово</div>' + tariffCard(d.once, d.once.id === pick, attr, d) +
      (d.extra ? '<div class="z-note">' + I.plus + '<span>' + esc(d.extra) + '</span></div>' : '') +
      '<div class="z-note">' + I.lock + '<span>' + esc(d.rule) + '</span></div>' +
      (d.pay_note ? '<div class="z-note">' + I.info + '<span>' + esc(d.pay_note) + '</span></div>' : '');
  }
  function bindMore(sec, redraw) {
    $$('[data-more]', sec).forEach(function (b) {
      b.addEventListener('click', function () { haptic.pick(); var id = b.getAttribute('data-more'); TAR_OPEN[id] = !TAR_OPEN[id]; var y = window.scrollY; redraw(); window.scrollTo(0, y); });
    });
  }
  function tariffName(d, id) { var t = d ? d.items.concat([d.once]).filter(function (x) { return x.id === id; })[0] : null; return t ? t.name : ''; }

  // ======================================================================
  // ПОДКЛЮЧИТЬ ЗАВОД — для нового человека, пришедшего из подарка
  // ======================================================================
  // ======================================================================
  // ТЫ НЕ ЗАКОНЧИЛ — знакомство брошено на середине
  // ======================================================================
  var STEP_NAMES = ['Согласия', 'Тариф или пробный период', 'Ниша', 'Распаковка голосом', 'Книга смыслов', 'Стиль каруселей', 'Формат рилсов', 'Соцсети', 'Первый план'];
  function stepNames() { return ONB && ONB.steps ? ONB.steps.map(function (s) { return s.title; }) : baseSteps(); }
  function baseSteps() { var a = STEP_NAMES.slice(); if (!feat('trial')) a[1] = 'Тариф'; return a; }
  SCREENS.resume = function (sec) {
    if (!ONB) { withOnb(sec, function () { SCREENS.resume(sec); }, 'resume'); return; }
    var n = ME.onboarding_step + 1;
    var names = stepNames();
    sec.innerHTML = '<span class="plaque in"><i></i>Напоминание</span>' +
      '<h2 class="title2" style="margin-top:16px">Ты не закончил: <em>шаг ' + n + ' из ' + names.length + '</em></h2>' +
      '<p class="lead">Всё, что ты уже рассказал, сохранено. Продолжим с того места, где остановились.</p>' +
      '<div class="z-sec"><div class="z-card"><ol class="z-nine">' + names.map(function (t, k) {
        var st = k + 1 < n ? '<span class="z-st ok">Готово</span>' : k + 1 === n ? '<span class="z-st red">Сейчас</span>' : '';
        return '<li style="align-items:center"><b>' + (k < 9 ? '0' : '') + (k + 1) + '</b><span style="flex:1">' + t + '</span>' + st + '</li>';
      }).join('') + '</ol></div></div>' +
      '<p class="fine">Напоминания можно поставить на паузу в настройках — после знакомства.</p>';
    primary('Продолжить', function () { nav('/onb/' + n); });
  };

  SCREENS.intro = function (sec) {
    var feats = [
      ['make', 'Сделать', 'Присылаешь видео, фото или тему голосом'],
      ['plan', 'План', 'Темы на две недели и что снять'],
      ['review', 'Утверждение', 'Без твоего «Утвердить» не выходит ничего'],
      ['stats', 'Как дела', 'Цифры по соцсетям и что снимать дальше'],
      ['rivals', 'Конкуренты', 'Разбор чужого ролика: почему держит'],
      ['settings', 'Настройки', 'Соцсети, стиль, время выхода']
    ].filter(function (f) { return f[0] !== 'rivals' || feat('rivals'); });
    var nine = baseSteps();
    sec.innerHTML =
      '<span class="plaque in"><i></i>Завод в Telegram</span>' +
      '<h1 class="title"><span class="ln"><span>Контент, который</span></span><span class="ln"><span>собирается сам —</span></span><span class="ln"><span><em>на твоих смыслах</em></span></span></h1>' +
      '<p class="lead in d2">Ты присылаешь видео и фото, завод собирает рилсы, карусели и подписи, а после твоего «Утвердить» — выкладывает в соцсети, которые ты подключил: Telegram, Instagram, YouTube и сообщество ВКонтакте.</p>' +
      '<div class="z-sec"><div class="eyebrow">Что внутри</div><div class="z-feat">' +
      feats.map(function (f) { return '<div class="z-in">' + I[f[0]] + '<b>' + f[1] + '</b><small>' + f[2] + '</small></div>'; }).join('') +
      '</div></div>' +
      '<div class="z-sec"><div class="eyebrow">Как начнём</div><div class="z-card"><ol class="z-nine">' +
      nine.map(function (t, k) { return '<li><b>' + (k < 9 ? '0' : '') + (k + 1) + '</b><span>' + t + '</span></li>'; }).join('') +
      '</ol></div><p class="fine">Знакомство проходит по одному шагу. Можно частями, в разные дни — завод запомнит, где ты остановился.</p></div>' +
      '<details class="tips z-words"><summary>Что значат слова</summary><ul>' +
      '<li><b>Рилс</b> — короткое вертикальное видео, до минуты.</li>' +
      '<li><b>Карусель</b> — пост из нескольких картинок, их листают пальцем.</li>' +
      '<li><b>Распаковка</b> — ты отвечаешь на вопросы о себе и своём деле, из ответов завод узнаёт, о чём тебе говорить.</li>' +
      '<li><b>Книга смыслов</b> — всё, что завод о тебе узнал: кто ты, кому помогаешь, как говоришь.</li>' +
      '<li><b>Профиль</b> — набор твоих соцсетей: личный или для дела.</li></ul></details>' +
      '<p class="fine center" style="margin-top:22px">Смыслы — твои. Машинной становится только сборка.</p>' +
      '<button class="link-btn" type="button" id="zTalk">Сначала поговорить с Валерией</button>';
    $('#zTalk', sec).addEventListener('click', function () { toast('Напиши Валерии слово ЗАВОД — она расскажет, как работает наша автоматизация.', 4500); });
    primary('Подключить завод', function () { nav('/onb/1'); });
  };

  // ======================================================================
  // ЗНАКОМСТВО — 9 шагов
  // ======================================================================
  var ONB = null;
  function withOnb(sec, fn, name) {
    if (ONB) { fn(ONB); return; }
    loading(sec, 3);
    A.onboarding().then(function (d) { ONB = d; ME.onboarding_total = d.steps.length; if (route && route.name === (name || 'onb')) fn(d); }).catch(fail);
  }
  function stepDone(n, data) {
    return A.stepDone(n, data).then(function (d) {
      ME.onboarding_step = Math.max(ME.onboarding_step, d.onboarding_step || n);
      if (d.onboarding_total) ME.onboarding_total = d.onboarding_total;
      if (d.steps && ONB) ONB.steps = d.steps;
      if (ME.role === 'lead') ME.role = 'client';
      haptic.ok();
      return d;
    });
  }
  function onbHead(n, title, lead) {
    var tot = TOTAL(), bar = '';
    for (var i = 1; i <= tot; i++) bar += '<i class="' + (i < n ? 'past' : i === n ? 'on' : '') + '"></i>';
    return '<div class="z-prog" style="grid-template-columns:repeat(' + tot + ',1fr)" aria-hidden="true">' + bar + '</div>' + head('Знакомство · шаг ' + n + ' из ' + tot, title, lead);
  }
  function next(n, data) {
    $('#ctaBtn').disabled = true;
    return stepDone(n, data).then(function () { nav(n < TOTAL() ? '/onb/' + (n + 1) : '/make'); })
      .catch(function (e) { $('#ctaBtn').disabled = false; fail(e); });
  }

  SCREENS.onb = function (sec, arg) {
    withOnb(sec, function (o) {
      var n = Math.max(1, Math.min(o.steps.length, +arg || 1));
      $('#topR').innerHTML = '<span class="z-onb-n"><b>' + n + '</b> / ' + o.steps.length + '</span>';
      ONB_STEPS[o.steps[n - 1].key](sec, o, n);
    });
  };

  // ---------- мини-превью стиля карусели: рисуется CSS, цвет — выбранный ----------
  function styleThumb(s, color, big) {
    var anim = /^a-/.test(s.look);
    return '<span class="z-thumb lk-' + s.look + (anim ? ' anim' : '') + (big ? ' big' : '') + '" style="--acc:' + (color || s.acc) + '" aria-hidden="true">' +
      '<span class="t1"></span><span class="t2"></span><span class="t3"></span><span class="ph"></span>' +
      '<span class="nm">' + esc(s.name.split(' · ')[0]) + '</span></span>';
  }
  function allStyles(o) { return o.styles.regular.concat(o.styles.old, o.styles.animated); }

  var ONB_STEPS = {
    consents: function (sec, o, n) {
      sec.innerHTML = onbHead(n, 'Сначала — <em>согласия</em>', 'Три галочки, чтобы завод мог работать с твоими материалами. Отозвать любое можно в настройках.') +
        o.consents.map(function (c) {
          return '<label class="consent z-in"><input type="checkbox" data-c="' + c.id + '"><span class="cb" aria-hidden="true"></span><span class="ctext"><b style="display:block;font:600 16px/1.2 var(--H);color:inherit;margin-bottom:4px">' + esc(c.title) + '</b>' + esc(c.text) + '</span></label>';
        }).join('') +
        '<p class="fine">Полный текст — <button type="button" class="inline-link" id="zPol">Политика обработки данных</button></p>';
      $('#zPol', sec).addEventListener('click', function () { if (A.DEMO) toast('Демо: здесь откроется полный текст.'); else location.href = 'dokumenty/soglasie.html'; });
      function upd() {
        var all = $$('[data-c]', sec).every(function (c) { return c.checked; });
        $$('.consent', sec).forEach(function (l) { l.classList.toggle('ok', $('input', l).checked); });
        primary('Дальше', function () { next(n); }, { active: all });
      }
      $$('[data-c]', sec).forEach(function (c) { c.addEventListener('change', function () { haptic.pick(); upd(); }); });
      upd();
    },
    // ---- шаг 2: тарифы с «что входит» или пробный период (пункт 1) ----
    access: function (sec, o, n) {
      // пришли из подарка по кнопке «Подключить завод» (?tarif=day) — сразу выбран этот тариф
      var fromGift = Q.get('tarif') || '';
      var pick = fromGift ? 'pay' : 'trial', tar = fromGift || 'day', T = null, trialOn = feat('trial');
      loading(sec, 3);
      A.tariffs().then(function (d) {
        T = d; if (d.trial_on != null) trialOn = !!d.trial_on;
        var known = !!fromGift && (d.items || []).concat(d.once ? [d.once] : []).some(function (x) { return x.id === fromGift; });
        if (known) { pick = 'pay'; tar = fromGift; }
        else {
          pick = 'trial'; tar = d.current || 'day';
          // без пробного периода по умолчанию выбраны «Сутки» — самая короткая проба
          if (!trialOn) { pick = 'pay'; tar = 'day'; }
        }
        draw();
      }).catch(fail);
      function draw() {
        var noPay = !!(ME.admin && ME.admin.no_pay);
        sec.innerHTML = (trialOn
          ? onbHead(n, 'Тариф или <em>пробный период</em>', 'Посмотри завод на своих материалах, прежде чем платить. Или сразу выбери тариф — раскрой «Что входит», чтобы сравнить.') +
            '<button class="z-opt z-in ' + (pick === 'trial' ? 'on' : '') + '" type="button" data-o="trial"><span class="rd"></span><span><b>Пробный период</b><small>Пройдём знакомство и соберём первые черновики. Без оплаты, один раз.</small></span></button>'
          : onbHead(n, 'Выбери <em>тариф</em>', 'Начни с «Суток», чтобы проверить завод на своих материалах. Раскрой «Что входит», чтобы сравнить.')) +
          '<div class="z-sec"><div class="eyebrow">Тарифы · платишь за опубликованное</div>' + tariffList(T, pick === 'pay' ? tar : '', 'data-tar') + '</div>' +
          (noPay ? '<div class="z-note">' + I.info + '<span>Тестовый режим «Без оплаты»: тариф запомнится, страница оплаты не откроется.</span></div>' : '');
        $$('[data-o]', sec).forEach(function (b) { b.addEventListener('click', function () { haptic.pick(); pick = 'trial'; var y = window.scrollY; draw(); window.scrollTo(0, y); }); });
        $$('[data-tar]', sec).forEach(function (b) { b.addEventListener('click', function () { haptic.pick(); pick = 'pay'; tar = b.getAttribute('data-tar'); var y = window.scrollY; draw(); window.scrollTo(0, y); }); });
        bindMore(sec, draw);
        primary(pick === 'trial' ? 'Начать пробный период' : noPay ? 'Дальше без оплаты · ' + tariffName(T, tar) : 'Оплатить · ' + tariffName(T, tar), function () {
          if (pick === 'pay' && !noPay) A.tariffChoose(tar).then(function (r) { openLink(r.pay_url, 'страница оплаты'); }).catch(fail);
          next(n, { access: pick, tariff: pick === 'pay' ? tar : null, no_pay: noPay });
        });
      }
    },

    // ---- шаг 3: ниша только из списка — 9 групп, 67 ниш (пункт 2) ----
    niche: function (sec, o, n) {
      var mode = o.niche.mode || 'list', picked = (o.niche.picked || []).slice(), q = '', openG = {};
      o.niche_groups.forEach(function (g, k) { if (g[1].some(function (x) { return picked.indexOf(x) >= 0; })) openG[k] = true; });
      if (!Object.keys(openG).length) openG[0] = true;
      var total = o.niche_groups.reduce(function (s, g) { return s + g[1].length; }, 0);
      function list() {
        var qq = q.toLowerCase();
        return o.niche_groups.map(function (g, k) {
          var items = qq ? g[1].filter(function (x) { return x.toLowerCase().indexOf(qq) >= 0; }) : g[1];
          if (!items.length) return '';
          var open = qq || openG[k], has = g[1].filter(function (x) { return picked.indexOf(x) >= 0; }).length;
          return '<div class="z-grp ' + (open ? 'open' : '') + '"><button type="button" class="z-grp-h" data-g="' + k + '" aria-expanded="' + !!open + '"><b>' + esc(g[0]) + '</b><small>' + (has ? '<span class="z-st ok">выбрано ' + has + '</span>' : g[1].length) + '</small><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>' +
            (open ? '<div class="z-chips">' + items.map(function (x) { return '<button type="button" class="z-chip ' + (picked.indexOf(x) >= 0 ? 'on' : '') + '" data-n="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div>' : '') + '</div>';
        }).join('') || '<div class="z-empty">Такой ниши в списке нет. Нажми «Не нашёл» ниже.</div>';
      }
      function draw() {
        sec.innerHTML = onbHead(n, 'Твоя <em>ниша</em>', mode === 'none'
          ? 'Выбери до двух ниш, которые ближе всего к твоей. Чем ты занимаешься, расскажешь голосом на следующем шаге.'
          : 'Выбери из списка: ' + o.niche_groups.length + ' групп, ' + total + ' ниш. Под каждую у завода готовы смыслы, первые фразы для роликов и темы.') +
          (mode === 'none' ? '<div class="z-note acc">' + I.info + '<span><b>Не нашёл свою.</b> Выбрано ' + picked.length + ' из 2 смежных. <button type="button" class="inline-link" id="zBackList">Вернуться к одной нише</button></span></div>' : '') +
          '<div class="z-search"><input id="zQ" type="search" placeholder="Найти в списке: например, косметолог" value="' + esc(q) + '" autocomplete="off"></div>' +
          '<div class="z-grps" id="zGrps">' + list() + '</div>' +
          (mode === 'list' ? '<button class="z-row z-notfound" type="button" id="zNone"><span class="z-ic">' + I.plus + '</span><span class="z-row-t"><b>Не нашёл свою нишу</b><small>Выбери до 2 смежных — а дальше расскажешь голосом, чем занимаешься</small></span>' + I.chev + '</button>' : '');
        bind();
        upd();
      }
      function bindList() {
        $$('#zGrps [data-g]', sec).forEach(function (b) { b.addEventListener('click', function () { haptic.pick(); var k = b.getAttribute('data-g'); openG[k] = !openG[k]; redrawList(); }); });
        $$('#zGrps [data-n]', sec).forEach(function (b) {
          b.addEventListener('click', function () {
            haptic.pick(); var x = b.getAttribute('data-n'), k = picked.indexOf(x);
            if (mode === 'list') picked = k >= 0 ? [] : [x];
            else if (k >= 0) picked.splice(k, 1);
            else if (picked.length >= 2) { toast('Смежных можно выбрать до двух.'); return; }
            else picked.push(x);
            var y = window.scrollY;
            if (mode === 'none') draw(); else { redrawList(); upd(); }
            window.scrollTo(0, y);
          });
        });
      }
      function bind() {
        bindList();
        var qi = $('#zQ', sec);
        qi.addEventListener('input', function () { q = qi.value.trim(); redrawList(); });
        var nf = $('#zNone', sec); if (nf) nf.addEventListener('click', function () { haptic.tap(); mode = 'none'; picked = picked.slice(0, 2); draw(); window.scrollTo(0, 0); });
        var bl = $('#zBackList', sec); if (bl) bl.addEventListener('click', function () { mode = 'list'; picked = picked.slice(0, 1); draw(); });
      }
      function redrawList() {
        var y = window.scrollY;
        $('#zGrps', sec).innerHTML = list();
        bindList();
        window.scrollTo(0, y);
      }
      function upd() {
        if (mode === 'list') primary(picked.length ? 'Дальше · ' + picked[0] : 'Выбери нишу из списка', function () {
          o.niche = { mode: 'list', picked: picked }; next(n, { niche_mode: 'list', niches: picked });
        }, { active: picked.length === 1 });
        else primary('Дальше · расскажу голосом', function () {
          o.niche = { mode: 'none', picked: picked }; next(n, { niche_mode: 'none', niches: picked });
        });
      }
      draw();
    },

    // ---- шаг 4 (только если ниши нет в списке): расскажи голосом (пункт 2) ----
    niche_voice: function (sec, o, n) {
      var said = false, rec = false;
      function draw() {
        sec.innerHTML = onbHead(n, 'Расскажи <em>голосом</em>, чем занимаешься', 'Своими словами: что делаешь, для кого и чем ты отличаешься. Минуты хватит.') +
          (o.niche.picked && o.niche.picked.length ? '<div class="z-card z-in" style="margin-top:16px"><div class="eyebrow">Смежные ниши</div><div class="z-chips" style="margin-top:10px">' + o.niche.picked.map(function (x) { return '<span class="z-chip on">' + esc(x) + '</span>'; }).join('') + '</div><p class="fine" style="margin-top:10px">Возьмём из них то, что подходит, — остальное соберём по твоему рассказу.</p></div>' : '') +
          '<div class="z-q z-in" style="margin-top:16px"><div class="eyebrow">Подсказка</div><p>Чем ты занимаешься и кто к тебе приходит?</p><small>Например: «делаю мебель на заказ из массива, ко мне приходят семьи после ремонта».</small></div>' +
          '<div class="z-mic-w z-in"><button class="z-mic ' + (rec ? 'rec' : '') + '" type="button" id="zMic" aria-label="Записать рассказ">' + I.mic + '</button><div class="z-mic-l" id="zMicL">' + (said ? 'Записано · можно перезаписать' : rec ? '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>Слушаю… нажми, когда закончишь' : 'Нажми и говори') + '</div></div>' +
          (said ? '<div class="z-card ok z-in"><span class="z-st ok">Принял</span><p style="margin-top:8px">Расшифровываю и добавлю в твою книгу смыслов. Если что-то понял не так — поправишь на шаге «Книга смыслов».</p></div>' : '');
        $('#zMic', sec).addEventListener('click', function () {
          haptic.tap();
          if (!rec) { rec = true; said = false; draw(); return; }
          rec = false; said = true; A.interviewAnswer('').catch(function () {}); draw();
        });
        primary(said ? 'Дальше' : 'Сначала расскажи голосом', function () { next(n); }, { active: said });
      }
      draw();
    },

    // ---- распаковка голосом + запись на личную распаковку к Валерии (пункт 3) ----
    interview: function (sec, o, n) {
      var iv = o.interview;
      function draw() {
        sec.innerHTML = onbHead(n, 'Распаковка <em>голосом</em>', 'Я задаю вопрос — ты отвечаешь, как другу. Из ответов соберётся твоя книга смыслов.') +
          '<div class="z-bar-l"><span>Ответов</span><span>' + iv.answered + ' из ' + iv.total + '</span></div><div class="z-bar"><u style="width:' + Math.round(iv.answered / iv.total * 100) + '%"></u></div>' +
          '<div class="z-q z-in" style="margin-top:18px"><div class="eyebrow">Вопрос ' + Math.min(iv.total, iv.answered + 1) + '</div><p>' + esc(iv.question) + '</p><small>' + esc(iv.hint) + '</small></div>' +
          '<div class="z-mic-w z-in"><button class="z-mic" type="button" id="zMic" aria-label="Записать ответ">' + I.mic + '</button><div class="z-mic-l" id="zMicL">Нажми и говори</div></div>' +
          '<button class="link-btn" type="button" id="zText">Ответить текстом</button>' +
          '<div class="z-card acc z-unpack z-in" style="margin-top:18px"><span class="z-tag">Вживую</span><h3 style="margin-top:10px">Хочешь распаковку с Валерией?</h3><p>Личный созвон: Валерия и команда вместе с тобой собирают книгу смыслов. Разово, не подписка.</p>' +
          '<button class="btn block" type="button" id="zUnpack" style="margin-top:12px">' + I.mic + 'Записаться на личную распаковку к Валерии</button></div>' +
          '<div class="z-note">' + I.book + '<span>Есть готовая книга смыслов? Пришли файл — PDF, Word или текст — в чат с ботом, и вопросы не понадобятся.</span></div>';
        var rec = false, mic = $('#zMic', sec);
        mic.addEventListener('click', function () {
          haptic.tap();
          if (!rec) { rec = true; mic.classList.add('rec'); $('#zMicL', sec).innerHTML = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>Слушаю… нажми, когда закончишь'; return; }
          rec = false; mic.classList.remove('rec'); $('#zMicL', sec).textContent = 'Принял, расшифровываю…';
          A.interviewAnswer('').then(function (d) { iv = d; o.interview = d; toast('Ответ сохранён. Следующий вопрос — ниже.'); draw(); }).catch(fail);
        });
        $('#zText', sec).addEventListener('click', function () {
          sheet('<h3 class="sheet-h" id="sheetH">Ответ <em>текстом</em></h3><p class="sheet-sub">' + esc(iv.question) + '</p><textarea class="z-ta" id="zAns" style="margin-top:14px" placeholder="Пиши как есть — с примерами и деталями"></textarea><button class="btn block" type="button" id="zAnsGo" style="margin-top:12px">Отправить ответ</button>', function (c) {
            $('#zAnsGo', c).addEventListener('click', function () {
              A.interviewAnswer($('#zAns', c).value).then(function (d) { iv = d; o.interview = d; closeSheet(); draw(); }).catch(fail);
            });
          });
        });
        $('#zUnpack', sec).addEventListener('click', function () { haptic.tap(); unpackSheet(); });
        primary('К книге смыслов', function () { next(n); }, { active: iv.answered >= 3 });
      }
      draw();
    },

    // ---- книга смыслов: только в приложении, PDF — за доплату (пункт 3) ----
    book: function (sec, o, n) {
      function draw() {
        var left = o.book.filter(function (s) { return !s.ok; }).length;
        sec.innerHTML = onbHead(n, 'Твоя книга <em>смыслов</em>', 'Черновик собран из твоих ответов. Проверь каждый раздел: всё верно — или поправь голосом.') +
          bookOnlyHere() +
          '<div class="z-book" style="margin-top:18px">' + o.book.map(function (s) {
            return '<div class="z-card z-in ' + (s.ok ? 'ok' : '') + '"><h3>' + esc(s.title) + (s.ok ? '<span class="z-st ok">Верно</span>' : '<span class="z-st wait">Проверь</span>') + '</h3><p>' + esc(s.text) + '</p>' +
              (s.ok ? '' : '<div class="z-acts"><button class="z-mini ok" type="button" data-ok="' + s.id + '">' + I.check + 'Всё верно</button><button class="z-mini" type="button" data-fix="' + s.id + '">' + I.mic + 'Поправлю голосом</button></div>') + '</div>';
          }).join('') + '</div><p class="fine">В книге 14 разделов; здесь — первые. Остальные откроются в настройках, поправить можно в любой момент.</p>';
        bindPdf(sec);
        $$('[data-ok]', sec).forEach(function (b) {
          b.addEventListener('click', function () {
            var id = b.getAttribute('data-ok');
            A.bookSection(id, true).then(function () { o.book.forEach(function (s) { if (s.id === id) s.ok = true; }); haptic.ok(); draw(); }).catch(fail);
          });
        });
        $$('[data-fix]', sec).forEach(function (b) { b.addEventListener('click', function () { toChat('Демо: скажи в чате с ботом, что поменять, — раздел перепишется.'); }); });
        primary(left ? 'Проверь ещё ' + left : 'Книга верна', function () { next(n); }, { active: !left });
      }
      draw();
    },

    // ---- стиль каруселей: все обычные и анимированные, с выбором цвета (пункты 4 и 5) ----
    carousels: function (sec, o, n) {
      var pick = (o.carousel_pick || []).map(function (x) { return typeof x === 'string' ? { id: x, color: '' } : x; });
      var tab = UI.styles || 'regular';
      var S = o.styles, byId = {};
      allStyles(o).forEach(function (s) { byId[s.id] = s; });
      function pickOf(id) { return pick.filter(function (x) { return x.id === id; })[0]; }
      function tile(s) {
        var p = pickOf(s.id), k = pick.indexOf(p), anim = /^anim_/.test(s.id);
        return '<button type="button" class="z-tpl z-in ' + (p ? 'on' : '') + '" data-t="' + s.id + '">' + styleThumb(s, p && p.color) +
          (anim ? '<span class="z-anim-b">' + esc(S.anim_badge) + '</span>' : '') +
          '<b>' + esc(s.name) + '</b><small>' + esc(s.note) + '</small>' + (p ? '<em>' + (k + 1) + '</em>' : '') + '</button>';
      }
      function draw() {
        var list = tab === 'animated' ? S.animated : S.regular;
        sec.innerHTML = (n ? onbHead(n, 'Стиль <em>каруселей</em>', 'Все стили завода. Нажми на стиль — выбери цвет. Можно до трёх: завод будет чередовать.') : head('Настройки', 'Стиль <em>каруселей</em>', 'Нажми на стиль — выбери цвет. Можно до трёх: завод будет чередовать.')) +
          '<div class="z-picked">' + (pick.length ? pick.map(function (p) { var s = byId[p.id]; return '<button type="button" class="z-chip on" data-t="' + p.id + '"><i class="z-dot" style="background:' + (p.color || s.acc) + '"></i>' + esc(s.name) + '</button>'; }).join('') : '<span class="fine" style="margin:0">Пока ничего не выбрано</span>') + '<span class="z-picked-n">' + pick.length + ' из 3</span></div>' +
          seg([{ id: 'regular', label: 'Обычные', n: S.regular.length }, { id: 'animated', label: 'Анимированные', n: S.animated.length }], tab) +
          (tab === 'animated' ? '<div class="z-note">' + I.spark + '<span>Анимированные карусели — слайды двигаются. Входят в тариф «Максимум».</span></div>' : '') +
          '<div class="z-pick" style="margin-top:14px">' + list.map(tile).join('') + '</div>';
        bindSeg(sec, function (v) { UI.styles = tab = v; draw(); });
        $$('[data-t]', sec).forEach(function (b) { b.addEventListener('click', function () { haptic.tap(); styleSheet(byId[b.getAttribute('data-t')]); }); });
        if (n) primary(pick.length ? 'Выбрать: ' + pick.length : 'Выбери хотя бы один', function () { o.carousel_pick = pick; next(n, { carousel_pick: pick }); }, { active: pick.length > 0 });
        else {
          var sv = document.createElement('button');
          sv.type = 'button'; sv.className = 'btn block'; sv.style.marginTop = '20px'; sv.disabled = !pick.length;
          sv.innerHTML = I.check + (pick.length ? 'Сохранить: ' + pick.length : 'Выбери хотя бы один');
          sv.addEventListener('click', function () { o.carousel_pick = pick; haptic.ok(); toast('Сохранил. Следующие карусели — в этих стилях.'); });
          sec.appendChild(sv);
        }
      }
      function styleSheet(s) {
        var p = pickOf(s.id), col = (p && p.color) || s.acc, anim = /^anim_/.test(s.id);
        var cols = [{ name: 'Родной', hex: s.acc }].concat(S.colors.filter(function (c) { return c.hex.toUpperCase() !== s.acc.toUpperCase(); }));
        function body() {
          return '<h3 class="sheet-h" id="sheetH">' + esc(s.name) + '</h3><p class="sheet-sub">' + esc(s.note) + '</p>' +
            (anim ? '<span class="z-anim-b inl">' + esc(S.anim_badge) + '</span>' : '') +
            '<div class="z-thumb-big">' + styleThumb(s, col, true) + '</div>' +
            '<div class="eyebrow" style="margin-top:16px">Цвет</div><div class="z-swatches sm" style="margin-top:10px">' + cols.map(function (c) {
              return '<button type="button" aria-label="' + esc(c.name) + '" title="' + esc(c.name) + '" class="' + (c.hex === col ? 'on' : '') + '" data-col="' + c.hex + '" style="--c:' + c.hex + '"></button>';
            }).join('') + '</div>' +
            '<button class="btn block" type="button" id="zStGo" style="margin-top:16px">' + I.check + (p ? 'Сохранить цвет' : 'Выбрать этот стиль') + '</button>' +
            (p ? '<button class="link-btn" type="button" id="zStDel">Убрать из выбранных</button>' : '');
        }
        sheet(body(), function bindS(c) {
          $$('[data-col]', c).forEach(function (b) { b.addEventListener('click', function () { haptic.pick(); col = b.getAttribute('data-col'); c.innerHTML = '<div class="sheet-grip" aria-hidden="true"></div>' + body(); bindS(c); }); });
          $('#zStGo', c).addEventListener('click', function () {
            if (p) p.color = col;
            else if (pick.length >= 3) { toast('Можно выбрать до трёх. Убери один из выбранных.'); return; }
            else pick.push({ id: s.id, color: col });
            haptic.ok(); closeSheet(); var y = window.scrollY; draw(); window.scrollTo(0, y);
          });
          var del = $('#zStDel', c); if (del) del.addEventListener('click', function () { pick = pick.filter(function (x) { return x.id !== s.id; }); closeSheet(); var y = window.scrollY; draw(); window.scrollTo(0, y); });
        });
      }
      draw();
    },

    // ---- формат рилсов: отдельный шаг, у каждого «Смотреть пример» (пункты 5 и 6) ----
    reels: function (sec, o, n) {
      var def = o.reels_default, fav = (o.reels_fav || []).slice(), col = o.sub_color;
      function row(f, kind) {
        var on = kind === 'day' ? f.id === def : fav.indexOf(f.id) >= 0;
        return '<div class="z-fmtw z-in"><button type="button" class="z-fmt ' + (on ? 'on' : '') + '" ' + (kind === 'day' ? 'data-d' : 'data-f') + '="' + f.id + '">' + (kind === 'day' ? '<span class="rd"></span>' : '') +
          '<span class="z-fmt-t"><b>' + esc(f.name) + '</b><small>' + esc(f.text) + '</small></span>' + (kind === 'day' ? '' : I.star) + '</button>' +
          '<button type="button" class="z-ex" data-ex="' + f.id + '"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>Смотреть пример</button></div>';
      }
      function draw() {
        var day = o.reels_formats.filter(function (f) { return f.kind === 'day'; });
        var ask = o.reels_formats.filter(function (f) { return f.kind === 'ask'; });
        sec.innerHTML = onbHead(n, 'Формат <em>рилсов</em>', 'Основной — для каждого дня. Ещё отметь звёздочкой, что хочется иногда. Не уверен — посмотри пример.') +
          '<div class="z-sec"><div class="eyebrow">Основной формат</div>' + day.map(function (f) { return row(f, 'day'); }).join('') + '</div>' +
          '<div class="z-sec"><div class="eyebrow">По просьбе</div>' + ask.map(function (f) { return row(f, 'ask'); }).join('') + '</div>' +
          '<div class="z-sec"><div class="eyebrow">Цвет главного слова в субтитрах</div><div class="z-swatches">' + o.sub_colors.map(function (c) {
            return '<button type="button" aria-label="' + c.name + '" class="' + (c.hex === col ? 'on' : '') + '" data-col="' + c.hex + '" style="--c:' + c.hex + '"></button>';
          }).join('') + '</div><div class="z-sub-demo" style="--c:' + col + '"><span>Ремонт срывается <em>в первую</em> неделю</span></div></div>';
        $$('[data-d]', sec).forEach(function (b) { b.addEventListener('click', function () { haptic.pick(); def = b.getAttribute('data-d'); var y = window.scrollY; draw(); window.scrollTo(0, y); }); });
        $$('[data-f]', sec).forEach(function (b) { b.addEventListener('click', function () { haptic.pick(); var id = b.getAttribute('data-f'), k = fav.indexOf(id); if (k >= 0) fav.splice(k, 1); else fav.push(id); var y = window.scrollY; draw(); window.scrollTo(0, y); }); });
        $$('[data-ex]', sec).forEach(function (b) { b.addEventListener('click', function () { haptic.tap(); exampleSheet(o.reels_formats.filter(function (f) { return f.id === b.getAttribute('data-ex'); })[0]); }); });
        $$('[data-col]', sec).forEach(function (b) { b.addEventListener('click', function () { haptic.pick(); col = b.getAttribute('data-col'); var y = window.scrollY; draw(); window.scrollTo(0, y); }); });
        primary('Дальше', function () { o.reels_default = def; o.reels_fav = fav; o.sub_color = col; next(n, { reels_default: def, reels_fav: fav, sub_color: col }); });
      }
      draw();
    },

    socials: function (sec, o, n) {
      sec.innerHTML = onbHead(n, 'Куда <em>выкладывать</em>', 'Подключи соцсети, в которые завод будет выкладывать утверждённое. Остальные — потом, в настройках.') + '<div id="zNets"></div>';
      socialsBlock($('#zNets', sec), function (items) {
        var c = items.filter(function (s) { return s.state === 'connected'; }).length;
        primary(c ? 'Дальше' : 'Подключу позже', function () { next(n); });
      });
    },

    first_plan: function (sec, o, n) {
      loading(sec, 3);
      A.plan().then(function (p) {
        var first = p.days.slice(0, 2);
        sec.innerHTML = onbHead(n, 'Твой <em>первый план</em>', 'Темы по твоей книге смыслов. Утверждаешь темы — каждый ролик всё равно придёт на утверждение.') +
          first.map(dayBlock).join('') +
          (p.days.length > first.length ? '<p class="fine">И ещё ' + (p.days.length - first.length) + ' ' + daysWord(p.days.length - first.length) + ' в плане — вкладка «План».</p>' : '') +
          '<div class="z-card acc z-in" style="margin-top:18px"><h3>Последний шаг — первое видео</h3><p>Сними пару минут о своей работе на телефон и пришли в чат с ботом. С него завод соберёт первые черновики.</p></div>';
        $$('.z-acts', sec).forEach(function (a) { a.remove(); });
        primary('Утвердить план и начать', function () {
          A.planApproveAll().then(function () { return next(n); }).then(function () { toast('Готово! Теперь присылай видео — черновики придут в «На утверждение».', 4500); }).catch(fail);
        });
      }).catch(fail);
    }
  };

  // ---------- общие кусочки: книга только в приложении, PDF за доплату, личная распаковка, пример рилса ----------
  function styleEditor(sec) { withOnb(sec, function (o) { ONB_STEPS.carousels(sec, o, 0); }, 'set'); }
  function bookOnlyHere() {
    return '<div class="z-card z-bookpdf z-in" style="margin-top:16px"><div class="z-row-t"><b>' + I.lock + 'Книга живёт здесь, в приложении</b><small>Открыть и поправить — в любой момент, в настройках.</small></div></div>';
  }
  function bindPdf(sec) {
    var b = $('#zPdf', sec);
    if (b) b.addEventListener('click', function () { haptic.tap(); A.bookPdf().then(function () {}).catch(fail); });
  }
  function unpackSheet() {
    sheet('<h3 class="sheet-h" id="sheetH">Личная распаковка <em>с Валерией</em></h3><p class="sheet-sub">Живой созвон: Валерия и команда задают вопросы, слушают тебя и вместе собирают книгу смыслов. Проводится один раз.</p>' +
      '<ul class="z-inc" style="margin-top:14px"><li class="y"><i>✓</i><span>Созвон с Валерией и командой</span></li><li class="y"><i>✓</i><span>Книга смыслов — собираем вместе</span></li><li class="n"><i>—</i><span>Подписка на завод — отдельно</span></li></ul>' +
      '<div class="z-price-big">39 990 ₽ <small>разово</small></div>' +
      '<button class="btn block" type="button" id="zGo" style="margin-top:14px"><span>Записаться на распаковку</span><span class="arr">→</span></button>' +
      '<p class="fine center">Время созвона подберём в чате после записи.</p>', function (c) {
      $('#zGo', c).addEventListener('click', function () { A.unpackBook().then(function (r) { closeSheet(); openLink(r.pay_url, 'страница записи и оплаты'); }).catch(fail); });
    });
  }
  function exampleSheet(f) {
    if (!f) return;
    var ex = f.example || {}, sec0 = ex.sec || 30;
    var player = ex.video
      ? '<video class="z-player-v" controls playsinline preload="none" poster="' + esc(ex.poster) + '" src="' + esc(ex.video) + '"></video>'
      : '<div class="z-player-v" style="background-image:url(' + esc(ex.poster) + ')"><span class="z-player-tag">пример</span><button type="button" class="z-play" id="zPlay" aria-label="Смотреть пример"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></button>' +
        '<div class="z-player-ctl"><span id="zPt">0:00</span><div class="z-bar"><u id="zPb" style="width:0"></u></div><span>0:' + (sec0 < 10 ? '0' : '') + sec0 + '</span></div></div>';
    sheet('<h3 class="sheet-h" id="sheetH">Пример: <em>' + esc(f.name) + '</em></h3><p class="sheet-sub">' + esc(f.text) + '</p><div class="z-player">' + player + '</div>' +
      '<p class="fine center">Пример на чужом ролике. Твои будут из твоих видео и по твоей книге смыслов.</p>', function (c) {
      var pl = $('#zPlay', c);
      if (pl) pl.addEventListener('click', function () {
        haptic.tap(); pl.hidden = true; var t = 0;
        var iv = setInterval(function () {
          if ($('#sheet').hidden || !$('#zPb', c)) { clearInterval(iv); return; }
          t = Math.min(sec0, t + 1); $('#zPb', c).style.width = Math.round(t / sec0 * 100) + '%'; $('#zPt', c).textContent = '0:' + (t < 10 ? '0' : '') + t;
          if (t >= sec0) { clearInterval(iv); pl.hidden = false; }
        }, 250);
        toast('Демо: здесь идёт сам пример ролика — видео подставит сервер.');
      });
    });
  }

  // ======================================================================
  // СОЦСЕТИ — один блок и для шага 8, и для экрана «Мои соцсети»
  // ======================================================================
  var ST = {
    connected: ['ok', 'Подключено'], pending: ['wait', 'Ждём подтверждения'], off: ['off', 'Не подключено'],
    unavailable: ['off', 'Недоступно'], no: ['off', 'Не подключается']
  };
  function socialsBlock(box, after) {
    box.innerHTML = '<div class="z-skel"></div><div class="z-skel"></div><div class="z-skel"></div>';
    var linkShown = {};
    function load() { return A.socials().then(draw).catch(fail); }
    function draw(d) {
      var items = d.items, bot = d.bot_username;
      var on = items.filter(function (s) { return s.state === 'connected'; }).length;
      var can = items.filter(function (s) { return s.state !== 'unavailable' && s.state !== 'no'; }).length;
      var profs = d.profiles || [], cur = profs.filter(function (x) { return x.id === d.profile; })[0] || profs[0];
      var TYPE = { personal: 'Личный', business: 'Бизнес' };
      var profH = !cur ? '' :
        '<div class="z-prof z-in"><div class="eyebrow">Профиль' + (profs.length > 1 ? 'и · ' + profs.length + ' из ' + d.included : ' · ' + profs.length + ' из ' + d.included) + '</div>' +
        (profs.length > 1 ? '<div class="z-seg" role="tablist" style="margin:10px 0 10px">' + profs.map(function (x, k) {
          return '<button type="button" role="tab" data-prof="' + x.id + '" class="' + (x.id === cur.id ? 'on' : '') + '">' + (k + 1) + ' · ' + TYPE[x.type] + '<b>' + x.on + '</b></button>';
        }).join('') + '</div>' : '') +
        '<div class="z-ptype"><span>Этот профиль —</span><div class="z-seg sm" role="radiogroup">' + ['personal', 'business'].map(function (t) {
          return '<button type="button" role="radio" aria-checked="' + (cur.type === t) + '" data-ptype="' + t + '" class="' + (cur.type === t ? 'on' : '') + '">' + TYPE[t] + '</button>';
        }).join('') + '</div></div>' +
        '<p class="fine" style="margin-top:8px">' + (cur.type === 'business' ? 'Бизнес-профиль: подписи от имени дела, без личных историй.' : 'Личный профиль: подписи от тебя, с твоими историями.') + '</p>' +
        (profs.length >= d.included ? '<button class="z-row z-addprof" type="button" id="zProfAdd"><span class="z-ic">' + I.plus + '</span><span class="z-row-t"><b>Добавить профиль — докупка</b><small>' + (d.included > 1 ? 'В «Максимуме» два профиля. Третий и дальше — отдельно, цену пришлём в чат до оплаты.' : 'В тарифе «' + esc(d.tariff || '') + '» один профиль. Два — в «Максимуме», или докупи ещё один.') + '</small></span>' + I.chev + '</button>' : '') +
        '</div>';
      box.innerHTML = profH + '<div class="z-sum"><div class="z-sum-n">' + on + '<span>/' + can + '</span></div><p>Подключено соцсетей' + (profs.length > 1 ? ' в этом профиле' : '') + '. Выкладываю только туда, где ты разрешил, и только утверждённое.</p></div>' +
        '<div class="z-list">' + items.map(function (s) { return netCard(s, bot, linkShown[s.id]); }).join('') + '</div>';
      $$('[data-prof]', box).forEach(function (b) { b.addEventListener('click', function () { haptic.pick(); linkShown = {}; A.profilePick(b.getAttribute('data-prof')).then(load).catch(fail); }); });
      $$('[data-ptype]', box).forEach(function (b) { b.addEventListener('click', function () { haptic.pick(); A.profileType(b.getAttribute('data-ptype')).then(load).catch(fail); }); });
      var pa = $('#zProfAdd', box); if (pa) pa.addEventListener('click', function () { haptic.tap(); A.profileAdd().then(function (r) { toast(r.note || 'Это докупка.', 4500); }).catch(fail); });
      $$('[data-act]', box).forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-net'), act = b.getAttribute('data-act');
          haptic.tap();
          if (act === 'open') { openLink(linkShown[id] || '', 'страница подключения'); return; }
          b.disabled = true;
          var p = act === 'connect' ? A.socialConnect(id) : act === 'check' ? A.socialCheck(id) : A.socialDisconnect(id);
          p.then(function (r) {
            if (act === 'connect' && r.how === 'link') { linkShown[id] = r.url; toast('Ссылка готова. Открой её и разреши доступ.'); }
            if (act === 'connect' && r.how === 'admin') { linkShown[id] = 'admin'; }
            if (act === 'check') { if (r.state === 'connected') { haptic.ok(); toast('Подключено!'); delete linkShown[id]; } else toast('Пока не вижу подключения. Разреши доступ на странице соцсети и проверь ещё раз.', 4500); }
            if (act === 'disconnect') toast('Отключил. Туда больше ничего не выходит.');
            return load();
          }).catch(function (e) { b.disabled = false; fail(e); });
        });
      });
      if (after) after(items);
    }
    load();
  }
  function netCard(s, bot, shown) {
    var st = ST[s.state] || ST.off, bodyH = '', acts = '';
    if (s.state === 'connected') {
      bodyH = '<p>' + (s.account ? esc(s.account) + ' · ' : '') + 'с ' + esc(s.since || '') + '. Утверждённое выходит сюда само.</p>';
      acts = '<button class="z-mini" type="button" data-net="' + s.id + '" data-act="disconnect">Отключить</button>';
    } else if (s.way === 'admin' && s.state !== 'connected') {
      bodyH = '<ol class="z-howto"><li><b>1</b><span>Открой свой канал → «Администраторы» → «Добавить».</span></li><li><b>2</b><span>Найди <code>@' + esc(bot) + '</code> и добавь админом.</span></li><li><b>3</b><span>Оставь одно право — «Публикация сообщений».</span></li></ol>';
      acts = '<button class="z-mini red" type="button" data-net="' + s.id + '" data-act="check">' + I.check + 'Я добавил — проверить</button>';
    } else if (s.state === 'pending') {
      bodyH = '<p>Ссылка отправлена. Открой её, разреши доступ в окне соцсети — и нажми «Проверить». Ссылка действует 48 часов.</p>';
      acts = (shown ? '<button class="z-mini" type="button" data-net="' + s.id + '" data-act="open">Открыть ссылку</button>' : '<button class="z-mini" type="button" data-net="' + s.id + '" data-act="connect">Новая ссылка</button>') +
        '<button class="z-mini red" type="button" data-net="' + s.id + '" data-act="check">' + I.check + 'Проверить</button>';
    } else if (s.state === 'off') {
      bodyH = '<p>Подключение по ссылке: доступ разрешаешь в окне самой соцсети, пароль заводу не нужен.</p>';
      acts = '<button class="z-mini red" type="button" data-net="' + s.id + '" data-act="connect">' + I.plus + 'Подключить</button>';
    } else if (s.state === 'no') {
      bodyH = '<p>ВКонтакте не даёт выкладывать за тебя на личную страницу. Выкладываю в сообщество — подключи его выше.</p>';
    } else {
      bodyH = '<p>У этой площадки нет способа выкладывать за тебя, поэтому подключить её нельзя.</p>';
    }
    var tone = s.state === 'connected' ? 'background:var(--red);color:#fff' : '';
    return '<div class="z-card z-net z-in ' + (s.state === 'no' || s.state === 'unavailable' ? 'muted' : '') + '">' +
      '<span class="z-ic" style="' + tone + '">' + esc(s.short) + '</span><h3>' + esc(s.name) + '</h3>' +
      '<div class="z-net-s"><span class="z-st ' + st[0] + '">' + st[1] + '</span></div>' +
      '<div class="z-net-body">' + bodyH + (acts ? '<div class="z-acts">' + acts + '</div>' : '') + '</div></div>';
  }
  SCREENS.socials = function (sec) {
    sec.innerHTML = head('Настройки', 'Мои <em>соцсети</em>', 'Telegram-канал подключается через бота-администратора, Instagram, YouTube и сообщество ВКонтакте — по ссылке подключения.') + '<div id="zNets"></div>';
    socialsBlock($('#zNets', sec));
  };

  // ======================================================================
  // 1. СДЕЛАТЬ
  // ======================================================================
  SCREENS.make = function (sec) {
    loading(sec, 4);
    Promise.all([A.make(), A.review()]).then(function (r) {
      var m = r[0], rv = r[1];
      setBadge(rv.drafts.length);
      var ic = { upload: I.up, reel_about: I.spark, longcut: I.cut, carousel_photos: I.photos, format_once: I.swap };
      sec.innerHTML = head('Сделать контент', 'Что <em>соберём</em>?', 'Присылай как удобно — голосом, файлом или темой. Готовое придёт на утверждение.') +
        (rv.work.length ? '<button class="z-work-strip" type="button" id="zWork"><span class="dot"></span><span>В работе: <b>' + rv.work.length + '</b> · черновиков ждут: <b>' + rv.drafts.length + '</b></span>' + I.chev + '</button>' : '') +
        '<div class="z-sec"><div class="z-do">' + m.actions.map(function (a, k) {
          return '<button class="z-row z-in" type="button" data-a="' + a.id + '"><span class="z-ic ' + (k === 0 ? 'red' : '') + '">' + ic[a.id] + '</span><span class="z-row-t"><b>' + esc(a.title) + '</b><small>' + esc(a.text) + '</small></span>' + I.chev + '</button>';
        }).join('') + '</div></div>' +
        '<div class="z-note">' + I.mic + '<span>Можно и без кнопок: напиши или скажи боту «сделай рилс про первую встречу с клиентом» — он поймёт.</span></div>';
      var w = $('#zWork', sec); if (w) w.addEventListener('click', function () { UI.review = 'work'; nav('/review'); });
      $$('[data-a]', sec).forEach(function (b) { b.addEventListener('click', function () { haptic.tap(); MAKE[b.getAttribute('data-a')](); }); });
    }).catch(fail);
  };
  var MAKE = {
    upload: function () {
      sheet('<h3 class="sheet-h" id="sheetH">Прислать <em>видео или фото</em></h3><p class="sheet-sub">Отправь файлы в чат с ботом — как обычное сообщение. Завод сам поймёт, что собрать: рилс из видео, карусель из фото.</p>' +
        '<ul class="z-howto" style="margin:16px 0"><li><b>1</b><span>Видео — вертикальное, можно прямо с телефона.</span></li><li><b>2</b><span>Хочешь подсказать тему — допиши словами или голосом.</span></li><li><b>3</b><span>Черновик придёт в «На утверждение».</span></li></ul>' +
        '<button class="btn block" type="button" id="zGo">' + I.send + 'Открыть чат с ботом</button>', function (c) { $('#zGo', c).addEventListener('click', function () { closeSheet(); toChat(); }); });
    },
    reel_about: function () {
      sheet('<h3 class="sheet-h" id="sheetH">Сделай рилс <em>про…</em></h3><p class="sheet-sub">Одной фразой — про что ролик. Сценарий и подпись завод соберёт по твоей книге смыслов.</p>' +
        '<textarea class="z-ta" id="zTopic" style="margin-top:14px" maxlength="200" placeholder="Например: как я провожу первую встречу с семьёй"></textarea>' +
        '<button class="voice" type="button" id="zVo" style="margin:10px 0 14px">' + I.mic + '<span><b>Сказать голосом</b><small>Запиши тему в чате с ботом</small></span></button>' +
        '<button class="btn block" type="button" id="zGo"><span>Заказать ролик</span><span class="arr">→</span></button>', function (c) {
        $('#zVo', c).addEventListener('click', function () { toChat('Демо: скажи тему боту голосом — она появится здесь.'); });
        $('#zGo', c).addEventListener('click', function () {
          var t = $('#zTopic', c).value.trim();
          if (!t) { $('#zTopic', c).focus(); toast('Напиши тему одной фразой.'); return; }
          A.order('reel', t).then(function (d) { closeSheet(); haptic.ok(); toast(d.note || 'Принял.', 4000); render(); }).catch(fail);
        });
      });
    },
    longcut: function () {
      sheet('<h3 class="sheet-h" id="sheetH">Нарезать <em>эфир</em></h3><p class="sheet-sub">Пришли запись эфира или вебинара в чат с ботом. Завод найдёт самые сильные куски и соберёт из них короткие ролики.</p>' +
        '<div class="z-note">' + I.info + '<span>Следующий файл, который ты пришлёшь, завод возьмёт как эфир.</span></div>' +
        '<button class="btn block" type="button" id="zGo" style="margin-top:16px">' + I.send + 'Прислать эфир</button>', function (c) {
        $('#zGo', c).addEventListener('click', function () { A.order('longcut').then(function () { closeSheet(); toChat('Жду эфир в чате с ботом.'); }).catch(fail); });
      });
    },
    carousel_photos: function () {
      sheet('<h3 class="sheet-h" id="sheetH">Карусель <em>из моих фото</em></h3><p class="sheet-sub">Без нового видео. Возьму твои фото, которые уже есть у завода, или пришли новые.</p>' +
        '<textarea class="z-ta" id="zTopic" style="margin-top:14px" maxlength="200" placeholder="Про что карусель? Можно оставить пустым — возьму тему из плана"></textarea>' +
        '<button class="btn block" type="button" id="zGo" style="margin-top:12px"><span>Собрать карусель</span><span class="arr">→</span></button>', function (c) {
        $('#zGo', c).addEventListener('click', function () { A.order('carousel_photos', $('#zTopic', c).value.trim() || 'Карусель из фото').then(function (d) { closeSheet(); haptic.ok(); toast(d.note || 'Принял.', 4000); render(); }).catch(fail); });
      });
    },
    format_once: function () {
      A.onboarding().then(function (o) {
        var cur = '';
        sheet('<h3 class="sheet-h" id="sheetH">Формат <em>на этот раз</em></h3><p class="sheet-sub">Следующий ролик соберу в этом формате, потом вернусь к основному.</p><div id="zF" style="margin-top:14px"></div>' +
          '<button class="btn block" type="button" id="zGo" style="margin-top:14px" disabled>Выбрать</button>', function (c) {
          var list = o.reels_formats.filter(function (f) { return f.kind === 'day' || o.reels_fav.indexOf(f.id) >= 0; });
          function draw() {
            $('#zF', c).innerHTML = list.map(function (f) { return '<button type="button" class="z-fmt ' + (f.id === cur ? 'on' : '') + '" data-x="' + f.id + '"><span class="rd"></span><span class="z-fmt-t"><b>' + esc(f.name) + (f.id === o.reels_default ? ' · основной' : '') + '</b><small>' + esc(f.text) + '</small></span></button>'; }).join('');
            $$('[data-x]', c).forEach(function (b) { b.addEventListener('click', function () { haptic.pick(); cur = b.getAttribute('data-x'); $('#zGo', c).disabled = false; draw(); }); });
          }
          draw();
          $('#zGo', c).addEventListener('click', function () { closeSheet(); haptic.ok(); toast('Следующий ролик — в этом формате.'); });
        });
      }).catch(fail);
    }
  };

  // ======================================================================
  // 2. ПЛАН
  // ======================================================================
  function itemCard(it) {
    var ok = it.state === 'approved';
    return '<div class="z-card z-pi z-in ' + (ok ? 'ok' : '') + '"><div class="z-pi-top"><span class="z-tag ' + (it.kind === 'reel' ? '' : 'g') + '">' + (it.kind === 'reel' ? 'Рилс' : 'Карусель') + '</span>' +
      (ok ? '<span class="z-st ok">Утверждено</span>' : '') + '<span class="t">' + esc(it.time) + '</span></div>' +
      '<h3>' + esc(it.topic) + '</h3><span class="fm">' + esc(it.format) + '</span>' +
      '<div class="z-acts">' + (ok ? '' : '<button class="z-mini ok" type="button" data-pa="approve" data-id="' + it.id + '">' + I.check + 'Утвердить</button>') +
      '<button class="z-mini" type="button" data-pa="replace" data-id="' + it.id + '">' + I.swap + 'Заменить</button>' +
      '<button class="z-mini" type="button" data-pa="remove" data-id="' + it.id + '">' + I.x + 'Убрать</button></div></div>';
  }
  function unitWord(n) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'единица' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'единицы' : 'единиц'; }
  function dayBlock(d) {
    return '<div class="z-day"><div class="z-day-h"><span>' + esc(d.wd) + '</span>' + esc(d.date) + '<small>' + d.items.length + ' ' + unitWord(d.items.length) + '</small></div>' + d.items.map(itemCard).join('') + '</div>';
  }
  SCREENS.plan = function (sec) {
    loading(sec, 4);
    A.plan().then(function (p) {
      function draw() {
        var newN = 0; p.days.forEach(function (d) { d.items.forEach(function (it) { if (it.state !== 'approved') newN++; }); });
        var dd = p.days_selected || 14, mx = p.max_days || 60, lim = p.days_left != null && p.days_left < 60;
        sec.innerHTML = head('План · ' + esc(p.period), 'План на <em>' + dd + ' ' + daysWord(dd) + '</em>', null) +
          '<div class="z-sec" style="margin-top:16px"><div class="eyebrow">Срок плана</div>' +
          (p.day_tariff ? '<div class="z-left" id="zLeft">' + I.info + '<span>На «Сутках» план — на один день: <b>1 рилс и 3 карусели</b>. Чтобы выходить дальше, выбери подписку.</span>' +
            '<button class="z-mini red" type="button" id="zExtend">Выбрать подписку</button></div>'
          : lim ? '<div class="z-left ' + (mx < 30 ? 'warn' : '') + '" id="zLeft">' + I.info + '<span>До конца подписки осталось <b>' + p.days_left + ' ' + daysWord(p.days_left) + '</b> — план максимум на ' + mx + ' ' + daysWord(mx) + '.</span>' +
            '<button class="z-mini red" type="button" id="zExtend">Продлить подписку</button></div>' : '') +
          (p.day_tariff ? '' : '<div id="zDays">' + daysPicker(dd, p.presets || [3, 7, 14, 30], true, mx) + '</div>') +
          (p.day_tariff ? '' : dd === p.default_days ? '<p class="fine" style="margin-top:8px">Это срок по умолчанию — меняется здесь или в настройках.</p>' : '<p class="fine" style="margin-top:8px">По умолчанию — ' + p.default_days + ' ' + daysWord(p.default_days) + (p.default_days > mx ? ', но сейчас план не длиннее остатка подписки' : '') + '.</p>') + '</div>' +
          seg([{ id: 'days', label: 'Темы' }, { id: 'shoot', label: 'Что снять', n: p.shoot.length }], UI.plan) +
          (UI.plan === 'days'
            ? '<p class="lead" style="font-size:14.5px">Утверждаешь темы. Каждый ролик и карусель всё равно придут на утверждение перед выходом.</p>' +
              p.days.map(dayBlock).join('') +
              (newN ? '<button class="btn block" type="button" id="zAll" style="margin-top:20px">' + I.check + 'Утвердить всё · ' + newN + '</button>' : '<div class="z-note">' + I.check + '<span>Весь план утверждён. Убрать или заменить пункт можно до выхода — за 48 часов.</span></div>')
            : '<p class="lead" style="font-size:14.5px">На неделю: что сказать и что показать в каждом ролике.</p>' +
              p.shoot.map(function (s) {
                return '<div class="z-card z-shoot z-in" style="margin-top:12px"><h3>' + esc(s.topic) + '</h3><h4>Что сказать</h4><ul>' + s.say.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><h4>Что показать</h4><ul>' + s.show.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
              }).join(''));
        bindSeg(sec, function (v) { UI.plan = v; draw(); });
        var ext = $('#zExtend', sec); if (ext) ext.addEventListener('click', function () { haptic.tap(); nav('/set/tariff'); });
        if ($('#zDays', sec)) bindDays($('#zDays', sec), mx, function (d, asDef) {
          A.planDays(d, asDef).then(function (r) {
            p.days_selected = r.days; p.default_days = r.default_days; haptic.ok();
            toast('Соберу план на ' + r.days + ' ' + daysWord(r.days) + (asDef ? ' — и так будет по умолчанию.' : '.'));
            var y = window.scrollY; draw(); window.scrollTo(0, y);
          }).catch(fail);
        });
        $$('[data-pa]', sec).forEach(function (b) {
          b.addEventListener('click', function () {
            haptic.tap(); b.disabled = true;
            A.planItem(b.getAttribute('data-id'), b.getAttribute('data-pa')).then(function (np) {
              var a = b.getAttribute('data-pa');
              toast(a === 'approve' ? 'Тема утверждена.' : a === 'replace' ? 'Заменил тему.' : 'Убрал из плана.');
              p = np; var y = window.scrollY; draw(); window.scrollTo(0, y);
            }).catch(function (e) { b.disabled = false; fail(e); });
          });
        });
        var all = $('#zAll', sec);
        if (all) all.addEventListener('click', function () { A.planApproveAll().then(function (np) { haptic.ok(); toast('Весь план утверждён.'); p = np; draw(); }).catch(fail); });
      }
      draw();
    }).catch(fail);
  };

  // ======================================================================
  // 3. НА УТВЕРЖДЕНИЕ
  // ======================================================================
  SCREENS.review = function (sec) {
    loading(sec, 3);
    A.review().then(function (r) {
      function draw() {
        setBadge(r.drafts.length);
        var v = UI.review, html = head('На утверждение', 'Ждёт <em>твоего слова</em>', null) +
          (r.usage ? usageBlock(r.usage, true) : '') +
          seg([{ id: 'drafts', label: 'Черновики', n: r.drafts.length }, { id: 'work', label: 'В работе', n: r.work.length }, { id: 'done', label: 'Вышло' }], v);
        if (v === 'drafts') {
          html += r.drafts.length ? r.drafts.map(function (d) {
            return '<div class="z-card z-draft z-in ' + (d.kind === 'carousel' ? 'car' : '') + '"><button class="z-wm" type="button" data-view="' + d.id + '" aria-label="Посмотреть черновик"><img src="' + d.img + '" alt="" draggable="false"><i>черновик</i></button>' +
              '<div><span class="z-tag ' + (d.kind === 'reel' ? '' : 'g') + '">' + (d.kind === 'reel' ? 'Рилс' : 'Карусель') + '</span><h3 style="margin-top:8px">' + esc(d.title) + '</h3>' +
              '<div class="meta"><span>' + esc(d.when) + '</span><span class="z-nets">' + d.nets.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</span></div>' +
              '<div class="cap">' + esc(d.caption) + '</div></div>' +
              '<div class="z-acts"><button class="btn block" type="button" data-d="approve" data-id="' + d.id + '">' + I.check + 'Утвердить</button>' +
              '<button class="z-mini" type="button" data-d="fix_voice" data-id="' + d.id + '">' + I.mic + 'Поправить голосом</button>' +
              '<button class="z-mini" type="button" data-d="caption" data-id="' + d.id + '">' + I.pen + 'Своя подпись</button>' +
              '<button class="link-btn" type="button" data-d="reject" data-id="' + d.id + '" style="margin:2px auto 0">Отклонить</button></div></div>';
          }).join('') + '<div class="z-note">' + I.lock + '<span>Без твоего «Утвердить» не выходит ничего. Нажмёшь дважды — выйдет всё равно один раз.</span></div>' +
            '<div class="z-note">' + I.info + '<span>Черновики не скачиваются — их можно посмотреть и опубликовать. В тариф идёт только опубликованное.</span></div>'
            : '<div class="z-empty">Черновиков нет. Как только завод соберёт новый — он появится здесь, и бот пришлёт сообщение.</div>';
        } else if (v === 'work') {
          html += r.work.length ? '<div class="z-list">' + r.work.map(function (w) {
            return '<div class="z-card z-work z-in"><h3>' + esc(w.title) + '</h3><small>' + esc(w.note) + '</small><div class="z-bar"><u style="width:' + Math.round(w.pct * 100) + '%"></u></div></div>';
          }).join('') + '</div>' : '<div class="z-empty">Сейчас ничего не собирается.</div>';
        } else {
          html += '<div class="z-list">' + r.done.map(function (d) {
            return '<div class="z-card z-done z-in"><span class="z-ic">' + I.check + '</span><span class="z-row-t"><b>' + esc(d.title) + '</b><small>' + esc(d.date) + '</small></span><span class="z-nets">' + d.nets.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</span></div>';
          }).join('') + '</div><p class="fine">Последние 30 дней.</p>';
        }
        sec.innerHTML = html;
        bindSeg(sec, function (x) { UI.review = x; draw(); });
        $$('[data-view]', sec).forEach(function (b) {
          b.addEventListener('click', function () { haptic.tap(); viewSheet(r.drafts.filter(function (d) { return d.id === b.getAttribute('data-view'); })[0]); });
        });
        $$('[data-d]', sec).forEach(function (b) {
          b.addEventListener('click', function () {
            var id = b.getAttribute('data-id'), act = b.getAttribute('data-d');
            haptic.tap();
            if (act === 'caption') return captionSheet(r.drafts.filter(function (d) { return d.id === id; })[0]);
            if (act === 'fix_voice') {
              sheet('<h3 class="sheet-h" id="sheetH">Поправить <em>голосом</em></h3><p class="sheet-sub">Скажи боту, что поменять: «короче начало», «другой кадр в конце». Завод переделает и пришлёт новый черновик.</p><button class="btn block" type="button" id="zGo" style="margin-top:16px">' + I.mic + 'Записать поправку</button>', function (c) {
                $('#zGo', c).addEventListener('click', function () { A.decide(id, 'fix_voice').then(function (nr) { r = nr; closeSheet(); toast('Принял поправку. Новый черновик придёт сюда.', 4000); draw(); }).catch(fail); });
              });
              return;
            }
            A.decide(id, act).then(function (nr) {
              r = nr; if (act === 'approve') { haptic.ok(); toast(nr.note || 'Утверждено. Выйдет по плану.', nr.note ? 4500 : 0); } else toast('Отклонил. Этот черновик не выйдет.');
              draw();
            }).catch(fail);
          });
        });
      }
      // просмотр черновика: только посмотреть и опубликовать — без «скачать» и «сохранить»
      function viewSheet(d) {
        if (!d) return;
        sheet('<h3 class="sheet-h" id="sheetH">' + esc(d.title) + '</h3><p class="sheet-sub">' + (d.kind === 'reel' ? 'Рилс' : 'Карусель') + ' · ' + esc(d.when) + '</p>' +
          '<div class="z-wm big ' + (d.kind === 'carousel' ? 'car' : '') + '"><img src="' + d.img + '" alt="" draggable="false"><i>черновик</i></div>' +
          '<button class="btn block" type="button" id="zGo" style="margin-top:14px">' + I.check + 'Утвердить и опубликовать</button>' +
          '<p class="fine center">Скачать черновик нельзя. Пометка «черновик» видна только здесь — в соцсети выйдет чистый вариант.</p>', function (c) {
          $('#zGo', c).addEventListener('click', function () {
            A.decide(d.id, 'approve').then(function (nr) { r = nr; closeSheet(); haptic.ok(); toast(nr.note || 'Утверждено. Выйдет по плану.', nr.note ? 4500 : 0); draw(); }).catch(fail);
          });
        });
      }
      function captionSheet(d) {
        sheet('<h3 class="sheet-h" id="sheetH">Своя <em>подпись</em></h3><p class="sheet-sub">Пришли подпись целиком — завод выложит её вместо своей.</p><textarea class="z-ta" id="zCap" style="margin-top:14px;min-height:160px">' + esc(d.caption) + '</textarea><button class="btn block" type="button" id="zGo" style="margin-top:12px">' + I.check + 'Утвердить с этой подписью</button>', function (c) {
          $('#zGo', c).addEventListener('click', function () {
            A.decide(d.id, 'caption', { caption: $('#zCap', c).value }).then(function () { return A.decide(d.id, 'approve'); })
              .then(function (nr) { r = nr; closeSheet(); haptic.ok(); toast('Утверждено с твоей подписью.'); draw(); }).catch(fail);
          });
        });
      }
      draw();
    }).catch(fail);
  };

  // ======================================================================
  // 4. КАК ДЕЛА
  // ======================================================================
  // аналитика от твоих прошлых постов (пункт 8): «обычно ~N → этот M: взлетел ×2»
  function perfMark(usual, now) {
    var x = usual ? now / usual : 1;
    var xs = (Math.round(x * 10) / 10).toString().replace('.', ',');
    if (x >= 1.5) return { cls: 'ok', lbl: 'взлетел ×' + xs };
    if (x >= 0.7) return { cls: 'mid', lbl: 'в норме' };
    return { cls: 'red', lbl: 'ниже обычного ×' + xs };
  }
  function approx(n) { return n >= 1000 ? fmtN(Math.round(n / 100) * 100) : fmtN(Math.round(n / 10) * 10); }
  function postsBlock(posts) {
    if (!posts || !posts.length) return '';
    return '<div class="z-sec"><div class="eyebrow">Твои посты против твоей нормы</div>' +
      '<p class="fine" style="margin:0 0 10px">Сравниваю с твоими же прошлыми постами на той же площадке, а не с чужими.</p>' +
      posts.map(function (p) {
        return '<div class="z-card z-perf z-in"><div class="z-perf-h"><span class="z-tag ' + (p.kind === 'reel' ? '' : 'g') + '">' + (p.kind === 'reel' ? 'Рилс' : 'Карусель') + '</span><h3>' + esc(p.title) + '</h3><small>' + esc(p.date) + '</small></div>' +
          '<ul>' + p.nets.map(function (n) {
            var m = perfMark(n.usual, n.now);
            return '<li><span class="net">' + esc(n.short) + '</span><span class="txt">Обычно ~' + approx(n.usual) + ' просмотров → этот ' + (p.kind === 'reel' ? 'ролик' : 'пост') + ' <b>' + fmtN(n.now) + '</b></span><span class="z-mark ' + m.cls + '">' + m.lbl + '</span></li>';
          }).join('') + '</ul></div>';
      }).join('') +
      '<p class="fine">«Обычно» — середина твоих последних 20 постов этого вида на площадке. Взлетел — в полтора раза выше и больше; ниже обычного — меньше 70 % от нормы.</p></div>';
  }
  SCREENS.stats = function (sec) {
    loading(sec, 4);
    A.stats().then(function (s) {
      if (s.locked) {
        sec.innerHTML = head('Как дела', 'Что <em>сработало</em>', null) +
          '<div class="z-card acc z-in" style="margin-top:18px"><span class="z-tag">Аналитика</span><h3 style="margin-top:10px">В тарифе «' + esc(s.tariff) + '» её нет</h3>' +
          '<p>Цифры по подписчикам и постам, сравнение с твоей нормой и советы, что снимать дальше, — в тарифах «Про» и «Максимум».</p>' +
          '<button class="btn block" type="button" id="zToTar" style="margin-top:14px"><span>Сравнить тарифы</span><span class="arr">→</span></button></div>' +
          '<p class="fine">Опубликованное всё равно видно во вкладке «На утверждение» → «Вышло».</p>';
        $('#zToTar', sec).addEventListener('click', function () { haptic.tap(); nav('/set/tariff'); });
        return;
      }
      function draw() {
        var d = s[UI.stats];
        sec.innerHTML = head('Как дела', 'Что <em>сработало</em>', null) +
          seg([{ id: 'week', label: 'Неделя' }, { id: 'month', label: 'Месяц' }], UI.stats) +
          '<div class="eyebrow">Подписчики · ' + esc(d.label) + '</div><div class="z-subs">' + d.subs.map(function (x) {
            var dl = x.to - x.from;
            return '<div class="z-in"><span>' + x.short + '</span><b>' + fmtN(x.to) + '</b><small class="' + (dl < 0 ? 'dn' : '') + '">' + (dl >= 0 ? '+' : '−') + fmtN(Math.abs(dl)) + ' · было ' + fmtN(x.from) + '</small></div>';
          }).join('') + '</div>' +
          postsBlock(s.posts) +
          '<div class="z-sec"><div class="z-card z-post z-in"><span class="lbl z-st ok">Лучший пост</span><h3>' + esc(d.best.title) + '</h3><div class="v">' + fmtN(d.best.views) + '<small>просмотров · ' + esc(d.best.net) + '</small></div><div class="why"><b>Почему:</b> ' + esc(d.best.why) + '</div></div>' +
          '<div class="z-card z-post z-in"><span class="lbl z-st red">Просел</span><h3>' + esc(d.worst.title) + '</h3><div class="v">' + fmtN(d.worst.views) + '<small>просмотров · ' + esc(d.worst.net) + '</small></div><div class="why"><b>Почему:</b> ' + esc(d.worst.why) + '</div></div></div>' +
          '<div class="z-sec"><div class="eyebrow">Что снимать дальше</div>' + s.tips.map(function (t, k) {
            return '<div class="z-card z-tip z-in"><b>' + (k < 9 ? '0' : '') + (k + 1) + '</b><div><p>' + esc(t.text) + '</p><button class="z-mini" type="button" data-tip="' + t.id + '">' + I.plus + 'Добавить в план</button></div></div>';
          }).join('') + '</div>' +
          '<div class="z-sec"><button class="z-row" type="button" id="zPost"><span class="z-ic">' + I.stats + '</span><span class="z-row-t"><b>Разобрать пост</b><small>Один пост на фоне остальных той же соцсети</small></span>' + I.chev + '</button>' +
          '<details class="tips"><summary>Откуда цифры</summary><ul><li>' + esc(s.sources) + '</li></ul></details></div>';
        bindSeg(sec, function (v) { UI.stats = v; draw(); });
        $$('[data-tip]', sec).forEach(function (b) {
          b.addEventListener('click', function () {
            var t = s.tips.filter(function (x) { return x.id === b.getAttribute('data-tip'); })[0];
            A.planAdd('reel', t.text).then(function () { haptic.ok(); b.outerHTML = '<span class="z-st ok" style="margin-top:10px">В плане</span>'; }).catch(fail);
          });
        });
        $('#zPost', sec).addEventListener('click', function () { toast('Демо: выбери пост — завод сравнит его с остальными.'); });
      }
      draw();
    }).catch(fail);
  };

  // ======================================================================
  // 5. КОНКУРЕНТЫ
  // ======================================================================
  SCREENS.rivals = function (sec) {
    loading(sec, 3);
    A.rivals().then(function (rv) {
      var recipe = null;
      function draw() {
        sec.innerHTML = head('Конкуренты', 'Почему у них <em>держит</em>', 'Пришли чужой ролик — разберу механику. Тему возьмём свою.') +
          '<div class="z-sec">' + (recipe
            ? '<div class="z-card z-recipe acc z-in"><span class="z-tag">Разбор</span><h3 style="margin-top:10px">' + esc(recipe.title) + '</h3><dl>' + recipe.rows.map(function (x) { return '<div><dt>' + esc(x.k) + '</dt><dd>' + esc(x.v) + '</dd></div>'; }).join('') + '</dl><div class="verdict">' + esc(recipe.verdict) + '</div>' +
              '<div class="z-acts"><button class="z-mini red" type="button" id="zSame">' + I.spark + 'Сделать так же</button><button class="z-mini" type="button" id="zTpl">' + I.book + 'Сохранить как шаблон</button></div></div>' +
              '<button class="link-btn" type="button" id="zAgain">Разобрать другой ролик</button>'
            : '<button class="z-drop z-in" type="button" id="zDrop"><span class="z-ic red">' + I.up + '</span><b>Прислать ролик конкурента</b><small>Файл или запись экрана. Сам ролик удаляю сразу после разбора — остаётся только рецепт.</small></button>') +
          '</div>' +
          '<div class="z-sec"><div class="eyebrow">Мои конкуренты на YouTube · ' + rv.channels.length + ' из ' + rv.max_channels + '</div><div class="z-list">' + rv.channels.map(function (c) {
            return '<div class="z-card z-ch z-in"><span class="z-ic">YT</span><span class="z-row-t"><b>' + esc(c.name) + '</b><small>' + (c.hits.length ? 'Залетело: «' + esc(c.hits[0].title) + '» — в ' + String(c.hits[0].x).replace('.', ',') + ' раза выше их обычного' : 'За две недели ничего необычного') + '</small></span></div>';
          }).join('') + '</div>' +
          (rv.channels.length < rv.max_channels ? '<div class="z-add"><input id="zCh" placeholder="Ссылка или название канала" maxlength="120"><button class="z-mini red" type="button" id="zChGo">' + I.plus + 'Добавить</button></div>' : '') +
          '<p class="fine">Раз в неделю пришлю, что у них залетело. Только открытые цифры YouTube — без чужих скачиваний.</p></div>';
        var dr = $('#zDrop', sec);
        if (dr) dr.addEventListener('click', function () {
          haptic.tap(); dr.disabled = true; $('b', dr).textContent = 'Разбираю ролик…';
          A.rivalAnalyze().then(function (x) { recipe = x; haptic.ok(); draw(); }).catch(function (e) { dr.disabled = false; fail(e); });
        });
        var ag = $('#zAgain', sec); if (ag) ag.addEventListener('click', function () { recipe = null; draw(); });
        var sm = $('#zSame', sec); if (sm) sm.addEventListener('click', function () { A.planAdd('reel', 'По рецепту: ' + recipe.title).then(function () { haptic.ok(); toast('Добавил в план — с твоей темой и этой механикой.'); }).catch(fail); });
        var tp = $('#zTpl', sec); if (tp) tp.addEventListener('click', function () { haptic.ok(); toast('Сохранил как шаблон. Он появится в выборе формата.'); });
        var go = $('#zChGo', sec);
        if (go) go.addEventListener('click', function () {
          var v = $('#zCh', sec).value.trim(); if (!v) { toast('Вставь ссылку на канал.'); return; }
          A.rivalAddChannel(v.replace(/^https?:\/\/(www\.)?youtube\.com\/@?/, '')).then(function (nr) { rv = nr; haptic.ok(); draw(); }).catch(fail);
        });
      }
      draw();
    }).catch(fail);
  };

  // ======================================================================
  // 6. НАСТРОЙКИ
  // ======================================================================
  var SETS = null;
  SCREENS.settings = function (sec) {
    loading(sec, 5);
    A.settings().then(function (d) {
      SETS = d;
      sec.innerHTML = head('Настройки', 'Твой <em>завод</em>', null) +
        '<button class="z-card acc z-plan-card z-in" type="button" id="zTar" style="margin-top:18px"><span class="z-row-t"><span class="z-tag">Тариф</span><b style="margin-top:10px">' + esc(d.tariff.name) + '</b><small>Оплачен до ' + esc(d.tariff.paid_until) + ' · без автопродления</small>' +
          '<small>Опубликовано: ' + d.tariff.reels.used + ' из ' + d.tariff.reels.limit + ' рилсов · ' + d.tariff.carousels.used + ' из ' + d.tariff.carousels.limit + ' каруселей</small></span>' + I.chev + '</button>' +
        '<div class="z-sec"><div class="z-list">' + d.items.map(function (s) {
          if (s.toggle) return '<label class="z-row z-in z-toggle"><span class="z-row-t"><b>' + esc(s.title) + '</b><small id="zRemV">' + esc(s.value) + '</small></span><input type="checkbox" id="zRem" ' + (s.on ? 'checked' : '') + '><span class="sw" aria-hidden="true"></span></label>';
          return '<button class="z-row z-in ' + (s.danger ? 'danger' : '') + '" type="button" data-s="' + s.id + '"><span class="z-row-t"><b>' + esc(s.title) + (s.badge ? ' <span class="z-tag" style="vertical-align:3px;margin-left:4px">' + esc(s.badge) + '</span>' : '') + '</b><small>' + (s.swatch ? '<span class="z-sw" style="display:inline-block;vertical-align:-3px;margin-right:6px;width:14px;height:14px;background:' + s.swatch + '"></span>' : '') + esc(s.value) + '</small></span>' + I.chev + '</button>';
        }).join('') + '</div></div>';
      $('#zTar', sec).addEventListener('click', function () { haptic.tap(); nav('/set/tariff'); });
      $$('[data-s]', sec).forEach(function (b) {
        b.addEventListener('click', function () { haptic.tap(); var id = b.getAttribute('data-s'); nav(id === 'socials' ? '/socials' : id === 'addon_bot' ? '/addon' : '/set/' + id); });
      });
      var rem = $('#zRem', sec);
      if (rem) rem.addEventListener('change', function () {
        haptic.pick();
        A.setReminders(rem.checked).then(function (r) { $('#zRemV', sec).textContent = r.on ? 'Включены' : 'На паузе'; toast(r.on ? 'Напоминания включены.' : 'Напоминания на паузе. Черновики всё равно придут в чат.'); }).catch(function (e) { rem.checked = !rem.checked; fail(e); });
      });
    }).catch(fail);
  };
  var SET_TEXT = {
    carousel_style: 'Шаблоны, которые завод чередует в каруселях. Можно выбрать от одного до трёх.',
    reels_format: 'Основной формат идёт каждый день, избранные — когда попросишь или по плану.',
    sub_color: 'Цвет главного слова в субтитрах рилсов.',
    times: 'Сколько раз в день и в какое время выходят посты. Сколько времён — столько единиц в день.',
    book: 'Твоя книга смыслов: по ней завод пишет первые фразы роликов, сценарии и подписи. Поправить любой раздел можно голосом.',
    codeword: 'Слово, которое люди пишут в комментариях, и куда завод ведёт такие заявки.',
    tariff: 'Тариф, срок и оплата. Продление — только когда ты сам решишь.',
    plan_days: 'На сколько дней вперёд завод собирает план. В самом плане срок можно поменять на один раз.',
    pause: 'На паузе завод ничего не выкладывает и не собирает. Данные и план сохраняются.',
    consents: 'Три согласия, которые ты дал на первом шаге. Любое можно отозвать — завод скажет, что тогда перестанет работать.',
    support: 'Напиши или скажи голосом — ответ придёт в чат с ботом. Имя и номер чата команда не видит.',
    erase: 'Сотрёт книгу смыслов, фото, видео, черновики и подключения. Отменить нельзя.'
  };
  SCREENS.set = function (sec, id) {
    if (id === 'tariff') return tariffScreen(sec);
    function draw(d) {
      var s = d.items.filter(function (x) { return x.id === id; })[0];
      if (!s) { nav('/settings', true); return; }
      var html = head('Настройки', esc(s.title), SET_TEXT[id] || '') +
        '<div class="z-card z-in" style="margin-top:18px"><span class="z-st ' + (s.danger ? 'red' : 'ok') + '">Сейчас</span><p style="font-size:16px;color:inherit;margin-top:10px">' + (s.swatch ? '<span class="z-sw" style="display:inline-block;vertical-align:-3px;margin-right:8px;background:' + s.swatch + '"></span>' : '') + esc(s.value) + '</p></div>';
      if (id === 'support') html += '<textarea class="z-ta" id="zSup" style="margin-top:14px" placeholder="Что случилось или что хочешь спросить"></textarea><button class="btn block" type="button" id="zGo" style="margin-top:12px">' + I.send + 'Отправить</button><button class="voice" type="button" id="zVo" style="margin-top:10px">' + I.mic + '<span><b>Сказать голосом</b><small>Запиши в чате с ботом</small></span></button>';
      else if (id === 'erase') html += '<div class="z-card z-erase z-in" style="margin-top:14px"><h3>Точно удалить?</h3><p>Чтобы подтвердить, впиши ниже: <b class="z-code">Удалить всё</b></p>' +
        '<div class="field" style="margin-top:12px"><label for="zErase">Подтверждение</label><input id="zErase" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Удалить всё"></div>' +
        '<button class="btn block z-danger" type="button" id="zGo" style="margin-top:14px" disabled>Удалить всё</button>' +
        '<p class="fine center" id="zEraseHint">Кнопка включится, когда текст совпадёт.</p></div>';
      else if (id === 'book') html += bookOnlyHere() + '<button class="btn ghost block" type="button" id="zGo" style="margin-top:16px">Открыть книгу</button>' +
        '<button class="link-btn" type="button" id="zUnpack">Записаться на личную распаковку к Валерии</button>';
      else if (id === 'carousel_style') html += '<button class="btn ghost block" type="button" id="zGo" style="margin-top:16px">Поменять стиль и цвет</button><p class="fine center">Все обычные стили и 20 анимированных — с выбором цвета.</p>';
      else if (id === 'plan_days') html += '<div id="zDays" style="margin-top:16px">' + daysPicker(d.plan_days, [3, 7, 14, 30], false) + '</div><button hidden id="zGo" type="button"></button>';
      else if (id === 'pause') html += '<button class="btn ghost block" type="button" id="zGo" style="margin-top:16px">Поставить на паузу</button>';
      else html += '<button class="btn ghost block" type="button" id="zGo" style="margin-top:16px">' + (id === 'book' ? 'Открыть книгу' : 'Поменять') + '</button>';
      sec.innerHTML = html;
      if (id === 'plan_days') bindDays($('#zDays', sec), 60, function (n) {
        A.planDays(n, true).then(function (r) { haptic.ok(); toast('Новые планы — на ' + r.days + ' ' + daysWord(r.days) + '.'); A.settings().then(function (nd) { SETS = nd; draw(nd); }); }).catch(fail);
      });
      $('#zGo', sec).addEventListener('click', function () {
        haptic.tap();
        if (id === 'support') {
          var t = $('#zSup', sec).value.trim(); if (!t) { toast('Напиши пару слов.'); return; }
          A.support(t).then(function (r) { haptic.ok(); toast(r.note || 'Передал.'); $('#zSup', sec).value = ''; }).catch(fail);
          return;
        }
        if (id === 'erase') {
          A.erase($('#zErase', sec).value.trim()).then(function (r) { toast(r.note || 'Удалено.', 4500); }).catch(fail);
          return;
        }
        if (id === 'carousel_style') { styleEditor(sec); return; }
        toast('Демо: здесь откроется выбор. В боте — тот же раздел.');
      });
      // «Удалить всё»: кнопка активна только при точном совпадении текста (пункт 9)
      var er = $('#zErase', sec);
      if (er) er.addEventListener('input', function () {
        var ok = er.value.trim() === 'Удалить всё';
        $('#zGo', sec).disabled = !ok;
        $('#zEraseHint', sec).textContent = ok ? 'Совпало. Нажмёшь — всё сотрётся.' : 'Кнопка включится, когда текст совпадёт.';
      });
      bindPdf(sec);
      var up = $('#zUnpack', sec); if (up) up.addEventListener('click', function () { haptic.tap(); unpackSheet(); });
      var vo = $('#zVo', sec); if (vo) vo.addEventListener('click', function () { toChat('Демо: запиши голосовое в чате с ботом — оно уйдёт в поддержку.'); });
    }
    if (SETS) draw(SETS); else { loading(sec, 2); A.settings().then(function (d) { SETS = d; draw(d); }).catch(fail); }
  };

  // ======================================================================
  // ТАРИФ И ОПЛАТА — счётчик опубликованного и выбор тарифа
  // ======================================================================
  function tariffScreen(sec) {
    loading(sec, 4);
    A.tariffs().then(function (d) {
      var pick = d.current;
      function tarLabel() { return pick === d.current ? 'Продлить «' + tariffName(d, pick) + '»' : pick === d.once.id ? 'Записаться на распаковку' : 'Перейти на «' + tariffName(d, pick) + '»'; }
      function draw() {
        sec.innerHTML = head('Настройки', 'Тариф <em>и оплата</em>', 'Платишь за то, что вышло в соцсетях. Продление — только когда ты сам решишь.') +
          '<div style="margin-top:18px">' + usageBlock(d.usage) + '</div>' +
          '<div class="z-sec"><div class="eyebrow">Тарифы · сравни в «Что входит»</div>' + tariffList(d, pick, 'data-tar') + '</div>' +
          '<button class="btn block" type="button" id="zTarGo" style="margin-top:18px"><span>' + tarLabel() + '</span><span class="arr">→</span></button>';
        $('#zTarGo', sec).addEventListener('click', function () { haptic.tap(); A.tariffChoose(pick).then(function (r) { openLink(r.pay_url, 'страница оплаты'); }).catch(fail); });
        $$('[data-tar]', sec).forEach(function (b) { b.addEventListener('click', function () { haptic.pick(); pick = b.getAttribute('data-tar'); var y = window.scrollY; draw(); window.scrollTo(0, y); }); });
        bindMore(sec, draw);
        primary(tarLabel(), function () {
          A.tariffChoose(pick).then(function (r) { openLink(r.pay_url, 'страница оплаты'); }).catch(fail);
        });
      }
      draw();
    }).catch(fail);
  }

  // ======================================================================
  // ДОПОЛНЕНИЕ «МОЙ БОТ ДЛЯ СОЦСЕТЕЙ» — витрина, мастер из 5 шагов, статус
  // ======================================================================
  SCREENS.addon = function (sec, arg) {
    loading(sec, 3);
    A.addon().then(function (a) {
      var step = +arg || 0;
      if (step && a.state === 'none') { nav('/addon', true); return; }
      if (!step) return addonHome(sec, a);
      addonStep(sec, a, Math.max(1, Math.min(5, step)));
    }).catch(fail);
  };
  // сколько ботов входит в тариф (пункт 11): в «Максимуме» 2, больше — докупка
  function botsIncl(a) {
    var inc = a.included || 0;
    return '<div class="z-card z-bots z-in" style="margin-top:18px"><div class="z-bots-h"><span class="z-tag">Тариф «' + esc(a.tariff || '') + '»</span>' +
      (inc ? '<b>' + (a.bots_used || 0) + ' из ' + inc + ' ботов</b>' : '<b>Не входит</b>') + '</div>' +
      '<ul class="z-inc"><li class="' + (inc ? 'y' : 'n') + '"><i>' + (inc ? '✓' : '—') + '</i><span>' + (inc ? 'В тариф входят 2 бота' : 'В твоём тарифе бот не входит. В «Максимуме» — 2') + '</span></li>' +
      '<li class="y"><i>+</i><span>' + (inc ? 'Третий бот и дальше — докупка' : 'Бот можно докупить отдельно') + '</span></li></ul>' +
      '<p class="fine" style="margin-top:8px">Цену докупки пришлём в чат до оплаты — без твоего согласия ничего не оплачивается.</p></div>';
  }
  function addonHome(sec, a) {
    var chain = '<div class="z-chain">' + a.chain.map(function (c, k) {
      return '<div class="z-in"><b>' + (k < 9 ? '0' : '') + (k + 1) + '</b><span><strong>' + esc(c.t) + '</strong><small>' + esc(c.p) + '</small></span></div>';
    }).join('') + '</div>';
    if (a.state === 'manual' || a.state === 'live') {
      sec.innerHTML = head('Дополнение', 'Мой бот <em>для соцсетей</em>', null) +
        '<div class="z-card acc z-in" style="margin-top:18px"><span class="z-st wait">Настраиваем вручную</span><h3 style="margin-top:12px">Ответы получили</h3><p>Команда собирает твоего бота по ответам: слово «' + esc(a.answers.word || '—') + '», подарок, вопросы и куда слать заявки. Когда бот будет готов, пришлю сообщение и покажу его здесь.</p></div>' +
        '<div class="z-sec"><div class="eyebrow">Как он будет работать</div>' + chain + '</div>' +
        botsIncl(a) +
        '<button class="btn ghost block" type="button" id="zEdit" style="margin-top:18px">Поправить ответы</button>';
      $('#zEdit', sec).addEventListener('click', function () { nav('/addon/1'); });
      return;
    }
    sec.innerHTML = '<span class="plaque in"><i></i>Дополнение</span>' +
      '<h2 class="title2" style="margin-top:16px">Мой бот <em>для соцсетей</em></h2>' +
      '<p class="lead">Свой бот или мини-приложение для твоих соцсетей. Человек пишет кодовое слово — получает подарок, отвечает на пару вопросов, а тебе приходит готовая заявка.</p>' +
      '<div class="z-sec"><div class="eyebrow">Цепочка</div>' + chain + '</div>' +
      '<div class="z-sec"><div class="z-card"><h3>Что от тебя</h3><p>Пять коротких ответов: цель, кодовое слово, подарок, вопросы и куда присылать заявки. Остальное настроим мы.</p></div></div>' +
      botsIncl(a) +
      '<button class="btn block" type="button" id="zAddonGo" style="margin-top:18px"><span>Подключить</span><span class="arr">→</span></button>';
    $('#zAddonGo', sec).addEventListener('click', function () { haptic.tap(); A.addonStart().then(function () { nav('/addon/1'); }).catch(fail); });
  }
  function addonStep(sec, a, n) {
    var q = a.wizard[n - 1], val = a.answers[q.key] || '';
    var bar = ''; for (var i = 1; i <= 5; i++) bar += '<i class="' + (i < n ? 'past' : i === n ? 'on' : '') + '"></i>';
    var multi = q.key === 'leads';
    var picked = multi ? (val ? String(val).split(', ') : []) : val;
    function bodyH() {
      if (q.options) return '<div class="z-chips" style="margin-top:20px">' + q.options.map(function (o) {
        var on = multi ? picked.indexOf(o) >= 0 : picked === o;
        return '<button type="button" class="z-chip ' + (on ? 'on' : '') + '" data-o="' + esc(o) + '">' + esc(o) + '</button>';
      }).join('') + '</div>';
      if (q.key === 'questions') return '<textarea class="z-ta" id="zA" style="margin-top:20px" placeholder="' + esc(q.placeholder) + '">' + esc(val) + '</textarea>';
      return '<div class="field"><label for="zA">Слово</label><input id="zA" maxlength="24" autocapitalize="characters" placeholder="' + esc(q.placeholder || '') + '" value="' + esc(val) + '"></div>';
    }
    function value() { var inp = $('#zA', sec); return inp ? inp.value.trim() : multi ? picked.join(', ') : picked; }
    function draw() {
      sec.innerHTML = '<div class="z-prog" style="grid-template-columns:repeat(5,1fr)" aria-hidden="true">' + bar + '</div>' +
        head('Мой бот · шаг ' + n + ' из 5', esc(q.title), esc(q.hint)) + bodyH() +
        '<button class="btn block" type="button" id="zNext" style="margin-top:22px"><span>' + (n < 5 ? 'Дальше' : 'Отправить команде') + '</span><span class="arr">→</span></button>';
      $$('[data-o]', sec).forEach(function (b) {
        b.addEventListener('click', function () {
          haptic.pick(); var o = b.getAttribute('data-o');
          if (multi) { var k = picked.indexOf(o); if (k >= 0) picked.splice(k, 1); else picked.push(o); } else picked = o;
          draw();
        });
      });
      var nb = $('#zNext', sec);
      function upd() { nb.disabled = !value(); }
      var inp = $('#zA', sec); if (inp) inp.addEventListener('input', upd);
      upd();
      nb.addEventListener('click', function () {
        A.addonAnswer(q.key, value()).then(function () {
          if (n < 5) nav('/addon/' + (n + 1));
          else A.addonFinish().then(function () { haptic.ok(); toast('Отправил. Настроим вручную и напишем.'); nav('/addon'); });
        }).catch(fail);
      });
    }
    draw();
  }

  // ======================================================================
  // СРОК ПЛАНА — 3 / 7 / 14 / 30 дней или своё число 1–60
  // ======================================================================
  function daysWord(n) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'день' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'дня' : 'дней'; }
  // max — сколько дней можно: не больше остатка подписки (в плане) или 60 (по умолчанию в настройках)
  function daysPicker(cur, presets, withDefault, max) {
    max = max || 60;
    var own = presets.indexOf(cur) < 0;
    return '<div class="z-days"><div class="z-chips">' + presets.map(function (d) {
      var off = d > max;
      return '<button type="button" class="z-chip ' + (d === cur ? 'on' : '') + (off ? ' off' : '') + '" data-days="' + d + '"' + (off ? ' disabled aria-disabled="true" title="Длиннее остатка подписки"' : '') + '>' + d + ' ' + daysWord(d) + '</button>';
    }).join('') + '<button type="button" class="z-chip ' + (own ? 'on' : '') + '" data-days="own">Своё число</button></div>' +
      '<div class="z-own" ' + (own ? '' : 'hidden') + '><input id="zOwn" type="number" inputmode="numeric" min="1" max="' + max + '" value="' + (own ? cur : '') + '" placeholder="1–' + max + '"><button class="z-mini red" type="button" id="zOwnGo">' + I.check + 'Готово</button></div>' +
      (withDefault ? '<label class="z-def"><input type="checkbox" id="zDef"><span>Сделать сроком по умолчанию</span></label>' : '') + '</div>';
  }
  function bindDays(box, max, apply) {
    max = max || 60;
    $$('[data-days]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        haptic.pick(); var v = b.getAttribute('data-days');
        if (v === 'own') { $('.z-own', box).hidden = false; $$('[data-days]', box).forEach(function (x) { x.classList.toggle('on', x === b); }); $('#zOwn', box).focus(); return; }
        apply(+v, !!($('#zDef', box) && $('#zDef', box).checked));
      });
    });
    var go = $('#zOwnGo', box);
    if (go) go.addEventListener('click', function () {
      var v = Math.round(+$('#zOwn', box).value);
      if (!(v >= 1 && v <= max)) { toast(max < 60 ? 'До конца подписки ' + max + ' ' + daysWord(max) + ' — план от 1 до ' + max + ' ' + daysWord(max) + '.' : 'Срок — от 1 до 60 дней.', 4200); return; }
      apply(v, !!($('#zDef', box) && $('#zDef', box).checked));
    });
  }

  // ======================================================================
  // ВХОД НА САЙТЕ (вне Telegram) — через Telegram или по телефону. Заглушка
  // ======================================================================
  function loginScreen(done) {
    body.classList.remove('has-tabs');
    body.setAttribute('data-screen', 'login');
    var sec = document.createElement('section'); sec.className = 'scr active';
    $('#app').innerHTML = ''; $('#app').appendChild(sec);
    var phone = '';
    function draw(stage) {
      sec.innerHTML = '<span class="plaque in"><i></i>Вход</span>' +
        '<h2 class="title2" style="margin-top:16px">Твой <em>завод</em> — и на сайте</h2>' +
        '<p class="lead">То же, что в Telegram: план, черновики, цифры. Войди тем же аккаунтом.</p>' +
        '<div class="z-sec">' +
        (stage === 'code'
          ? '<div class="field" style="margin-top:0"><label for="zCode">Код <small>отправили на ' + esc(phone) + '</small></label><input id="zCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••"></div>' +
            '<button class="btn block" type="button" id="zCodeGo" style="margin-top:14px">Войти</button><button class="link-btn" type="button" id="zBack">Другой номер</button>'
          : '<button class="btn block" type="button" id="zTg">' + I.send + 'Войти через Telegram</button>' +
            '<div class="z-or"><span>или по телефону</span></div>' +
            '<div class="field" style="margin-top:0"><label for="zPhone">Номер телефона</label><input id="zPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 900 000-00-00"></div>' +
            '<button class="btn ghost block" type="button" id="zPhoneGo" style="margin-top:14px">Получить код</button>') +
        '</div><p class="fine center">Нет аккаунта? Открой бота в Telegram — знакомство начинается там.</p>';
      if (stage === 'code') {
        $('#zCodeGo', sec).addEventListener('click', function () { A.authCode(phone, $('#zCode', sec).value.trim()).then(done).catch(fail); });
        $('#zBack', sec).addEventListener('click', function () { draw('start'); });
      } else {
        $('#zTg', sec).addEventListener('click', function () { A.authTelegram({}).then(done).catch(fail); });
        $('#zPhoneGo', sec).addEventListener('click', function () {
          phone = $('#zPhone', sec).value.trim();
          A.authPhone(phone).then(function (d) { toast('Код отправлен: ' + (d.via || 'СМС') + '.'); draw('code'); }).catch(fail);
        });
      }
    }
    draw('start');
  }

  // ---------- старт ----------
  function boot() { A.me().then(function (d) {
    ME = d;
    buildTabs();
    if (Q.get('screen') && !location.hash) history.replaceState(null, '', '#/' + Q.get('screen'));
    render();
    if (ME.role !== 'lead' && onbDone()) A.review().then(function (r) { setBadge(r.drafts.length); }).catch(function () {});
  }).catch(function (e) {
    $('#app').innerHTML = '<section class="scr active">' + head('Завод', 'Не получилось <em>открыть</em>', (e && e.human && e.message) || 'Проверь интернет и открой приложение ещё раз.') + '</section>';
  });
  }
  if (A.needLogin()) loginScreen(function () { haptic.ok(); boot(); }); else boot();
})();
