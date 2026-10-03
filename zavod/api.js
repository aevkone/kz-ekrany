/* Контент-завод 2.0 · сетевой слой пульта.
   Экраны (zavod.js) зовут ТОЛЬКО ZavodApi.* — ни fetch, ни подставных данных они не знают.

   Режимы:
   - демо (вне Telegram или ?demo=1): ответы из ZAVOD_MOCK (mock.js), с небольшой задержкой;
   - сервер (внутри Telegram или ?demo=0): fetch на /api/zavod/*, заголовок X-Tg-Init-Data —
     тот же договор, что у подарка (../app.js). Ответ {"error": "..."} — понятный текст для человека.

   Список запросов ниже — и есть договор с сервером. */
(function () {
  'use strict';

  var Q = new URLSearchParams(location.search);
  var tg = (window.Telegram && window.Telegram.WebApp) || null;
  var IN_TG = !!(tg && tg.initData);
  var DEMO = true;   // копия для GitHub Pages: всегда демо, сервера нет
  var BASE = '/api/zavod/';
  // режим сайта (вне Telegram): вход через Telegram или по телефону, сервер выдаёт ключ сессии
  var SKEY = 'kz_session';
  function getSession() { try { return localStorage.getItem(SKEY) || ''; } catch (e) { return ''; } }
  function setSession(v) { try { v ? localStorage.setItem(SKEY, v) : localStorage.removeItem(SKEY); } catch (e) {} }
  var SITE = !IN_TG;
  var TIMEOUT = 30000;

  var TXT = {
    net: 'Связь прервалась. Проверь интернет и нажми ещё раз.',
    busy: 'Завод сейчас занят. Подожди немного и попробуй ещё раз.',
    other: 'Что-то пошло не так. Попробуй ещё раз.'
  };

  function err(kind, msg, status) {
    var e = new Error(msg || TXT[kind] || TXT.other);
    e.kind = kind; e.human = true; e.status = status || 0;
    return e;
  }

  function viaMock(method, path, body) {
    return new Promise(function (res, rej) {
      setTimeout(function () {
        var d;
        try { d = window.ZAVOD_MOCK.handle(method, path, body); } catch (x) { rej(err('other')); return; }
        if (d && typeof d.error === 'string') rej(err('server', d.error, 400));
        else res(d);
      }, method === 'GET' ? 160 : 420);
    });
  }

  function viaNet(method, path, body) {
    var init = { method: method, headers: { 'X-Tg-Init-Data': (tg && tg.initData) || '' } };
    if (!IN_TG && getSession()) init.headers['Authorization'] = 'Bearer ' + getSession();
    if (body) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
    var ctl = window.AbortController ? new AbortController() : null, tm = 0;
    if (ctl) { init.signal = ctl.signal; tm = setTimeout(function () { ctl.abort(); }, TIMEOUT); }
    return fetch(path, init)
      .then(function (r) { return r.text().then(function (t) { return [r.status, t]; }); })
      .catch(function () { throw err('net'); })
      .then(function (rt) {
        clearTimeout(tm);
        var d = null; try { d = JSON.parse(rt[1]); } catch (x) {}
        if (d && typeof d.error === 'string' && d.error) throw err('server', d.error, rt[0]);
        if (rt[0] >= 500 || rt[0] === 429) throw err('busy', null, rt[0]);
        if (rt[0] >= 400 || !d) throw err('other', null, rt[0]);
        return d;
      }, function (e) { clearTimeout(tm); throw e; });
  }

  function call(method, rel, body) {
    var path = BASE + rel;
    return DEMO ? viaMock(method, path, body) : viaNet(method, path, body);
  }
  var get = function (rel) { return call('GET', rel); };
  var post = function (rel, body) { return call('POST', rel, body || {}); };

  window.ZavodApi = {
    DEMO: DEMO, IN_TG: IN_TG, SITE: SITE,
    // вход нужен на сайте без сессии; в демо — только с ?site=1, чтобы посмотреть экран входа
    needLogin: function () { return SITE && !getSession() && (!DEMO || Q.get('site') === '1'); },
    authTelegram: function (widgetData) { return post('auth/telegram', widgetData || {}).then(function (d) { setSession(d.session); return d; }); },
    authPhone: function (phone) { return post('auth/phone', { phone: phone }); },
    authCode: function (phone, code) { return post('auth/code', { phone: phone, code: code }).then(function (d) { setSession(d.session); return d; }); },
    logout: function () { setSession(''); },
    // кто открыл: роль, шаг знакомства, тариф
    me: function () { return get('me'); },

    // знакомство (brand + pay + connect + plan)
    onboarding: function () { return get('onboarding'); },
    stepDone: function (step, data) { return post('onboarding/step', { step: step, data: data || null }); },
    interviewAnswer: function (text) { return post('onboarding/answer', { text: text || '' }); },
    bookSection: function (id, ok) { return post('onboarding/book', { id: id, ok: ok }); },
    bookPdf: function () { return post('onboarding/book_pdf'); },          // скачать книгу в PDF — доплата, сумма на согласовании
    unpackBook: function () { return post('onboarding/unpack'); },         // записаться на личную распаковку к Валерии → { pay_url }

    // режим администратора (флаг в me.admin): сброс знакомства, «без оплаты», «публикация выключена»
    adminReset: function () { return post('admin/reset'); },
    adminSet: function (flags) { return post('admin/set', flags || {}); },

    // «Удалить всё» — только с подтверждением текстом «Удалить всё»
    erase: function (confirmText) { return post('erase', { confirm: confirmText }); },

    // соцсети (connect)
    socials: function () { return get('socials'); },
    socialConnect: function (net) { return post('socials/' + net + '/connect'); },
    socialCheck: function (net) { return post('socials/' + net + '/check'); },
    socialDisconnect: function (net) { return post('socials/' + net + '/disconnect'); },
    // профили соцсетей: личный / бизнес; в «Максимуме» два, больше — докупка
    profilePick: function (id) { return post('socials/profile', { id: id }); },
    profileType: function (type) { return post('socials/profile_type', { type: type }); },
    profileAdd: function () { return post('socials/profile_add'); },

    // сделать контент (menu → workers)
    make: function () { return get('make'); },
    order: function (kind, topic) { return post('make/order', { kind: kind, topic: topic || '' }); },

    // план (plan)
    plan: function () { return get('plan'); },
    planItem: function (id, action) { return post('plan/' + id + '/' + action); },   // approve | replace | remove
    planApproveAll: function () { return post('plan/approve_all'); },
    planDays: function (days, asDefault) { return post('plan/days', { days: days, as_default: !!asDefault }); },
    planAdd: function (kind, topic) { return post('plan/add', { kind: kind, topic: topic }); },

    // на утверждение (review + publish + очередь работ)
    review: function () { return get('review'); },
    decide: function (id, action, payload) { return post('review/' + id + '/' + action, payload || {}); },  // approve | reject | fix_voice | caption

    // как дела и конкуренты (analytics, competitors)
    stats: function () { return get('stats'); },
    rivals: function () { return get('rivals'); },
    rivalAnalyze: function () { return post('rivals/analyze'); },
    rivalAddChannel: function (name) { return post('rivals/channel', { name: name }); },

    // настройки и поддержка (brand, pay, menu)
    settings: function () { return get('settings'); },
    support: function (text) { return post('support', { text: text }); },

    // тарифы: считаются по ОПУБЛИКОВАННОМУ; ответ — список, текущий тариф и счётчик «опубликовано X из Y»
    tariffs: function () { return get('tariffs'); },
    tariffChoose: function (id) { return post('tariffs/choose', { id: id }); },   // → { pay_url }

    // напоминания: плашка «ты не закончил…» и переключатель в настройках
    reminders: function () { return get('reminders'); },
    setReminders: function (on) { return post('reminders/set', { on: !!on }); },

    // дополнение «Мой бот для соцсетей»: витрина, мастер из 5 шагов, статус
    addon: function () { return get('addon'); },
    addonStart: function () { return post('addon/start'); },
    addonAnswer: function (key, value) { return post('addon/answer', { key: key, value: value }); },
    addonFinish: function () { return post('addon/finish'); }
  };
})();
