/* Контент-завод · мини-приложение «собери свой ролик».
   Без сборщиков: один файл, чистый JavaScript.
   Режим демо (моки без сервера): открыто вне Telegram или ?demo=1.
   Для просмотра дизайна в демо можно сразу прыгнуть на экран:
   ?demo=1&screen=photos|about|steps|color|build|done|fail   (для build можно &t=секунды)
   ?demo=0 — в обычном браузере ходить в настоящий сервер (для проверки с DEV=1).
   ?demo=1&tgsim=1 — подставной Telegram 8.0 только для «вау»-кнопок (сторис, полный экран, вибрация,
   ссылки): кнопки видны, а их вызовы пишутся в консоль как «[tg-sim] …». Вне Telegram без tgsim
   кнопка «Выложить в сторис» скрыта.
   «Вау»-поля и запросы — по договору docs/бот_ролик/ВАУ_ДОГОВОР_API.md; любое может отсутствовать. */
(function () {
  'use strict';

  // ---------- окружение ----------
  var Q = new URLSearchParams(location.search);
  var tg = (window.Telegram && window.Telegram.WebApp) || null;
  var IN_TG = !!(tg && tg.initData);
  var DEMO = Q.get('demo') === '1' || (!IN_TG && Q.get('demo') !== '0');
  var REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var MIN_STEPS = 4, MAX_STEPS = 7, LEN_T = 28, LEN_P = 90;
  var DEFAULT_HEAD = 'Как я работаю с клиентом';
  var POLICY_URL = 'https://valeriachirkova.getcourse.ru/privacypolicy';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var body = document.body;

  function ver(v) { try { return !!(tg && tg.isVersionAtLeast && tg.isVersionAtLeast(v)); } catch (e) { return false; } }

  if (IN_TG) {
    body.classList.add('tg');
    try { tg.ready(); } catch (e) {}
    try { tg.expand(); } catch (e) {}
    try { if (ver('6.1')) { tg.setHeaderColor('#0B0D0F'); tg.setBackgroundColor('#0B0D0F'); } } catch (e) {}
    try { if (ver('7.10')) tg.setBottomBarColor('#0B0D0F'); } catch (e) {}
    try { if (ver('7.7')) tg.disableVerticalSwipes(); } catch (e) {}
  }

  // ---------- возможности Telegram для «вау»-кнопок ----------
  // TGX — настоящий Telegram, а в демо с ?tgsim=1 — подставной 8.0, который пишет вызовы в консоль.
  // Каждая кнопка проверяет версию сама: нет поддержки — кнопки нет.
  function cmpVer(a, b) {
    a = String(a).split('.'); b = String(b).split('.');
    for (var i = 0; i < Math.max(a.length, b.length); i++) {
      var x = parseInt(a[i] || 0, 10) || 0, y = parseInt(b[i] || 0, 10) || 0;
      if (x !== y) return x > y ? 1 : -1;
    }
    return 0;
  }
  var SIM = DEMO && Q.get('tgsim') === '1';
  var simTg = SIM ? (function () {
    function log(n) { return function () { try { console.info('[tg-sim] ' + n, JSON.stringify(Array.prototype.slice.call(arguments, 0, 2))); } catch (e) {} }; }
    var o = {
      version: '8.0', isFullscreen: false,
      isVersionAtLeast: function (v) { return cmpVer('8.0', v) >= 0; },
      initDataUnsafe: { user: { is_premium: false } },
      shareToStory: log('shareToStory'),
      openTelegramLink: log('openTelegramLink'),
      requestFullscreen: function () { o.isFullscreen = true; log('requestFullscreen')(); },
      exitFullscreen: function () { o.isFullscreen = false; log('exitFullscreen')(); },
      HapticFeedback: { impactOccurred: log('haptic.impact'), selectionChanged: log('haptic.selection'), notificationOccurred: log('haptic.notification') }
    };
    return o;
  })() : null;
  var TGX = IN_TG ? tg : simTg;
  function xver(v) { try { return !!(TGX && TGX.isVersionAtLeast && TGX.isVersionAtLeast(v)); } catch (e) { return false; } }

  // ---------- вибро-отклик (только в Telegram 6.1+) ----------
  var HAP = (IN_TG && ver('6.1') && !!tg.HapticFeedback) || SIM;
  function hf() { return TGX.HapticFeedback; }
  var haptic = {
    tap: function () { try { HAP && hf().impactOccurred('light'); } catch (e) {} },
    frame: function () { try { HAP && hf().impactOccurred('medium'); } catch (e) {} },
    pick: function () { try { HAP && hf().selectionChanged(); } catch (e) {} },
    ok: function () { try { HAP && hf().notificationOccurred('success'); } catch (e) {} },
    err: function () { try { HAP && hf().notificationOccurred('error'); } catch (e) {} },
    warn: function () { try { HAP && hf().notificationOccurred('warning'); } catch (e) {} }
  };

  // ---------- тост ----------
  var toastT;
  function toast(msg, ms) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove('on'); }, ms || 3800);
  }

  // ---------- сервер ----------
  // Человеку — только русские тексты. Сырые ошибки браузера («Load failed», «Failed to fetch»)
  // наружу не выпускаем: у каждой ошибки есть kind, а текст — из TXT или от нашего сервера.
  var TXT = {
    net: 'Связь прервалась. Проверь интернет и нажми ещё раз — всё, что ты заполнил, сохранено.',
    retry: 'Связь прервалась — пробуем ещё раз…',
    busy: 'Сервер сейчас занят. Подожди немного и попробуй ещё раз.',
    big: 'Фото слишком большое. Выбери другое фото.',
    type: 'Этот файл не подходит. Нужны фото: JPG, PNG, HEIC или WebP.',
    other: 'Что-то пошло не так. Попробуй ещё раз.'
  };
  var PAUSES = [1000, 2000, 4000];   // три повтора при сетевом сбое, потом — ошибка
  var REQ_TIMEOUT = 30000, STALL_MS = 30000;

  // kind: net — нет связи; busy — сервер/туннель перегружен; big, type — про файл;
  // server — сервер сам прислал понятный текст {"error": "..."}; other — прочее
  function apiErr(kind, msg, status, data) {
    var e = new Error(msg || TXT[kind] || TXT.other);
    e.kind = kind; e.human = true; e.status = status || 0; e.data = data || null;
    return e;
  }
  function kindOf(st) {
    if (st === 413) return 'big';
    if (st === 415) return 'type';
    if (st === 408 || st === 429 || st === 502 || st === 503 || st === 504 || (st >= 520 && st <= 530)) return 'busy';
    return 'other';
  }
  // ответ сервера → данные или понятная ошибка
  function parseReply(status, text) {
    var d = null;
    try { d = JSON.parse(text); } catch (e) {}
    if (d && typeof d.error === 'string' && d.error) throw apiErr('server', d.error, status, d);
    if (status === 0) throw apiErr('net', null, 0);
    if (status >= 400 || !d || typeof d !== 'object') { var k = status >= 400 ? kindOf(status) : 'other'; throw apiErr(k, null, status, d); }
    return d;
  }
  function humanMsg(e, fallback) { return (e && e.human && e.message) || fallback || TXT.other; }
  function sleep(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  // повторяем, пока сбой сетевой или туннель ответил «занят»; ответ сервера по-русски не повторяем
  function retrying(make, onRetry) {
    var n = 0;
    function attempt() {
      return make(n).catch(function (e) {
        var again = e && (e.kind === 'net' || (e.kind === 'busy' && e.status !== 429));
        if (!again || n >= PAUSES.length) throw e;
        var ms = PAUSES[n++];
        if (onRetry) try { onRetry(n, PAUSES.length, e); } catch (x) {}
        return sleep(ms).then(attempt);
      });
    }
    return attempt();
  }

  function fetchOnce(path, opt) {
    var init = { method: opt.method || 'GET', headers: { 'X-Tg-Init-Data': (tg && tg.initData) || '' } };
    if (opt.json) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opt.json); }
    if (opt.keepalive) init.keepalive = true;
    var ctl = (!opt.keepalive && window.AbortController) ? new AbortController() : null, tm = 0;
    if (ctl) { init.signal = ctl.signal; tm = setTimeout(function () { ctl.abort(); }, opt.timeout || REQ_TIMEOUT); }
    return fetch(path, init)
      .then(function (r) { return r.text().then(function (t) { return [r.status, t]; }); })
      .catch(function () { throw apiErr('net'); })   // TypeError «Load failed» и обрыв на чтении ответа
      .then(function (rt) { clearTimeout(tm); return parseReply(rt[0], rt[1]); },
            function (e) { clearTimeout(tm); throw e; });
  }
  // opt.retry === false — без повторов; opt.quiet — повторять молча (фоновые запросы)
  function api(path, opt) {
    opt = opt || {};
    if (DEMO) return MOCK.call(path, opt);
    if (opt.keepalive || opt.retry === false) return fetchOnce(path, opt);
    return retrying(function () { return fetchOnce(path, opt); },
      opt.quiet ? null : (opt.onRetry || function () { toast(TXT.retry, 4500); }));
  }
  function track(name, data) {
    if (DEMO) { try { console.info('[событие]', name, data || {}); } catch (e) {} return; }
    api('/api/event', { method: 'POST', json: { name: name, data: data || {} }, keepalive: true }).catch(function () {});
  }

  // ---------- моки для демо ----------
  var MOCK = (function () {
    var t0 = 0;
    var STAGES = ['Готовлю фото', 'Раскладываю шаги', 'Рисую кадры', 'Собираю анимацию', 'Свожу ролик'];
    function wait(ms, v) { return new Promise(function (res) { setTimeout(function () { res(v); }, ms); }); }
    function waitErr(ms, msg, status, data) { return wait(ms).then(function () { throw apiErr('server', msg, status, data); }); }
    var EX = 'primer/example.mp4';
    // «вау»-заглушки: кадры раскадровки настоящего ролика (primer/kadr_*.jpg, 540×960)
    // kind: cover — заставка, step — кадр шага (step — номер с 1), cta — финал
    var PREVIEW = ['7 шагов — и готово', 'Знакомство', 'Разбор', 'План', 'Работа', 'Проверка', 'Итог', 'Финал']
      .map(function (t, k, a) {
        var it = { url: 'primer/kadr_' + (k + 1) + '.jpg', title: t, kind: k === 0 ? 'cover' : k === a.length - 1 ? 'cta' : 'step' };
        if (it.kind === 'step') it.step = k;
        return it;
      });
    var Q_END = 4, FRAMES_AT = 6, FRAME_EVERY = 1.4, DONE_AT = 22;
    var locked = ['instagram', 'youtube'], unlockTries = 0, rerenderLeft = 1, draftAt = 0;
    var VOICE_STEPS = [
      { nazvanie: 'Первый звонок', tekst: 'Слушаю, как ты живёшь и чего хочешь от дома.' },
      { nazvanie: 'Замер', tekst: 'Приезжаю, снимаю размеры и фотографирую каждый угол.' },
      { nazvanie: 'Два стиля', tekst: 'Показываю два варианта — выбираем вместе.' },
      { nazvanie: 'Проект', tekst: 'Чертежи, свет, мебель — всё расписано по полочкам.' },
      { nazvanie: 'Стройка', tekst: 'Веду ремонт и каждую неделю присылаю фото.' },
      { nazvanie: 'Ключи', tekst: 'Сдаю готовую квартиру и расставляю последние вазы.' }
    ];
    function detail(s) {
      var st = (typeof S !== 'undefined' && S.shagi) || [];
      var p = (s - Q_END) / (DONE_AT - Q_END);
      if (p < 0.12) return 'Сажаю твоё лицо в кружок…';
      if (p > 0.86) return 'Свожу музыку под удар…';
      if (p > 0.74) return 'Проверяю каждый кадр…';
      var k = Math.min(st.length - 1, Math.floor((p - 0.12) / 0.62 * st.length));
      var n = st[k] && st[k].nazvanie;
      return n ? 'Анимирую шаг ' + (k + 1) + ': ' + n + '…' : 'Рисую кадры…';
    }
    function urls() {
      var u = {};
      ['instagram', 'telegram', 'youtube'].forEach(function (f) { if (locked.indexOf(f) < 0) u[f] = EX; });
      return u;
    }
    function doneData() {
      return {
        status: 'done', progress: 1, stage: 'Готово', queue_pos: 0, video_urls: urls(), error: null,
        preview: PREVIEW, stage_detail: 'Ролик готов',
        // Telegram берёт в сторис только внешний https-адрес; локальный демо-сервер — http, поэтому адрес-заглушка
        story_url: /^https:/.test(location.protocol) ? abs(EX) : 'https://demo.invalid/kontent-zavod-telegram-stories.mp4', formats_locked: locked.slice(), rerender_left: rerenderLeft,
        post_text: 'Как я веду клиента — от первого звонка до ключей\n\n' +
          '1. Знакомство — слушаю, как ты живёшь и что хочешь.\n2. Замер — снимаю размеры и фотографирую.\n' +
          '3. Концепция — два варианта стиля на выбор.\n4. Проект — чертежи, свет, мебель.\n5. Ремонт — веду стройку и отвечаю за результат.\n\n' +
          'Хочешь так же спокойно? Пиши в директ @anna.design',
        stats: { hours_saved: 6 }
      };
    }
    return {
      call: function (path, opt) {
        opt = opt || {};
        if (path === '/api/session') return wait(200, { session_id: 'demo' });
        if (path === '/api/offer') return wait(80, {
          site_url: 'https://valeriachirkova.getcourse.ru/kontentzavod',
          pay_url: 'https://valeriachirkova.getcourse.ru/kontentzavod#cz-tariffs',
          bot_username: 'demo_bot', manager_url: 'https://t.me/valeria_chirkova',
          call_url: 'https://valeriachirkova.getcourse.ru/zapis'
        });
        if (path === '/api/stats') return wait(250, { rendered_total: 1284 });
        if (path === '/api/gallery') return wait(300, { items: [
          { poster: 'primer/kadr_3.jpg', video: EX, name: 'Антон, автоматизация' },
          { poster: 'primer/example.jpg', video: EX, name: 'Валерия, смыслы' },
          { poster: 'primer/kadr_7.jpg', video: EX, name: 'Ирина, психолог' },
          { poster: 'primer/kadr_5.jpg', video: EX, name: 'Олег, ремонт' }
        ] });
        if (path === '/api/styles') return wait(350, { styles: [
          { id: 'noch', name: 'Ночь', note: 'Тёмный фон и неон — как в примере', preview_url: 'primer/kadr_3.jpg' },
          { id: 'belyi', name: 'Светлый', note: 'Белый фон, чистая журнальная вёрстка', preview_url: '' },
          { id: 'kino', name: 'Кино', note: 'Крупные кадры и медленные переходы', preview_url: 'primer/kadr_6.jpg' }
        ] });
        if (path === '/api/draft') return wait(150, { shagi: draftAt && Date.now() >= draftAt ? VOICE_STEPS : [] });
        if (path === '/api/share') return wait(120, { text: 'Собери бесплатный ролик о том, как ты работаешь с клиентом — за пару минут', url: 'https://t.me/demo_bot?start=ref_demo' });
        if (path === '/api/unlock_formats') {
          unlockTries++;
          if (unlockTries >= 2) locked = [];
          return wait(700, { ok: !locked.length, formats_locked: locked.slice(), channel_url: 'https://t.me/kontent_zavod' });
        }
        if (path.indexOf('/api/gallery_optin/') === 0) return wait(300, { ok: true });
        if (path.indexOf('/api/rerender/') === 0) {
          if (rerenderLeft <= 0) return waitErr(400, 'Бесплатная правка уже использована. Ролик в чате остаётся твоим.', 409);
          rerenderLeft--; t0 = Date.now();
          return wait(500, { job_id: 'demo-job-2' });
        }
        if (path === '/api/suggest_steps') return wait(1600, { shagi: [
          { nazvanie: 'Знакомство', tekst: 'Созвон: разбираем задачу и что для тебя важно.' },
          { nazvanie: 'Разбор', tekst: 'Смотрю, что уже есть, и нахожу слабые места.' },
          { nazvanie: 'План', tekst: 'Собираю план по шагам — понятно, что и когда.' },
          { nazvanie: 'Работа', tekst: 'Делаю и показываю промежуточный результат.' },
          { nazvanie: 'Результат', tekst: 'Сдаю работу и объясняю, как этим пользоваться.' },
          { nazvanie: 'На связи', tekst: 'Остаюсь рядом, если появятся вопросы.' }
        ] });
        if (path.indexOf('/api/render/') === 0) { t0 = Date.now(); return wait(400, { job_id: 'demo-job' }); }
        if (path.indexOf('/api/job/') === 0) {
          var s = (Date.now() - t0) / 1000;
          if (s < Q_END) return wait(100, { status: 'queued', progress: 0, stage: null, queue_pos: Math.max(1, 3 - Math.floor(s / 1.4)), video_urls: null, error: null });
          var p = Math.min(1, (s - Q_END) / (DONE_AT - Q_END));
          if (p >= 1) return wait(100, doneData());
          var nf = s < FRAMES_AT ? 0 : Math.min(PREVIEW.length, Math.floor((s - FRAMES_AT) / FRAME_EVERY) + 1);
          return wait(100, { status: 'working', progress: p, stage: STAGES[Math.min(STAGES.length - 1, Math.floor(p * STAGES.length))], queue_pos: 0, video_urls: null, error: null,
            preview: PREVIEW.slice(0, nf), stage_detail: detail(s), rerender_left: rerenderLeft });
        }
        return wait(50, {});
      },
      startAt: function (sec) { t0 = Date.now() - sec * 1000; },
      voice: function () { draftAt = Date.now() + 3500; },
      doneData: doneData
    };
  })();

  // ---------- состояние ----------
  var S = {
    session: null,
    photos: [null, null, null],   // {uid, file, url, name, w, h, broken, demo, prep}
    busy: false,                  // идёт загрузка фото или запуск сборки — вторая не начинается
    uploadedSig: null, fotoIds: [],
    shagi: [], cvet: '#E4102B',
    job: null, urls: null, fmt: 'instagram',
    offer: { site_url: '', pay_url: '', bot_username: '', manager_url: '' },
    // «вау»: всё необязательное — от нового сервера
    style: null, styles: null,    // выбранный стиль (id) и список из /api/styles (null — ещё не спрашивали)
    vau: {},                      // новые поля последнего /api/job: preview, story_url, formats_locked, rerender_left, post_text, stats
    preview: [], share: null, celebrated: false
  };
  var uidN = 0;
  for (var i0 = 0; i0 < MIN_STEPS; i0++) S.shagi.push({ nazvanie: '', tekst: '' });

  function ensureSession(force, opt) {
    if (S.session && !force) return Promise.resolve(S.session);
    opt = opt || {};
    var o = function (x) { x.retry = opt.retry; return x; };
    // без согласия сервер не примет фото (403) — отправляем его перед новой сессией
    return api('/api/consent', o({ method: 'POST', json: {} }))
      .then(function () { return api('/api/session', o({ method: 'POST', json: {} })); })
      .then(function (d) { S.session = d.session_id; return S.session; });
  }
  api('/api/offer', { quiet: true }).then(function (d) {
    for (var k in d) if (d[k]) S.offer[k] = d[k];
    $('#callBtn').hidden = !S.offer.call_url;
  }).catch(function () {});

  // ---------- навигация ----------
  var ORDER = ['welcome', 'photos', 'about', 'steps', 'color', 'build', 'done'];
  var BACK = { photos: 'welcome', about: 'photos', steps: 'about', color: 'steps', fail: 'color' };
  var cur = null;

  function go(name, back) {
    var next = $('.scr[data-screen="' + name + '"]');
    var prev = cur ? $('.scr[data-screen="' + cur + '"]') : null;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (prev && prev !== next) {
      prev.classList.remove('active', 'from-back');
      if (!REDUCED) {
        prev.classList.add('leaving');
        setTimeout(function () { prev.classList.remove('leaving'); }, 300);
      }
      if (LEAVE[cur]) LEAVE[cur]();
    }
    next.classList.toggle('from-back', !!back);
    next.classList.remove('active'); void next.offsetWidth; next.classList.add('active');
    cur = name;
    body.setAttribute('data-screen', name);
    window.scrollTo(0, 0);

    var idx = ORDER.indexOf(name === 'fail' ? 'build' : name);
    $$('#steps i').forEach(function (el, i) { el.classList.toggle('on', i === idx); el.classList.toggle('past', i < idx); });

    var canBack = !!BACK[name];
    body.classList.toggle('can-back', canBack);
    syncBack();

    if (SCREENS[name]) SCREENS[name]();
  }
  function goBack() {
    if (!$('#theater').hidden) { closeTheater(); return; }
    if (!$('#sheet').hidden) { closeSheet(); return; }
    var b = BACK[cur]; if (b) { haptic.tap(); go(b, true); }
  }
  // системная «Назад» в Telegram: поверх экрана открыт просмотр или правка — она их закрывает
  function syncBack() {
    if (!(IN_TG && tg.BackButton)) return;
    var on = !!BACK[cur] || !$('#theater').hidden || !$('#sheet').hidden;
    try { on ? tg.BackButton.show() : tg.BackButton.hide(); } catch (e) {}
  }
  function overlayOpen() { return !$('#theater').hidden || !$('#sheet').hidden; }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlayOpen()) goBack(); });
  $('#backBtn').addEventListener('click', goBack);
  if (IN_TG && tg.BackButton) try { tg.BackButton.onClick(goBack); } catch (e) {}

  // ---------- главная кнопка: в Telegram — MainButton, в браузере — своя панель снизу ----------
  var primaryFn = null, lastPrimary = null;
  // opt.keep — временно спрятать (поверх открыт просмотр/правка), не забывая, что было
  function primary(text, fn, opt) {
    opt = opt || {};
    if (!opt.keep) {
      lastPrimary = [text, fn, opt];
      if (overlayOpen()) return;   // применится, когда закроют просмотр или правку
    }
    primaryFn = fn;
    var visible = opt.visible !== false && !!text, active = opt.active !== false;
    if (IN_TG && tg.MainButton) {
      try {
        if (visible) tg.MainButton.setParams({ text: text.toUpperCase(), color: '#E4102B', text_color: '#FFFFFF', is_active: active, is_visible: true });
        else tg.MainButton.hide();
        if (opt.progress) tg.MainButton.showProgress(false); else tg.MainButton.hideProgress();
      } catch (e) {}
    }
    if (text) $('#ctaText').textContent = text;
    $('#ctaBtn').disabled = !active;
    $('#cta').classList.toggle('hide', !visible);
  }
  function onPrimary() { if (primaryFn) { haptic.tap(); primaryFn(); } }
  $('#ctaBtn').addEventListener('click', onPrimary);
  if (IN_TG && tg.MainButton) try { tg.MainButton.onClick(onPrimary); } catch (e) {}

  var SCREENS = {
    welcome: function () { playVid($('#exVideo')); primary('Собрать свой ролик', function () { go('photos'); }); },
    photos: function () { renderSlots(); },
    about: function () { primary('Дальше', submitAbout); },
    steps: function () { renderSteps(); primary('Шаги готовы', submitSteps); initVoice(); },
    color: function () { loadStyles(); buildMock(); primary('Собрать ролик', startRender); },
    build: function () { primary('', null, { visible: false }); fillBelt(); startWarm(); },
    done: function () { stopWarm(); showDone(); },
    fail: function () { stopWarm(); primary('Попробовать ещё раз', function () { go('color', true); }); }
  };
  var LEAVE = {
    welcome: function () { $('#exVideo').pause(); },
    steps: function () { stopVoice(); },
    color: function () { stopMock(); },
    build: function () { clearTimeout(reelT); reelT = 0; },
    done: function () { $('#video').pause(); }
  };

  window.addEventListener('scroll', function () { $('#top').classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });

  // ---------- видео: звук, прогресс ----------
  function playVid(v) { if (!v) return; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  $$('.snd').forEach(function (b) {
    var v = document.getElementById(b.getAttribute('data-for'));
    b.addEventListener('click', function () {
      v.muted = !v.muted;
      b.classList.toggle('on', !v.muted);
      b.setAttribute('aria-label', v.muted ? 'Включить звук' : 'Выключить звук');
      if (v.paused) playVid(v);
      haptic.tap();
    });
  });
  $$('[data-prog]').forEach(function (bar) {
    var v = document.getElementById(bar.getAttribute('data-prog'));
    v.addEventListener('timeupdate', function () { if (v.duration) bar.style.width = (v.currentTime / v.duration * 100) + '%'; });
    v.addEventListener('click', function () { if (v.paused) playVid(v); else v.pause(); });
  });

  // =====================================================
  // 2. СОГЛАСИЕ + ФОТО
  // =====================================================
  var consent = $('#consent');
  consent.addEventListener('change', function () {
    $('#consentBox').classList.toggle('ok', consent.checked);
    haptic.pick();
    renderSlots();
  });
  $('#policyLink').addEventListener('click', function (e) {
    e.preventDefault(); e.stopPropagation();
    openExt(POLICY_URL, 'политика обработки данных');
  });

  var fileInput = $('#fileInput');
  var targetSlot = 0;
  $$('.slot').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target.closest('.rm')) return;
      if (S.busy) { toast('Подожди — фото ещё отправляются.'); return; }
      if (!consent.checked) {
        haptic.warn();
        var cb = $('#consentBox'); cb.classList.remove('shake'); void cb.offsetWidth; cb.classList.add('shake');
        toast('Сначала отметь согласие на обработку фото.');
        return;
      }
      targetSlot = +el.getAttribute('data-slot');
      var empty = S.photos.filter(function (p) { return !p; }).length;
      fileInput.multiple = !S.photos[targetSlot] && empty > 1;
      fileInput.click();
    });
  });
  fileInput.addEventListener('change', function () {
    var files = Array.prototype.slice.call(fileInput.files || []);
    fileInput.value = '';
    if (!files.length) return;
    var imgs = files.filter(isImage);
    if (imgs.length < files.length) {
      haptic.warn();
      var vid = files.some(function (f) { return /^video\//i.test(f.type || '') || /\.(mp4|mov|m4v|avi|webm|mkv)$/i.test(f.name || ''); });
      toast(vid ? 'Видео не принимаем — только фото. Остальное пропустил.'
                : 'Часть файлов не фото — пропустил. Подойдут JPG, PNG, HEIC или WebP.');
    }
    if (!imgs.length) return;
    // первое — в выбранное место, остальные — в пустые по порядку
    putPhoto(targetSlot, imgs.shift());
    var extra = 0;
    imgs.forEach(function (f) {
      var k = S.photos.indexOf(null);
      if (k >= 0) putPhoto(k, f); else extra++;
    });
    if (extra) toast('Больше трёх фото не нужно — взял первые.');
    haptic.tap();
    renderSlots();
  });

  function isImage(f) {
    var t = (f.type || '').toLowerCase(), n = (f.name || '').toLowerCase();
    if (t.indexOf('video/') === 0) return false;
    return t.indexOf('image/') === 0 || /\.(jpe?g|png|webp|heic|heif)$/.test(n);
  }
  function putPhoto(k, f) {
    var old = S.photos[k];
    if (old && !old.demo) try { URL.revokeObjectURL(old.url); } catch (e) {}
    var it = { uid: ++uidN, file: f, url: URL.createObjectURL(f), name: f.name, w: 0, h: 0, broken: false };
    S.photos[k] = it;
    var im = new Image(), ready;
    it.prep = new Promise(function (res) { ready = res; });   // уменьшенное фото для отправки
    im.onload = function () {
      it.w = im.naturalWidth; it.h = im.naturalHeight; renderSlots();
      shrink(im, f).then(ready);
    };
    // например, HEIC в браузере без поддержки — отправим как есть, сервер его примет
    im.onerror = function () { it.broken = true; renderSlots(); ready({ blob: f, name: f.name }); };
    im.src = it.url;
  }

  // Уменьшение перед отправкой: длинная сторона до 2000 px, JPEG 0.85.
  // Фото с айфона 3–8 МБ становятся ~0,5 МБ — на медленной связи это разница между «ушло» и «оборвалось».
  // Поворот по EXIF делает сам браузер: <img> и drawImage учитывают ориентацию (Safari 13.1+, Chrome 81+).
  // Не вышло сжать — отправляем оригинал: сервер принимает и HEIC, и большие файлы.
  var MAX_SIDE = 2000, JPEG_Q = 0.85, KEEP_JPEG_BYTES = 1.2 * 1024 * 1024;
  var OK_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;
  function shrink(im, f) {
    var orig = { blob: f, name: f.name };
    try {
      var w = im.naturalWidth, h = im.naturalHeight;
      if (!w || !h || !window.HTMLCanvasElement) return Promise.resolve(orig);
      var k = Math.min(1, MAX_SIDE / Math.max(w, h));
      if (k === 1 && /jpe?g/i.test(f.type || '') && f.size <= KEEP_JPEG_BYTES) return Promise.resolve(orig);
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
      var g = c.getContext('2d');
      if (!g || !c.toBlob) return Promise.resolve(orig);
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, c.width, c.height);   // прозрачный PNG — на белом, а не на чёрном
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(im, 0, 0, c.width, c.height);
      return new Promise(function (res) {
        c.toBlob(function (b) {
          var cw = c.width, ch = c.height;
          c.width = c.height = 0;   // айфону — отдать память холста сразу
          if (!b || !b.size || (b.size >= f.size && OK_EXT.test(f.name || ''))) return res(orig);
          var base = String(f.name || 'foto').replace(/\.[^.\/]*$/, '') || 'foto';
          try { console.info('[сжатие]', f.name, Math.round(f.size / 1024) + ' КБ → ' + Math.round(b.size / 1024) + ' КБ, ' + cw + '×' + ch); } catch (e) {}
          res({ blob: b, name: base + '.jpg', w: cw, h: ch });
        }, 'image/jpeg', JPEG_Q);
      }).catch(function () { return orig; });
    } catch (e) { return Promise.resolve(orig); }
  }
  function removePhoto(k) {
    if (S.busy) { toast('Подожди — фото ещё отправляются.'); return; }
    var it = S.photos[k];
    if (it && !it.demo) try { URL.revokeObjectURL(it.url); } catch (e) {}
    S.photos[k] = null;
    // сдвигаем, чтобы портретом всегда было первое фото
    var rest = S.photos.filter(Boolean);
    S.photos = [rest[0] || null, rest[1] || null, rest[2] || null];
    haptic.tap();
    renderSlots();
  }

  var ICON_X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var EMPTY_HTML = $$('.slot').map(function (el) { return el.innerHTML; });

  function renderSlots() {
    $('#slots').classList.toggle('locked', !consent.checked);
    $$('.slot').forEach(function (el, k) {
      var it = S.photos[k];
      var key = it ? it.uid + ':' + (it.broken ? 'b' : '') + it.w + 'x' + it.h : 'empty';
      if (el.getAttribute('data-key') === key) return;
      el.setAttribute('data-key', key);
      el.classList.toggle('filled', !!it);
      if (!it) { el.innerHTML = EMPTY_HTML[k]; el.setAttribute('aria-label', k ? 'Добавить фото' : 'Добавить портрет'); return; }
      var wide = it.w && it.h && it.w > it.h * 1.05;
      el.innerHTML = (it.broken ? '<span class="nm">' + esc(short(it.name)) + '</span>' : '<img class="pic" alt="" src="' + it.url + '">') +
        (wide ? '<span class="warn">Горизонтальное — обрежем по бокам</span>' : '') +
        '<span class="lbl">' + (k ? 'Фото ' + (k + 1) : 'Портрет') + '</span>' +
        '<span class="rm" role="button" tabindex="0" aria-label="Убрать фото">' + ICON_X + '</span>';
      el.setAttribute('aria-label', 'Заменить фото');
      el.querySelector('.rm').addEventListener('click', function (e) { e.stopPropagation(); removePhoto(k); });
    });
    var n = S.photos.filter(Boolean).length;
    $('#slotHint').textContent = !consent.checked ? 'Сначала отметь согласие — потом откроется загрузка.'
      : n ? 'Нажми на фото, чтобы заменить. Первое — всегда портрет.' : 'Нажми на «Портрет», чтобы выбрать фото из галереи.';
    if (cur === 'photos' && !S.busy) {
      primary(!consent.checked ? 'Отметь согласие' : n ? 'Дальше' : 'Добавь портрет', uploadPhotos, { active: consent.checked && n > 0 });
    }
  }
  function short(n) { n = String(n || ''); return n.length > 22 ? n.slice(0, 10) + '…' + n.slice(-8) : n; }
  function plural(n, f) { n = Math.abs(n) % 100; var d = n % 10; return n > 10 && n < 20 ? f[2] : d === 1 ? f[0] : d > 1 && d < 5 ? f[1] : f[2]; }
  function fmtN(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  if (DEMO) { $('#demoFill').hidden = false; $('#demoFill').addEventListener('click', demoFill); }
  function demoFill() {
    consent.checked = true; $('#consentBox').classList.add('ok');
    S.photos = [
      { uid: ++uidN, url: 'img/demo_v.webp', name: 'portret.webp', w: 4, h: 5, demo: true },
      { uid: ++uidN, url: 'img/reel.jpg', name: 'rabota.jpg', w: 9, h: 16, demo: true },
      null
    ];
    renderSlots();
  }

  function sig() { return S.photos.map(function (p) { return p ? p.uid : '-'; }).join(','); }

  function uploadPhotos() {
    if (S.busy || !consent.checked || !S.photos[0]) return;
    if (S.uploadedSig === sig()) { go('about'); return; }
    S.busy = true;
    var bar = $('#upbar'), prog = $('#upProg'), txt = $('#upText');
    var lastPct = -1;
    function show(t, pct) {
      txt.textContent = t;
      if (pct != null) {
        prog.style.width = pct.toFixed(1) + '%';
        var r = Math.round(pct);
        // в Telegram полоски под фото может быть не видно — дублируем проценты на главной кнопке
        if (r !== lastPct) { lastPct = r; primary(r < 99 ? 'Загружаю… ' + r + '%' : 'Проверяю фото…', null, { active: false, progress: true }); }
      }
    }
    bar.hidden = false; prog.style.width = '0%';
    show('Готовлю фото…');
    primary('Загружаю…', null, { active: false, progress: true });
    var mySig = sig(), items = S.photos.filter(Boolean);
    Promise.all(items.map(function (p) { return p.prep || { blob: p.file, name: p.name }; })).then(function (parts) {
      if (DEMO) return ensureSession(S.uploadedSig !== null).then(function () { return fakeUpload(prog); });
      parts = parts.filter(function (x) { return x && x.blob; });
      var kb = parts.reduce(function (a, x) { return a + x.blob.size; }, 0) / 1024;
      return retrying(function (n) {
        show(n ? TXT.retry : 'Отправляю фото…', 0); lastPct = -1;
        // повтор — всегда в новую сессию: если прошлая попытка всё-таки дошла, фото не задвоятся
        return ensureSession(n > 0 || S.uploadedSig !== null, { retry: false }).then(function (sid) {
          return xhrUpload(sid, parts, function (f) {
            show(f < 0.99 ? 'Отправляю фото… ' + Math.round(f * 100) + '%' : 'Проверяю фото…', f * 100);
          });
        });
      }, function (n, of) {
        show(TXT.retry + ' (' + n + ' из ' + of + ')');
        primary('Пробуем ещё раз…', null, { active: false, progress: true });
        toast(TXT.retry, 4500);
        haptic.warn();
      }).then(function (d) { if (d) d._kb = Math.round(kb); return d; });
    }).then(function (d) {
      var files = ((d && d.files) || []).filter(function (f) { return !f.kind || f.kind === 'photo'; });
      if (!files.length) throw apiErr('other', 'Сервер не принял ни одного фото. Попробуй другое фото.');
      S.fotoIds = files.map(function (f) { return f.id; });
      S.uploadedSig = mySig;
      prog.style.width = '100%'; txt.textContent = 'Фото на месте';
      track('upload', { photos: S.fotoIds.length, kb: d._kb || null });
      haptic.ok();
      setTimeout(function () { S.busy = false; bar.hidden = true; go('about'); }, 350);
    }).catch(function (e) {
      S.busy = false;
      bar.hidden = true;
      haptic.err();
      toast(humanMsg(e, TXT.net), 7000);
      if (!DEMO) track('upload_fail', { kind: (e && e.kind) || 'other', status: (e && e.status) || 0 });
      renderSlots();
    });
  }
  function fakeUpload(prog) {
    return new Promise(function (res) {
      var p = 0;
      var t = setInterval(function () {
        p += 12 + Math.random() * 16; prog.style.width = Math.min(100, p) + '%';
        if (p >= 100) { clearInterval(t); res({ files: S.photos.filter(Boolean).map(function (i) { return { id: 'd' + i.uid, kind: 'photo', name: i.name, duration_sec: null }; }) }); }
      }, 100);
    });
  }
  // XHR, а не fetch — ради полосы прогресса. Сторож: пока байты уходят и STALL_MS нет движения —
  // связь оборвалась. Когда телефон всё отдал, туннель может ещё долго досылать их серверу
  // (~48 КБ/с), поэтому ответа ждём дольше: не меньше 90 с и ~15 КБ/с на объём.
  function xhrUpload(sid, parts, onProg) {
    return new Promise(function (res, rej) {
      var fd = new FormData(), bytes = 0;
      parts.forEach(function (p) { fd.append('files', p.blob, p.name); bytes += p.blob.size || 0; });
      var x = new XMLHttpRequest(), dog = 0, over = false;
      function fin(err, d) { if (over) return; over = true; clearTimeout(dog); if (err) rej(err); else res(d); }
      function kick(ms) { clearTimeout(dog); dog = setTimeout(function () { fin(apiErr('net')); try { x.abort(); } catch (e) {} }, ms || STALL_MS); }
      var waitMs = Math.max(90000, bytes / 15);
      x.open('POST', '/api/upload/' + encodeURIComponent(sid));
      x.setRequestHeader('X-Tg-Init-Data', (tg && tg.initData) || '');
      if (x.upload) {
        x.upload.onprogress = function (e) {
          var f = e.lengthComputable && e.total ? e.loaded / e.total : 0;
          kick(f >= 1 ? waitMs : STALL_MS);
          if (f) onProg(f);
        };
        x.upload.onload = function () { kick(waitMs); onProg(1); };
      }
      x.onload = function () { try { fin(null, parseReply(x.status, x.responseText)); } catch (e) { fin(e); } };
      x.onerror = x.onabort = x.ontimeout = function () { fin(apiErr('net')); };
      kick();
      try { x.send(fd); } catch (e) { fin(apiErr('net')); }
    });
  }

  // =====================================================
  // 3. О ТЕБЕ
  // =====================================================
  var fImya = $('#imya'), fNik = $('#nik'), fNiche = $('#niche'), fZag = $('#zagolovok');
  fZag.addEventListener('input', function () { $('#zgCount').textContent = fZag.value.length + '/40'; });
  fNik.addEventListener('blur', function () { fNik.value = normNik(fNik.value); });
  [fImya, fNik, fNiche, fZag].forEach(function (inp, k, arr) {
    inp.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (arr[k + 1]) arr[k + 1].focus(); else inp.blur();
    });
    inp.addEventListener('input', function () { inp.classList.remove('bad'); });
  });
  function normNik(v) {
    v = String(v || '').trim();
    if (!v) return '';
    // вставили ссылку на профиль — берём имя из неё
    var m = v.match(/(?:instagram\.com|t\.me|vk\.com|youtube\.com|tiktok\.com)\/@?([A-Za-z0-9_.]+)/i);
    if (m) v = m[1];
    v = v.replace(/\s+/g, '');
    return v.charAt(0) === '@' ? v : '@' + v;
  }
  function submitAbout() {
    fNik.value = normNik(fNik.value);
    var miss = [[fImya, 'имя'], [fNik, 'ник'], [fNiche, 'чем ты занимаешься']].filter(function (p) { return !p[0].value.trim(); });
    if (miss.length) {
      haptic.warn();
      miss.forEach(function (p) { p[0].classList.add('bad'); });
      toast('Заполни: ' + miss.map(function (p) { return p[1]; }).join(', ') + '.');
      miss[0][0].focus();
      return;
    }
    go('steps');
  }

  // =====================================================
  // 4. ШАГИ
  // =====================================================
  var list = $('#shagi');
  function renderSteps(skel, fresh) {
    list.innerHTML = '';
    var arr = skel ? [{}, {}, {}, {}, {}] : S.shagi;
    arr.forEach(function (s, k) {
      var li = document.createElement('li');
      li.className = 'shag' + (skel ? ' skel' : '') + (fresh ? ' fresh' : '');
      li.style.animationDelay = (k * (fresh ? 0.14 : 0.05)) + 's';
      li.innerHTML = '<span class="n">' + ('0' + (k + 1)).slice(-2) + '</span>' +
        '<input maxlength="' + LEN_T + '" placeholder="Название шага" aria-label="Название шага ' + (k + 1) + '">' +
        '<textarea rows="1" maxlength="' + LEN_P + '" placeholder="Что происходит — одной строкой" aria-label="Пояснение к шагу ' + (k + 1) + '"></textarea>' +
        '<button class="del" type="button" aria-label="Убрать шаг">' + ICON_X + '</button>';
      if (!skel) {
        var inp = li.querySelector('input'), ta = li.querySelector('textarea'), del = li.querySelector('.del');
        inp.value = s.nazvanie || ''; ta.value = s.tekst || '';
        inp.addEventListener('input', function () { s.nazvanie = inp.value; li.classList.remove('miss'); });
        ta.addEventListener('input', function () { s.tekst = ta.value; li.classList.remove('miss'); grow(ta); });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ta.focus(); } });
        ta.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ta.blur(); } });
        del.disabled = S.shagi.length <= MIN_STEPS;
        del.addEventListener('click', function () { S.shagi.splice(k, 1); haptic.tap(); renderSteps(); });
        setTimeout(function () { grow(ta); }, 0);
      } else {
        $$('input,textarea,button', li).forEach(function (x) { x.disabled = true; });
      }
      list.appendChild(li);
    });
    $('#addStep').disabled = !!skel || S.shagi.length >= MAX_STEPS;
    $('#stepsNote').textContent = skel ? '' : 'Шагов: ' + S.shagi.length + ' из ' + MAX_STEPS + '. Можно от ' + MIN_STEPS + ' до ' + MAX_STEPS + '.';
  }
  function grow(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
  $('#addStep').addEventListener('click', function () {
    if (S.shagi.length >= MAX_STEPS) return;
    S.shagi.push({ nazvanie: '', tekst: '' });
    haptic.tap();
    renderSteps();
    var last = list.lastElementChild; if (last) last.querySelector('input').focus();
  });

  function hasSteps() { return S.shagi.some(function (s) { return (s.nazvanie || '').trim() || (s.tekst || '').trim(); }); }
  function askReplace() {
    return new Promise(function (res) {
      if (!hasSteps()) return res(true);
      var q = 'Заменить твои шаги предложенными? То, что ты написал, пропадёт.';
      if (IN_TG && ver('6.2') && tg.showConfirm) { try { tg.showConfirm(q, function (ok) { res(!!ok); }); return; } catch (e) {} }
      res(window.confirm(q));
    });
  }
  $('#suggestBtn').addEventListener('click', function () {
    var niche = fNiche.value.trim();
    if (!niche) { toast('Сначала напиши, чем ты занимаешься, — по этой фразе подберу шаги.'); go('about', true); setTimeout(function () { fNiche.focus(); }, 400); return; }
    if ($('#suggestBtn').classList.contains('busy')) return;
    askReplace().then(function (ok) {
      if (!ok) return;
      var btn = $('#suggestBtn');
      btn.classList.add('busy'); $('#suggestSub').textContent = 'Подбираю шаги под твою нишу…';
      haptic.tap();
      renderSteps(true);
      api('/api/suggest_steps', { method: 'POST', json: { niche: niche } }).then(function (d) {
        var arr = ((d && d.shagi) || []).filter(function (s) { return s && (s.nazvanie || s.tekst); }).slice(0, MAX_STEPS)
          .map(function (s) { return { nazvanie: String(s.nazvanie || '').slice(0, LEN_T), tekst: String(s.tekst || '').slice(0, LEN_P) }; });
        if (arr.length < MIN_STEPS) throw apiErr('other', 'Не получилось подобрать шаги. Попробуй ещё раз или напиши сам.');
        S.shagi = arr;
        haptic.ok();
        toast('Готово. Проверь и поправь под себя — это твои шаги.');
      }).catch(function (e) {
        haptic.err();
        toast(humanMsg(e, 'Не получилось подобрать шаги. Попробуй ещё раз или напиши сам.'), 6000);
      }).then(function () {
        btn.classList.remove('busy'); $('#suggestSub').textContent = 'По твоей нише — потом поправишь';
        renderSteps();
      });
    });
  });
  function submitSteps() {
    var bad = [];
    S.shagi.forEach(function (s, k) { s.nazvanie = (s.nazvanie || '').trim(); s.tekst = (s.tekst || '').trim(); if (!s.nazvanie || !s.tekst) bad.push(k); });
    if (S.shagi.length < MIN_STEPS) { toast('Нужно хотя бы ' + MIN_STEPS + ' шага.'); return; }
    if (bad.length) {
      haptic.warn();
      var lis = $$('.shag', list);
      bad.forEach(function (k) { if (lis[k]) lis[k].classList.add('miss'); });
      toast('У каждого шага нужно название и пояснение. Или нажми «Предложи шаги сам».');
      if (lis[bad[0]]) lis[bad[0]].scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    go('color');
  }

  // ---------- голос: «Надиктовать голосом» ----------
  // Человек уходит в чат с ботом и надиктовывает шаги; бот раскладывает речь и кладёт черновик,
  // мини-приложение забирает его через GET /api/draft. Нет запроса (старый сервер) или ника бота — нет кнопки.
  var voice = { avail: null, on: false, base: '', t: 0, until: 0 };
  function botName() { return String(S.offer.bot_username || '').replace(/^@/, ''); }
  function normSteps(arr) {
    return (Array.isArray(arr) ? arr : []).filter(function (s) { return s && (s.nazvanie || s.tekst); }).slice(0, MAX_STEPS)
      .map(function (s) { return { nazvanie: String(s.nazvanie || '').slice(0, LEN_T), tekst: String(s.tekst || '').slice(0, LEN_P) }; });
  }
  function draftSig(d) { return JSON.stringify(normSteps(d && d.shagi)); }
  function initVoice() {
    var btn = $('#voiceBtn');
    if (voice.on) { btn.hidden = true; $('#voiceWait').hidden = false; scheduleVoice(800); return; }
    $('#voiceWait').hidden = true;
    if (voice.avail === false || (!DEMO && !botName())) { btn.hidden = true; return; }
    if (voice.avail) { btn.hidden = false; return; }
    api('/api/draft', { quiet: true, retry: false }).then(function (d) {
      voice.avail = !!(d && typeof d === 'object');
      voice.base = draftSig(d);
      btn.hidden = !voice.avail || voice.on;
    }).catch(function () { voice.avail = false; btn.hidden = true; });
  }
  $('#voiceBtn').addEventListener('click', function () {
    var bot = botName();
    haptic.tap();
    track('voice_start');
    // запоминаем, какой черновик был ДО голосового: новые шаги — это любой другой черновик
    api('/api/draft', { quiet: true, retry: false }).then(function (d) { voice.base = draftSig(d); }, function () {}).then(function () {
      voice.on = true; voice.until = Date.now() + 6 * 60 * 1000;
      $('#voiceBtn').hidden = true; $('#voiceWait').hidden = false;
      $('#voiceWaitH').textContent = 'Жду голосовое';
      scheduleVoice(3000);
      if (DEMO) { MOCK.voice(); toast('Демо: здесь откроется чат с ботом. Представь, что ты надиктовал шаги, — они появятся через пару секунд.', 5000); return; }
      var url = 'https://t.me/' + bot + '?start=golos';   // бот ответит подсказкой, как надиктовать
      // с Telegram 7.0 мини-приложение после перехода в чат не закрывается — шаги подтянутся, когда человек вернётся
      if (IN_TG) { try { tg.openTelegramLink(url); return; } catch (e) {} }
      window.open(url, '_blank', 'noopener');
    });
  });
  $('#voiceStop').addEventListener('click', function () {
    haptic.tap(); clearTimeout(voice.t); voice.on = false; $('#voiceWait').hidden = true; initVoice();
  });
  function scheduleVoice(ms) { clearTimeout(voice.t); voice.t = setTimeout(checkVoice, ms); }
  function stopVoice() { clearTimeout(voice.t); }   // ушли с экрана шагов — опрос на паузе, вернутся — продолжим
  function checkVoice() {
    if (!voice.on || cur !== 'steps') return;
    if (Date.now() > voice.until) {
      voice.on = false; $('#voiceWait').hidden = true; $('#voiceBtn').hidden = false;
      toast('Голосовое пока не пришло. Можно надиктовать ещё раз или написать шаги здесь.', 6000);
      return;
    }
    api('/api/draft', { quiet: true, retry: false }).then(function (d) {
      if (!voice.on || cur !== 'steps') return;
      var arr = normSteps(d && d.shagi);
      if (arr.length >= MIN_STEPS && draftSig(d) !== voice.base) {
        voice.on = false; clearTimeout(voice.t);
        $('#voiceWait').hidden = true; $('#voiceBtn').hidden = false;
        S.shagi = arr;
        renderSteps(false, true);
        haptic.ok();
        track('voice_steps', { steps: arr.length });
        toast('Шаги из голосового на месте. Проверь и поправь под себя.', 5000);
        return;
      }
      scheduleVoice(3000);
    }).catch(function () { scheduleVoice(6000); });
  }
  // вернулись из чата — проверяем сразу, не дожидаясь очередного опроса
  document.addEventListener('visibilitychange', function () { if (!document.hidden && voice.on) scheduleVoice(300); });
  if (IN_TG && ver('8.0') && tg.onEvent) try { tg.onEvent('activated', function () { if (voice.on) scheduleVoice(300); }); } catch (e) {}

  // =====================================================
  // 5. ЦВЕТ И СТИЛЬ + ЖИВОЙ МАКЕТ
  // =====================================================
  var COLORS = [['#E4102B', 'Красный завода'], ['#FF6A00', 'Оранжевый'], ['#F5B700', 'Жёлтый'], ['#16A34A', 'Зелёный'],
                ['#0EA5B7', 'Бирюзовый'], ['#2F6BFF', 'Синий'], ['#7B4DFF', 'Фиолетовый'], ['#FF4FA3', 'Розовый']];
  $('#swatches').innerHTML = COLORS.map(function (c, k) {
    return '<button type="button" role="radio" class="sw' + (k === 0 ? ' on' : '') + (c[0] === '#F5B700' ? ' light' : '') + '" style="--c:' + c[0] + '" data-c="' + c[0] + '" data-n="' + c[1] + '" aria-checked="' + (k === 0) + '" aria-label="' + c[1] + '"><small>' + c[1] + '</small></button>';
  }).join('');
  $$('.sw').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.sw').forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
      b.classList.add('on'); b.setAttribute('aria-checked', 'true');
      S.cvet = b.getAttribute('data-c');
      $('#swCap').textContent = b.getAttribute('data-n');
      $('#mk').style.setProperty('--acc', S.cvet);
      haptic.pick();
    });
  });

  // стили оформления — что реально умеет движок, решает сервер (GET /api/styles); нет ответа — блока нет
  function loadStyles() {
    if (S.styles) { renderStyles(); return; }
    api('/api/styles', { quiet: true, retry: false }).then(function (d) {
      var arr = ((d && d.styles) || []).filter(function (x) { return x && x.id && x.name; }).slice(0, 4);
      S.styles = arr;
      if (arr.length && !S.style) S.style = String(arr[0].id);
      renderStyles();
    }).catch(function () { S.styles = []; renderStyles(); });
  }
  function isLightStyle(st) { return !!st && /бел|светл|white|light|svet|bel/i.test(String(st.id) + ' ' + String(st.name)); }
  function curStyle() { return (S.styles || []).filter(function (x) { return String(x.id) === S.style; })[0] || null; }
  function renderStyles() {
    var arr = S.styles || [];
    $('#styles').hidden = arr.length < 2;   // один вариант — выбирать нечего
    $('#styleRow').innerHTML = arr.map(function (st) {
      var on = String(st.id) === S.style;
      var pic = st.preview_url ? '<img alt="" loading="lazy" src="' + esc(st.preview_url) + '">'
        : '<div class="st-ph' + (isLightStyle(st) ? ' light' : '') + '"><i></i><i></i><i></i></div>';
      return '<button type="button" role="radio" class="st' + (on ? ' on' : '') + '" data-id="' + esc(st.id) + '" aria-checked="' + on + '">' +
        '<span class="st-img">' + pic + '</span><b>' + esc(st.name) + '</b>' + (st.note ? '<small>' + esc(st.note) + '</small>' : '') + '</button>';
    }).join('');
    $$('.st').forEach(function (b) {
      b.addEventListener('click', function () {
        S.style = b.getAttribute('data-id');
        $$('.st').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
        haptic.pick();
        applyStyleLook();
      });
    });
    applyStyleLook();
  }
  function applyStyleLook() { $('#mk').classList.toggle('light', isLightStyle(curStyle())); }

  // Живой макет: заставка со списком шагов → каждый шаг со своим фото → финал с ником.
  // Только transform/opacity и один таймер — лёгкий для телефона.
  var mk = { t: 0, i: -1, scenes: [], n: 0 };
  function headline() { return (fZag.value.trim() || DEFAULT_HEAD).toUpperCase(); }
  function pad2(n) { return ('0' + n).slice(-2); }
  function buildMock() {
    var h = headline().split(/\s+/);
    var cut = h.length > 2 ? h.length - 2 : Math.max(1, h.length - 1);
    $('#mkH').innerHTML = esc(h.slice(0, cut).join(' ')) + (h.length > 1 ? ' <em>' + esc(h.slice(cut).join(' ')) + '</em>' : '');
    $('#mkEb').textContent = 'ПО ШАГАМ';
    var name = (fImya.value.trim() || 'Твоё имя'), nik = normNik(fNik.value) || '@nik';
    $('#mkName').textContent = name.toUpperCase();
    $('#mkNik').textContent = nik;
    var photos = S.photos.filter(function (p) { return p && !p.broken; }).map(function (p) { return p.url; });
    if (!photos.length) photos = ['img/demo_v.webp'];
    $('#mkAva').src = photos[0];
    $('#mk').style.setProperty('--acc', S.cvet);
    applyStyleLook();
    var steps = S.shagi.filter(function (s) { return (s.nazvanie || '').trim() || (s.tekst || '').trim(); });
    if (!steps.length) steps = [{ nazvanie: 'Знакомство', tekst: 'Созвон: разбираем задачу.' }];
    mk.n = steps.length;
    $('#mkLine').innerHTML = steps.map(function () { return '<i></i>'; }).join('') + '<u id="mkRun"></u>';
    var html = '<div class="mk-scene"><ul class="mk-list">' + steps.map(function (s, k) {
      return '<li style="animation-delay:' + (0.12 + k * 0.08).toFixed(2) + 's"><i>' + (k + 1) + '</i>' + esc(s.nazvanie || 'Шаг') + '</li>';
    }).join('') + '</ul><div class="mk-big">' + steps.length + ' ' + plural(steps.length, ['шаг', 'шага', 'шагов']) + ' — <em>и готово</em></div></div>';
    steps.forEach(function (s, k) {
      html += '<div class="mk-scene"><div class="mk-card"><img alt="" src="' + esc(photos[k % photos.length]) + '"></div>' +
        '<div class="mk-n">' + pad2(k + 1) + '</div><div class="mk-t">' + esc(s.nazvanie || 'Шаг') + '</div><div class="mk-p">' + esc(s.tekst || '') + '</div></div>';
    });
    html += '<div class="mk-scene"><div class="mk-out"><img alt="" src="' + esc(photos[0]) + '"><b>' + esc(name) + '</b><small>' + esc(nik) + '</small><span>Хочешь так же? Пиши</span></div></div>';
    $('#mkStage').innerHTML = html;
    mk.scenes = $$('.mk-scene', $('#mkStage'));
    $('#mkBars').innerHTML = mk.scenes.map(function () { return '<i><u></u></i>'; }).join('');
    clearTimeout(mk.t);
    mk.i = REDUCED ? 0 : -1;   // без анимаций — сразу первый шаг, без смены
    nextScene();
  }
  function nextScene() {
    var sc = mk.scenes;
    if (!sc.length) return;
    var prev = sc[mk.i];
    mk.i = REDUCED ? 1 : (mk.i + 1) % sc.length;
    var now = sc[mk.i];
    if (prev && prev !== now) {
      prev.classList.remove('on'); prev.classList.add('off');
      setTimeout(function () { prev.classList.remove('off'); }, 650);
    }
    now.classList.remove('off'); void now.offsetWidth; now.classList.add('on');
    var k = mk.i - 1, n = mk.n, outro = mk.i === sc.length - 1;
    var dur = mk.i === 0 ? 3000 : outro ? 2600 : 2600;
    $('#mk').style.setProperty('--mk-dur', dur + 'ms');
    $$('#mkBars i').forEach(function (b, j) { b.classList.toggle('past', j < mk.i); b.classList.remove('on'); });
    var bar = $$('#mkBars i')[mk.i]; if (bar) { void bar.offsetWidth; bar.classList.add('on'); }
    $$('#mkLine i').forEach(function (d, j) { d.classList.toggle('past', outro || j <= k); });
    var run = $('#mkRun');
    if (run) {
      var pos = n > 1 ? Math.max(0, Math.min(n - 1, outro ? n - 1 : k)) / (n - 1) * 100 : 0;
      run.style.transform = 'translateX(' + pos.toFixed(2) + '%)';
      run.style.opacity = mk.i === 0 ? 0 : 1;
    }
    if (!REDUCED && cur === 'color') mk.t = setTimeout(nextScene, dur);
  }
  function stopMock() { clearTimeout(mk.t); }

  function startRender() {
    if (S.busy) return;
    var payload = {
      imya: fImya.value.trim(),
      nik: normNik(fNik.value),
      zagolovok: fZag.value.trim() || null,
      niche: fNiche.value.trim(),
      shagi: S.shagi.map(function (s) { return { nazvanie: s.nazvanie.trim(), tekst: s.tekst.trim() }; }),
      foto_ids: S.fotoIds.slice(),
      cvet: S.cvet
    };
    if (S.style) payload.style = S.style;   // только если сервер прислал стили — старому лишнего не шлём
    S.busy = true;
    primary('Запускаю…', null, { active: false, progress: true });
    ensureSession().then(function (sid) {
      return api('/api/render/' + encodeURIComponent(sid), { method: 'POST', json: payload }).catch(function (e) {
        // первая попытка дошла, а ответ потерялся — сервер говорит «уже собирается» и даёт номер сборки
        if (e && e.status === 409 && e.data && e.data.job_id) return { job_id: e.data.job_id };
        throw e;
      });
    }).then(function (d) {
      S.busy = false;
      S.job = d.job_id; S.urls = null; S.vau = {}; S.preview = [];
      track('render_start', { steps: payload.shagi.length, photos: payload.foto_ids.length, cvet: payload.cvet, has_zagolovok: !!payload.zagolovok, style: payload.style || null });
      go('build');
      poll();
    }).catch(function (e) {
      S.busy = false;
      haptic.err();
      toast(humanMsg(e, 'Не получилось запустить сборку. Попробуй ещё раз.'), 7000);
      primary('Собрать ролик', startRender);
    });
  }

  // =====================================================
  // 6. СБОРКА
  // =====================================================
  var shown = 0, target = 0, rafId = 0, pollT = 0, netFails = 0, RING = 553;
  function setProgress(p) {
    target = Math.max(target, Math.max(0, Math.min(100, p)));
    if (REDUCED) { shown = target; drawP(); return; }
    if (!rafId) rafId = requestAnimationFrame(stepP);
  }
  function stepP() {
    rafId = 0;
    shown += (target - shown) * 0.08;
    if (Math.abs(target - shown) < 0.2) shown = target;
    drawP();
    if (shown !== target) rafId = requestAnimationFrame(stepP);
  }
  function drawP() {
    $('#pctNum').textContent = Math.round(shown);
    $('#ringVal').style.strokeDashoffset = RING - RING * shown / 100;
  }
  var lastStage = '';
  function setStage(t) {
    if (!t || t === lastStage) return;
    lastStage = t;
    var el = $('#stageText');
    if (REDUCED) { el.textContent = t; return; }
    el.classList.add('swap');
    setTimeout(function () { el.textContent = t; el.classList.remove('swap'); }, 220);
  }
  function fallbackStage(p) {
    if (p < 15) return 'Готовлю фото';
    if (p < 35) return 'Раскладываю шаги';
    if (p < 60) return 'Рисую кадры';
    if (p < 85) return 'Собираю анимацию';
    return 'Свожу ролик';
  }
  function norm(p) { p = Number(p) || 0; return p <= 1 ? p * 100 : p; }

  function poll() {
    clearTimeout(pollT);
    if (!S.job) return;
    api('/api/job/' + encodeURIComponent(S.job), { retry: false }).then(function (d) {
      netFails = 0;
      absorb(d);
      if (d.status === 'queued') {
        $('#queueBox').hidden = !(d.queue_pos > 0);
        $('#queueNum').textContent = d.queue_pos;
        setStage(d.stage || 'Жду своей очереди');
        setProgress(Math.max(2, norm(d.progress)));
      } else if (d.status === 'working') {
        $('#queueBox').hidden = true;
        var p = norm(d.progress);
        setProgress(Math.max(4, p));
        setStage(d.stage || fallbackStage(p));
      } else if (d.status === 'done') {
        $('#queueBox').hidden = true;
        setProgress(100); setStage('Готово');
        S.urls = d.video_urls || (d.video_url ? { instagram: d.video_url, telegram: d.video_url, youtube: d.video_url } : {});
        track('done', { job_id: S.job });
        finale();
        return;
      } else if (d.status === 'error') {
        fail(d.error);
        return;
      }
      pollT = setTimeout(poll, 1500);
    }).catch(function (e) {
      if (e && e.kind === 'server') { fail(e.message); return; }
      netFails++;
      if (netFails === 4) toast('Связь нестабильная — продолжаю ждать. Ролики в любом случае придут в чат.');
      pollT = setTimeout(poll, Math.min(10000, 1500 * netFails));
    });
  }
  function fail(msg) {
    clearTimeout(pollT); clearTimeout(reelT); reelT = 0; reelQueue = [];
    haptic.err();
    if (msg) $('#failText').textContent = msg + ' Попробуй ещё раз — всё, что ты заполнил, сохранено.';
    go('fail');
  }

  // ---- «спектакль»: новые поля хода сборки (каждое может отсутствовать) ----
  var VAU_KEYS = ['preview', 'story_url', 'formats_locked', 'rerender_left', 'post_text', 'stats'];
  function absorb(d) {
    if (!d || typeof d !== 'object') return;
    VAU_KEYS.forEach(function (k) { if (d[k] != null) { S.vau[k] = d[k]; S.vau._new = true; } });
    if (Array.isArray(d.preview) && d.preview.length) takePreview(d.preview);
    if (typeof d.stage_detail === 'string' && d.stage_detail.trim() && d.status !== 'done') setDetail(d.stage_detail.trim());
  }
  var lastDetail = '';
  function setDetail(t) {
    if (t === lastDetail) return;
    lastDetail = t;
    var el = $('#stageDetail');
    if (REDUCED) { el.textContent = t; return; }
    el.classList.add('swap');
    setTimeout(function () { el.textContent = t; el.classList.remove('swap'); }, 230);
  }
  // кадры выезжают на ленту по одному, даже если сервер прислал все сразу; на каждом — вибрация
  var reelShown = 0, reelQueue = [], reelT = 0, reelFast = false;
  function resetReel() {
    reelShown = 0; reelQueue = []; clearTimeout(reelT); reelT = 0; reelFast = false;
    $('#reelTrack').innerHTML = ''; $('#reel').hidden = true; $('#beltBox').hidden = false;
    body.classList.remove('has-preview');
    lastDetail = ''; $('#stageDetail').textContent = '';
    $('.machine').classList.remove('boom');
  }
  function takePreview(arr) {
    arr = arr.filter(function (x) { return x && typeof x.url === 'string' && x.url; });
    if (!arr.length) return;
    S.preview = arr;
    for (var k = reelShown + reelQueue.length; k < arr.length; k++) reelQueue.push(arr[k]);
    if (!reelT && cur === 'build') pumpReel();
  }
  function pumpReel() {
    reelT = 0;
    var f = reelQueue.shift();
    if (!f) return;
    var track = $('#reelTrack');
    if (!reelShown) { $('#reel').hidden = false; $('#beltBox').hidden = true; body.classList.add('has-preview'); }
    var el = document.createElement('div');
    el.className = 'rf new';
    el.innerHTML = '<img alt="" src="' + esc(f.url) + '">' + (f.title ? '<small>' + esc(f.title) + '</small>' : '');
    track.appendChild(el);
    reelShown++;
    $('#reelCount').textContent = S.preview.length > reelShown ? reelShown + ' из ' + S.preview.length : reelShown + ' ' + plural(reelShown, ['кадр', 'кадра', 'кадров']);
    try { track.scrollTo({ left: track.scrollWidth, behavior: REDUCED ? 'auto' : 'smooth' }); } catch (e) { track.scrollLeft = track.scrollWidth; }
    haptic.frame();
    setTimeout(function () { el.classList.remove('new'); }, 1300);
    if (reelQueue.length) reelT = setTimeout(pumpReel, REDUCED ? 60 : reelFast ? 220 : 800);
  }
  // финал: докатываем оставшиеся кадры, вспышка, вибрация «успех» — и на экран «Готово»
  function finale() {
    if (cur !== 'build') return;
    if (reelQueue.length) {
      reelFast = true;
      if (!reelT) reelT = setTimeout(pumpReel, 120);
      setTimeout(finale, 300);
      return;
    }
    S.celebrated = true;
    haptic.ok();
    if (!REDUCED) {
      var m = $('.machine'); m.classList.remove('boom'); void m.offsetWidth; m.classList.add('boom');
      flash();
    }
    setTimeout(function () { if (cur === 'build') go('done'); }, REDUCED ? 200 : 1100);
  }
  function flash() { var f = $('#flashScr'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

  function fillBelt() {
    resetReel(); S.celebrated = false;
    if (S.preview.length) takePreview(S.preview);   // вернулись на сборку — уже готовые кадры снова на ленте
    shown = 0; target = 0; drawP(); lastStage = ''; $('#stageText').textContent = 'Готовлю фото';
    var u = S.photos.filter(function (p) { return p && !p.broken; }).map(function (p) { return p.url; });
    if (!u.length) u = ['img/demo_v.webp'];
    var arr = [];
    while (arr.length < 10) arr = arr.concat(u);
    arr = arr.concat(arr); // дубль — для бесшовной ленты
    $('#belt').innerHTML = arr.map(function (x) { return '<div><img alt="" src="' + x + '"></div>'; }).join('');
  }

  var WARM = [
    { img: 'img/car1.webp', t: 'Карусели каждый день', p: 'Из твоих фото и твоих формулировок — восемь слайдов, готовых к публикации.' },
    { ic: '<svg viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M9 16h6M9 13h6"/></svg>', t: 'Разговорные Reels', p: 'Снял себя на телефон — завод уберёт паузы и оговорки, наложит субтитры и перебивки.' },
    { ic: '<svg viewBox="0 0 24 24"><path d="M4 5h16M4 10h16M4 15h10M4 20h7"/></svg>', t: 'Подписи под каждую площадку', p: 'Своей длины для Instagram, Telegram и Threads — на твоих смыслах, а не шаблонными фразами.' },
    { img: 'img/car2.webp', t: 'Хуки из твоей распаковки', p: 'Живой созвон с Валерией — и у тебя личная книга смыслов, на которой собирается весь контент.' },
    { ic: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>', t: 'Сам публикует во все соцсети', p: 'ВКонтакте, Telegram, YouTube, Instagram и другие — по плану, без твоего участия.' }
  ];
  var warmI = 0, warmT = 0;
  $('#warm').innerHTML = WARM.map(function (w) {
    return '<div class="wcard"><div class="wimg">' + (w.img ? '<img alt="" src="' + w.img + '">' : w.ic) + '</div><div><b>' + w.t + '</b><p>' + w.p + '</p></div></div>';
  }).join('');
  $('#warmDots').innerHTML = WARM.map(function () { return '<i></i>'; }).join('');
  $('#warm').addEventListener('click', function () { showWarm(warmI + 1); restartWarm(); haptic.tap(); });
  function showWarm(i) {
    warmI = (i + WARM.length) % WARM.length;
    $$('.wcard').forEach(function (c, k) { c.classList.toggle('on', k === warmI); });
    $$('#warmDots i').forEach(function (c, k) { c.classList.toggle('on', k === warmI); });
  }
  function restartWarm() { clearInterval(warmT); if (!REDUCED) warmT = setInterval(function () { showWarm(warmI + 1); }, 5500); }
  function startWarm() { showWarm(0); restartWarm(); }
  function stopWarm() { clearInterval(warmT); }

  // =====================================================
  // 7. ГОТОВО + ДОЖИМ
  // =====================================================
  var video = $('#video');
  var FMT_NAME = { instagram: 'instagram', telegram: 'telegram-stories', youtube: 'youtube-shorts' };
  function urlOf(f) { return (S.urls && S.urls[f]) || ''; }
  function setFmt(f) {
    S.fmt = f;
    $$('#fmtTabs button').forEach(function (b) { var on = b.getAttribute('data-fmt') === f; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    var u = urlOf(f);
    if (u && video.getAttribute('src') !== u) video.src = u;
    playVid(video);
  }
  $$('#fmtTabs button').forEach(function (b) { b.addEventListener('click', function () { haptic.pick(); setFmt(b.getAttribute('data-fmt')); }); });

  var FORMATS = ['instagram', 'telegram', 'youtube'];
  var FMT_TITLE = { instagram: 'Instagram', telegram: 'Telegram', youtube: 'YouTube' };
  function lockedList() { var l = S.vau.formats_locked; return Array.isArray(l) ? l.filter(function (f) { return FORMATS.indexOf(f) >= 0; }) : []; }
  function isLocked(f) { return lockedList().indexOf(f) >= 0; }
  function canPlay(f) { return !!urlOf(f) && !isLocked(f); }

  function showDone() {
    if (!S.celebrated) { haptic.ok(); if (!REDUCED) flash(); }
    S.celebrated = false;
    if (!S.urls && DEMO) S.urls = { instagram: 'primer/example.mp4', telegram: 'primer/example.mp4', youtube: 'primer/example.mp4' };
    renderFormats();
    video.muted = true; $('.snd[data-for="video"]').classList.remove('on');
    // пока ролик грузится — первый кадр раскадровки вместо чёрного экрана
    if (S.preview.length) video.poster = S.preview[0].url; else video.removeAttribute('poster');
    setFmt(FORMATS.filter(canPlay)[0] || FORMATS.filter(urlOf)[0] || 'instagram');
    showVau();
    primary('Подключить завод', goZavod, { visible: false });
    setTimeout(function () { if (cur === 'done' && !offerVisible) primary('Подключить завод', goZavod); }, 2600);
    $$('.funnel .rv, .soft-zavod.rv').forEach(function (el) { el.classList.remove('on'); });
    observeReveal();
  }

  // форматы: невыгруженные прячем; закрытые до подписки показываем с замком и кнопкой «Открыть за подписку»
  var LOCK_ICON = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0"/></svg>';
  function renderFormats() {
    $$('[data-dl]').forEach(function (b) {
      var f = b.getAttribute('data-dl'), row = b.closest('.frow'), lk = isLocked(f);
      var tag = row.querySelector('.lock');
      if (!tag) { tag = document.createElement('span'); tag.className = 'lock'; tag.innerHTML = LOCK_ICON + 'за подпиской'; row.appendChild(tag); }
      tag.hidden = !lk;
      b.hidden = lk || !urlOf(f);
      row.hidden = !lk && !urlOf(f);
      row.classList.toggle('locked', lk);
    });
    $$('#fmtTabs button').forEach(function (b) { b.hidden = !canPlay(b.getAttribute('data-fmt')); });
    $('#fmtTabs').hidden = FORMATS.filter(canPlay).length < 2;
    var l = lockedList();
    $('#unlockBox').hidden = !l.length;
    if (l.length) {
      $('#unlockBox b').textContent = l.map(function (f) { return FMT_TITLE[f]; }).join(' и ') + ' — за подписку';
      if (!unlock.tries) $('#unlockText').textContent = 'Подпишись на канал завода — и ' + (l.length > 1 ? 'эти форматы откроются' : 'формат откроется') + ' здесь же.';
    }
  }

  var unlock = { busy: false, tries: 0, channel: '' };
  $('#unlockBtn').addEventListener('click', function () {
    if (unlock.busy) return;
    unlock.busy = true; haptic.tap();
    var lbl = $('#unlockLbl'), was = lbl.textContent;
    lbl.textContent = 'Проверяю…';
    api('/api/unlock_formats', { method: 'POST', json: {} }).then(function (d) {
      unlock.tries++;
      if (Array.isArray(d.formats_locked)) S.vau.formats_locked = d.formats_locked;
      if (d.channel_url) unlock.channel = d.channel_url;
      if (d.ok && !lockedList().length) {
        haptic.ok();
        track('unlock_formats', { ok: true });
        toast('Готово — все форматы открыты. Спасибо за подписку!');
        refreshUrls();
        return;
      }
      haptic.warn();
      track('unlock_formats', { ok: false });
      lbl.textContent = was = 'Проверить подписку';
      $('#unlockText').textContent = 'Подпишись на канал и вернись сюда — нажми «Проверить подписку».';
      if (unlock.tries > 1) toast('Пока не вижу подписки. Проверь, что подписался именно на канал завода, и нажми ещё раз.', 6000);
      if (unlock.channel) openTg(unlock.channel, 'канал завода');
    }).catch(function (e) {
      haptic.err();
      toast(humanMsg(e, 'Не получилось проверить подписку. Попробуй ещё раз.'), 6000);
    }).then(function () { unlock.busy = false; if (lbl.textContent === 'Проверяю…') lbl.textContent = was; });
  });
  // после подписки сервер отдаёт адреса открытых форматов — берём свежий ответ о сборке
  function refreshUrls() {
    var before = FORMATS.filter(canPlay);
    var apply = function () {
      renderFormats();
      FORMATS.filter(canPlay).forEach(function (f) {
        if (before.indexOf(f) >= 0) return;
        var row = $('[data-dl="' + f + '"]').closest('.frow');
        row.classList.remove('opened'); void row.offsetWidth; row.classList.add('opened');
      });
    };
    if (!S.job) { apply(); return; }
    api('/api/job/' + encodeURIComponent(S.job), { quiet: true }).then(function (d) {
      VAU_KEYS.forEach(function (k) { if (d[k] != null) S.vau[k] = d[k]; });
      if (d.video_urls) S.urls = d.video_urls;
    }).catch(function () {}).then(apply);
  }

  // ссылка внутри Telegram — в Telegram; в демо — подсказка
  function openTg(url, what) {
    if (DEMO && !SIM) { toast('Демо: здесь откроется ' + what + ' — ' + url, 4500); return; }
    if (TGX && /^https:\/\/t\.me\//.test(url) && TGX.openTelegramLink) { try { TGX.openTelegramLink(url); return; } catch (e) {} }
    openExt(url, what);
  }

  function showVau() {
    var v = S.vau;
    // сторис: Telegram 7.8+, только с внешним https-адресом ролика
    var canStory = !!(TGX && xver('7.8') && typeof TGX.shareToStory === 'function' && typeof v.story_url === 'string' && /^https:\/\//.test(v.story_url));
    $('#storyBtn').hidden = !canStory;

    // до/после: его портрет → кадр первого шага (на нём его лицо). Сервер помечает кадры kind/step;
    // старый ответ без пометок — берём третий кадр раскадровки, как раньше
    var me = S.photos[0] && !S.photos[0].broken ? S.photos[0].url : '';
    var pv = S.preview || [];
    var first = pv.filter(function (x) { return x.kind === 'step' && Number(x.step) === 1; })[0];
    var after = first ? first.url : pv.length ? pv[Math.min(2, pv.length - 1)].url : '';
    $('#baBox').hidden = !(me && after);
    if (me && after) { $('#baBeforeImg').src = me; $('#baAfter').src = after; baIntro(); }

    var hrs = v.stats && Math.round(Number(v.stats.hours_saved));
    $('#hoursBox').hidden = !(hrs > 0);
    if (hrs > 0) {
      $('#hoursNum').textContent = hrs;
      $('#hoursText').textContent = 'столько ' + plural(hrs, ['час', 'часа', 'часов']) + ' потратил бы монтажёр на такой ролик. У завода ушло несколько минут.';
    }

    var post = typeof v.post_text === 'string' ? v.post_text.trim() : '';
    $('#postBox').hidden = !post;
    $('#postText').textContent = post;
    $('#copyBtn').classList.remove('done'); $('#copyLbl').textContent = 'Скопировать текст';

    // подарить другу: ссылка-приглашение с сервера; нет её — просто ссылка на бота
    $('#giftBtn').hidden = true;
    api('/api/share', { quiet: true, retry: false }).then(function (d) {
      if (d && d.url) { S.share = d; $('#giftSub').textContent = 'Друг соберёт свой — тебе ещё одна бесплатная сборка'; $('#giftBtn').hidden = false; }
      else throw 0;
    }).catch(function () {
      S.share = null;
      if (botName()) { $('#giftSub').textContent = 'Друг соберёт свой ролик бесплатно'; $('#giftBtn').hidden = false; }
    });

    var left = Number(v.rerender_left) || 0;
    $('#redoBtn').hidden = !(left > 0 && S.job);
    $('#redoSub').textContent = left === 1 ? 'Одна бесплатная правка' : 'Бесплатных правок: ' + left;

    // галочка галереи — только у нового сервера (он прислал хоть одно «вау»-поле)
    $('#optinBox').hidden = !v._new || !S.job;
    $('#callBtn').hidden = !S.offer.call_url;
  }

  // до/после: тянется пальцем; при первом показе сам проезжает туда-обратно
  var baX = 50, baDrag = false, baAnim = 0;
  function baSet(x) { baX = Math.max(0, Math.min(100, x)); $('#baView').style.setProperty('--x', baX + '%'); }
  function baIntro() {
    cancelAnimationFrame(baAnim); baSet(50);
    if (REDUCED) return;
    var t0 = 0, D = 2600;
    function f(t) {
      if (baDrag) return;
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / D);
      baSet(50 + 34 * Math.sin(p * Math.PI * 2) * (1 - p * 0.3) * (p < 1 ? 1 : 0));
      if (p < 1) baAnim = requestAnimationFrame(f); else baSet(50);
    }
    setTimeout(function () { baAnim = requestAnimationFrame(f); }, 900);
  }
  (function () {
    var view = $('#baView');
    function at(e) { var r = view.getBoundingClientRect(); baSet((e.clientX - r.left) / r.width * 100); }
    view.addEventListener('pointerdown', function (e) { baDrag = true; cancelAnimationFrame(baAnim); try { view.setPointerCapture(e.pointerId); } catch (x) {} at(e); });
    view.addEventListener('pointermove', function (e) { if (baDrag) at(e); });
    ['pointerup', 'pointercancel'].forEach(function (n) { view.addEventListener(n, function () { if (baDrag) { baDrag = false; haptic.pick(); } }); });
  })();

  // копирование текста поста
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(t).catch(function () { return copyOld(t); });
    }
    return copyOld(t);
  }
  function copyOld(t) {
    return new Promise(function (res, rej) {
      var ta = document.createElement('textarea');
      ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); ok ? res() : rej();
    });
  }
  $('#copyBtn').addEventListener('click', function () {
    var t = $('#postText').textContent;
    copyText(t).then(function () {
      haptic.ok(); track('copy_post');
      $('#copyBtn').classList.add('done'); $('#copyLbl').textContent = 'Скопировано';
      toast('Текст скопирован — вставь его под ролик.');
    }, function () {
      // не дали скопировать — выделяем текст, чтобы скопировать вручную
      try { var r = document.createRange(); r.selectNodeContents($('#postText')); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } catch (e) {}
      toast('Не получилось скопировать само — текст выделен, скопируй его вручную.', 5000);
    });
  });

  // «Выложить в сторис» — Telegram 7.8+. Ссылка-виджет в сторис доступна только с Premium:
  // без него Telegram не пускает ссылку, поэтому добавляем её только Premium-пользователям.
  $('#storyBtn').addEventListener('click', function () {
    var v = S.vau;
    if (!(TGX && xver('7.8') && TGX.shareToStory && v.story_url)) return;
    haptic.tap();
    var bot = botName();
    var link = (S.share && S.share.url) || (bot ? 'https://t.me/' + bot : '');
    var text = ('Мой ролик о том, как я работаю с клиентом.' + (bot ? ' Собран за пару минут в @' + bot : '')).slice(0, 200);
    var params = { text: text };
    var u = TGX.initDataUnsafe && TGX.initDataUnsafe.user;
    if (link && u && u.is_premium) params.widget_link = { url: link, name: 'Собрать свой ролик' };
    try {
      TGX.shareToStory(v.story_url, params);
      track('story_share', { premium: !!(u && u.is_premium) });
    } catch (e) {
      toast('Не получилось открыть сторис. Скачай ролик и выложи его вручную.', 6000);
    }
  });

  // «Подарить ролик другу»
  $('#giftBtn').addEventListener('click', function () {
    haptic.tap();
    var d = S.share || {}, bot = botName();
    var url = d.url || (bot ? 'https://t.me/' + bot : '');
    var text = d.text || 'Собери бесплатный ролик о том, как ты работаешь с клиентом';
    if (!url) return;
    track('invite_share', { ref: !!d.url });
    // подготовленное сообщение (если сервер когда-нибудь пришлёт его номер) — нативное окно Telegram 8.0
    if (d.prepared_message_id && TGX && xver('8.0') && TGX.shareMessage) {
      try { TGX.shareMessage(d.prepared_message_id); return; } catch (e) {}
    }
    var shareUrl = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text);
    if (IN_TG || SIM) { openTg(shareUrl, 'выбор друга'); return; }
    if (DEMO) { toast('Демо: здесь откроется выбор друга в Telegram — ' + url, 4500); return; }
    if (navigator.share) { navigator.share({ title: 'Ролик в подарок', text: text, url: url }).catch(function () {}); return; }
    copyText(url).then(function () { toast('Ссылка скопирована — отправь её другу.'); }, function () { window.open(shareUrl, '_blank', 'noopener'); });
  });

  // галерея: человек сам разрешает показать свой ролик
  $('#optin').addEventListener('change', function () {
    var cb = $('#optin'), on = cb.checked;
    $('#optinBox').classList.toggle('ok', on);
    haptic.pick();
    if (!S.job) return;
    api('/api/gallery_optin/' + encodeURIComponent(S.job), { method: 'POST', json: { on: on }, quiet: true }).then(function () {
      track('gallery_optin', { on: on });
      toast(on ? 'Спасибо! Покажем твой ролик в галерее участников.' : 'Хорошо, в галерее его не будет.');
    }).catch(function (e) {
      cb.checked = !on; $('#optinBox').classList.toggle('ok', !on);
      toast(humanMsg(e, 'Не получилось сохранить. Попробуй ещё раз.'));
    });
  });
  $('#callBtn').addEventListener('click', function () { haptic.tap(); track('click_call'); openExt(S.offer.call_url, 'запись на созвон'); });

  // ---------- полноэкранный просмотр (свой и галерея) ----------
  // Telegram 8.0+ — ещё и настоящий полный экран приложения; без него — просто плеер на всё окно
  var fsByUs = false;
  function openTheater(src, cap, t) {
    if (!src) return;
    var th = $('#theater'), v = $('#thVideo');
    video.pause(); $('#exVideo').pause();
    v.src = src; v.muted = false;
    try { if (t) v.currentTime = t; } catch (e) {}
    $('#thCap').textContent = cap || '';
    th.hidden = false; body.classList.add('locked');
    primary('', null, { visible: false, keep: true });
    syncBack();
    if (TGX && xver('8.0') && TGX.requestFullscreen && !TGX.isFullscreen) { try { TGX.requestFullscreen(); fsByUs = true; } catch (e) {} }
    var p = v.play();
    if (p && p.catch) p.catch(function () { v.muted = true; playVid(v); });   // со звуком не дали — играем без звука
    haptic.tap();
  }
  function closeTheater() {
    var v = $('#thVideo');
    v.pause(); v.removeAttribute('src'); try { v.load(); } catch (e) {}
    $('#theater').hidden = true; body.classList.remove('locked');
    if (fsByUs && TGX && TGX.isFullscreen && TGX.exitFullscreen) { try { TGX.exitFullscreen(); } catch (e) {} }
    fsByUs = false;
    if (lastPrimary) primary.apply(null, lastPrimary);
    syncBack();
    if (cur === 'done') playVid(video); else if (cur === 'welcome') playVid($('#exVideo'));
  }
  $('#thClose').addEventListener('click', function () { haptic.tap(); closeTheater(); });
  $('#fsBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    track('fullscreen');
    openTheater(abs(urlOf(S.fmt) || video.currentSrc || ''), 'Твой ролик', video.currentTime);
  });

  // ---------- «Поправить текст и пересобрать» ----------
  var redo = { shagi: [], busy: false };
  $('#redoBtn').addEventListener('click', function () {
    haptic.tap();
    $('#rzZag').value = fZag.value.trim() || DEFAULT_HEAD;
    $('#rzImya').value = fImya.value.trim();
    $('#rzNik').value = normNik(fNik.value);
    redo.shagi = S.shagi.map(function (s) { return { nazvanie: s.nazvanie, tekst: s.tekst }; });
    var ol = $('#rzShagi');
    ol.innerHTML = '';
    redo.shagi.forEach(function (s, k) {
      var li = document.createElement('li');
      li.className = 'shag';
      li.innerHTML = '<span class="n">' + pad2(k + 1) + '</span>' +
        '<input maxlength="' + LEN_T + '" aria-label="Название шага ' + (k + 1) + '">' +
        '<textarea rows="1" maxlength="' + LEN_P + '" aria-label="Пояснение к шагу ' + (k + 1) + '"></textarea>';
      var inp = li.querySelector('input'), ta = li.querySelector('textarea');
      inp.value = s.nazvanie || ''; ta.value = s.tekst || '';
      inp.addEventListener('input', function () { s.nazvanie = inp.value; li.classList.remove('miss'); });
      ta.addEventListener('input', function () { s.tekst = ta.value; li.classList.remove('miss'); grow(ta); });
      ol.appendChild(li);
      setTimeout(function () { grow(ta); }, 0);
    });
    $('#sheet').hidden = false; body.classList.add('locked');
    primary('', null, { visible: false, keep: true });
    syncBack();
  });
  function closeSheet() {
    if (redo.busy) return;
    $('#sheet').hidden = true; body.classList.remove('locked');
    if (lastPrimary) primary.apply(null, lastPrimary);
    syncBack();
  }
  $('#sheetBg').addEventListener('click', closeSheet);
  $('#rzCancel').addEventListener('click', function () { haptic.tap(); closeSheet(); });
  $('#rzNik').addEventListener('blur', function () { $('#rzNik').value = normNik($('#rzNik').value); });
  $('#rzGo').addEventListener('click', function () {
    if (redo.busy) return;
    var bad = [];
    redo.shagi.forEach(function (s, k) { s.nazvanie = (s.nazvanie || '').trim(); s.tekst = (s.tekst || '').trim(); if (!s.nazvanie || !s.tekst) bad.push(k); });
    var imya = $('#rzImya').value.trim(), nik = normNik($('#rzNik').value);
    if (!imya || !nik) { haptic.warn(); toast('Имя и ник нужны — они подписывают ролик.'); return; }
    if (bad.length) {
      haptic.warn();
      var lis = $$('.shag', $('#rzShagi'));
      bad.forEach(function (k) { lis[k] && lis[k].classList.add('miss'); });
      toast('У каждого шага нужно название и пояснение.');
      return;
    }
    var body1 = { zagolovok: $('#rzZag').value.trim() || null, imya: imya, nik: nik, shagi: redo.shagi.map(function (s) { return { nazvanie: s.nazvanie, tekst: s.tekst }; }) };
    redo.busy = true; haptic.tap();
    $('#rzGo').disabled = true; $('#rzGo span').textContent = 'Запускаю…';
    // без повторов: если первый запрос дошёл, второй получит 409 — тогда берём номер сборки из ответа
    api('/api/rerender/' + encodeURIComponent(S.job), { method: 'POST', json: body1, retry: false }).catch(function (e) {
      if (e && e.status === 409 && e.data && e.data.job_id) return { job_id: e.data.job_id };
      throw e;
    }).then(function (d) {
      if (!d || !d.job_id) throw apiErr('other');
      // правка принята — переносим тексты в форму, чтобы и макет, и следующий шаг видели новое
      fZag.value = body1.zagolovok && body1.zagolovok !== DEFAULT_HEAD ? body1.zagolovok : '';
      fImya.value = imya; fNik.value = nik;
      S.shagi = body1.shagi.map(function (s) { return { nazvanie: s.nazvanie, tekst: s.tekst }; });
      track('rerender', { job_id: S.job });
      redo.busy = false; closeSheet();
      S.job = d.job_id; S.urls = null; S.vau = {}; S.preview = [];
      go('build'); poll();
    }).catch(function (e) {
      redo.busy = false;
      haptic.err();
      toast(humanMsg(e, 'Не получилось запустить пересборку. Попробуй ещё раз.'), 7000);
      if (e && e.status === 409) { S.vau.rerender_left = 0; $('#redoBtn').hidden = true; closeSheet(); }
    }).then(function () { $('#rzGo').disabled = false; $('#rzGo span').textContent = 'Пересобрать ролик'; });
  });

  // ---------- первый экран: счётчик и галерея (без ответа сервера — блоков нет) ----------
  var MIN_COUNTER = 10;   // меньше — не хвастаемся
  function countUp(el, n) {
    if (REDUCED) { el.textContent = fmtN(n); return; }
    var t0 = Date.now(), D = 1400;
    (function f() {
      var p = Math.min(1, (Date.now() - t0) / D); p = 1 - Math.pow(1 - p, 3);
      el.textContent = fmtN(Math.round(n * p));
      if (p < 1) requestAnimationFrame(f);
    })();
  }
  api('/api/stats', { quiet: true, retry: false }).then(function (d) {
    var n = Math.floor(Number(d && d.rendered_total) || 0);
    if (n < MIN_COUNTER) return;
    $('#cntWord').textContent = plural(n, ['ролик', 'ролика', 'роликов']);
    $('#counter').hidden = false;
    countUp($('#cntNum'), n);
  }).catch(function () {});
  api('/api/gallery', { quiet: true, retry: false }).then(function (d) {
    var items = ((d && d.items) || []).filter(function (x) { return x && x.video && x.poster; }).slice(0, 12);
    if (!items.length) return;
    $('#galRow').innerHTML = items.map(function (x, k) {
      return '<button type="button" class="gi" data-k="' + k + '" aria-label="Смотреть ролик: ' + esc(x.name || 'участник') + '"><img alt="" loading="lazy" src="' + esc(x.poster) + '"><i></i>' + (x.name ? '<span>' + esc(x.name) + '</span>' : '') + '</button>';
    }).join('');
    $$('.gi').forEach(function (b) {
      b.addEventListener('click', function () { var x = items[+b.getAttribute('data-k')]; track('gallery_view'); openTheater(abs(x.video), x.name || ''); });
    });
    $('#gal').hidden = false;
  }).catch(function () {});

  var offerVisible = false, io = null;
  function observeReveal() {
    if (!('IntersectionObserver' in window)) { $$('.rv').forEach(function (el) { el.classList.add('on'); }); return; }
    if (io) io.disconnect();
    io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (e.isIntersecting) e.target.classList.add('on');
        if (e.target.classList.contains('offer')) {
          offerVisible = e.isIntersecting;
          if (cur === 'done') primary('Подключить завод', goZavod, { visible: !offerVisible });
        }
      });
    }, { threshold: 0.18 });
    $$('.funnel .rv, .soft-zavod.rv').forEach(function (el) { io.observe(el); });
  }

  function abs(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }
  function openExt(url, what) {
    if (!url) { toast('Ссылка пока не настроена.'); return; }
    if (DEMO) { toast('Демо: здесь откроется ' + what + ' — ' + url, 4500); return; }
    if (IN_TG) {
      if (/^https:\/\/t\.me\//.test(url)) { try { tg.openTelegramLink(url); return; } catch (e) {} }
      try { tg.openLink(url); return; } catch (e) {}
    }
    window.open(url, '_blank', 'noopener');
  }
  function pay() { haptic.tap(); track('click_pay'); openExt(S.offer.pay_url, 'оплата'); }
  $('#payBtn').addEventListener('click', pay);
  $('#siteBtn').addEventListener('click', function () { haptic.tap(); track('click_site'); openExt(S.offer.site_url, 'сайт'); });
  // «Подключить завод» — пульт завода в этом же приложении (zavod/), без перехода в браузер
  function zavodUrl(hash) {
    var q = new URLSearchParams(location.search), keep = new URLSearchParams();
    ['demo', 'theme'].forEach(function (k) { if (q.get(k) != null) keep.set(k, q.get(k)); });
    var qs = keep.toString();
    return 'zavod/' + (qs ? '?' + qs : '') + (hash || '');
  }
  function goZavod() { haptic.tap(); track('click_zavod'); location.href = zavodUrl('#/intro'); }
  $('#zavodBtn').addEventListener('click', goZavod);

  $('#mgrBtn').addEventListener('click', function () { haptic.tap(); track('click_manager'); openExt(S.offer.manager_url, 'чат с Валерией'); });

  $$('[data-dl]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-dl'), u = urlOf(f);
      if (!u) return;
      haptic.tap();
      track('download', { format: f });
      var url = abs(u), name = 'kontent-zavod-' + FMT_NAME[f] + '.mp4';
      if (IN_TG && !DEMO) {
        if (ver('8.0') && tg.downloadFile) { try { tg.downloadFile({ url: url, file_name: name }); return; } catch (e) {} }
        try { tg.openLink(url); return; } catch (e) {}
      }
      var a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    });
  });
  $('#chatBtn').addEventListener('click', function () {
    haptic.tap();
    var bot = S.offer.bot_username;
    if (DEMO || !IN_TG) { toast('Ролики приходят в чат от бота сами — оттуда их удобно переслать.'); return; }
    if (bot) { try { tg.openTelegramLink('https://t.me/' + String(bot).replace(/^@/, '')); } catch (e) {} }
    try { tg.close(); } catch (e) {}
  });

  // ---------- старт ----------
  track('open', { demo: DEMO, platform: (tg && tg.platform) || 'web', start_param: (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || null });

  // ---------- один вход: клиента завода сразу ведём в пульт ----------
  // демо: ?role=client; с сервером: GET /api/zavod/me → {role: 'client'}. Старый сервер такого
  // адреса не знает (404) — ошибка глотается, человек остаётся в подарке, как раньше.
  if (DEMO && Q.get('role') === 'client') { location.replace(zavodUrl('')); return; }
  if (!DEMO) {
    api('/api/zavod/me', { quiet: true, retry: false }).then(function (d) {
      if (d && d.role === 'client' && (cur === 'welcome' || cur === null)) location.replace(zavodUrl(''));
    }).catch(function () {});
  }

  var jump = DEMO && Q.get('screen');
  if (jump && SCREENS[jump] && jump !== 'welcome') {
    // прыжок сразу на экран — только в демо, чтобы смотреть дизайн
    if (jump !== 'photos') {
      demoFill(); S.uploadedSig = sig(); S.fotoIds = ['d1', 'd2'];
      fImya.value = 'Анна Смирнова'; fNik.value = '@anna.design'; fNiche.value = 'Дизайн интерьеров под ключ';
      if (jump !== 'about') S.shagi = [
        { nazvanie: 'Знакомство', tekst: 'Созвон: слушаю, как ты живёшь и что хочешь.' },
        { nazvanie: 'Замер', tekst: 'Приезжаю, снимаю размеры и фотографирую.' },
        { nazvanie: 'Концепция', tekst: 'Показываю два варианта стиля на выбор.' },
        { nazvanie: 'Проект', tekst: 'Чертежи, свет, мебель — всё по полочкам.' },
        { nazvanie: 'Ремонт', tekst: 'Веду стройку и отвечаю за результат.' }
      ];
    }
    if (jump === 'build') { S.job = 'demo-job'; MOCK.startAt(+(Q.get('t') || 9)); go('build'); poll(); }
    else if (jump === 'done') {
      // сразу готовый ролик со всеми «вау»-полями (без ?vau=0 — как ответил бы старый сервер)
      S.job = 'demo-job';
      if (Q.get('vau') !== '0') { var dd = MOCK.doneData(); VAU_KEYS.forEach(function (k) { S.vau[k] = dd[k]; }); S.vau._new = true; S.preview = dd.preview; S.urls = dd.video_urls; }
      go('done');
    }
    else go(jump);
  } else {
    go('welcome');
  }
})();
