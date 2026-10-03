/* Контент-завод 2.0 · подставные данные для прототипа пульта.
   ЕДИНСТВЕННОЕ место, где живут выдуманные данные. Сетевой слой (api.js) в демо
   отвечает отсюда: ZAVOD_MOCK.handle(метод, путь, тело) → данные, как ответил бы сервер.
   Когда сервер будет готов, этот файл просто перестаёт подключаться — экраны не меняются.

   Все тексты здесь — для клиента: на «ты», мужской род, без слов «модель», «рендер», «API»,
   без обещаний сумм и сроков результата. */
(function () {
  'use strict';

  var IMG = {
    car1: '../img/car1.webp', car2: '../img/car2.webp',
    portret: '../img/demo_v.webp', reel: '../img/reel.jpg', primer: '../primer/example.jpg'
  };

  // ---------- кто открыл приложение ----------
  // role: lead — пришёл за подарком; client — клиент завода
  // onboarding_step — сколько шагов знакомства ЗАКОНЧЕНО. Всего шагов 9, или 10, если своей ниши
  // в списке не нашлось (тогда добавляется шаг «Расскажи голосом, чем занимаешься»).
  var me = {
    role: 'client', name: 'Анна',
    onboarding_step: 9,
    bot_username: 'Kontent_Agent_bot',
    // days_left — сколько дней осталось до конца подписки: план не может быть длиннее
    tariff: { id: 'start', name: 'Старт', paid_until: '28.10', days_left: 25, trial: false, paused: false },
    // режим администратора (?admin=1): тестовая плашка, сброс знакомства, без оплаты, без публикации
    admin: null
  };

  // ---------- тарифы ----------
  // ГЛАВНОЕ ПРАВИЛО: тариф считается по ОПУБЛИКОВАННОМУ контенту. Черновики не скачиваются —
  // их можно только посмотреть (с пометкой «черновик») и опубликовать.
  // Цены, рилсы и карусели — решение владельца 03.10. Остальной состав — ЧЕРНОВИК на согласовании
  // Валерии и Антона (как server/pay/tarify_matrica.json в ветке srv-tarify).
  // inc: значение false — «не входит», true — «входит», строка — входит, с уточнением.
  var tariffs = {
    rule: 'Считаем только то, что вышло в твоих соцсетях. Черновики смотришь и правишь сколько угодно — в тариф они не идут. Скачать черновик нельзя: только посмотреть и опубликовать.',
    items: [
      { id: 'day', name: 'Сутки', price: 990, period: 'на сутки', reels: 1, carousels: 3, text: 'Попробовать завод в деле за один день.' },
      { id: 'start', name: 'Старт', price: 9990, period: 'в месяц', reels: 10, carousels: 20, text: 'Чтобы выходить регулярно, без пропусков.' },
      { id: 'pro', name: 'Про', price: 19990, period: 'в месяц', reels: 30, carousels: 40, text: 'Почти каждый день — и рилсы, и карусели.' },
      { id: 'max', name: 'Максимум', price: 29990, period: 'в месяц', reels: 60, carousels: 90, draft: true, text: 'Несколько выходов в день, анимированные карусели, свои боты и два профиля.' }
    ],
    // разовая услуга, не подписка: распаковка проводится один раз
    once: { id: 'unpack', name: 'Личная распаковка с Валерией', price: 39990, period: 'разово', text: 'Живой созвон: Валерия и команда вместе с тобой собирают книгу смыслов. Проводится один раз.' },
    rows: [
      { k: 'reels', t: 'Рилсы в соцсетях' },
      { k: 'carousels', t: 'Карусели в соцсетях' },
      { k: 'plain', t: 'Обычные карусели — все стили' },
      { k: 'anim', t: 'Анимированные карусели' },
      { k: 'stats', t: 'Аналитика' },
      { k: 'bots', t: 'Свой бот для соцсетей' },
      { k: 'profiles', t: 'Профили соцсетей' },
      { k: 'call', t: 'Личный созвон с Валерией' }
    ],
    inc: {
      day:   { reels: '1', carousels: '3', plain: true, anim: false, stats: false, bots: false, profiles: '1', call: false },
      start: { reels: '10', carousels: '20', plain: true, anim: false, stats: false, bots: false, profiles: '1', call: false },
      pro:   { reels: '30', carousels: '40', plain: true, anim: false, stats: 'базовая', bots: false, profiles: '1', call: false },
      max:   { reels: '60', carousels: '90', plain: true, anim: 'черновик', stats: 'от твоих прошлых постов · черновик', bots: '2 · черновик', profiles: '2 · черновик', call: false },
      unpack: { reels: false, carousels: false, plain: false, anim: false, stats: false, bots: false, profiles: false, call: 'созвон, книга смыслов вместе' }
    },
    extra: 'Чего нет в тарифе, можно докупить отдельно: ещё профиль, ещё бот.',
    current: 'start',
    // сколько уже опубликовано в этом периоде
    used: { reels: 4, carousels: 9 }
  };
  function tariffItem(id) { return tariffs.items.concat([tariffs.once]).filter(function (x) { return x.id === id; })[0]; }
  function tariffNow() {
    var t = tariffs.items.filter(function (x) { return x.id === tariffs.current; })[0] || tariffs.items[0];
    return { id: t.id, name: t.name, paid_until: me.tariff.paid_until, days_left: me.tariff.days_left,
      reels: { used: tariffs.used.reels, limit: t.reels }, carousels: { used: tariffs.used.carousels, limit: t.carousels } };
  }
  // сколько профилей и ботов входит в текущий тариф (пункты 10 и 11 замечаний владельца)
  function incl() { var mx = tariffs.current === 'max'; return { profiles: mx ? 2 : 1, bots: mx ? 2 : 0 }; }

  // ---------- ниши: 9 групп, 67 ниш — «База смыслов Контент-завода», версия 2 ----------
  var NICHES = [["Здоровье и тело", ["Фитнес-тренер", "Врач, медицинские услуги", "Нутрициолог", "Эксперт по подготовке к родам", "Танцор, хореограф", "Массажист", "Ветеринарный врач", "Логопед"]], ["Красота", ["Косметолог", "Колорист", "Бровист", "Мастер ногтевого сервиса: обучение и услуги", "Салон красоты", "Визажист"]], ["Психология и самопознание", ["Астролог", "Нумеролог", "Таролог", "Эзотерик", "Психолог", "Нейрографика", "Коуч"]], ["Обучение", ["Преподаватель иностранного языка", "Обучение продажам на Wildberries", "Образовательная онлайн-школа", "Обучение персонала общественного питания", "Преподаватель и репетитор"]], ["Маркетинг и креатив", ["Веб-дизайнер", "СММ-специалист", "Маркетолог, воронки", "Фотограф", "Контент-мейкер, рилсмейкер", "Эксперт по нейросетям", "Видеомейкер, монтажёр", "Продюсер запусков", "PR-менеджер (для тех, кто продаёт свои услуги)", "Рекламное агентство"]], ["Деньги и бизнес", ["Бухгалтерия", "Инвестиции и криптовалюта", "Банковский работник", "Эксперт по развитию бизнеса", "Фулфилмент, логистика", "Сетевой бизнес"]], ["Товары и производство", ["Кондитер", "Одежда и украшения своего бренда", "Сладкие букеты", "Свечеварение: обучение и товары", "Мыловарение", "Офлайн-бизнес: продукты и товары", "Товары для животных", "Офлайн-бизнес: магазин одежды", "Продажа сантехники"]], ["Сервис и место", ["Продажа недвижимости, риелтор", "Туризм", "Клининг", "Ресторатор", "Дизайн интерьеров", "Руководитель отделения Почты России", "Аренда загородной недвижимости", "Визовый центр", "Организация и проведение мероприятий", "Конный клуб"]], ["Медиа и творчество", ["Блог рецептов еды", "Ведущий мероприятий", "Лайфстайл-блогер", "Артист, певица", "Модельное агентство", "Радиоведущий"]]];

  // ---------- стили каруселей ----------
  // Обычные — styles/carousel_templates.json (families); «прежние» — виды до студии 2.0 (*_old).
  // Анимированные — server/brand/karuseli3.json (студия каруселей 3.0), все 20 со статусом «принят».
  // look — как нарисовать мини-превью (CSS, без картинок); acc — родной цвет стиля.
  var COLORS = [
    { id: 'red', name: 'Красный', hex: '#E4102B' }, { id: 'coral', name: 'Коралл', hex: '#DF7656' },
    { id: 'terracotta', name: 'Терракота', hex: '#C9714E' }, { id: 'orange', name: 'Оранжевый', hex: '#F08A4A' },
    { id: 'flash', name: 'Жёлтый', hex: '#FFE23D' }, { id: 'lime', name: 'Лайм', hex: '#CCFF00' },
    { id: 'mint', name: 'Мятный', hex: '#5ED6B8' }, { id: 'meadow', name: 'Зелёный', hex: '#2FB574' },
    { id: 'sky', name: 'Голубой', hex: '#6CA8FF' }, { id: 'azure', name: 'Синий', hex: '#2C6BED' },
    { id: 'bubblegum', name: 'Розовый', hex: '#FF5C8A' }, { id: 'sand', name: 'Песок', hex: '#D6C4AA' },
    { id: 'gold', name: 'Золото', hex: '#C9A24B' }, { id: 'vanilla', name: 'Сливочный', hex: '#FAEEBE' }
  ];
  var STYLES = {
    regular: [
      { id: 'photo', name: 'ПРЕМИУМ-ФОТО', note: 'Твоё фото на каждом слайде, текст поверх мягкого затемнения', look: 'photo', acc: '#E4102B' },
      { id: 'white', name: 'ЖУРНАЛ', note: 'Белый фон, много воздуха, фото на обложке', look: 'white', acc: '#5ED6B8' },
      { id: 'cream', name: 'CREMA', note: 'Тёплый кремовый фон, скруглённые фото', look: 'cream', acc: '#DF7656' },
      { id: 'editorial', name: 'РЕДАКТУРА', note: 'Журнальная подача, буквица, спокойно и дорого', look: 'paper', acc: '#D6C4AA' },
      { id: 'brutalist', name: 'БЕТОН', note: 'Огромные буквы впритык к краю, дерзко', look: 'concrete', acc: '#FF3B12' },
      { id: 'scrapbook', name: 'ДНЕВНИК', note: 'Полароиды под углом, тёплая бумага', look: 'polaroid', acc: '#D96A54' },
      { id: 'quote', name: 'МАНИФЕСТ', note: 'Одна цитата на слайд, крупно', look: 'quote', acc: '#C9A24B' },
      { id: 'sticker', name: 'СТИКЕР', note: 'Рамки и опросы, как в сторис', look: 'sticker', acc: '#FF5C8A' },
      { id: 'meme', name: 'РЕПЛИКА', note: 'Плашка-цитата, жирно и разговорно', look: 'meme', acc: '#FFE23D' },
      { id: 'minimal', name: 'МИНИМАЛИЗМ', note: 'Фото на весь кадр, короткая подпись в углу', look: 'photo2', acc: '#DF7656' },
      { id: 'swiss', name: 'ТИШИНА', note: 'Белый лист, одна мысль на слайд', look: 'swiss', acc: '#2C6BED' },
      { id: 'cinematic', name: 'КАДР', note: 'Как кадр из фильма: полосы и подпись-субтитр', look: 'cine', acc: '#C9A24B' },
      { id: 'panorama', name: 'ПАНОРАМА', note: 'Один снимок тянется через все слайды', look: 'pano', acc: '#D98C4A' },
      { id: 'split', name: 'РАЗВИЛКА', note: 'Экран пополам: «как все» и «как надо»', look: 'split', acc: '#2FB574' },
      { id: 'data', name: 'ЦИФРА', note: 'Крупные числа и мини-график', look: 'data', acc: '#4C8DFF' },
      { id: 'checklist', name: 'ЧЕК-ЛИСТ', note: 'Галочки и «3 из 7» — сохрани и сделай', look: 'check', acc: '#2FB574' },
      { id: 'love1', name: 'ЛЮБОВЬ 1', note: 'Фото на весь слайд, крупные буквы, рукописный вывод', look: 'photo3', acc: '#FAEEBE' },
      { id: 'love2', name: 'ЛЮБОВЬ 2', note: 'Ключевое слово на сливочной плашке', look: 'photo3', acc: '#FAEEBE' },
      { id: 'love3', name: 'ЛЮБОВЬ 3', note: 'Светлое фото, текст по центру внизу', look: 'photo2', acc: '#FAEEBE' },
      { id: 'marker', name: 'МАРКЕР', note: 'Заголовок одной плашкой, текст уходит от лица', look: 'marker', acc: '#E4102B' },
      { id: 'infografika', name: 'ИНФОГРАФИКА', note: 'Карточки 01–05, шаги в кругах, «было / нужно»', look: 'info', acc: '#E4102B' },
      { id: 'offer', name: 'ОФФЕР', note: 'Что входит, цена, кодовое слово', look: 'offer', acc: '#E4102B' },
      { id: 'razbor', name: 'РАЗБОР', note: 'Скриншот с пометками: «ошибка → как надо»', look: 'razbor', acc: '#E4102B' }
    ],
    old: [
      { id: 'photo_old', name: 'ПРЕМИУМ-ФОТО · прежний', note: 'Прежний вид: крупный белый заголовок внизу', look: 'photo', acc: '#E4102B' },
      { id: 'editorial_old', name: 'РЕДАКТУРА · прежний', note: 'Прежний вид: тёмный кадр, заголовок капсом', look: 'quote', acc: '#D6C4AA' },
      { id: 'brutalist_old', name: 'БЕТОН · прежний', note: 'Прежний вид: огромные буквы на фото', look: 'concrete', acc: '#FF3B12' },
      { id: 'minimal_old', name: 'МИНИМАЛИЗМ · прежний', note: 'Прежний вид: подпись строчными по центру', look: 'photo2', acc: '#DF7656' },
      { id: 'marker_old', name: 'МАРКЕР · прежний', note: 'Прежний вид: красная плашка-маркер', look: 'marker', acc: '#E4102B' }
    ],
    animated: [
      { id: 'anim_keynote', name: 'КЕЙНОУТ', note: 'Как выступление со сцены: слайды выезжают по одному', look: 'a-keynote', acc: '#2997FF' },
      { id: 'anim_dashboard', name: 'ДАШБОРД', note: 'Живые графики и счётчики', look: 'a-dash', acc: '#635BFF' },
      { id: 'anim_gazeta', name: 'ПЕРЕДОВИЦА', note: 'Газетная полоса, заголовки печатаются', look: 'a-gazeta', acc: '#C8102E' },
      { id: 'anim_kinetic', name: 'КИНЕТИКА', note: 'Слова двигаются в ритм', look: 'a-kinetic', acc: '#FF3D00' },
      { id: 'anim_storis', name: 'ПРОГРЕСС-СТОРИС', note: 'Полоски сверху, как в сторис', look: 'a-storis', acc: '#FF2E7E' },
      { id: 'anim_neon', name: 'НЕОН', note: 'Светящиеся вывески на тёмном', look: 'a-neon', acc: '#FF3EA5' },
      { id: 'anim_bauhaus', name: 'БАУХАУС', note: 'Круги, квадраты, строгие цвета', look: 'a-bauhaus', acc: '#E53A2F' },
      { id: 'anim_kollazh', name: 'БУМАЖНЫЙ КОЛЛАЖ', note: 'Вырезки и скотч, собирается на глазах', look: 'a-kollazh', acc: '#FF5A36' },
      { id: 'anim_perepiska', name: 'ПЕРЕПИСКА', note: 'Сообщения появляются, как в чате', look: 'a-chat', acc: '#2AABEE' },
      { id: 'anim_steklo', name: 'СТЕКЛО', note: 'Матовые стеклянные карточки', look: 'a-glass', acc: '#9BE3FF' },
      { id: 'anim_tablo', name: 'ТАБЛО ВЫЛЕТОВ', note: 'Буквы перелистываются, как на вокзале', look: 'a-tablo', acc: '#F7C600' },
      { id: 'anim_terminal', name: 'ТЕРМИНАЛ', note: 'Текст набирается строка за строкой', look: 'a-term', acc: '#3DDC84' },
      { id: 'anim_uroven', name: 'ИГРОВЫЕ УРОВНИ', note: 'Шаги как уровни в игре', look: 'a-level', acc: '#FFD23F' },
      { id: 'anim_birzha', name: 'БИРЖЕВОЙ ТИКЕР', note: 'Бегущая строка и стрелки вверх', look: 'a-ticker', acc: '#F0B90B' },
      { id: 'anim_chek', name: 'КАССОВЫЙ ЧЕК', note: 'Пункты печатаются чеком', look: 'a-chek', acc: '#E4102B' },
      { id: 'anim_chertyozh', name: 'ЧЕРТЁЖ', note: 'Линии рисуются, как на чертеже', look: 'a-blue', acc: '#FFD400' },
      { id: 'anim_glyanec', name: 'ГЛЯНЕЦ', note: 'Обложка журнала с бликом', look: 'a-gloss', acc: '#B3122E' },
      { id: 'anim_marshrut', name: 'КАРТА-МАРШРУТ', note: 'Путь по точкам на карте', look: 'a-route', acc: '#FF4D00' },
      { id: 'anim_perevorot', name: '3D-КАРТОЧКИ', note: 'Карточки переворачиваются', look: 'a-flip', acc: '#6C4BFF' },
      { id: 'anim_vhs', name: 'РЕТРО-ТВ', note: 'Помехи и кассета', look: 'a-vhs', acc: '#6CFF8A' }
    ],
    colors: COLORS,
    anim_badge: 'анимация · Максимум (черновик)'
  };

  // ---------- знакомство: 9 шагов (10, если ниши нет в списке) ----------
  var STEP_TITLES = {
    consents: 'Согласия', access: 'Тариф или пробный период', niche: 'Ниша', niche_voice: 'Расскажи голосом о себе',
    interview: 'Распаковка голосом', book: 'Книга смыслов', carousels: 'Стиль каруселей', reels: 'Формат рилсов',
    socials: 'Соцсети', first_plan: 'Первый план'
  };
  function stepKeys() {
    var k = ['consents', 'access', 'niche'];
    if (onboarding.niche.mode === 'none') k.push('niche_voice');
    return k.concat(['interview', 'book', 'carousels', 'reels', 'socials', 'first_plan']);
  }
  function stepsOut() { return stepKeys().map(function (k, i) { return { n: i + 1, key: k, title: STEP_TITLES[k] }; }); }
  var onboarding = {
    // mode: list — нашёл в списке (одна ниша); none — не нашёл, выбрал до 2 смежных + рассказал голосом
    niche: { mode: 'list', picked: ['Дизайн интерьеров'] },
    niche_groups: NICHES,
    consents: [
      { id: 'data', title: 'Обработка моих данных', text: 'Фото, видео и ответы нужны заводу, чтобы собирать твой контент. Хранятся у нас, наружу не уходят.', required: true },
      { id: 'publish', title: 'Публикация от моего имени', text: 'Завод выкладывает только то, что ты утвердил. Без твоего «Утвердить» не выходит ничего.', required: true },
      { id: 'text', title: 'Тексты без имён', text: 'Чтобы написать подпись, завод передаёт помощнику только обезличенный текст. Фото и лица — никогда.', required: true }
    ],
    interview: {
      total: 14, answered: 5,
      question: 'Расскажи про клиента, который ушёл от тебя довольным. С чем он пришёл и что изменилось?',
      hint: 'Говори как другу — с деталями. Можно частями и в разные дни.'
    },
    book: [
      { id: 'who', title: 'Кто ты', text: 'Дизайнер интерьеров, 9 лет. Ведёшь проект от первого замера до ключей. Работаешь с семьями, которые въезжают в первую свою квартиру.', ok: true },
      { id: 'pain', title: 'Боль клиента', text: 'Боится, что ремонт затянется, а результат будет «как у всех». Не знает, с чего начать, и стесняется спросить глупость.', ok: true },
      { id: 'voice', title: 'Голос', text: 'Спокойно, по-дружески, с примерами из объектов. Без терминов и без давления.', ok: false },
      { id: 'proof', title: 'Доказательства', text: 'Фото до и после, отзывы с объектов, разборы планировок.', ok: false },
      { id: 'taboo', title: 'О чём не говоришь', text: 'Цены конкурентов, личная жизнь, политика.', ok: false }
    ],
    // книга смыслов живёт только в приложении; PDF — за доплату, сумма на согласовании
    book_pdf: { price: null, status: 'на согласовании' },
    styles: STYLES,
    // выбранные стили каруселей: до трёх, у каждого свой цвет
    carousel_pick: [{ id: 'marker', color: '#E4102B' }],
    reels_formats: [
      // example — пример ролика: пока постер-заглушка, адрес видео подставит сервер
      { id: 'standart', name: 'СТАНДАРТ', kind: 'day', text: 'Твой клип, поверх — крупная первая фраза.', example: { poster: IMG.reel, video: '', sec: 24 } },
      { id: 'subs-plain', name: 'СУБТИТРЫ', kind: 'day', text: 'Ты говоришь на весь экран, внизу — подпись словами.', example: { poster: IMG.portret, video: '', sec: 31 } },
      { id: 'subs-stroked', name: 'С ПЕРЕБИВКОЙ', kind: 'day', text: 'На ключевых фразах кадр уходит в картинку.', example: { poster: IMG.reel, video: '', sec: 28 } },
      { id: 'halves-generated', name: 'ПОЛОВИНКИ', kind: 'day', text: 'Сверху ты, снизу — видео по смыслу слов.', example: { poster: IMG.portret, video: '', sec: 35 } },
      { id: 'anim3', name: 'АНИМАЦИЯ 3', kind: 'ask', text: 'Сверху ты, снизу — живые счётчики и пункты.', example: { poster: IMG.reel, video: '', sec: 40 } },
      { id: 'anim5', name: 'АНИМАЦИЯ 5', kind: 'ask', text: 'Фоны в оттенках твоей стены, заголовки сбоку.', example: { poster: IMG.portret, video: '', sec: 38 } },
      { id: 'telefon', name: 'ВСПЛЫВАЮЩИЙ ТЕЛЕФОН', kind: 'ask', text: 'Под лицом выезжает телефон с живым экраном.', example: { poster: IMG.reel, video: '', sec: 33 } }
    ],
    reels_default: 'subs-stroked',
    reels_fav: ['anim5'],
    sub_colors: [
      { name: 'Мятный', hex: '#2DD2BE' }, { name: 'Жёлтый', hex: '#FFD43B' }, { name: 'Белый', hex: '#FFFFFF' },
      { name: 'Розовый', hex: '#FF4F9A' }, { name: 'Оранжевый', hex: '#FF8A1F' }
    ],
    sub_color: '#2DD2BE'
  };

  // ---------- соцсети (ВОЛНА_Б_CONNECT) ----------
  // state: connected — подключено; pending — ждём подтверждения; off — не подключено;
  //        soon — скоро; unavailable — пока недоступно; needs_service — сервис ещё не настроен
  // Профили (пункт 10): у каждого свой набор соцсетей и тип — личный или бизнес.
  // В «Максимуме» 2 профиля, в остальных тарифах 1; больше — докупка.
  function netsSet(first) {
    return first ? [
      { id: 'telegram', name: 'Telegram-канал', short: 'TG', way: 'admin', state: 'connected', account: 'Канал «Дом с нуля»', since: '28.09' },
      { id: 'instagram', name: 'Instagram', short: 'IG', way: 'link', state: 'connected', since: '29.09' },
      { id: 'youtube', name: 'YouTube', short: 'YT', way: 'link', state: 'pending' },
      { id: 'vk', name: 'ВКонтакте', short: 'VK', way: 'none', state: 'soon' },
      { id: 'dzen', name: 'Дзен', short: 'ДЗ', way: 'none', state: 'unavailable' }
    ] : [
      { id: 'telegram', name: 'Telegram-канал', short: 'TG', way: 'admin', state: 'off' },
      { id: 'instagram', name: 'Instagram', short: 'IG', way: 'link', state: 'off' },
      { id: 'youtube', name: 'YouTube', short: 'YT', way: 'link', state: 'off' },
      { id: 'vk', name: 'ВКонтакте', short: 'VK', way: 'none', state: 'soon' },
      { id: 'dzen', name: 'Дзен', short: 'ДЗ', way: 'none', state: 'unavailable' }
    ];
  }
  var profiles = [{ id: 'pr1', type: 'personal', nets: netsSet(true) }];
  var profileCur = 'pr1';
  function ensureProfiles() {
    var need = incl().profiles;
    if (profiles.length < need) profiles.push({ id: 'pr2', type: 'business', nets: netsSet(false) });
    if (profiles.length > need) { profiles = profiles.slice(0, need); if (!profiles.some(function (x) { return x.id === profileCur; })) profileCur = profiles[0].id; }
  }
  function curProfile() { ensureProfiles(); return profiles.filter(function (x) { return x.id === profileCur; })[0] || profiles[0]; }
  var socials = curProfile().nets;

  // ---------- план на 2 недели (ВОЛНА_Д_PLAN) ----------
  var plan = {
    period: '06.10 — 19.10',
    days: [
      { date: '06.10', wd: 'Пн', items: [
        { id: 'p1', kind: 'reel', format: 'СУБТИТРЫ С ПЕРЕБИВКОЙ', topic: 'Почему ремонт затягивается — и как это заметить на первой неделе', state: 'approved', time: '10:00' },
        { id: 'p2', kind: 'carousel', format: 'МАРКЕР', topic: '5 вопросов, которые стоит задать дизайнеру до договора', state: 'new', time: '19:00' }
      ] },
      { date: '07.10', wd: 'Вт', items: [
        { id: 'p3', kind: 'carousel', format: 'МИНИМАЛИЗМ', topic: 'Кухня 8 метров: три планировки и что выбрала семья', state: 'new', time: '10:00' },
        { id: 'p4', kind: 'reel', format: 'АНИМАЦИЯ 5', topic: 'Один день на объекте: что я проверяю первым', state: 'new', time: '19:00' }
      ] },
      { date: '08.10', wd: 'Ср', items: [
        { id: 'p5', kind: 'reel', format: 'ПОЛОВИНКИ', topic: 'Свет в спальне: ошибка, которую делают почти все', state: 'new', time: '10:00' },
        { id: 'p6', kind: 'carousel', format: 'РАЗБОР', topic: 'Было и стало: прихожая, в которой наконец есть место', state: 'new', time: '19:00' }
      ] },
      { date: '09.10', wd: 'Чт', items: [
        { id: 'p7', kind: 'carousel', format: 'МАРКЕР', topic: 'Что входит в дизайн-проект, а что — нет', state: 'new', time: '10:00' },
        { id: 'p8', kind: 'reel', format: 'СТАНДАРТ', topic: 'Как я выбираю плитку вместе с клиентом', state: 'new', time: '19:00' }
      ] }
    ],
    shoot: [
      { id: 's1', topic: 'Почему ремонт затягивается', say: ['Ремонт затягивается не на стройке, а в голове.', 'Первая неделя показывает всё.', 'Смотри на три вещи: график, закупку, связь.'], show: ['Ты на объекте, общий план', 'Крупно — график на стене', 'Телефон с чатом прораба'] },
      { id: 's2', topic: 'Один день на объекте', say: ['Утро начинаю не с кофе, а с уровня.', 'Что я проверяю первым — и почему.'], show: ['Ты входишь в квартиру', 'Руки с лазерным уровнем', 'Короткий план: ты у окна'] }
    ]
  };

  // ---------- на утверждение (ВОЛНА_Б_REVIEW + меню) ----------
  var review = {
    drafts: [
      { id: 'drf-1a2b', kind: 'reel', title: 'Почему ремонт затягивается', img: IMG.reel, format: 'СУБТИТРЫ С ПЕРЕБИВКОЙ', when: 'выйдет 06.10 в 10:00', nets: ['IG', 'TG', 'YT'],
        caption: 'Ремонт редко срывается на стройке. Он срывается в первую неделю — когда никто не смотрит на график. Рассказываю, на какие три вещи смотрю я, чтобы через месяц не было сюрпризов 🛠️\n\nНапиши мне в лс — разберём твой случай.' },
      { id: 'drf-3c4d', kind: 'carousel', title: '5 вопросов дизайнеру до договора', img: IMG.car1, format: 'МАРКЕР', when: 'выйдет 06.10 в 19:00', nets: ['IG', 'TG'],
        caption: 'Сохрани, чтобы не забыть на первой встрече. Пять вопросов, после которых станет понятно, сработаетесь вы или нет 📌' }
    ],
    work: [
      { id: 'w1', title: 'Кухня 8 метров — карусель', note: 'Собираю слайды — осталось примерно 10 минут', pct: 0.6 },
      { id: 'w2', title: 'Один день на объекте — рилс', note: 'Начну скоро, готово примерно через 20 минут', pct: 0.1 },
      { id: 'w3', title: 'Свет в спальне — рилс', note: 'Смотрим вручную — пришлю, как будет готово', pct: 0.35 }
    ],
    done: [
      { id: 'd1', title: 'Прихожая: было и стало', date: '02.10', nets: ['IG', 'TG'], url: '' },
      { id: 'd2', title: 'Как я выбираю плитку', date: '01.10', nets: ['IG', 'TG', 'YT'], url: '' },
      { id: 'd3', title: 'Три ошибки в ванной', date: '30.09', nets: ['TG'], url: '' }
    ]
  };

  // ---------- как дела (ВОЛНА_Е_STATS) ----------
  var stats = {
    week: {
      label: '7 дней',
      subs: [
        { net: 'Instagram', short: 'IG', from: 2140, to: 2213 },
        { net: 'Telegram', short: 'TG', from: 860, to: 874 },
        { net: 'YouTube', short: 'YT', from: 312, to: 341 }
      ],
      best: { title: 'Прихожая: было и стало', net: 'Instagram', views: 4817, why: 'Сравнение «было — стало» в первых двух секундах: досматривают до конца чаще обычного.' },
      worst: { title: 'Три ошибки в ванной', net: 'Telegram', views: 213, why: 'Вышел в 23:40 — твоя аудитория в это время уже не читает.' }
    },
    month: {
      label: '30 дней',
      subs: [
        { net: 'Instagram', short: 'IG', from: 1904, to: 2213 },
        { net: 'Telegram', short: 'TG', from: 791, to: 874 },
        { net: 'YouTube', short: 'YT', from: 246, to: 341 }
      ],
      best: { title: 'Как я выбираю плитку', net: 'YouTube', views: 9316, why: 'Ты в кадре с руками и материалом — такие ролики у тебя смотрят дольше.' },
      worst: { title: 'Что входит в дизайн-проект', net: 'Instagram', views: 618, why: 'Длинный текст на первом слайде — листают дальше, не читая.' }
    },
    tips: [
      { id: 't1', text: 'Сними ещё одно «было — стало»: такие ролики у тебя досматривают лучше всего.' },
      { id: 't2', text: 'Выходи в Telegram до 21:00 — позже тебя почти не читают.' },
      { id: 't3', text: 'Добавь в карусели вопрос на последнем слайде — сохранений станет заметно больше.' }
    ],
    // Аналитика от твоих прошлых постов (пункт 8): «обычно» — середина твоих последних 20 постов
    // того же вида на этой площадке; метка — во сколько раз этот пост выше или ниже твоей нормы.
    // Взлетел — от ×1,5; в норме — от ×0,7 до ×1,5; ниже обычного — меньше ×0,7.
    posts: [
      { id: 'a1', title: 'Прихожая: было и стало', kind: 'reel', date: '02.10', nets: [
        { short: 'IG', usual: 2400, now: 4817 }, { short: 'TG', usual: 610, now: 702 }, { short: 'YT', usual: 200, now: 400 } ] },
      { id: 'a2', title: 'Как я выбираю плитку', kind: 'reel', date: '01.10', nets: [
        { short: 'IG', usual: 2400, now: 2210 }, { short: 'YT', usual: 200, now: 186 } ] },
      { id: 'a3', title: 'Три ошибки в ванной', kind: 'carousel', date: '30.09', nets: [
        { short: 'IG', usual: 1300, now: 1420 }, { short: 'TG', usual: 610, now: 213 } ] }
    ],
    sources: 'Цифры собираются раз в сутки с площадок, которые ты подключил. Прошлое задним числом площадки не отдают — картина становится полнее с каждой неделей.'
  };

  // ---------- конкуренты (ВОЛНА_Е_STATS) ----------
  var rivals = {
    channels: [
      { id: 'c1', name: 'Интерьеры без боли', hits: [{ title: 'Квартира за 90 дней: дневник', x: 4.2 }] },
      { id: 'c2', name: 'Дом и свет', hits: [] }
    ],
    max_channels: 5,
    recipe: {
      title: 'Ролик конкурента · 38 секунд',
      rows: [
        { k: 'Темп', v: 'Склейка каждые 1,6 с — быстрее твоего обычного' },
        { k: 'Первая склейка', v: 'На 0,8 с — зритель не успевает уйти' },
        { k: 'Субтитры', v: 'Есть, по центру кадра, крупно' },
        { k: 'Первые слова', v: '«Вы делаете ремонт неправильно»' },
        { k: 'Громкость', v: 'Ровная, музыка тише голоса' }
      ],
      verdict: 'Держит резким заходом с первой секунды и частой сменой кадра. Взять можно механику, а тему — свою.'
    }
  };

  // ---------- настройки (ВОЛНА_Д_MENU, 12 входов) ----------
  var settings = [
    { id: 'socials', title: 'Соцсети', value: '2 подключены' },
    { id: 'addon_bot', title: 'Мой бот для соцсетей', value: 'Дополнение: кодовое слово → подарок → заявка', badge: 'Новое' },
    { id: 'plan_days', title: 'Срок плана по умолчанию', value: '14 дней' },
    { id: 'reminders', title: 'Напоминания', value: 'Включены', toggle: true, on: true },
    { id: 'carousel_style', title: 'Стиль каруселей', value: 'МАРКЕР · красный' },
    { id: 'reels_format', title: 'Формат рилсов', value: 'С ПЕРЕБИВКОЙ · избранное: АНИМАЦИЯ 5' },
    { id: 'sub_color', title: 'Цвет субтитров', value: 'Мятный', swatch: '#2DD2BE' },
    { id: 'times', title: 'Время и частота публикаций', value: '2 в день · 10:00 и 19:00' },
    { id: 'book', title: 'Книга смыслов', value: '14 разделов · только здесь, в приложении' },
    { id: 'codeword', title: 'Кодовое слово и заявки', value: 'ДОМ → в личные сообщения' },
    { id: 'tariff', title: 'Тариф и оплата', value: 'Старт · опубликовано 4 из 10 рилсов и 9 из 20 каруселей' },
    { id: 'pause', title: 'Пауза', value: 'Выключена' },
    { id: 'consents', title: 'Согласия', value: 'Все три даны' },
    { id: 'support', title: 'Поддержка', value: 'Напиши или скажи голосом' },
    { id: 'erase', title: 'Удалить всё', value: 'Стереть твои данные из завода', danger: true }
  ];

  // ---------- срок плана: 3 / 7 / 14 / 30 или своё число 1–60; по умолчанию — из настроек ----------
  // и не больше, чем осталось дней подписки (пункт 7)
  var planPrefs = { days: 14, presets: [3, 7, 14, 30], min: 1, max: 60 };
  function planMax() { return Math.max(1, Math.min(planPrefs.max, me.tariff.days_left)); }

  // ---------- напоминания ----------
  var reminders = { on: true };

  // ---------- вход в режиме сайта (вне Telegram) ----------
  var auth = { phone_code_len: 4 };

  // ---------- дополнение «Мой бот для соцсетей» ----------
  // state: none — не подключено; setup — мастер в процессе; manual — «настраиваем вручную»; live — работает
  var addon = {
    state: 'none',
    chain: [
      { t: 'Кодовое слово', p: 'Человек пишет слово в комментарии или в личку — например, ДОМ.' },
      { t: 'Подарок', p: 'Бот сразу присылает подарок: чек-лист, разбор, мини-урок.' },
      { t: 'Вопросы', p: 'Два-три коротких вопроса — понять, что человеку нужно.' },
      { t: 'Заявка', p: 'Готовая заявка с ответами приходит тебе — туда, куда скажешь.' }
    ],
    wizard: [
      { key: 'goal', title: 'Зачем тебе бот?', hint: 'Одна цель — бот работает на неё.', options: ['Собирать заявки на консультацию', 'Продавать продукт', 'Набирать подписчиков в Telegram', 'Своё'] },
      { key: 'word', title: 'Кодовое слово', hint: 'Короткое и понятное. Его будут писать в комментариях.', placeholder: 'Например: ДОМ' },
      { key: 'gift', title: 'Какой подарок получит человек?', hint: 'То, что полезно сразу, без долгого чтения.', options: ['Чек-лист', 'Разбор ошибок', 'Мини-урок видео', 'Своё'] },
      { key: 'questions', title: 'Что спросить перед заявкой?', hint: 'До трёх вопросов — по одному в строке.', placeholder: 'Какая у тебя площадь? Когда планируешь ремонт?' },
      { key: 'leads', title: 'Куда присылать заявки?', hint: 'Можно несколько.', options: ['Мне в Telegram', 'На почту', 'В таблицу', 'Менеджеру'] }
    ],
    answers: {}
  };

  var make = {
    actions: [
      { id: 'upload', title: 'Прислать видео или фото', text: 'Скинь в чат с ботом — завод сам поймёт, что из этого собрать.' },
      { id: 'reel_about', title: 'Сделай рилс про…', text: 'Назови тему голосом или текстом — соберу сценарий и ролик.' },
      { id: 'longcut', title: 'Нарезать эфир', text: 'Пришли запись эфира — нарежу короткие ролики по смыслу.' },
      { id: 'carousel_photos', title: 'Карусель из моих фото', text: 'Без нового видео: из тех фото, что уже есть у завода.' },
      { id: 'format_once', title: 'Формат на этот раз', text: 'Следующий ролик — в другом формате, потом вернусь к обычному.' }
    ]
  };

  // ---------- «сервер» для демо ----------
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function findItem(id) {
    for (var d = 0; d < plan.days.length; d++)
      for (var i = 0; i < plan.days[d].items.length; i++)
        if (plan.days[d].items[i].id === id) return { day: plan.days[d], idx: i, it: plan.days[d].items[i] };
    return null;
  }
  var REPLACE = ['Как я провожу первую встречу с семьёй', 'Детская на вырост: что заложить заранее', 'Балкон, который стал кабинетом'];
  var replaceN = 0;

  function handle(method, path, body) {
    body = body || {};
    var m = path.match(/^\/api\/zavod\/(.+)$/);
    if (!m) return { error: 'Не нашёл такой раздел.' };
    var p = m[1];

    if (p === 'me') { var mc = clone(me); mc.onboarding_total = stepKeys().length; mc.tariff.id = tariffs.current; mc.tariff.name = tariffNow().name; return mc; }
    if (p === 'onboarding') { var oc = clone(onboarding); oc.steps = stepsOut(); return oc; }
    if (p === 'onboarding/step' && method === 'POST') {
      var n = +body.step || 0;
      if (n > me.onboarding_step + 1) return { error: 'Этот шаг пока закрыт — сначала предыдущий.' };
      if (body.data && body.data.niche_mode) {
        // ниша меняет число шагов: «не нашёл» добавляет шаг «расскажи голосом»
        onboarding.niche = { mode: body.data.niche_mode, picked: body.data.niches || [] };
      }
      if (n > me.onboarding_step) me.onboarding_step = n;
      me.role = 'client';
      if (body.data) {
        if (body.data.carousel_pick) onboarding.carousel_pick = body.data.carousel_pick;
        if (body.data.reels_default) onboarding.reels_default = body.data.reels_default;
        if (body.data.reels_fav) onboarding.reels_fav = body.data.reels_fav;
        if (body.data.sub_color) onboarding.sub_color = body.data.sub_color;
      }
      return { ok: true, onboarding_step: me.onboarding_step, onboarding_total: stepKeys().length, steps: stepsOut() };
    }
    if (p === 'onboarding/book_pdf' && method === 'POST') return { error: 'Скачать книгу в PDF можно будет за небольшую доплату — сумму сейчас согласуем. Пока книга открыта здесь, в приложении.' };
    if (p === 'onboarding/unpack' && method === 'POST') return { pay_url: 'https://example.invalid/pay/unpack', price: tariffs.once.price };

    // ---------- режим администратора (пункт 12) ----------
    if (/^admin\//.test(p) && !me.admin) return { error: 'Это только для администратора.' };
    if (p === 'admin/reset' && method === 'POST') {
      me.onboarding_step = 0; onboarding.niche = { mode: 'list', picked: [] };
      return { ok: true, onboarding_step: 0, onboarding_total: stepKeys().length };
    }
    if (p === 'admin/set' && method === 'POST') {
      ['no_pay', 'publish_off'].forEach(function (k) { if (k in body) me.admin[k] = !!body[k]; });
      if (body.days_left) me.tariff.days_left = Math.max(1, +body.days_left);
      if (body.tariff && tariffItem(body.tariff)) { tariffs.current = body.tariff; ensureProfiles(); }
      return clone(me.admin);
    }
    if (p === 'onboarding/book' && method === 'POST') {
      onboarding.book.forEach(function (s) { if (s.id === body.id) s.ok = !!body.ok; });
      return { ok: true };
    }
    if (p === 'onboarding/answer' && method === 'POST') {
      onboarding.interview.answered = Math.min(onboarding.interview.total, onboarding.interview.answered + 1);
      return clone(onboarding.interview);
    }

    if (p === 'socials') {
      var cp = curProfile();
      return { items: clone(cp.nets), bot_username: me.bot_username,
        profiles: profiles.map(function (x) { return { id: x.id, type: x.type, on: x.nets.filter(function (s) { return s.state === 'connected'; }).length }; }),
        profile: cp.id, included: incl().profiles, tariff: tariffNow().name };
    }
    if (p === 'socials/profile' && method === 'POST') {
      ensureProfiles();
      if (!profiles.some(function (x) { return x.id === body.id; })) return { error: 'Такого профиля нет.' };
      profileCur = body.id; return { ok: true };
    }
    if (p === 'socials/profile_type' && method === 'POST') {
      if (body.type !== 'personal' && body.type !== 'business') return { error: 'Профиль бывает личный или бизнес.' };
      curProfile().type = body.type; return { ok: true };
    }
    if (p === 'socials/profile_add' && method === 'POST') return { buy: true, note: 'Ещё один профиль — докупка к тарифу. Цену подскажет команда.' };
    var sm = p.match(/^socials\/(\w+)\/(connect|check|disconnect)$/);
    if (sm) {
      socials = curProfile().nets;
      var net = socials.filter(function (s) { return s.id === sm[1]; })[0];
      if (!net) return { error: 'Такой соцсети нет.' };
      if (net.state === 'soon' || net.state === 'unavailable') return { error: 'Эту соцсеть пока нельзя подключить.' };
      if (sm[2] === 'connect') {
        if (net.way === 'admin') return { how: 'admin', bot_username: me.bot_username };
        net.state = 'pending';
        return { how: 'link', url: 'https://example.invalid/connect/' + net.id, valid_hours: 48 };
      }
      if (sm[2] === 'check') {
        if (net.state === 'pending' || net.way === 'admin') { net.state = 'connected'; net.since = '03.10'; }
        return { state: net.state };
      }
      if (sm[2] === 'disconnect') { net.state = 'off'; delete net.since; return { state: 'off' }; }
    }

    if (p === 'plan') {
      var pc = clone(plan), mx = planMax();
      pc.days_selected = Math.min(plan.days_selected || planPrefs.days, mx); pc.default_days = planPrefs.days; pc.presets = planPrefs.presets;
      pc.max_days = mx; pc.days_left = me.tariff.days_left;
      return pc;
    }
    var pm = p.match(/^plan\/(\w+)\/(approve|replace|remove)$/);
    if (pm) {
      var f = findItem(pm[1]);
      if (!f) return { error: 'Пункт уже убран.' };
      if (pm[2] === 'approve') f.it.state = 'approved';
      if (pm[2] === 'replace') { f.it.topic = REPLACE[replaceN++ % REPLACE.length]; f.it.state = 'new'; }
      if (pm[2] === 'remove') f.day.items.splice(f.idx, 1);
      return clone(plan);
    }
    if (p === 'plan/approve_all') {
      plan.days.forEach(function (d) { d.items.forEach(function (it) { it.state = 'approved'; }); });
      return clone(plan);
    }
    if (p === 'plan/add') {
      plan.days[plan.days.length - 1].items.push({ id: 'p' + Date.now(), kind: body.kind || 'reel', format: 'СТАНДАРТ', topic: body.topic || 'Новая тема', state: 'new', time: '19:00' });
      return { ok: true };
    }

    if (p === 'review') { var rc = clone(review); rc.usage = tariffNow(); return rc; }
    var rm = p.match(/^review\/([\w-]+)\/(approve|reject|fix_voice|caption)$/);
    if (rm) {
      var di = -1;
      review.drafts.forEach(function (d, k) { if (d.id === rm[1]) di = k; });
      if (di < 0) return { error: 'Этот черновик уже решён.' };
      var dr = review.drafts[di];
      if (rm[2] === 'approve') {
        var u = tariffNow(), k = dr.kind === 'reel' ? 'reels' : 'carousels';
        if (me.admin && me.admin.publish_off) {
          // тестовый режим: утверждение проходит, но в соцсети ничего не уходит и в тариф не считается
          review.drafts.splice(di, 1); review.done.unshift({ id: dr.id, title: dr.title + ' (тест, не опубликовано)', date: 'тест', nets: [], url: '' });
          var rcx = clone(review); rcx.note = 'Тестовый режим: публикация выключена — в соцсети не ушло.'; return rcx;
        }
        if (u[k].used >= u[k].limit) return { error: 'По тарифу «' + u.name + '» ' + (k === 'reels' ? 'рилсы' : 'карусели') + ' на этот период закончились. Черновик сохранится — опубликуешь после продления или на тарифе побольше.' };
        tariffs.used[k]++;
        review.drafts.splice(di, 1); review.done.unshift({ id: dr.id, title: dr.title, date: 'по плану', nets: dr.nets, url: '' }); }
      if (rm[2] === 'reject') review.drafts.splice(di, 1);
      if (rm[2] === 'fix_voice') { review.drafts.splice(di, 1); review.work.unshift({ id: 'w' + Date.now(), title: dr.title + ' — правка', note: 'Переделываю по твоей поправке — пришлю новый черновик', pct: 0.05 }); }
      if (rm[2] === 'caption') dr.caption = body.caption || dr.caption;
      return clone(review);
    }

    if (p === 'make') return clone(make);
    if (p === 'make/order' && method === 'POST') {
      review.work.unshift({ id: 'w' + Date.now(), title: (body.topic || 'Новый ролик') + ' — рилс', note: 'Начну скоро, готово примерно через 20 минут', pct: 0.02 });
      return { ok: true, note: 'Принял. Пришлю черновик сюда, в «На утверждение».' };
    }

    if (p === 'stats') return clone(stats);
    if (p === 'rivals') return clone(rivals);
    if (p === 'rivals/analyze') return clone(rivals.recipe);
    if (p === 'rivals/channel' && method === 'POST') {
      if (rivals.channels.length >= rivals.max_channels) return { error: 'Можно следить не больше чем за пятью каналами.' };
      rivals.channels.push({ id: 'c' + Date.now(), name: body.name || 'Новый канал', hits: [] });
      return clone(rivals);
    }

    if (p === 'tariffs') { var tc = clone(tariffs); tc.current = tariffs.current; tc.usage = tariffNow(); return tc; }
    if (p === 'tariffs/choose' && method === 'POST') {
      var all = tariffs.items.concat([tariffs.once]);
      if (!all.some(function (x) { return x.id === body.id; })) return { error: 'Такого тарифа нет.' };
      return { pay_url: 'https://example.invalid/pay/' + body.id };
    }
    if (p === 'settings') {
      var tn = tariffNow();
      settings.forEach(function (x) { if (x.id === 'tariff') x.value = tn.name + ' · опубликовано ' + tn.reels.used + ' из ' + tn.reels.limit + ' рилсов и ' + tn.carousels.used + ' из ' + tn.carousels.limit + ' каруселей'; });
      return { items: clone(settings), tariff: tn, plan_days: planPrefs.days, reminders: reminders.on };
    }
    if (p === 'plan/prefs') return clone(planPrefs);
    if (p === 'plan/days' && method === 'POST') {
      var dd = Math.round(+body.days);
      if (!(dd >= planPrefs.min && dd <= planPrefs.max)) return { error: 'Срок — от 1 до 60 дней.' };
      if (!body.as_default && dd > planMax()) return { error: 'До конца подписки ' + me.tariff.days_left + ' ' + daysWord(me.tariff.days_left) + ' — план максимум на ' + planMax() + ' ' + daysWord(planMax()) + '. Продли подписку, чтобы план стал длиннее.' };
      plan.days_selected = dd;
      if (body.as_default) { planPrefs.days = dd; settings.forEach(function (x) { if (x.id === 'plan_days') x.value = dd + ' ' + daysWord(dd); }); }
      return { ok: true, days: dd, default_days: planPrefs.days };
    }
    if (p === 'reminders') return { on: reminders.on, items: remindersList() };
    if (p === 'reminders/set' && method === 'POST') {
      reminders.on = !!body.on;
      settings.forEach(function (x) { if (x.id === 'reminders') { x.on = reminders.on; x.value = reminders.on ? 'Включены' : 'На паузе'; } });
      return { on: reminders.on };
    }
    if (p === 'erase' && method === 'POST') {
      if (body.confirm !== 'Удалить всё') return { error: 'Чтобы удалить, впиши ровно: Удалить всё' };
      return { ok: true, note: 'Демо: в настоящем заводе здесь всё стёрлось бы.' };
    }
    if (p === 'addon') { var ac = clone(addon); ac.included = incl().bots; ac.tariff = tariffNow().name; ac.bots_used = addon.state === 'none' ? 0 : 1; return ac; }
    if (p === 'addon/start' && method === 'POST') { addon.state = 'setup'; return clone(addon); }
    if (p === 'addon/answer' && method === 'POST') { addon.answers[body.key] = body.value; return clone(addon); }
    if (p === 'addon/finish' && method === 'POST') { addon.state = 'manual'; return clone(addon); }
    if (p === 'auth/telegram' && method === 'POST') return { session: 'demo-session-tg' };
    if (p === 'auth/phone' && method === 'POST') {
      if (!/^\+?\d[\d\s()-]{9,}$/.test(body.phone || '')) return { error: 'Проверь номер: нужен полный, с кодом страны.' };
      return { sent: true, code_len: auth.phone_code_len, via: 'Telegram или СМС' };
    }
    if (p === 'auth/code' && method === 'POST') {
      if (String(body.code || '').length !== auth.phone_code_len) return { error: 'Код из ' + auth.phone_code_len + ' цифр.' };
      return { session: 'demo-session-phone' };
    }
    if (p === 'support' && method === 'POST') return { ok: true, note: 'Передал команде. Ответ придёт в чат с ботом.' };
    return { error: 'Не нашёл такой раздел.' };
  }

  function daysWord(n) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'день' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'дня' : 'дней'; }
  function remindersList() {
    var out = [];
    if (!reminders.on) return out;
    var tot = stepKeys().length;
    if (me.role !== 'lead' && me.onboarding_step > 0 && me.onboarding_step < tot)
      out.push({ kind: 'onboarding', text: 'Ты не закончил знакомство: шаг ' + (me.onboarding_step + 1) + ' из ' + tot, go: '/onb/' + (me.onboarding_step + 1) });
    if (me.onboarding_step >= tot && review.drafts.length)
      out.push({ kind: 'drafts', text: 'Ждут утверждения: ' + review.drafts.length + ' ' + (review.drafts.length === 1 ? 'черновик' : review.drafts.length < 5 ? 'черновика' : 'черновиков'), go: '/review' });
    return out;
  }

  window.ZAVOD_MOCK = {
    handle: handle,
    // для демо-переключателей: ?role=lead / ?step=N / ?niche=none / ?left=5 / ?tariff=max / ?admin=1
    setRole: function (r) { me.role = r; if (r === 'lead') me.onboarding_step = 0; },
    setStep: function (n) { me.onboarding_step = Math.max(0, Math.min(stepKeys().length, n)); },
    setNiche: function (m) { onboarding.niche = m === 'none' ? { mode: 'none', picked: ['Дизайн интерьеров', 'Продажа недвижимости, риелтор'] } : { mode: 'list', picked: ['Дизайн интерьеров'] }; },
    setDaysLeft: function (n) { me.tariff.days_left = Math.max(1, +n || 25); },
    setTariff: function (id) { if (tariffItem(id) && id !== 'unpack') { tariffs.current = id; ensureProfiles(); } },
    setAdmin: function (on) { me.admin = on ? { on: true, no_pay: false, publish_off: true } : null; }
  };
})();
