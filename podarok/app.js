/* Контент-завод · мини-приложение «собери свой первый ролик».
   Путь — документ владельца «Смыслы для первого ролика: 5 форматов × 67 ниш» (03.10.2026) с правками
   владельца 03.10 (новый порядок шагов):
   приветствие (тексты с главной страницы сайта) → примеры контента (рилсы и карусели в разных стилях) →
   1 ниша (9 групп → 67 ниш) → 2 имя и ник (обязательны) → 3 тема (3 смысла или свой) + 3 вопроса голосом +
   проверка текста → 4 стиль, цвет и фото/видео → 5 монтаж: экраны о возможностях завода с примерами и тарифы
   «входит / не входит» (прогрев к подписке) → ролик сразу, как только собрался (проверка подписки на наши
   соцсети отменена 04.10.2026 решением владельца) →
   ролик, подпись, сторис → «что дальше»: пробный день, подписка, распаковка, «Подключить завод».
   Ниши, смыслы, вопросы и форматы — data/pervyj_rolik.json (разборщик lid_bot/data/razobrat_pervyj_rolik.py).
   Без сборщиков: один файл, чистый JavaScript.
   Режим демо (моки без сервера): открыто вне Telegram или ?demo=1.
   Для просмотра дизайна в демо можно сразу прыгнуть на экран:
   ?demo=1&screen=primery|nisha|imya|smysl|voprosy|scenarij|oformlenie|build|done|fail   (для build можно &t=секунды)
   ?job=<номер> — открыть готовый ролик (кнопка «Выложить в сторис» из чата)
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
  var DEMO = true;   // копия для GitHub Pages: всегда демо, сервера нет
  var REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var LEN_T = 34, LEN_P = 140;
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

  // ---------- демо: сценарий без сервера (упрощённая копия server/pervyj_rolik.py) ----------
  var DEMO_OTVETY = [
    'Ну вот, клиентки сами выщипывают брови дома пинцетом и убирают слишком много, особенно снизу.',
    'Потом приходится отращивать месяцами, а лицо всё это время выглядит уставшим и грустным.',
    'Не трогайте брови хотя бы шесть недель до коррекции и приходите к мастеру с запасом.'
  ];
  var DEMO_ETAPY = {
    oshibka: ['Ошибка', 'Цена ошибки', 'Как правильно'], mif: ['Миф', 'Правда', 'Доказательство'],
    bylo_stalo: ['Было', 'Что сделали', 'Стало'], pochemu: ['До', 'Перелом', 'Сейчас'],
    tri_veshchi: ['Первая', 'Вторая', 'Третья'], svoj: ['Проблема', 'Знакомо?', 'Главное']
  };
  // как server/pervyj_rolik.py PRIZYV_FORMATA — на «ты» (совет директоров 04.10)
  var DEMO_PRIZYV = {
    oshibka: ['Сохрани', 'Сохрани, чтобы не потерять. Напиши мне — пришлю подробнее.'],
    mif: ['А ты верил?', 'А ты в это верил? Напиши в комментариях.'],
    bylo_stalo: ['Хочешь так же?', 'Хочешь так же — напиши мне в личные сообщения.'],
    pochemu: ['Будем знакомы', 'Подписывайся, если тебе это близко.'],
    tri_veshchi: ['Какая твоя?', 'Какая откликнулась — 1, 2 или 3? Напиши в комментариях.']
  };
  var HUK_ZAPAS = { oshibka: 'Эту ошибку делают почти все', mif: 'Миф, в который верят почти все',
    bylo_stalo: 'Было и стало: история клиента', pochemu: 'Почему я этим занимаюсь', tri_veshchi: '3 вещи, которые стоит знать' };
  var ZNAKOMO_ZAPAS = 'Если узнал себя — досмотри: дальше главное.';
  // заголовок из «своего смысла»: целиком, или до знака препинания — не посреди фразы (как server huk_svoj)
  function hukSvoj(ideya, fid) {
    var t = demoClean(ideya).replace(/[.…!;:,— ]+$/, '');
    if (t.length >= 8 && t.length <= 44) return t;
    var best = '', re = /\s*[,.;:!?]\s|\s[—–-]\s/g, m, tt = t + ' ';
    while ((m = re.exec(tt))) {
      var c = tt.slice(0, m.index).trim().replace(/[.…!;:,— ]+$/, '');
      if (c.length > 44) break;
      if (c.length >= 8) best = c;
    }
    return best || HUK_ZAPAS[fid] || 'Главное — в конце';
  }
  function demoClean(t) {
    t = String(t || '').replace(/\s+/g, ' ').replace(/(^|[\s,.!?])(ну|вот|короче|типа)(?=[\s,.!?]|$),?\s*/gi, '$1').trim();
    t = t.replace(/^[,.\s]+/, '');
    if (t && !/[.!?…]$/.test(t)) t += '.';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function demoFormat(ideya) {
    var t = String(ideya || '').trim();
    if (!t || /^(расскажу|рассказать|хочу рассказать)?\s*(о|про)\s+(себе|себя|мне|работе)\W*$/i.test(t) || t.split(/\s+/).length <= 2)
      return { format: 'pochemu', obshchee: true, vopros: 'Похоже на «Почему я этим занимаюсь» — собрать в этом формате?' };
    var map = [[/ошиб|не делай|нельзя|зря/i, 'oshibka'], [/миф|правд|верят|на самом деле/i, 'mif'], [/было|стало|кейс|результат|до и после/i, 'bylo_stalo'],
               [/о себе|почему я|как я приш|мой путь/i, 'pochemu']];
    for (var i = 0; i < map.length; i++) if (map[i][0].test(t)) return { format: map[i][1], obshchee: false, vopros: '' };
    return { format: 'tri_veshchi', obshchee: false, vopros: '' };
  }
  function demoScen(b) {
    var n = nishaBy(b.nisha) || { nazvanie: 'Бровист', nomer: 15, smysly: [], otkrytaya_bol: '' };
    var k = +b.smysl || 0, sm = k ? n.smysly[k - 1] : null;
    var fid = sm ? sm.format : (b.format || demoFormat(b.svoj_smysl).format);
    var ot = (b.otvety || []).map(demoClean);
    var teksty = ot;
    if (!sm) {
      // «Свой смысл»: этап «Знакомо?» — боль ниши; её нет в открытом демо → делим ответ про проблему или запасная строка
      var bol = String(n.otkrytaya_bol || '').trim(), prob = ot[1] || '';
      if (!bol) {
        var parts = (prob.match(/[^.!?…]+[.!?…]*/g) || []).map(function (x) { return x.trim(); }).filter(Boolean);
        if (parts.length >= 2) { prob = parts[0]; bol = parts.slice(1).join(' '); } else bol = ZNAKOMO_ZAPAS;
      }
      teksty = [prob, bol, ot[0]];
    }
    var names = DEMO_ETAPY[sm ? fid : 'svoj'];
    var shagi = names.map(function (nm, i) { return { nazvanie: nm, tekst: String(teksty[i] || '').slice(0, LEN_P) }; });
    var pz = sm ? DEMO_PRIZYV[fid] : ['Что дальше', ot[2]];
    shagi.push({ nazvanie: pz[0], tekst: pz[1] });
    var zag = sm ? (sm.nazvanie.length <= 44 && sm.nazvanie.indexOf('(') < 0 ? sm.nazvanie : HUK_ZAPAS[fid] || 'Эту ошибку делают почти все') : hukSvoj(b.svoj_smysl, fid);
    var f = fmtBy(fid) || { nazvanie: '' };
    return { format: fid, format_nazvanie: f.nazvanie, nisha: n.nazvanie, nisha_nomer: n.nomer, smysl: sm ? sm.nazvanie : b.svoj_smysl,
      smysl_nomer: k, zagolovok: zag, shagi: shagi, pochemu_zameny: [],
      podpis: zag + ' 👇\n\n' + ot.join(' ') + '\n\n' + pz[1] + '\n\n🎬 Ролик собран на Контент-заводе из одной записи на телефон — собери свой бесплатно: t.me/Kontent_Agent_bot' };
  }

  // ---------- моки для демо ----------
  var MOCK = (function () {
    var t0 = 0;
    var STAGES = ['Готовлю фото и видео', 'Раскладываю шаги', 'Рисую кадры', 'Собираю анимацию', 'Свожу ролик'];
    function wait(ms, v) { return new Promise(function (res) { setTimeout(function () { res(v); }, ms); }); }
    function waitErr(ms, msg, status, data) { return wait(ms).then(function () { throw apiErr('server', msg, status, data); }); }
    var EX = 'primer/example.mp4';
    var DEMO_KADRY = ['r_podarok', 'r_zavod_pomnit', 'r_vozrazheniya', 'r_voprosy', 'r_storis', 'r_marshrut', 'r_otchet', 'r_podarok'];
    // «вау»-заглушки: кадры раскадровки — примеры из img/primery (файлов primer/kadr_*.jpg в репозитории нет)
    // kind: cover — заставка, step — кадр шага (step — номер с 1), cta — финал
    var PREVIEW = ['7 шагов — и готово', 'Знакомство', 'Разбор', 'План', 'Работа', 'Проверка', 'Итог', 'Финал']
      .map(function (t, k, a) {
        var it = { url: 'img/primery/' + DEMO_KADRY[k] + '.webp', title: t, kind: k === 0 ? 'cover' : k === a.length - 1 ? 'cta' : 'step' };
        if (it.kind === 'step') it.step = k;
        return it;
      });
    var Q_END = 4, FRAMES_AT = 6, FRAME_EVERY = 1.4, DONE_AT = 22;
    var rerenderLeft = 0, draftAt = 0, demoPochta = false;   // ролик-подарок без переделок (04.10)
    var DEMO_POCHTA = Q.get('pochta') !== '0' && Q.get('admin') !== '1';
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
      ['instagram', 'telegram', 'youtube'].forEach(function (f) { u[f] = EX; });
      return u;
    }
    function doneData() {
      return {
        status: 'done', progress: 1, stage: 'Готово', queue_pos: 0, video_urls: urls(), error: null,
        preview: PREVIEW, stage_detail: 'Ролик готов',
        // Telegram берёт в сторис только внешний https-адрес; локальный демо-сервер — http, поэтому адрес-заглушка
        story_url: /^https:/.test(location.protocol) ? abs(EX) : 'https://demo.invalid/kontent-zavod-telegram-stories.mp4', rerender_left: rerenderLeft,
        post_text: (typeof S !== 'undefined' && S.scen && S.scen.podpis) || demoScen({ nisha: 15, smysl: 2, otvety: DEMO_OTVETY }).podpis,
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
        if (path === '/api/gallery') return wait(300, { items: [
          { poster: 'img/primery/r_zavod_pomnit.webp', video: EX, name: 'Антон, автоматизация' },
          { poster: 'primer/example.jpg', video: EX, name: 'Валерия, смыслы' },
          { poster: 'img/primery/r_storis.webp', video: EX, name: 'Ирина, психолог' },
          { poster: 'img/primery/r_marshrut.webp', video: EX, name: 'Олег, ремонт' }
        ] });
        if (path === '/api/styles') return wait(350, { styles: [
          { id: 'noch', name: 'Ночь', note: 'Тёмный фон и неон — как в примере', preview_url: 'img/primery/r_vozrazheniya.webp' },
          { id: 'belyi', name: 'Светлый', note: 'Белый фон, чистая журнальная вёрстка', preview_url: '' },
          { id: 'kino', name: 'Кино', note: 'Крупные кадры и медленные переходы', preview_url: 'img/primery/r_otchet.webp' }
        ] });
        if (path === '/api/draft') return wait(150, { shagi: draftAt && Date.now() >= draftAt ? VOICE_STEPS : [] });
        if (path === '/api/share') return wait(120, { text: 'Собрал себе ролик — ответил голосом на три вопроса 🎬 Попробуй тоже — бот соберёт ролик под твою нишу:', url: 'https://t.me/demo_bot?start=ref_demo' });
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
        if (path === '/api/moj_rolik') return wait(120, { job_id: Q.get('povtor') ? 'demo-job' : null, nisha: Q.get('povtor') ? 15 : null, admin: Q.get('admin') === '1', free_left: Q.get('admin') === '1' ? null : (Q.get('povtor') ? 0 : 1), trial_day_price: 990 });
        if (path === '/api/admin/reset') return wait(300, { ok: true });
        // почта в демо — ЗАГЛУШКА, включена по умолчанию: письмо не уходит, подходит любой код из 6 цифр (на экране — пометка).
        // ?pochta=0 — без экрана почты, ?pochta=byl — «подарок на эту почту уже был», ?admin=1 — админ проходит без почты
        if (path === '/api/pochta' && (opt.method || 'GET') === 'GET') return wait(80, { vklyuchena: DEMO_POCHTA, nuzhna: DEMO_POCHTA && !demoPochta, podtverzhdena: demoPochta, kod_min: 15, podarok_byl: false });
        if (path === '/api/pochta') return wait(400, { ok: true, adres: 'im***@demo.ru', kod_min: 15 });
        if (path === '/api/pochta/kod') { demoPochta = true; return wait(300, { vklyuchena: true, nuzhna: false, podtverzhdena: true, kod_min: 15, podarok_byl: Q.get('pochta') === 'byl' }); }
        if (path === '/api/golos' && (opt.method || 'GET') === 'GET') return wait(80, { dostupen: true, max_sec: 180 });
        if (path === '/api/podobrat_format') return wait(300, demoFormat((opt.json || {}).ideya || ''));
        if (path === '/api/scenarij') return wait(700, demoScen(opt.json || {}));
        if (path.indexOf('/api/render/') === 0) { t0 = Date.now(); return wait(400, { job_id: 'demo-job' }); }
        if (path.indexOf('/api/job/') === 0) {
          var s = (Date.now() - t0) / 1000;
          if (s < Q_END) return wait(100, { status: 'queued', progress: 0, stage: null, queue_pos: Math.max(1, 3 - Math.floor(s / 1.4)), video_urls: null, error: null });
          var p = Math.min(1, (s - Q_END) / (DONE_AT - Q_END));
          if (p >= 1) return wait(100, doneData());
          var nf = s < FRAMES_AT ? 0 : Math.min(PREVIEW.length, Math.floor((s - FRAMES_AT) / FRAME_EVERY) + 1);
          var w = { status: 'working', progress: p, stage: STAGES[Math.min(STAGES.length - 1, Math.floor(p * STAGES.length))], queue_pos: 0, video_urls: null, error: null,
            preview: PREVIEW.slice(0, nf), stage_detail: detail(s), rerender_left: rerenderLeft };
          return wait(100, w);
        }
        return wait(50, {});
      },
      golos: function () {   // демо: «распознанный» ответ голосом
        return wait(1400, { text: DEMO_OTVETY[(S.q || 0) % DEMO_OTVETY.length] });
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
    vau: {},                      // новые поля последнего /api/job: preview, story_url, rerender_left, post_text, stats
    preview: [], share: null, celebrated: false,
    // «первый ролик»: каталог ниш, выбор человека, ответы и собранный сценарий
    kat: null, nisha: null, smysl: 0, svoj: '', format: '', otvety: ['', '', ''], q: 0, scen: null, scenSig: ''
  };
  var uidN = 0;
  function nishaBy(n) { return S.kat ? S.kat.nishi.filter(function (x) { return x.nomer === +n; })[0] : null; }
  function fmtBy(id) { return S.kat ? S.kat.formaty.filter(function (x) { return x.id === id; })[0] : null; }
  var katP = null;
  function loadKat() {
    if (!katP) katP = fetch('data/pervyj_rolik.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw apiErr('other', 'Не получилось загрузить список ниш. Обнови приложение.');
      return r.json();
    }).then(function (d) { S.kat = d; return d; }).catch(function (e) { katP = null; throw e.human ? e : apiErr('net'); });
    return katP;
  }
  loadKat().catch(function () {});

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
  }).catch(function () {});

  // ---------- навигация ----------
  // Порядок экранов (правка владельца 03.10). SHAG — номер шага «N из 5» для полоски в шапке:
  // приветствие и примеры — до шагов; тема, вопросы и проверка текста — один шаг 3; монтаж и ворота — шаг 5.
  var ORDER = ['welcome', 'primery', 'nisha', 'imya', 'smysl', 'voprosy', 'scenarij', 'oformlenie', 'build', 'done'];
  var SHAG = { nisha: 1, imya: 2, smysl: 3, voprosy: 3, scenarij: 3, oformlenie: 4, pochta: 4, build: 5, fail: 5, done: 6 };
  // «Назад» ведёт на прошлый экран; всё введённое живёт в S и в полях формы — при возврате ничего не теряется
  var BACK = { primery: 'welcome', nisha: 'primery', imya: 'nisha', smysl: 'imya', voprosy: 'smysl', scenarij: 'voprosy', oformlenie: 'scenarij', pochta: 'oformlenie', fail: 'oformlenie' };
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

    var idx = (SHAG[name] || 0) - 1;
    $$('#steps i').forEach(function (el, i) { el.classList.toggle('on', i === idx); el.classList.toggle('past', i < idx); });
    $('#steps').classList.toggle('hide', idx < 0);

    var canBack = !!BACK[name];
    body.classList.toggle('can-back', canBack);
    syncBack();

    if (SCREENS[name]) SCREENS[name]();
  }
  function goBack() {
    if (!$('#theater').hidden) { closeTheater(); return; }
    if (cur === 'voprosy' && S.q > 0) { haptic.tap(); saveOtvet(); S.q--; showQ(); return; }   // назад — к прошлому вопросу
    var b = BACK[cur]; if (b) { haptic.tap(); go(b, true); }
  }
  // системная «Назад» в Telegram: поверх экрана открыт просмотр или правка — она их закрывает
  function syncBack() {
    if (!(IN_TG && tg.BackButton)) return;
    var on = !!BACK[cur] || !$('#theater').hidden;
    try { on ? tg.BackButton.show() : tg.BackButton.hide(); } catch (e) {}
  }
  function overlayOpen() { return !$('#theater').hidden; }
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
    welcome: function () { primary('Начать', function () { track('start'); go('primery'); }); },
    primery: function () { renderPrimery(); primary('Собрать мой ролик', function () { track('start_rolik'); go('nisha'); }); },
    nisha: function () { renderNishi(); },
    imya: function () { renderImya(); },
    smysl: function () { renderSmysl(); },
    voprosy: function () { showQ(); },
    scenarij: function () { renderScen(); primary('Дальше — фото и цвет', submitScen); },
    oformlenie: function () { renderSlots(); loadStyles(); },
    pochta: function () { renderPochta(); },
    build: function () { primary('', null, { visible: false }); fillBelt(); startWarm(); },
    done: function () { stopWarm(); showDone(); },
    fail: function () { stopWarm(); primary('Попробовать ещё раз', function () { go('oformlenie', true); }); }
  };
  var LEAVE = {
    voprosy: function () { saveOtvet(); stopRec(true); },
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
  // ---------- загрузка: фото и короткие видео ----------
  // Лимиты — с сервера (/api/limits); пока не ответил — те же числа по умолчанию.
  // Длительность и вес видео проверяем в телефоне ДО отправки: зачем гнать 100 МБ, чтобы услышать «длинное».
  var LIM = { photos: 3, videos: 3, photoMb: 30, videoMb: 100, videoSec: 30 };
  if (!DEMO) api('/api/limits', { quiet: true, retry: false }).then(function (d) {
    LIM = { photos: d.max_photos || LIM.photos, videos: d.max_videos || LIM.videos, photoMb: d.max_photo_mb || LIM.photoMb,
            videoMb: d.max_video_mb || LIM.videoMb, videoSec: d.max_video_sec || LIM.videoSec };
    if ($('#pickVideo')) $('#pickVideo').lastChild.textContent = 'Видео до ' + LIM.videoSec + ' сек';
    renderSlots();
  }).catch(function () {});
  var ACCEPT_ALL = 'image/*,video/mp4,video/quicktime,.mp4,.mov,.m4v';
  // Отдельные кнопки «Фото» и «Видео до 30 сек»: галерея телефона сразу открывается на нужном.
  function openPicker(accept) {
    if (S.busy) { toast('Подожди — файлы ещё отправляются.'); return; }
    if (!consent.checked) { haptic.warn(); toast('Сначала отметь согласие на обработку фото и видео.'); return; }
    var k = S.photos.indexOf(null);
    if (k < 0) { toast('Уже три файла. Убери лишний — крестик на миниатюре.'); return; }
    targetSlot = k;
    fileInput.setAttribute('accept', accept);
    fileInput.multiple = S.photos.filter(function (p) { return !p; }).length > 1;
    fileInput.click();
    setTimeout(function () { fileInput.setAttribute('accept', ACCEPT_ALL); }, 1500);
  }
  if ($('#pickVideo')) $('#pickVideo').lastChild.textContent = 'Видео до ' + LIM.videoSec + ' сек';
  if ($('#pickPhoto')) $('#pickPhoto').addEventListener('click', function () { openPicker('image/*'); });
  if ($('#pickVideo')) $('#pickVideo').addEventListener('click', function () { openPicker('video/mp4,video/quicktime,.mp4,.mov,.m4v'); });
  var VIDEO_RE = /\.(mp4|mov|m4v)$/i, ANY_VIDEO_RE = /\.(mp4|mov|m4v|avi|webm|mkv|3gp)$/i;
  var targetSlot = 0;
  $$('.slot').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target.closest('.rm')) return;
      if (S.busy) { toast('Подожди — файлы ещё отправляются.'); return; }
      if (!consent.checked) {
        haptic.warn();
        var cb = $('#consentBox'); cb.classList.remove('shake'); void cb.offsetWidth; cb.classList.add('shake');
        toast('Сначала отметь согласие на обработку фото и видео.');
        return;
      }
      targetSlot = +el.getAttribute('data-slot');
      fileInput.setAttribute('accept', ACCEPT_ALL);
      var empty = S.photos.filter(function (p) { return !p; }).length;
      fileInput.multiple = !S.photos[targetSlot] && empty > 1;
      fileInput.click();
    });
  });
  fileInput.addEventListener('change', function () {
    var files = Array.prototype.slice.call(fileInput.files || []);
    fileInput.value = '';
    if (!files.length) return;
    var ok = [], msgs = [];
    files.forEach(function (f) {
      if (isImage(f)) {
        if (f.size > LIM.photoMb * 1048576) msgs.push('Файл «' + short(f.name) + '» больше ' + LIM.photoMb + ' МБ — выбери фото поменьше.');
        else ok.push(f);
      } else if (isVideo(f)) {
        if (!VIDEO_RE.test(f.name || '') && !/^video\/(mp4|quicktime)$/i.test(f.type || '')) msgs.push('Видео «' + short(f.name) + '» не подходит — нужны MP4 или MOV.');
        else if (f.size > LIM.videoMb * 1048576) msgs.push('Файл «' + short(f.name) + '» больше ' + LIM.videoMb + ' МБ — обрежь видео или выбери другое.');
        else ok.push(f);
      } else msgs.push('Часть файлов не подошла — нужны фото (JPG, PNG, HEIC) или видео (MP4, MOV).');
    });
    if (msgs.length) { haptic.warn(); toast(msgs[0], 6000); }
    if (!ok.length) return;
    // первое — в выбранное место, остальные — в пустые по порядку; видео и фото — каждое не больше своего лимита
    var extra = 0, first = true;
    ok.forEach(function (f) {
      var vid = isVideo(f);
      var have = S.photos.filter(function (p, k) { return p && p.kind === (vid ? 'video' : 'photo') && !(first && k === targetSlot); }).length;
      if (have >= (vid ? LIM.videos : LIM.photos)) { extra++; return; }
      var k = first ? targetSlot : S.photos.indexOf(null);
      first = false;
      if (k < 0) { extra++; return; }
      if (vid) putVideo(k, f); else putPhoto(k, f);
    });
    if (extra) toast('Больше трёх файлов не нужно — взял первые.');
    haptic.tap();
    renderSlots();
  });

  function isVideo(f) {
    return /^video\//i.test(f.type || '') || ANY_VIDEO_RE.test(f.name || '');
  }
  function isImage(f) {
    var t = (f.type || '').toLowerCase(), n = (f.name || '').toLowerCase();
    if (t.indexOf('video/') === 0) return false;
    return t.indexOf('image/') === 0 || /\.(jpe?g|png|webp|heic|heif)$/.test(n);
  }
  function dropItem(old) {
    if (!old || old.demo) return;
    try { URL.revokeObjectURL(old.url); } catch (e) {}
    if (old.vurl) try { URL.revokeObjectURL(old.vurl); } catch (e) {}
  }
  function putPhoto(k, f) {
    dropItem(S.photos[k]);
    var it = { uid: ++uidN, kind: 'photo', file: f, url: URL.createObjectURL(f), name: f.name, w: 0, h: 0, broken: false,
               cid: newCid() };
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
  // Метка файла для сервера: повтор после обрыва с той же меткой не создаёт копию на сервере.
  function newCid() { return 'f' + (++uidN) + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

  // Видео отправляем как есть (жмёт и приводит цвет сервер). Здесь — длительность и кадр-обложка:
  // it.url — картинка-кадр (её показывают макет и экраны дальше), it.vurl — само видео.
  // Не смогли прочитать (бывает с HEVC на андроиде) — не отказываем: длительность проверит сервер.
  function putVideo(k, f) {
    // прежний файл в ячейке не выбрасываем, пока видео не прошло проверку длительности:
    // отказ «длинное» возвращает ячейку как была, а не оставляет её пустой
    var prev = S.photos[k];
    var it = { uid: ++uidN, kind: 'video', file: f, url: '', vurl: URL.createObjectURL(f), name: f.name, w: 0, h: 0,
               broken: true, dur: 0, cid: newCid() };
    S.photos[k] = it;
    var ready, done = false;
    it.prep = new Promise(function (res) { ready = res; });
    var v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'metadata';
    function finish(okMeta) {
      if (done) return; done = true; clearTimeout(tm);
      if (okMeta && it.dur > LIM.videoSec + 0.5) {
        haptic.warn();
        toast('Видео «' + short(f.name) + '» длиннее ' + LIM.videoSec + ' сек — обрежь или выбери другое.', 7000);
        if (S.photos[k] === it) { S.photos[k] = prev || null; if (!prev) compact(); }
        dropItem(it); v.removeAttribute('src');
        renderSlots(); ready(null);
        return;
      }
      if (prev && prev !== it) dropItem(prev);
      ready({ blob: f, name: f.name, kind: 'video' });
      renderSlots();
    }
    var tm = setTimeout(function () { finish(false); }, 8000);
    v.onloadedmetadata = function () {
      it.dur = isFinite(v.duration) ? v.duration : 0;
      it.w = v.videoWidth; it.h = v.videoHeight;
      if (it.dur > LIM.videoSec + 0.5) { finish(true); return; }
      try { v.currentTime = Math.min(0.5, (it.dur || 1) / 2); } catch (e) { finish(true); }
    };
    v.onseeked = function () {
      try {
        var c = document.createElement('canvas'), sc = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight, 1));
        c.width = Math.max(1, Math.round(v.videoWidth * sc)); c.height = Math.max(1, Math.round(v.videoHeight * sc));
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        c.toBlob(function (b) {
          if (b && b.size && S.photos[k] === it) { it.url = URL.createObjectURL(b); it.broken = false; }
          c.width = c.height = 0; v.removeAttribute('src'); try { v.load(); } catch (e) {}
          finish(true);
        }, 'image/jpeg', 0.8);
      } catch (e) { finish(true); }
    };
    v.onerror = function () { finish(false); };
    v.src = it.vurl;
  }
  function prepWord() { return S.photos.some(function (p) { return p && p.kind === 'video'; }) ? 'Готовлю твои фото и видео' : 'Готовлю фото'; }
  function fmtDur(s) { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

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
  // сдвигаем, чтобы первым всегда стоял портрет (или первое видео)
  function compact() {
    var rest = S.photos.filter(Boolean);
    S.photos = [rest[0] || null, rest[1] || null, rest[2] || null];
  }
  function removePhoto(k) {
    if (S.busy) { toast('Подожди — файлы ещё отправляются.'); return; }
    dropItem(S.photos[k]);
    S.photos[k] = null;
    compact();
    haptic.tap();
    renderSlots();
  }

  var ICON_X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var EMPTY_HTML = $$('.slot').map(function (el) { return el.innerHTML; });

  function renderSlots() {
    $('#slots').classList.toggle('locked', !consent.checked);
    $$('.slot').forEach(function (el, k) {
      var it = S.photos[k];
      var key = it ? it.uid + ':' + (it.broken ? 'b' : '') + it.w + 'x' + it.h + ':' + Math.round(it.dur || 0) : 'empty';
      if (el.getAttribute('data-key') === key) return;
      el.setAttribute('data-key', key);
      el.classList.toggle('filled', !!it);
      if (!it) { el.innerHTML = EMPTY_HTML[k]; el.setAttribute('aria-label', k ? 'Добавить фото или видео' : 'Добавить портрет или видео'); return; }
      var vid = it.kind === 'video';
      var wide = it.w && it.h && it.w > it.h * 1.05;
      el.innerHTML = (it.broken ? '<span class="nm">' + esc(short(it.name)) + '</span>' : '<img class="pic" alt="" src="' + it.url + '">') +
        (wide ? '<span class="warn">Горизонтальное — обрежем по бокам</span>' : '') +
        (vid ? '<span class="vid-badge"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' + (it.dur ? fmtDur(it.dur) : 'видео') + '</span>' : '') +
        '<span class="lbl">' + (vid ? 'Видео' : k ? 'Фото ' + (k + 1) : 'Портрет') + '</span>' +
        '<span class="rm" role="button" tabindex="0" aria-label="Убрать">' + ICON_X + '</span>';
      el.setAttribute('aria-label', vid ? 'Заменить видео' : 'Заменить фото');
      el.querySelector('.rm').addEventListener('click', function (e) { e.stopPropagation(); removePhoto(k); });
    });
    var n = S.photos.filter(Boolean).length;
    $('#slotHint').textContent = !consent.checked ? 'Сначала отметь согласие — потом откроется загрузка.'
      : n ? 'Нажми на фото или видео, чтобы заменить. Первое фото — портрет.'
      : 'Загрузи фото или короткие видео (до ' + LIM.videoSec + ' сек). Лучше начать с портрета.';
    if (cur === 'oformlenie' && !S.busy) {
      primary(!consent.checked ? 'Отметь согласие' : n ? 'Собрать ролик' : 'Добавь портрет', submitOform, { active: consent.checked && n > 0 });
    }
  }
  function short(n) { n = String(n || ''); return n.length > 22 ? n.slice(0, 10) + '…' + n.slice(-8) : n; }
  function plural(n, f) { n = Math.abs(n) % 100; var d = n % 10; return n > 10 && n < 20 ? f[2] : d === 1 ? f[0] : d > 1 && d < 5 ? f[1] : f[2]; }
  function fmtN(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  if (DEMO) { $('#demoFill').hidden = false; $('#demoFill').addEventListener('click', demoFill); }
  function demoFill() {
    consent.checked = true; $('#consentBox').classList.add('ok');
    S.photos = [
      { uid: ++uidN, kind: 'photo', url: 'img/demo_v.webp', name: 'portret.webp', w: 4, h: 5, demo: true },
      { uid: ++uidN, kind: 'photo', url: 'img/reel.jpg', name: 'rabota.jpg', w: 9, h: 16, demo: true },
      null
    ];
    renderSlots();
  }

  function sig() { return S.photos.map(function (p) { return p ? p.uid : '-'; }).join(','); }

  // Отправка: по одному файлу за запрос. Оборвалось — повторяем только этот файл, а не всё заново;
  // метка файла (cid) не даёт серверу сохранить его дважды, если прошлая попытка всё-таки дошла.
  // Полоса — честная: доля отправленных байт всех файлов вместе.
  function uploadPhotos() {
    if (S.busy || !consent.checked || !S.photos[0]) return;
    if (S.uploadedSig === sig()) { startRender(); return; }
    S.busy = true;
    var bar = $('#upbar'), prog = $('#upProg'), txt = $('#upText');
    var lastPct = -1;
    function show(t, pct) {
      txt.textContent = t;
      if (pct != null) {
        prog.style.width = pct.toFixed(1) + '%';
        var r = Math.round(pct);
        // в Telegram полоски под фото может быть не видно — дублируем проценты на главной кнопке
        if (r !== lastPct) { lastPct = r; primary(r < 99 ? 'Загружаю… ' + r + '%' : 'Проверяю…', null, { active: false, progress: true }); }
      }
    }
    bar.hidden = false; prog.style.width = '0%';
    var items = S.photos.filter(Boolean);
    var hasVid = items.some(function (p) { return p.kind === 'video'; });
    var WHAT = hasVid ? 'файлы' : 'фото';
    show(hasVid ? 'Готовлю файлы… Видео весит больше фото — загрузка займёт чуть дольше.' : 'Готовлю фото…');
    primary('Загружаю…', null, { active: false, progress: true });
    var mySig = sig();
    Promise.all(items.map(function (p) { return p.prep || { blob: p.file, name: p.name }; })).then(function (parts) {
      // демо: файлы-примеры («Демо: взять примеры фото») без blob — отправлять нечего, загрузка понарошку
      if (DEMO) return ensureSession(S.uploadedSig !== null).then(function () { return fakeUpload(prog); });
      parts = parts.map(function (x, i) { return x && x.blob ? { blob: x.blob, name: x.name, cid: items[i].cid, kind: items[i].kind } : null; }).filter(Boolean);
      if (!parts.length) throw apiErr('other', 'Нечего отправлять — добавь фото или видео.');
      var total = parts.reduce(function (a, x) { return a + (x.blob.size || 0); }, 0) || 1, sent = 0, got = [];
      // новая сессия, если набор поменялся после прошлой загрузки: на сервере не останется лишнего
      return ensureSession(S.uploadedSig !== null || S.upFailed).then(function (sid) {
        var chain = Promise.resolve();
        parts.forEach(function (p, i) {
          chain = chain.then(function () {
            var lbl = 'Отправляю ' + WHAT + (parts.length > 1 ? ' (' + (i + 1) + ' из ' + parts.length + ')' : '') + '… ';
            return retrying(function (n) {
              show(n ? TXT.retry : lbl + Math.round(sent / total * 100) + '%', sent / total * 100); lastPct = -1;
              return xhrUpload(sid, [p], function (f) {
                var pct = (sent + f * p.blob.size) / total * 100;
                show(pct < 99 ? lbl + Math.round(pct) + '%' : p.kind === 'video' ? 'Проверяю видео…' : 'Проверяю…', pct);
              });
            }, function (n, of) {
              show(TXT.retry + ' (' + n + ' из ' + of + ')');
              primary('Пробуем ещё раз…', null, { active: false, progress: true });
              toast(TXT.retry, 4500);
              haptic.warn();
            }).then(function (d) {
              sent += p.blob.size || 0;
              got = got.concat((d && d.files) || []);
            });
          });
        });
        return chain.then(function () { return { files: got, _kb: Math.round(total / 1024) }; });
      });
    }).then(function (d) {
      var files = (d && d.files) || [];
      if (!files.length) throw apiErr('other', 'Сервер не принял ни одного файла. Попробуй другое фото или видео.');
      S.fotoIds = files.map(function (f) { return f.id; });
      S.uploadedSig = mySig; S.upFailed = false;
      prog.style.width = '100%'; txt.textContent = hasVid ? 'Фото и видео на месте' : 'Фото на месте';
      var nv = files.filter(function (f) { return f.kind === 'video'; }).length;
      track('upload', { photos: files.length - nv, videos: nv, kb: d._kb || null });
      haptic.ok();
      setTimeout(function () { S.busy = false; bar.hidden = true; startRender(); }, 350);
    }).catch(function (e) {
      S.busy = false; S.upFailed = true;   // часть файлов могла дойти — следующая попытка в новую сессию
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
        if (p >= 100) { clearInterval(t); res({ files: S.photos.filter(Boolean).map(function (i) { return { id: 'd' + i.uid, kind: i.kind || 'photo', name: i.name, duration_sec: i.dur || null }; }) }); }
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
      if (parts.length === 1 && parts[0].cid) fd.append('client_id', parts[0].cid);
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
  // 2. НИША: 9 групп → ниша
  // =====================================================
  function plainNisha(n) { return String(n.nazvanie || '').replace(/\s*\(.*?\)\s*/g, ' ').trim(); }
  var openGrp = 0;
  function renderNishi() {
    primary('Дальше', function () { if (S.nisha) go('imya'); }, { active: !!S.nisha });
    var box = $('#grpList');
    if (!S.kat) {
      box.innerHTML = '<div class="skel-row"></div><div class="skel-row"></div><div class="skel-row"></div>';
      loadKat().then(function () { if (cur === 'nisha') renderNishi(); })
        .catch(function (e) { toast(humanMsg(e), 6000); });
      return;
    }
    if (!openGrp && S.nisha) openGrp = (S.kat.gruppy.filter(function (g) { return g.nishi.indexOf(S.nisha) >= 0; })[0] || {}).nomer || 0;
    box.innerHTML = S.kat.gruppy.map(function (g) {
      var on = g.nomer === openGrp;
      return '<div class="grp' + (on ? ' open' : '') + '" role="listitem">' +
        '<button type="button" class="grp-h" data-g="' + g.nomer + '" aria-expanded="' + on + '"><b>' + esc(g.nazvanie) + '</b><small>' + g.nishi.length + ' ' + plural(g.nishi.length, ['ниша', 'ниши', 'ниш']) + '</small><i></i></button>' +
        '<div class="grp-b">' + g.nishi.map(function (nn) {
          var n = nishaBy(nn);
          return n ? '<button type="button" class="nchip' + (S.nisha === n.nomer ? ' on' : '') + '" data-n="' + n.nomer + '">' + esc(plainNisha(n)) + '</button>' : '';
        }).join('') + '</div></div>';
    }).join('');
    $$('.grp-h', box).forEach(function (b) {
      b.addEventListener('click', function () {
        var g = +b.getAttribute('data-g'); openGrp = openGrp === g ? 0 : g; haptic.pick(); renderNishi();
        var el = $('.grp.open', box); if (el) try { el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest' }); } catch (e) {}
      });
    });
    $$('.nchip', box).forEach(function (b) {
      b.addEventListener('click', function () {
        var n = +b.getAttribute('data-n');
        if (S.nisha !== n) { S.nisha = n; S.smysl = 0; S.scen = null; }
        haptic.pick(); track('nisha', { nisha: n });
        go('imya');
      });
    });
    var n = nishaBy(S.nisha);
    $('#nishaNote').textContent = n ? 'Выбрано: ' + plainNisha(n) + '. Можно выбрать другую.' : 'Нет твоей ниши — выбери ближайшую: смысл можно будет написать свой.';
  }

  // =====================================================
  // 3. СМЫСЛ: вау «завод знает нишу» + 3 смысла или свой
  // =====================================================
  var FMT_TAG = { oshibka: 'Ошибка', mif: 'Миф и правда', bylo_stalo: 'Было → стало', pochemu: 'Почему я этим занимаюсь', tri_veshchi: '3 вещи' };
  function renderSmysl() {
    var n = nishaBy(S.nisha);
    if (!n) { go('nisha', true); return; }
    if (imyaPusto().length) { go('imya', true); return; }
    var c = n.schet || {};
    $('#vauName').textContent = '«' + plainNisha(n) + '»';
    var items = [
      [c.boli, ['главная боль', 'главные боли', 'главных болей'], 'твоих клиентов'],
      [c.strahi, ['страх', 'страха', 'страхов'], 'из-за которых они не покупают'],
      [c.rubriki, ['рубрика', 'рубрики', 'рубрик'], 'и ' + ideiText((c.idei || 0) + (c.huki || 0)) + ' для роликов']
    ];
    $('#vauList').innerHTML = items.map(function (it, k) {
      return '<li style="animation-delay:' + (0.15 + k * 0.18) + 's"><b>' + it[0] + '</b> ' + plural(it[0], it[1]) + ' ' + it[2] + '</li>';
    }).join('');
    $('#vauBol').textContent = n.otkrytaya_bol || '';
    $('.vau-n-bol').hidden = !n.otkrytaya_bol;   // нет боли в данных (открытое демо) — блока нет
    $('#vauBlur').textContent = 'Ещё ' + Math.max(0, (c.boli || 1) - 1) + ' болей, страхи и возражения клиентов — внутри завода. Откроются в пробный день.';
    var html = n.smysly.map(function (sm, k) {
      var f = fmtBy(sm.format) || {};
      var on = S.smysl === k + 1;
      return '<button type="button" role="radio" aria-checked="' + on + '" class="smysl' + (on ? ' on' : '') + '" data-k="' + (k + 1) + '">' +
        '<span class="rd"></span><span class="sm-t"><b>' + esc(sm.nazvanie) + '</b><small>' + esc(cap(f.chto_poluchitsya || '')) + '</small>' +
        '<span class="sm-tag">' + esc(FMT_TAG[sm.format] || '') + '</span></span></button>';
    }).join('');
    html += '<button type="button" role="radio" aria-checked="' + (S.smysl === -1) + '" class="smysl svoj-b' + (S.smysl === -1 ? ' on' : '') + '" data-k="-1">' +
      '<span class="rd"></span><span class="sm-t"><b>Свой смысл</b><small>Напиши или надиктуй, о чём хочешь ролик</small></span></button>';
    $('#smysly').innerHTML = html;
    $$('.smysl').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = +b.getAttribute('data-k');
        if (S.smysl !== k) { S.smysl = k; S.scen = null; S.otvety = ['', '', '']; S.q = 0; }
        haptic.pick(); renderSmysl();
        if (k === -1) setTimeout(function () { $('#svojText').focus(); }, 150);
      });
    });
    $('#svojBox').hidden = S.smysl !== -1;
    $('#svojText').value = S.svoj;
    updSmyslBtn();
  }
  function cap(t) { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); }
  // как в документе: «30+ идей»; меньше десяти — точным числом с правильным окончанием
  function ideiText(n) { return n >= 10 ? Math.floor(n / 10) * 10 + '+ идей' : n + ' ' + plural(n, ['идея', 'идеи', 'идей']); }
  function updSmyslBtn() {
    var ok = S.smysl > 0 || (S.smysl === -1 && S.svoj.trim().split(/\s+/).filter(Boolean).length >= 2);
    primary(S.smysl === -1 ? 'Дальше — 3 вопроса' : 'Ответить на 3 вопроса', submitSmysl, { active: ok });
  }
  $('#svojText').addEventListener('input', function () { S.svoj = $('#svojText').value; S.format = ''; $('#svojFmt').textContent = ''; updSmyslBtn(); });
  function askYes(q) {
    return new Promise(function (res) {
      if (IN_TG && ver('6.2') && tg.showConfirm) { try { tg.showConfirm(q, function (ok) { res(!!ok); }); return; } catch (e) {} }
      res(window.confirm(q));
    });
  }
  function submitSmysl() {
    if (S.smysl > 0) { track('smysl', { nisha: S.nisha, smysl: S.smysl }); S.q = 0; go('voprosy'); return; }
    if (S.smysl !== -1 || S.busy) return;
    S.busy = true;
    primary('Подбираю формат…', null, { active: false, progress: true });
    api('/api/podobrat_format', { method: 'POST', json: { ideya: S.svoj } }).then(function (d) {
      S.busy = false;
      if (d.obshchee) {
        // идея слишком общая: один уточняющий вопрос и ближайший готовый смысл
        var near = (nishaBy(S.nisha).smysly || []).map(function (x, k) { return [x, k + 1]; }).filter(function (p) { return p[0].format === 'pochemu'; })[0];
        return askYes(d.vopros).then(function (yes) {
          if (!yes) { toast('Уточни идею: о чём ролик, что зритель должен понять?', 5000); $('#svojText').focus(); updSmyslBtn(); return; }
          if (near) { S.smysl = near[1]; S.scen = null; renderSmysl(); }
          else S.format = 'pochemu';
          S.q = 0; go('voprosy');
        });
      }
      S.format = d.format;
      $('#svojFmt').textContent = 'Формат: «' + ((fmtBy(d.format) || {}).nazvanie || '') + '» — завод дополнит его болями твоей ниши.';
      track('smysl', { nisha: S.nisha, smysl: 0, format: d.format });
      S.q = 0; go('voprosy');
    }).catch(function (e) { S.busy = false; toast(humanMsg(e), 6000); updSmyslBtn(); });
  }

  // =====================================================
  // 4. ТРИ ВОПРОСА ГОЛОСОМ
  // =====================================================
  // Вопросы — из карточки ниши (раздел 14 Базы смыслов); для «своего смысла» — 3 универсальных.
  // Голос: запись в приложении (MediaRecorder) → /api/golos → тот же распознаватель, что в чате
  // (faster-whisper на нашем сервере). Нет микрофона или распознавания — пишут текстом.
  function voprosy() {
    var n = nishaBy(S.nisha);
    if (S.smysl > 0 && n) return n.smysly[S.smysl - 1].voprosy;
    return (S.kat && S.kat.svoj_smysl.voprosy) || ['', '', ''];
  }
  var ZONE_HINT = {
    medicina: 'Без обещаний вылечить и диагнозов: лучше «стало легче», «улучшились показатели».',
    dengi: 'Без обещаний дохода и процентов: результат у каждого свой.',
    psihologiya: 'Результат — через ощущения и решения клиента, без обещаний изменить судьбу.'
  };
  function curFormat() { var n = nishaBy(S.nisha); return S.smysl > 0 && n ? n.smysly[S.smysl - 1].format : S.format; }
  function showQ() {
    var qs = voprosy(), k = Math.max(0, Math.min(2, S.q || 0));
    S.q = k;
    $('#qEyebrow').textContent = 'Шаг 3 из 5 · вопрос ' + (k + 1) + ' из 3';
    $('#qNum').textContent = pad2(k + 1);
    $('#qText').textContent = qs[k] || '';
    var n = nishaBy(S.nisha), hint = '';
    if (curFormat() === 'bylo_stalo' && k === 0) hint = 'Имя клиента можно не называть. Фото «до/после» — только с его согласия.';
    else if (n && ZONE_HINT[n.zona] && k === 2) hint = ZONE_HINT[n.zona];
    $('#qHint').hidden = !hint; $('#qHint').textContent = hint;
    $$('#qDots i').forEach(function (d, j) { d.classList.toggle('on', j === k); d.classList.toggle('past', j < k); });
    var ta = $('#otvet');
    ta.value = S.otvety[k] || '';
    grow(ta);
    var card = $('#qCard'); card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    recUi();
    updQBtn();
  }
  function saveOtvet() { if (cur === 'voprosy' || $('#otvet')) S.otvety[S.q || 0] = $('#otvet').value; }
  function updQBtn() {
    var ok = $('#otvet').value.trim().split(/\s+/).filter(Boolean).length >= 2;
    primary(S.q < 2 ? 'Следующий вопрос' : 'Собрать сценарий', nextQ, { active: ok && !rec.on && !rec.busy });
  }
  $('#otvet').addEventListener('input', function () { grow($('#otvet')); S.otvety[S.q] = $('#otvet').value; updQBtn(); });
  function nextQ() {
    saveOtvet();
    if (S.q < 2) { S.q++; haptic.tap(); showQ(); window.scrollTo(0, 0); return; }
    track('otvety', { nisha: S.nisha, smysl: S.smysl, golos: rec.used });
    buildScen();
  }
  function grow(ta) { ta.style.height = 'auto'; ta.style.height = Math.max(ta.scrollHeight, 96) + 'px'; }
  function pad2(n) { return ('0' + n).slice(-2); }

  // ---- запись голоса ----
  var rec = { on: false, busy: false, mr: null, chunks: [], t0: 0, tick: 0, target: 'otvet', used: 0, avail: null };
  function recSupported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); }
  function recUi() {
    var b = $('#recBtn');
    b.classList.toggle('on', rec.on); b.classList.toggle('busy', rec.busy);
    $('#recLbl').textContent = rec.busy ? 'Распознаю…' : rec.on ? 'Говори — я слушаю' : 'Ответить голосом';
    $('#recSub').textContent = rec.busy ? 'Пара секунд — и текст появится ниже' : rec.on ? 'Нажми ещё раз, когда закончишь' : 'Нажми и говори. Ещё раз — стоп';
    $('#recTime').hidden = !rec.on;
    if (rec.avail === false) { b.hidden = true; $('#otvetNote').textContent = 'голос сейчас недоступен — напиши текстом'; }
  }
  api('/api/golos', { quiet: true, retry: false }).then(function (d) { rec.avail = !!(d && d.dostupen) && (DEMO || recSupported()); recUi(); })
    .catch(function () { rec.avail = DEMO || false; recUi(); });
  function pickMime() {
    var c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    for (var i = 0; i < c.length; i++) try { if (MediaRecorder.isTypeSupported(c[i])) return c[i]; } catch (e) {}
    return '';
  }
  function startRec(target) {
    rec.target = target || 'otvet';
    if (DEMO && !recSupported()) { rec.on = true; rec.t0 = Date.now(); tickRec(); recUi(); updQBtn(); return; }
    if (!recSupported()) { toast('Запись голоса здесь не поддерживается — напиши ответ текстом.', 5000); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var mime = pickMime();
      var mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.mr = mr; rec.chunks = []; rec.on = true; rec.t0 = Date.now();
      mr.ondataavailable = function (e) { if (e.data && e.data.size) rec.chunks.push(e.data); };
      mr.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        if (rec.cancel) { rec.cancel = false; return; }
        sendRec(new Blob(rec.chunks, { type: mr.mimeType || mime || 'audio/webm' }));
      };
      mr.start();
      haptic.frame(); tickRec(); recUi(); updQBtn();
    }).catch(function () {
      rec.avail = rec.avail;
      toast('Нет доступа к микрофону. Разреши его в настройках Telegram или напиши ответ текстом.', 6500);
    });
  }
  function tickRec() {
    clearTimeout(rec.tick);
    if (!rec.on) return;
    var s = Math.floor((Date.now() - rec.t0) / 1000);
    $('#recTime').textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
    if (s >= 170) { stopRec(); return; }      // сервер принимает до VOICE_MAX_SEC (180 с)
    rec.tick = setTimeout(tickRec, 500);
  }
  function stopRec(cancel) {
    clearTimeout(rec.tick);
    if (!rec.on) return;
    rec.on = false;
    if (cancel) rec.cancel = true;
    if (rec.mr) { try { rec.mr.stop(); } catch (e) {} rec.mr = null; }
    else if (!cancel && DEMO) sendRec(null);
    recUi(); if (cur === 'voprosy') updQBtn();
  }
  function sendRec(blob) {
    rec.busy = true; recUi(); if (cur === 'voprosy') updQBtn();
    var p;
    if (DEMO) p = MOCK.golos();
    else {
      var fd = new FormData();
      var ext = /mp4/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
      fd.append('audio', blob, 'otvet.' + ext);
      p = fetch('/api/golos', { method: 'POST', headers: { 'X-Tg-Init-Data': (tg && tg.initData) || '' }, body: fd })
        .then(function (r) { return r.text().then(function (t) { return parseReply(r.status, t); }); }, function () { throw apiErr('net'); });
    }
    p.then(function (d) {
      var t = String((d && d.text) || '').trim();
      if (!t) throw apiErr('other', 'Не расслышал. Попробуй ещё раз, ближе к телефону, или напиши текстом.');
      rec.used++;
      if (rec.target === 'svoj') {
        S.svoj = (S.svoj ? S.svoj.trim() + ' ' : '') + t; $('#svojText').value = S.svoj; updSmyslBtn();
      } else {
        var ta = $('#otvet');
        ta.value = (ta.value.trim() ? ta.value.trim() + ' ' : '') + t;
        S.otvety[S.q] = ta.value; grow(ta);
      }
      haptic.ok();
    }).catch(function (e) { haptic.err(); toast(humanMsg(e, 'Не получилось разобрать запись. Попробуй ещё раз или напиши текстом.'), 6000); })
      .then(function () { rec.busy = false; recUi(); if (cur === 'voprosy') updQBtn(); });
  }
  $('#recBtn').addEventListener('click', function () { if (rec.busy) return; haptic.tap(); rec.on ? stopRec() : startRec('otvet'); });
  $$('[data-rec]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (rec.busy) return; haptic.tap();
      if (rec.on) { stopRec(); b.classList.remove('on'); return; }
      startRec(b.getAttribute('data-rec')); b.classList.add('on');
      if (DEMO) setTimeout(function () { stopRec(); b.classList.remove('on'); }, 1200);
    });
  });

  // =====================================================
  // 4б. СЦЕНАРИЙ: что получилось из ответов (сервер собирает правилами, без нейросети)
  // =====================================================
  function scenBody() {
    var b = { nisha: S.nisha, smysl: S.smysl > 0 ? S.smysl : 0, otvety: S.otvety.slice() };
    if (S.smysl <= 0) { b.svoj_smysl = S.svoj; if (S.format) b.format = S.format; }
    return b;
  }
  function buildScen() {
    var body = scenBody(), sigNow = JSON.stringify(body);
    if (S.scen && S.scenSig === sigNow) { go('scenarij'); return; }
    if (S.busy) return;
    S.busy = true;
    primary('Собираю сценарий…', null, { active: false, progress: true });
    api('/api/scenarij', { method: 'POST', json: body }).then(function (d) {
      S.busy = false; S.scen = d; S.scenSig = sigNow;
      S.shagi = d.shagi.map(function (x) { return { nazvanie: x.nazvanie, tekst: x.tekst }; });
      haptic.ok(); go('scenarij');
    }).catch(function (e) { S.busy = false; haptic.err(); toast(humanMsg(e), 6500); updQBtn(); });
  }
  function renderScen() {
    var d = S.scen;
    if (!d) { go('voprosy', true); return; }
    $('#scenFmt').innerHTML = '<span class="sm-tag">' + esc(FMT_TAG[d.format] || d.format_nazvanie || '') + '</span><span class="scen-n">' + esc(d.nisha || '') + '</span>';
    var z = $('#scenZag');
    if (!z.value || z.getAttribute('data-sig') !== S.scenSig) { z.value = d.zagolovok; z.setAttribute('data-sig', S.scenSig); }
    $('#scenZagCnt').textContent = z.value.length + '/44';
    var ol = $('#scenShagi'); ol.innerHTML = '';
    S.shagi.forEach(function (s, k) {
      var li = document.createElement('li');
      li.className = 'shag';
      li.innerHTML = '<span class="n">' + pad2(k + 1) + '</span>' +
        '<input maxlength="' + LEN_T + '" aria-label="Название этапа ' + (k + 1) + '">' +
        '<textarea rows="1" maxlength="' + LEN_P + '" aria-label="Текст этапа ' + (k + 1) + '"></textarea>';
      var inp = li.querySelector('input'), ta = li.querySelector('textarea');
      inp.value = s.nazvanie; ta.value = s.tekst;
      inp.addEventListener('input', function () { s.nazvanie = inp.value; li.classList.remove('miss'); });
      ta.addEventListener('input', function () { s.tekst = ta.value; li.classList.remove('miss'); growS(ta); });
      ol.appendChild(li);
      setTimeout(function () { growS(ta); }, 0);
    });
    var zm = d.pochemu_zameny || [];
    $('#zameny').hidden = !zm.length;
    $('#zameny').innerHTML = zm.length ? '<b>Мы смягчили формулировки</b>' + zm.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') : '';
  }
  function growS(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
  $('#scenZag').addEventListener('input', function () { $('#scenZagCnt').textContent = $('#scenZag').value.length + '/44'; });
  function submitScen() {
    var bad = [];
    S.shagi.forEach(function (s, k) { s.nazvanie = (s.nazvanie || '').trim(); s.tekst = (s.tekst || '').trim(); if (!s.nazvanie || !s.tekst) bad.push(k); });
    if (bad.length) {
      haptic.warn();
      var lis = $$('.shag', $('#scenShagi'));
      bad.forEach(function (k) { if (lis[k]) lis[k].classList.add('miss'); });
      toast('У каждого этапа нужно название и текст.');
      return;
    }
    if (!$('#scenZag').value.trim()) { toast('Нужна первая фраза — хук.'); $('#scenZag').focus(); return; }
    go('oformlenie');
  }

  // =====================================================
  // ШАГ 2. ИМЯ И НИК: имя — в титры и подпись, ник — в соцсетях. Без обоих дальше не пускаем
  // =====================================================
  var fImya = $('#imya'), fNik = $('#nik');
  fNik.addEventListener('blur', function () { fNik.value = normNik(fNik.value); titr(); });
  [fImya, fNik].forEach(function (inp, k, arr) {
    inp.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (arr[k + 1]) arr[k + 1].focus(); else { inp.blur(); if (cur === 'imya') submitImya(); }
    });
    inp.addEventListener('input', function () { inp.classList.remove('bad'); titr(); if (cur === 'imya') updImyaBtn(); });
  });
  function imyaPusto() {
    return [[fImya, 'имя'], [fNik, 'ник']].filter(function (p) { return !p[0].value.trim().replace(/^@+$/, ''); });
  }
  function titr() {
    $('#titrImya').textContent = fImya.value.trim() || 'Твоё имя';
    $('#titrNik').textContent = normNik(fNik.value) || '@nik';
  }
  function updImyaBtn() {
    var gotovo = !imyaPusto().length;
    if (gotovo) $('#imyaNote').classList.remove('bad');
    primary('Дальше — тема ролика', submitImya, { active: gotovo });
  }
  function renderImya() {
    if (!S.nisha) { go('nisha', true); return; }
    titr(); updImyaBtn();
  }
  // возвращает true, если имя и ник есть; иначе подсвечивает пустые поля и объясняет, зачем они
  function proveritImya() {
    fNik.value = normNik(fNik.value);
    var miss = imyaPusto();
    if (!miss.length) return true;
    haptic.warn();
    miss.forEach(function (p) { p[0].classList.add('bad'); });
    $('#imyaNote').classList.add('bad');
    toast('Заполни: ' + miss.map(function (p) { return p[1]; }).join(' и ') + ' — ими подпишем ролик.');
    return false;
  }
  function submitImya() {
    if (!proveritImya()) { var m = imyaPusto(); if (m.length) m[0][0].focus(); return; }
    $('#imyaNote').classList.remove('bad');
    track('imya', { nik: true });
    go('smysl');
  }
  function normNik(v) {
    v = String(v || '').trim();
    if (!v) return '';
    // вставили ссылку на профиль — берём имя из неё
    var m = v.match(/(?:instagram\.com|t\.me|vk\.com|youtube\.com|tiktok\.com)\/@?([A-Za-z0-9_.]+)/i);
    if (m) v = m[1];
    v = v.replace(/\s+/g, '');
    return v.charAt(0) === '@' ? v : '@' + v;
  }
  function submitOform() {
    // имя и ник — шаг 2; если их как-то нет (стёрли, прыжок на экран) — возвращаем туда, остальное сохранено
    if (!proveritImya()) { go('imya', true); return; }
    uploadPhotos();
  }

  // =====================================================
  // 5. ЦВЕТ И РИТМ ПОДПИСЕЙ
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
  function applyStyleLook() {}

  // ---------- ПОЧТА: один ролик-подарок на почту (lid_bot/docs/ОДИН_РАЗ_НА_ПОЧТУ.md) ----------
  // Сервер говорит, включена ли проверка (GET /api/pochta). Выключена — экрана нет вовсе.
  var POCHTA = { vklyuchena: false, nuzhna: false, podtverzhdena: false, podarok_byl: false, kod_min: 15, soglasie_url: '', politika_url: '' };
  var pVid = 'adres';   // adres | kod | byl
  function loadPochta() {
    return api('/api/pochta', { quiet: true, retry: false }).then(function (d) {
      if (d && typeof d === 'object') for (var k in d) POCHTA[k] = d[k];
      return POCHTA;
    }).catch(function () { return POCHTA; });
  }
  loadPochta();
  function pochtaShow(vid) {
    pVid = vid;
    $('#pAdresBox').hidden = vid !== 'adres';
    $('#pKodBox').hidden = vid !== 'kod';
    $('#pBylBox').hidden = vid !== 'byl';
    $('#h-pochta').innerHTML = vid === 'byl' ? 'Подарок <em>уже был</em>' : 'Куда прислать <em>код</em>';
    if (vid === 'adres') primary('Прислать код', pochtaZapros);
    else if (vid === 'kod') primary('Подтвердить', pochtaKod);
    else primary('Посмотреть тарифы', goZavod);
  }
  function renderPochta() { $('#pDemo').hidden = !DEMO; pochtaShow(POCHTA.podarok_byl ? 'byl' : pVid === 'kod' ? 'kod' : 'adres'); }
  function pochtaZapros() {
    var adres = $('#pAdres').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adres)) { haptic.warn(); toast('Проверь адрес почты — похоже, в нём опечатка.'); return; }
    if (!$('#pSogl').checked) {
      haptic.warn(); toast('Отметь согласие на обработку почты.');
      var cb = $('#pSoglBox'); cb.classList.remove('shake'); void cb.offsetWidth; cb.classList.add('shake');
      return;
    }
    primary('Отправляю…', null, { active: false, progress: true });
    api('/api/pochta', { method: 'POST', json: { adres: adres, soglasie: true }, retry: false }).then(function (d) {
      haptic.ok(); track('pochta_kod');
      $('#pKodLead').textContent = 'Отправили код на ' + (d.adres || adres) + '. Он действует ' + (d.kod_min || 15) + ' минут — проверь и папку «Спам».';
      $('#pKod').value = '';
      pochtaShow('kod');
      try { $('#pKod').focus(); } catch (e) {}
    }).catch(function (e) {
      haptic.err(); toast(humanMsg(e, 'Не получилось отправить письмо. Попробуй через минуту.'), 6000);
      pochtaShow(pVid);
    });
  }
  function pochtaKod() {
    var kod = $('#pKod').value.replace(/\D/g, '');
    if (kod.length !== 6) { haptic.warn(); toast('Код — это 6 цифр из письма.'); return; }
    primary('Проверяю…', null, { active: false, progress: true });
    api('/api/pochta/kod', { method: 'POST', json: { kod: kod }, retry: false }).then(function (d) {
      for (var k in d) POCHTA[k] = d[k];
      track('pochta_ok', { podarok_byl: !!d.podarok_byl });
      if (d.podarok_byl) { haptic.warn(); pochtaShow('byl'); return; }
      haptic.ok(); toast('Почта подтверждена ✅', 2500);
      primary('Собрать ролик', submitOform);
      startRender();
    }).catch(function (e) {
      haptic.err(); toast(humanMsg(e, 'Код не подошёл. Попробуй ещё раз.'), 6000);
      var k = e && e.data && e.data.kod;
      if (k === 'konchilis' || k === 'istek' || k === 'net') $('#pKod').value = '';
      pochtaShow('kod');
    });
  }
  $('#pResend').addEventListener('click', function () { haptic.tap(); pochtaZapros(); });
  $('#pDrugoj').addEventListener('click', function () { haptic.tap(); pochtaShow('adres'); try { $('#pAdres').focus(); } catch (e) {} });
  $('#pSogl').addEventListener('change', function () { $('#pSoglBox').classList.toggle('ok', $('#pSogl').checked); haptic.pick(); });
  $('#pSoglLink').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); openExt(POCHTA.soglasie_url || POLICY_URL, 'согласие на обработку данных'); });
  $('#pPolLink').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); openExt(POCHTA.politika_url || POLICY_URL, 'политика обработки данных'); });

  function startRender() {
    if (S.busy) return;
    if (POCHTA.nuzhna && !POCHTA.podtverzhdena) { go('pochta'); return; }   // почта — до сборки
    // «первый ролик»: сервер сам соберёт этапы из ответов (pervyj); shagi и zagolovok — правки человека
    var payload = {
      imya: fImya.value.trim(),
      nik: normNik(fNik.value),
      zagolovok: $('#scenZag').value.trim() || null,
      pervyj: scenBody(),
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
      track('render_start', { nisha: S.nisha, smysl: S.smysl, format: S.scen && S.scen.format, photos: payload.foto_ids.length, cvet: payload.cvet, golos: rec.used, style: payload.style || null });
      go('build');            // монтаж и прогрев; ролик открывается сам, как только готов
      poll();
    }).catch(function (e) {
      S.busy = false;
      var pv = e && e.data && e.data.pochta;
      if (pv === 'nuzhna') { POCHTA.nuzhna = true; POCHTA.podtverzhdena = false; pVid = 'adres'; go('pochta'); return; }
      if (pv === 'ispolzovana') { POCHTA.podarok_byl = true; haptic.warn(); go('pochta'); return; }
      haptic.err();
      toast(humanMsg(e, 'Не получилось запустить сборку. Попробуй ещё раз.'), 7000);
      primary('Собрать ролик', submitOform);
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
    if (p < 15) return prepWord();
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
  var VAU_KEYS = ['preview', 'story_url', 'rerender_left', 'post_text', 'stats'];
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
    shown = 0; target = 0; drawP(); lastStage = ''; $('#stageText').textContent = prepWord();
    var u = S.photos.filter(function (p) { return p && !p.broken; }).map(function (p) { return p.url; });
    if (!u.length) u = ['img/demo_v.webp'];
    var arr = [];
    while (arr.length < 10) arr = arr.concat(u);
    arr = arr.concat(arr); // дубль — для бесшовной ленты
    $('#belt').innerHTML = arr.map(function (x) { return '<div><img alt="" src="' + x + '"></div>'; }).join('');
  }

  // Экраны ожидания — документ, «Экраны ожидания: пока монтируется ролик»: 8 экранов по 12–15 с,
  // одна возможность завода на экран, в шестом — ниша человека. Затянулся монтаж (>2 мин) — «Почти готово».
  var WARM_IC = [
    '<svg viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10 9l5 3-5 3z"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/></svg>',
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4"/><path d="M4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5"/></svg>',
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>',
    '<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="11" height="12" rx="2"/><rect x="15.5" y="4" width="6" height="7" rx="1.5"/><rect x="15.5" y="13" width="6" height="7" rx="1.5"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M4 4.5h7a2 2 0 012 2V20a2 2 0 00-2-2H4zM20 4.5h-7a2 2 0 00-2 2V20a2 2 0 012-2h7z"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M5 12.5l4 4 10-10"/></svg>'
  ];
  var WARM_MS = REDUCED ? 15000 : 13000, POCHTI_MS = 120000;
  var warmI = 0, warmT = 0, warmStart = 0, WARM = [];
  // к каждому из 8 экранов документа — пример настоящего поста (выгода видна, а не только написана)
  var WARM_PIC = ['r_podarok', 'r_zavod_pomnit', 'r_storis', 'k_premium_red', 'r_vozrazheniya', 'k_redaktura', 'k_marker', 'k_kadr'];
  // в документе часть строк на «вы»; в мини-приложении — на «ты» (брендбук)
  function naTy(t) {
    // без \b: в JavaScript граница слова не видит кириллицу
    return String(t || '').replace(/Ваш ролик/g, 'Твой ролик').replace(/ваш ролик/g, 'твой ролик')
      .replace(/проверьте уведомления/g, 'проверь уведомления');
  }
  function fillWarm() {
    var n = nishaBy(S.nisha), name = n ? plainNisha(n).toLowerCase() : 'твоя ниша';
    WARM = ((S.kat && S.kat.ekrany_ozhidaniya) || []).map(function (e, k) {
      return { ic: WARM_IC[k % WARM_IC.length], pic: WARM_PIC[k] || '', t: naTy(e.zagolovok), p: naTy(String(e.tekst).replace('{ниша}', name)) };
    });
    if (!WARM.length) WARM = [{ ic: WARM_IC[0], pic: 'r_podarok', t: 'Твой ролик уже собирается', p: 'Пока идёт монтаж — покажем, что умеет Контент-завод.' }];
    $('#warm').innerHTML = WARM.map(function (w) {
      var vis = w.pic ? '<img alt="" loading="lazy" src="img/primery/' + w.pic + '.webp">' : w.ic;
      return '<div class="wcard"><div class="wimg">' + vis + '</div><div><b>' + esc(w.t) + '</b><p>' + esc(w.p) + '</p></div></div>';
    }).join('');
    $('#warmDots').innerHTML = WARM.map(function () { return '<i></i>'; }).join('');
  }
  $('#warm').addEventListener('click', function () { showWarm(warmI + 1); restartWarm(); haptic.tap(); });
  function showWarm(i) {
    warmI = (i + WARM.length) % WARM.length;
    $$('.wcard').forEach(function (c, k) { c.classList.toggle('on', k === warmI); });
    $$('#warmDots i').forEach(function (c, k) { c.classList.toggle('on', k === warmI); });
    $('#warmH').textContent = warmStart && Date.now() - warmStart > POCHTI_MS ? naTy((S.kat && S.kat.pochti_gotovo) || 'Почти готово.') : 'Пока идёт монтаж';
  }
  function restartWarm() { clearInterval(warmT); warmT = setInterval(function () { showWarm(warmI + 1); }, WARM_MS); }
  function startWarm() { if (!WARM.length || $('#warm').getAttribute('data-n') !== String(S.nisha)) { fillWarm(); $('#warm').setAttribute('data-n', String(S.nisha)); } warmStart = Date.now(); showWarm(0); restartWarm(); renderTarify(); }
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
  function canPlay(f) { return !!urlOf(f); }

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
    renderTarify(); $('#tarCmp').open = Q.get('dalshe') === 'tarify';
    // одна главная кнопка экрана — видна всегда (совет директоров 04.10, пункт 2)
    primary('Подключить завод', goZavod);
    $$('[data-screen="done"] .rv').forEach(function (el) { el.classList.remove('on'); });
    observeReveal();
  }

  // форматы: невыгруженные прячем (все выгруженные открыты сразу — без условий подписки)
  function renderFormats() {
    $('#lDl').hidden = !FORMATS.some(urlOf);
    $$('#fmtTabs button').forEach(function (b) { b.hidden = !canPlay(b.getAttribute('data-fmt')); });
    $('#fmtTabs').hidden = FORMATS.filter(canPlay).length < 2;
  }

  // ссылка внутри Telegram — в Telegram; в демо — подсказка
  function openTg(url, what) {
    if (DEMO && !SIM) { toast('Демо: здесь откроется ' + what + ' — ' + url, 4500); return; }
    if (TGX && /^https:\/\/t\.me\//.test(url) && TGX.openTelegramLink) { try { TGX.openTelegramLink(url); return; } catch (e) {} }
    openExt(url, what);
  }

  function showVau() {
    var v = S.vau;
    // до/после: его портрет → кадр первого шага (на нём его лицо). Сервер помечает кадры kind/step;
    // старый ответ без пометок — берём третий кадр раскадровки, как раньше
    var me = S.photos[0] && !S.photos[0].broken ? S.photos[0].url : '';
    var pv = S.preview || [];
    var first = pv.filter(function (x) { return x.kind === 'step' && Number(x.step) === 1; })[0];
    var after = first ? first.url : pv.length ? pv[Math.min(2, pv.length - 1)].url : '';
    $('#baBox').hidden = !(me && after);
    if (me && after) { $('#baBeforeImg').src = me; $('#baAfter').src = after; $('#baTagL').textContent = S.photos[0].kind === 'video' ? 'Было: видео' : 'Было: фото'; baIntro(); }

    var post = typeof v.post_text === 'string' ? v.post_text.trim() : '';
    $('#postBox').hidden = !post;
    $('#postText').textContent = post;
    $('#copyBtn').classList.remove('done'); $('#copyLbl').textContent = 'Скопировать текст';

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

  // ---------- полноэкранный просмотр (свой и галерея) ----------
  // Telegram 8.0+ — ещё и настоящий полный экран приложения; без него — просто плеер на всё окно
  var fsByUs = false;
  function openTheater(src, cap, t) {
    if (!src) return;
    var th = $('#theater'), v = $('#thVideo');
    video.pause();
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
    if (cur === 'done') playVid(video);
  }
  $('#thClose').addEventListener('click', function () { haptic.tap(); closeTheater(); });
  $('#fsBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    track('fullscreen');
    openTheater(abs(urlOf(S.fmt) || video.currentSrc || ''), 'Твой ролик', video.currentTime);
  });

  // ---------- примеры: рилсы и карусели в разных стилях (img/primery, собраны lid_bot/data/sdelat_primery.py) ----------
  // Всё — настоящие опубликованные посты из банка шаблонов и рилсов завода; первый рилс — ролик-подарок,
  // такой же соберётся у человека (играет по нажатию).
  var PRIMERY = {
    rils: [
      { f: 'r_podarok', t: 'Ролик-подарок', s: 'из фото — как твой', video: 'primer/example.mp4' },
      { f: 'r_zavod_pomnit', t: 'Разговорный', s: 'смысл и субтитры' },
      { f: 'r_vozrazheniya', t: 'Экспертный', s: 'возражения клиентов' },
      { f: 'r_voprosy', t: 'Польза', s: 'ответы на вопросы' },
      { f: 'r_storis', t: 'Из выступления', s: 'идея для сторис' },
      { f: 'r_marshrut', t: 'Совет', s: 'по шагам' },
      { f: 'r_otchet', t: 'Разбор', s: 'с готовым шаблоном' }
    ],
    kar: [
      { f: 'k_premium_orange', t: 'Премиум-фото' }, { f: 'k_beton', t: 'Бетон' }, { f: 'k_redaktura', t: 'Редактура' },
      { f: 'k_stiker', t: 'Стикер' }, { f: 'k_lyubov', t: 'Любовь' }, { f: 'k_zhurnal', t: 'Журнал' },
      { f: 'k_replika', t: 'Реплика' }, { f: 'k_kadr', t: 'Кадр' }, { f: 'k_marker', t: 'Маркер' },
      { f: 'k_premium_red', t: 'Премиум-фото · красный' }, { f: 'k_razvilka', t: 'Развилка' }, { f: 'k_zhurnal_slajd', t: 'Журнал · слайд' }
    ]
  };
  function renderPrimery() {
    if ($('#prRils').children.length) return;
    $('#prRils').innerHTML = PRIMERY.rils.map(function (x, k) {
      return '<button type="button" class="pr rils' + (x.video ? ' play' : '') + '" role="listitem" data-k="' + k + '"' + (x.video ? '' : ' tabindex="-1"') + '>' +
        '<span class="pr-i"><img alt="" loading="lazy" src="img/primery/' + x.f + '.webp">' + (x.video ? '<i></i>' : '') + '</span>' +
        '<span class="pr-c"><b>' + esc(x.t) + '</b><small>' + esc(x.s) + '</small></span></button>';
    }).join('');
    $('#prKar').innerHTML = PRIMERY.kar.map(function (x) {
      return '<div class="pr kar" role="listitem"><span class="pr-i"><img alt="Карусель в стиле «' + esc(x.t) + '»" loading="lazy" src="img/primery/' + x.f + '.webp"></span><span class="pr-c"><b>' + esc(x.t) + '</b></span></div>';
    }).join('');
    $('#prKarN').textContent = PRIMERY.kar.length + ' ' + plural(PRIMERY.kar.length, ['пример', 'примера', 'примеров']) + ' стилей';
    $$('#prRils .pr.play').forEach(function (b) {
      b.addEventListener('click', function () { var x = PRIMERY.rils[+b.getAttribute('data-k')]; track('primer_view'); openTheater(abs(x.video), 'Пример: ролик-подарок из фото'); });
    });
  }

  var offerVisible = false, io = null;
  function observeReveal() {
    if (!('IntersectionObserver' in window)) { $$('.rv').forEach(function (el) { el.classList.add('on'); }); return; }
    if (io) io.disconnect();
    io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (e.isIntersecting) e.target.classList.add('on');
        if (e.target.classList.contains('offer')) {
          offerVisible = e.isIntersecting;
        }
      });
    }, { threshold: 0.18 });
    $$('[data-screen="done"] .rv').forEach(function (el) { io.observe(el); });
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
  // ---------- «Что дальше» под роликом (поручение владельца 03.10): не сайт, а следующий шаг ----------
  // Тарифы и лимиты — решение владельца 03.10 (как в пульте zavod/mock.js); «Сутки» = пробный день, цена дня —
  // с сервера (TRIAL_DAY_PRICE). Что входит и что нет — по матрице server/pay/tarify_matrica.json (ветка srv-tarify,
  // ЧЕРНОВИК: решено только «в Старте аналитики нет, она начинается с Про»). Поменяется матрица — править здесь.
  // Интенсив и «под ключ» здесь не продаём; ТикТок не упоминаем.
  var TARIFY = [
    { id: 'day', name: 'Сутки', what: 'Пробный день: попробовать завод в деле', price: 990, per: ' / 24 часа',
      v: { reels: '1', car: '3', kniga: 1, anim: 0, analit: 0, bot: 0, prof: '1 (личный)', call: 0 } },
    { id: 'start', name: 'Старт', what: 'Чтобы выходить регулярно, без пропусков', price: 9990, per: ' / мес',
      v: { reels: '10', car: '20', kniga: 1, anim: 0, analit: 0, bot: 0, prof: '1 (личный)', call: 0 } },
    { id: 'pro', name: 'Про', what: 'Почти каждый день — и рилсы, и карусели', price: 19990, per: ' / мес', sovet: true,
      v: { reels: '30', car: '40', kniga: 1, anim: 0, analit: 'базовая', bot: 0, prof: '1 (личный)', call: 0 } },
    { id: 'max', name: 'Максимум', what: 'Несколько выходов каждый день во все подключённые соцсети', price: 29990, per: ' / мес',
      v: { reels: '60', car: '90', kniga: 1, anim: 1, analit: 'по твоим прошлым постам', bot: '2', prof: '2 (личный и бизнес)', call: 0 } },
    { id: 'unpack', name: 'Личная распаковка', what: 'Живой созвон с Валерией и командой — книга смыслов вместе с тобой', price: 39990, per: ' разово',
      v: { reels: 0, car: 0, kniga: 'собираем вместе', anim: 0, analit: 0, bot: 0, prof: 0, call: 1 } }
  ];
  var TAR_ROWS = [
    ['reels', 'Рилсы (считаем опубликованные)'], ['car', 'Карусели (считаем опубликованные)'],
    ['kniga', 'Книга смыслов и знание твоей ниши'], ['anim', 'Анимированные карусели'],
    ['analit', 'Аналитика'], ['bot', 'Свой бот для соцсетей'], ['prof', 'Профили соцсетей'],
    ['call', 'Личный созвон с Валерией и командой']
  ];
  var ME = { admin: false, free_left: null, job_id: null, nisha: null, trial_day_price: 990 };
  function rubs(n) { return fmtN(n) + ' ₽'; }
  var ICON_DA = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var ICON_NET = '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>';
  function tarCard(t, knopka) {
    var rows = TAR_ROWS.map(function (r) {
      var x = t.v[r[0]], da = !!x;
      var val = typeof x === 'string' ? x : da ? 'входит' : (r[0] === 'bot' && t.id !== 'unpack' ? 'докупается отдельно' : 'не входит');
      return '<li class="' + (da ? 'da' : 'net') + '"><i>' + (da ? ICON_DA : ICON_NET) + '</i><span>' + esc(r[1]) + '</span><b>' + esc(val) + '</b></li>';
    }).join('');
    return '<details class="tar' + (t.sovet ? ' sovet' : '') + '" data-tar="' + t.id + '"' + (t.sovet ? ' open' : '') + '>' +
      '<summary><span class="tar-n"><b>' + esc(t.name) + '</b>' + (t.sovet ? '<em>Советуем</em>' : '') + '<small>' + esc(t.what) + '</small></span>' +
      '<span class="tar-c">' + rubs(t.price) + '<small>' + esc(t.per) + '</small></span></summary>' +
      '<ul class="tar-v">' + rows + '</ul>' +
      (knopka ? '<button type="button" class="btn ' + (t.sovet ? '' : 'ghost ') + 'block sm tar-go" data-go="' + t.id + '">' +
        (t.id === 'day' ? 'Начать с пробного дня' : t.id === 'unpack' ? 'Записаться на распаковку' : 'Подключить «' + esc(t.name) + '»') + '</button>' : '') +
      '</details>';
  }
  function renderTarify() {
    TARIFY[0].price = ME.trial_day_price || TARIFY[0].price;
    // на монтаже — только сравнение (уходить со сборки не зовём), под роликом — с кнопками
    $('#tarBuild').innerHTML = TARIFY.map(function (t) { return tarCard(t, false); }).join('');
    $('#tarDone').innerHTML = TARIFY.map(function (t) { return tarCard(t, true); }).join('');
    $$('#tarDone .tar-go').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-go');
        haptic.tap(); track('click_tarif', { tarif: id });
        location.href = zavodUrl('#/intro', id);
      });
    });
    $$('.tar').forEach(function (d) { d.addEventListener('toggle', function () { if (d.open) { haptic.pick(); track('tarif_open', { tarif: d.getAttribute('data-tar') }); } }); });
    $('#denPrice').textContent = rubs(TARIFY[0].price);
  }
  $('#lTar').addEventListener('click', function () {
    haptic.tap(); track('click_tarify');
    var d = $('#tarCmp'); d.open = true;
    $$('[data-screen="done"] .rv').forEach(function (el) { el.classList.add('on'); });
    try { d.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' }); } catch (e) {}
  });
  // новый ролик: та же ниша, другой смысл; фото и имя остаются
  function novyjRolik() {
    S.smysl = 0; S.svoj = ''; S.format = ''; S.otvety = ['', '', '']; S.q = 0; S.scen = null; S.scenSig = '';
    S.job = null; S.urls = null; S.vau = {}; S.preview = [];
    loadKat().then(function () { go(S.nisha ? 'smysl' : 'nisha'); });
  }

  // ---------- тестовый режим (LID_ADMIN_IDS): пометка и «Начать заново»; обычным людям не виден ----------
  function showTestMode() {
    if (!ME.admin || $('#testMode')) return;
    var el = document.createElement('div');
    el.className = 'test-mode'; el.id = 'testMode';
    el.innerHTML = '<span>Тестовый режим · без лимита</span><button type="button" id="testReset">Начать заново</button>';
    document.body.appendChild(el);
    $('#testReset').addEventListener('click', function () {
      askYes('Стереть твои ролики и начать путь заново? Это только для тебя.').then(function (ok) {
        if (!ok) return;
        api('/api/admin/reset', { method: 'POST', json: {} }).then(function () {
          toast('Готово — начинаем заново.');
          try { history.replaceState(null, '', location.pathname + (DEMO ? '?demo=1&admin=1' : '')); } catch (e) {}
          setTimeout(function () { location.reload(); }, 600);
        }).catch(function (e) { toast(humanMsg(e), 6000); });
      });
    });
  }

  // Коробочную версию в боте не продвигаем (правило 03.10: дорабатываем только сервер 2.0)
  // «Подключить завод» — пульт завода в этом же приложении (zavod/), без перехода в браузер
  function zavodUrl(hash, tarif) {
    var q = new URLSearchParams(location.search), keep = new URLSearchParams();
    ['demo', 'theme'].forEach(function (k) { if (q.get(k) != null) keep.set(k, q.get(k)); });
    if (tarif) keep.set('tarif', tarif);
    var qs = keep.toString();
    return 'zavod/' + (qs ? '?' + qs : '') + (hash || '');
  }
  // «Подключить завод» (решение владельца) = начать с пробного дня: пульт с выбранным тарифом «Сутки»
  function goZavod() { haptic.tap(); track('click_zavod', { tarif: 'day' }); location.href = zavodUrl('#/intro', 'day'); }

  $('#mgrBtn').addEventListener('click', function () { haptic.tap(); track('click_manager'); openExt(S.offer.manager_url, 'чат с Валерией'); });

  // «Скачать ролик» — формат, который сейчас открыт в плеере
  $('#lDl').addEventListener('click', function () {
    (function () {
      var f = urlOf(S.fmt) ? S.fmt : FORMATS.filter(urlOf)[0], u = urlOf(f);
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
    })();
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
  var openJob = !DEMO && /^[0-9a-f]{8,64}$/i.test(Q.get('job') || '') ? Q.get('job') : '';
  var dalshe = Q.get('dalshe') || '';
  // кто это: тестировщик? уже есть готовый ролик? — повторный вход ведёт на «Готово» с тем, что дальше
  var meP = api('/api/moj_rolik', { quiet: true, retry: false }).then(function (d) {
    for (var k in d) ME[k] = d[k];
    if (ME.nisha && !S.nisha) S.nisha = ME.nisha;
    showTestMode();
    return ME;
  }).catch(function () { return ME; });
  if (openJob) {
    // кнопка «Выложить в сторис» из чата: открываем готовый ролик сразу на экране «Готово»
    S.job = openJob; S.celebrated = true; go('build'); poll();
  } else if (!jump && (dalshe || !DEMO || Q.get('povtor'))) {
    go('welcome');
    meP.then(function () {
      if (dalshe === 'smysl') { novyjRolik(); return; }
      if (ME.job_id && (dalshe === 'tarify' || !ME.admin) && cur === 'welcome') {
        track('povtor_vhod', { dalshe: dalshe || null });
        if (DEMO) { S.job = 'demo-job'; var dd = MOCK.doneData(); VAU_KEYS.forEach(function (k) { S.vau[k] = dd[k]; }); S.vau._new = true; S.preview = dd.preview; S.urls = dd.video_urls; go('done'); return; }
        S.job = ME.job_id; S.celebrated = true; go('build'); poll();
      }
    });
  } else if (jump && SCREENS[jump] && jump !== 'welcome') {
    // прыжок сразу на экран — только в демо, чтобы смотреть дизайн (ниша — бровист, смысл 2)
    loadKat().then(function () {
      if (jump !== 'primery') S.nisha = +(Q.get('nisha') || 15);
      if (['primery', 'nisha', 'imya'].indexOf(jump) < 0) {
        S.smysl = +(Q.get('smysl') || 2);
        fImya.value = 'Анна Смирнова'; fNik.value = '@anna.brows';
      }
      if (['scenarij', 'oformlenie', 'build', 'done', 'fail'].indexOf(jump) >= 0) {
        S.otvety = DEMO_OTVETY.slice();
        S.scen = demoScen(scenBody()); S.scenSig = JSON.stringify(scenBody());
        S.shagi = S.scen.shagi.map(function (x) { return { nazvanie: x.nazvanie, tekst: x.tekst }; });
      }
      if (['build', 'done', 'fail'].indexOf(jump) >= 0) {
        demoFill(); S.uploadedSig = sig(); S.fotoIds = ['d1', 'd2'];
      }
      if (jump === 'voprosy') S.q = +(Q.get('q') || 0);
      if (jump === 'build') { S.job = 'demo-job'; MOCK.startAt(+(Q.get('t') || 9)); go('build'); poll(); }
      else if (jump === 'done') {
        // сразу готовый ролик со всеми «вау»-полями (без ?vau=0 — как ответил бы старый сервер)
        S.job = 'demo-job';
        if (Q.get('vau') !== '0') { var dd = MOCK.doneData(); VAU_KEYS.forEach(function (k) { S.vau[k] = dd[k]; }); S.vau._new = true; S.preview = dd.preview; S.urls = dd.video_urls; }
        go('done');
      }
      else go(jump);
    });
  } else {
    go('welcome');
  }
})();
