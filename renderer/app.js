'use strict';

/* ═══════════════════════════════════════════════════════════════
   Myanmar Calendar — Production Renderer Application Logic (v2.0)
   Complete implementation of all domain knowledge features
   ═══════════════════════════════════════════════════════════════ */

// ─── Browser Engine Polyfill (PWA / non-Electron fallback) ───────────────────
// When running as a PWA or plain browser (no Electron IPC), wire up the
// in-browser MyanmarCalendarEngine as window.myanmarCalendar so the rest
// of the app works identically without any code changes.
if (typeof window.myanmarCalendar === 'undefined' && typeof window.MyanmarCalendarEngine !== 'undefined') {
  const _e = window.MyanmarCalendarEngine;
  window.myanmarCalendar = {
    getMyanmarDate: (dateStr) => Promise.resolve(_e.getMyanmarDate(dateStr || undefined)),
    getMonthData: (year, month) => Promise.resolve(_e.getMonthData(year, month)),
    getYearData: (year) => Promise.resolve(_e.getYearData(year)),
    getThingyanCountdown: () => Promise.resolve(_e.getThingyanCountdown()),
    getHolidays: (year, month) => Promise.resolve(_e.getMyanmarHolidays(year, month)),
    getToday: () => {
      const t = new Date();
      return Promise.resolve({ year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate(), isoString: t.toISOString() });
    },
    findAuspiciousDates: (purpose, year, month, count) => Promise.resolve(_e.findAuspiciousDates(purpose, year, month, count || 10)),
    exportIcal: (year) => Promise.resolve({ success: false, canceled: true, reason: 'PWA mode: download not supported via IPC' }),
    get8MansionChart: (my, weekday, isWednesdayPM) => Promise.resolve(_e.get8MansionChart(my, weekday, isWednesdayPM)),
    convertMyanmarToGregorian: (my, mm, md) => {
      const g = _e.convertMyanmarToGregorian(my, mm, md);
      return Promise.resolve({ gregorian: g, myanmarDate: _e.getMyanmarDate(new Date(g.year, g.month - 1, g.day)) });
    },
    sendNotification: (options) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(options.title || 'Myanmar Calendar', { body: options.body || '', icon: './icon-192.png' });
      }
      return Promise.resolve({ sent: true });
    },
  };
  console.log('[PWA] Browser engine polyfill loaded — running offline-capable mode');
}


// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  currentView: 'month',
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  yearViewYear: new Date().getFullYear(),
  selectedDay: null,
  monthData: null,
  yearData: null,
  todayInfo: null,
  thingyanInfo: null,
  festivalsYear: new Date().getFullYear(),
  finderPurpose: 'wedding',
  finderYear: new Date().getFullYear(),
  finderMonth: new Date().getMonth() + 1,
  isWednesdayPM: false,
  theme: localStorage.getItem('theme') || 'dark',
};

// ─── DOM References ────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

// ─── Constants ─────────────────────────────────────────────────────────────────
const GREGORIAN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// 12 Authentic Nakhat Animals (နဂါးစက်ဝိုင်း ၁၂ ကောင်)
const NAKHAT_12 = [
  { id: 0,  name: 'Garuda',   nameMM: 'ဂဠုန်',    my: 'Galon',    emoji: '🦅', element: 'Fire' },
  { id: 1,  name: 'Kayar',    nameMM: 'ကြာ',      my: 'Kyar',     emoji: '🦢', element: 'Water' },
  { id: 2,  name: 'Tiger',    nameMM: 'ကျား',     my: 'Kyar',     emoji: '🐯', element: 'Earth' },
  { id: 3,  name: 'Rabbit',   nameMM: 'ယုန်',     my: 'Yon',      emoji: '🐇', element: 'Wood' },
  { id: 4,  name: 'Naga',     nameMM: 'နဂါး',    my: 'Naga',     emoji: '🐉', element: 'Water' },
  { id: 5,  name: 'Elephant', nameMM: 'ဆင်',      my: 'Sin',      emoji: '🐘', element: 'Earth' },
  { id: 6,  name: 'Horse',    nameMM: 'မြင်း',    my: 'Myin',     emoji: '🐎', element: 'Fire' },
  { id: 7,  name: 'Goat',     nameMM: 'သိုး',     my: 'Thoe',     emoji: '🐐', element: 'Earth' },
  { id: 8,  name: 'Monkey',   nameMM: 'မျောက်',   my: 'Myauk',    emoji: '🐒', element: 'Metal' },
  { id: 9,  name: 'Crow',     nameMM: 'ကျီးကန်း', my: 'Kyi-kan',  emoji: '🐦‍⬛', element: 'Air' },
  { id: 10, name: 'Dog',      nameMM: 'ခွေး',     my: 'Khway',    emoji: '🐕', element: 'Earth' },
  { id: 11, name: 'Pig',      nameMM: 'ဝက်',      my: 'Wet',      emoji: '🐖', element: 'Water' },
];

// Myanmar numeral conversion
const MYANMAR_NUMERALS = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
function toMMNum(num) {
  return String(num).split('').map(d => {
    const n = parseInt(d, 10);
    return isNaN(n) ? d : MYANMAR_NUMERALS[n];
  }).join('');
}

// ─── App Initialization ───────────────────────────────────────────────────────
async function init() {
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeUI();

  // Populate Year Selectors
  populateYearSelectors();

  // Load initial datasets
  await Promise.all([
    loadTodayInfo(),
    loadMonthView(state.currentYear, state.currentMonth),
    loadThingyan(),
  ]);

  // Render Nakhat Zodiac Grid
  renderNakhatGrid();

  // Setup Event Listeners
  setupEventListeners();

  // Auto trigger initial Auspicious Finder search
  searchAuspiciousDates();

  // Initialize Modern Flatpickr Date Pickers
  initDatePickers();

  // Hide loading overlay
  setTimeout(() => {
    const overlay = $('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  }, 400);
}

function initDatePickers() {
  if (typeof flatpickr !== 'undefined') {
    // 1. Birth Date Picker for Mahabote
    const birthEl = $('birth-date-input');
    if (birthEl) {
      flatpickr(birthEl, {
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'F j, Y',
        altInputClass: 'date-input date-input-flatpickr',
        defaultDate: '1996-10-25',
        maxDate: 'today',
        animate: true,
        disableMobile: true,
        monthSelectorType: 'dropdown',
        onChange: function(selectedDates, dateStr) {
          if (dateStr) calculateMahaboteChart();
        }
      });
      calculateMahaboteChart();
    }

    // 2. Gregorian to Myanmar Converter Date Picker
    const gregEl = $('gregorian-input');
    if (gregEl) {
      flatpickr(gregEl, {
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'F j, Y',
        altInputClass: 'date-input date-input-flatpickr',
        defaultDate: 'today',
        animate: true,
        disableMobile: true,
        monthSelectorType: 'dropdown',
        onChange: function(selectedDates, dateStr) {
          if (dateStr) convertToMyanmar();
        }
      });
      convertToMyanmar();
    }
  }
}

function populateYearSelectors() {
  const currentYear = new Date().getFullYear();

  // Festivals year selector
  const festSelect = $('festivals-year-select');
  if (festSelect) {
    festSelect.innerHTML = '';
    for (let y = currentYear - 3; y <= currentYear + 4; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = `${y} (${y - 638} ME)`;
      if (y === currentYear) opt.selected = true;
      festSelect.appendChild(opt);
    }
  }

  // Finder year selector
  const finderSelect = $('finder-year-select');
  if (finderSelect) {
    finderSelect.innerHTML = '';
    for (let y = currentYear; y <= currentYear + 3; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = `${y} (${y - 638} ME)`;
      if (y === currentYear) opt.selected = true;
      finderSelect.appendChild(opt);
    }
  }

  const finderMonthSelect = $('finder-month-select');
  if (finderMonthSelect) {
    finderMonthSelect.value = state.currentMonth;
  }
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function loadTodayInfo() {
  try {
    const info = await window.myanmarCalendar.getMyanmarDate();
    state.todayInfo = info;
    renderSidebarToday(info);
  } catch (err) {
    console.error('Failed to load today info:', err);
  }
}

async function loadMonthView(year, month) {
  try {
    const data = await window.myanmarCalendar.getMonthData(year, month);
    state.monthData = data;
    renderMonthView(data);
  } catch (err) {
    console.error('Failed to load month data:', err);
  }
}

async function loadYearView(year) {
  try {
    const data = await window.myanmarCalendar.getYearData(year);
    state.yearData = data;
    renderYearView(data);
  } catch (err) {
    console.error('Failed to load year data:', err);
  }
}

async function loadThingyan() {
  try {
    const info = await window.myanmarCalendar.getThingyanCountdown();
    state.thingyanInfo = info;
    renderThingyan(info);
  } catch (err) {
    console.error('Failed to load thingyan info:', err);
  }
}

async function loadFestivals(year) {
  try {
    const monthsData = [];
    for (let m = 1; m <= 12; m++) {
      const holidays = await window.myanmarCalendar.getHolidays(year, m);
      if (holidays && holidays.length > 0) {
        monthsData.push({ month: m, holidays });
      }
    }
    renderFestivals(year, monthsData);
  } catch (err) {
    console.error('Failed to load festivals:', err);
  }
}

// ─── Sidebar Rendering ────────────────────────────────────────────────────────

function renderSidebarToday(info) {
  if (!info || !info.gregorian) return;

  const g = info.gregorian;
  const m = info.myanmar;
  const aup = info.auspicious;
  const ast = info.astrology;

  // Gregorian string
  const gregDate = new Date(g.year, g.month - 1, g.day);
  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  $('today-gregorian').textContent = gregDate.toLocaleDateString('en-US', options);

  // Buddhist Era (Sasana Year) Badge
  const sasanaBadge = $('today-sasana-badge');
  if (sasanaBadge) {
    sasanaBadge.textContent = `${m.sasanaYear} BE (သာသနာနှစ် ${toMMNum(m.sasanaYear)})`;
  }

  // Myanmar Year
  $('today-myanmar-year').textContent = `${m.year} ME • ${toMMNum(m.year)} ခုနှစ်`;

  // Myanmar Date
  $('today-myanmar-date').textContent = info.formatted.myanmarDateMM;

  // Moon Phase & Sabbath Badge
  const moonSymbols = ['🌙 Waxing', '🌕 Full Moon', '🌗 Waning', '🌑 New Moon'];
  const moonSymbolsMM = ['လဆန်း', 'လပြည့်', 'လဆုတ်', 'လကွယ်'];
  $('today-moon').textContent = `${moonSymbols[m.moonPhase]} (${moonSymbolsMM[m.moonPhase]})`;

  const sabbathBadge = $('today-sabbath-badge');
  if (sabbathBadge) {
    if (aup.sabbath === 1) {
      sabbathBadge.textContent = '☸️ ဥပုသ်နေ့ (Sabbath)';
      sabbathBadge.classList.add('visible');
    } else if (aup.sabbath === 2) {
      sabbathBadge.textContent = '☸️ အဖိတ်နေ့ (Eve)';
      sabbathBadge.classList.add('visible');
    } else {
      sabbathBadge.classList.remove('visible');
    }
  }

  // Weekday Name
  $('today-weekday').textContent = `${ast.weekdayName} (${ast.weekdayNameMM})`;

  // Auspicious Badges
  const itemsContainer = $('auspicious-items');
  itemsContainer.innerHTML = '';

  const badges = [];
  if (aup.isYatyaza)       badges.push({ name: 'Yatyaza (ရက်ရာဇာ)',         cls: 'yatyaza',       icon: '⭐' });
  if (aup.isPyathada)      badges.push({ name: 'Pyathada (ပြဿဒါး)',        cls: 'pyathada',      icon: '⚠️' });
  if (aup.isAfternoonPyathada) badges.push({ name: 'Afternoon Pyathada (မွန်းလွဲ)', cls: 'pyathada', icon: '⚠️' });
  if (aup.isAmyeittasote)  badges.push({ name: 'Amyeittasote (အမြိုက်စိုတ်)',    cls: 'amyeittasote',  icon: '💎' });
  if (aup.isWarameittugyi) badges.push({ name: 'Warameittugyi (ဝါရမိတ္တုကြီး)', cls: 'warameittugyi', icon: '🌟' });
  if (aup.isNagapor)       badges.push({ name: 'Nagapor (နဂါးပေါ်)',         cls: 'nagapor',       icon: '🐉' });
  if (aup.isYatpote)       badges.push({ name: 'Yatpote (ရက်ပုပ်)',         cls: 'holiday',       icon: '🛑' });
  if (aup.sabbath === 1)   badges.push({ name: 'Uposatha (ဥပုသ်နေ့)',       cls: 'amyeittasote',  icon: '☸️' });

  // Add Mahabote & Nakhat summary
  badges.push({
    name: `House: ${aup.mahaboteMM} (${aup.mahabote})`,
    cls: 'yatyaza',
    icon: '🔮'
  });
  badges.push({
    name: `Nagahle: ${aup.nagahleMM}`,
    cls: 'warameittugyi',
    icon: '🧭'
  });

  badges.forEach(b => {
    const item = document.createElement('div');
    item.className = 'auspicious-item';
    item.innerHTML = `
      <span class="auspicious-dot ${b.cls}"></span>
      <span class="badge-icon">${b.icon}</span>
      <span>${b.name}</span>
    `;
    itemsContainer.appendChild(item);
  });
}

function renderThingyan(info) {
  if (!info) return;

  const countdownEl = $('thingyan-countdown');
  const dateEl = $('thingyan-date');
  const timingEl = $('thingyan-timing');

  if (info.isNow) {
    countdownEl.textContent = '🎉 THINGYAN IS NOW! 🎉';
    countdownEl.style.color = 'var(--accent-primary)';
  } else {
    countdownEl.textContent = `${info.daysUntil} Days`;
  }

  if (info.thingyan) {
    const tg = info.thingyan;
    dateEl.textContent = `Akyo: ${info.akyoDateStr} • Year ${tg.myanmarYear} ME`;
    if (timingEl && tg.transitTiming) {
      timingEl.textContent = `Akya: ${tg.transitTiming.akyaTimeStr} | Atat: ${tg.transitTiming.atatTimeStr}`;
    }

    // Detail card in Astrology view
    const detailEl = $('thingyan-detail-content');
    if (detailEl) {
      detailEl.innerHTML = `
        <div class="timing-highlight">
          💧 Solar Transit: Akya at ${tg.transitTiming.akyaTimeStr} | Atat at ${tg.transitTiming.atatTimeStr}
        </div>
        <p><strong>A-kyo Day (သင်္ကြန်အကြို):</strong> ${info.akyoDateStr} — Thagyamin descends.</p>
        <p><strong>A-kya Day (သင်္ကြန်အကျ):</strong> Water festival begins across Myanmar.</p>
        <p><strong>A-tat Day (သင်္ကြန်အတက်):</strong> Thagyamin ascends back to Tavatimsa.</p>
        <p><strong>Myanmar New Year (နှစ်ဆန်းတစ်ရက်):</strong> ${info.newYearDateStr} — Year ${tg.myanmarYear} ME begins (${tg.sasanaYear} BE).</p>
        <p style="font-family:var(--font-myanmar);color:var(--accent-primary);margin-top:4px;">${tg.mythology.descMM}</p>
      `;
    }
  }
}

// ─── Month View Rendering ─────────────────────────────────────────────────────

function renderMonthView(data) {
  if (!data) return;

  // Header Title
  $('month-title').textContent = `${GREGORIAN_MONTHS[data.month - 1]} ${data.year}`;
  $('month-subtitle-mm').textContent =
    `${data.primaryMMMonthMM} ${toMMNum(data.primaryMMYear)} ခုနှစ် (သာသနာနှစ် ${toMMNum(data.primarySasanaYear)})`;

  const grid = $('calendar-grid');
  grid.innerHTML = '';

  // 1. Previous month trailing days
  const prevMonthTotalDays = new Date(data.year, data.month - 1, 0).getDate();
  const firstDay = data.firstDayOfWeek; // 0=Sun..6=Sat

  for (let i = firstDay - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    const cell = createCalendarCell({
      gregorian: { day: dayNum },
      isOtherMonth: true,
    });
    grid.appendChild(cell);
  }

  // 2. Current month days
  data.days.forEach(dayInfo => {
    const cell = createCalendarCell({
      ...dayInfo,
      isOtherMonth: false,
    });
    grid.appendChild(cell);
  });

  // 3. Next month leading days (fill 42 or 35 cells)
  const totalCells = grid.children.length;
  const remaining = (totalCells <= 35 ? 35 : 42) - totalCells;
  for (let i = 1; i <= remaining; i++) {
    const cell = createCalendarCell({
      gregorian: { day: i },
      isOtherMonth: true,
    });
    grid.appendChild(cell);
  }
}

function createCalendarCell(dayInfo) {
  const cell = document.createElement('div');
  cell.className = 'calendar-day cal-day';

  if (dayInfo.isOtherMonth) {
    cell.classList.add('other-month');
    cell.innerHTML = `
      <div class="day-number-row">
        <span class="day-num">${dayInfo.gregorian.day}</span>
      </div>
    `;
    return cell;
  }

  const { gregorian, myanmar, auspicious, holidays } = dayInfo;
  const now = new Date();
  const isToday = dayInfo.isToday || (
    gregorian.year === now.getFullYear() &&
    gregorian.month === (now.getMonth() + 1) &&
    gregorian.day === now.getDate()
  );

  if (isToday) cell.classList.add('today');
  if (gregorian.weekday === 0) cell.classList.add('sunday');
  if (gregorian.weekday === 6) cell.classList.add('saturday', 'weekend');
  if (auspicious.isYatyaza)       cell.classList.add('yatyaza');
  if (auspicious.isPyathada)      cell.classList.add('pyathada');
  if (auspicious.isAmyeittasote)  cell.classList.add('amyeittasote');
  if (auspicious.isWarameittugyi) cell.classList.add('warameittugyi');
  if (auspicious.isNagapor)       cell.classList.add('nagapor');
  if (auspicious.sabbath === 1)   cell.classList.add('sabbath');

  // Moon Symbol
  const moonSymbols = ['🌙', '🌕', '🌗', '🌑'];
  const moonIcon = moonSymbols[myanmar.moonPhase] || '';

  // Generate badges
  const tags = [];
  if (holidays && holidays.length > 0) {
    const holidayName = holidays[0].name.length > 12 ? holidays[0].name.slice(0, 10) + '…' : holidays[0].name;
    tags.push(`<span class="cell-tag holiday" title="${holidays[0].name}">${holidayName}</span>`);
  }
  if (auspicious.isYatyaza) {
    tags.push(`<span class="cell-tag yatyaza">ရက်ရာဇာ</span>`);
  }
  if (auspicious.isPyathada) {
    tags.push(`<span class="cell-tag pyathada">ပြဿဒါး</span>`);
  }
  if (auspicious.isAfternoonPyathada) {
    tags.push(`<span class="cell-tag pyathada">မွန်းလွဲ</span>`);
  }
  if (auspicious.isAmyeittasote) {
    tags.push(`<span class="cell-tag amyeittasote">အမြိုက်စိုတ်</span>`);
  }
  if (auspicious.isNagapor) {
    tags.push(`<span class="cell-tag nagapor">နဂါးပေါ်</span>`);
  }
  if (auspicious.sabbath === 1) {
    tags.push(`<span class="cell-tag sabbath">ဥပုသ်</span>`);
  } else if (auspicious.sabbath === 2) {
    tags.push(`<span class="cell-tag sabbath-eve">အဖိတ်</span>`);
  }

  const todayPill = isToday ? '<span class="today-pill" title="Today / ယနေ့">TODAY</span>' : '';

  cell.innerHTML = `
    <div class="day-number-row">
      <div class="day-num-wrap">
        <span class="day-num ${isToday ? 'today-num' : ''}">${gregorian.day}</span>
        ${todayPill}
      </div>
      <span class="day-moon-icon" title="${myanmar.moonPhaseName} (${myanmar.moonPhaseNameMM})">${moonIcon}</span>
    </div>
    <div class="day-myanmar-num">${toMMNum(myanmar.fortnightDay)}</div>
    <div class="day-myanmar-sub">${myanmar.moonPhaseNameMM}</div>
    <div class="day-tags-container">
      ${tags.slice(0, 2).join('')}
    </div>
  `;

  cell.addEventListener('click', () => {
    $$('.calendar-day.selected, .cal-day.selected').forEach(c => c.classList.remove('selected'));
    cell.classList.add('selected');
    showDayModal(dayInfo);
  });

  return cell;
}

// ─── Day Detail Modal ─────────────────────────────────────────────────────────

function showDayModal(dayInfo) {
  const modal = $('day-modal');
  const overlay = $('modal-overlay');
  const content = $('modal-content');

  const { gregorian, myanmar, auspicious, astrology, holidays, formatted } = dayInfo;
  const date = new Date(gregorian.year, gregorian.month - 1, gregorian.day);

  const signsBadges = (auspicious.signsMM || []).map(s => {
    let cls = 'yatyaza';
    if (s.includes('ပြဿဒါး') || s.includes('ရက်ပုပ်') || s.includes('ယုတ်မာ') || s.includes('ရက်ကြမ်း')) cls = 'pyathada';
    else if (s.includes('အမြိုက်') || s.includes('ဥပုသ်')) cls = 'amyeittasote';
    else if (s.includes('ဝါရမိတ္တု')) cls = 'warameittugyi';
    else if (s.includes('နဂါးပေါ်')) cls = 'nagapor';
    return `<span class="modal-badge ${cls}">${s}</span>`;
  }).join('');

  const holidaysHtml = (holidays || []).map(h => `
    <div class="modal-holiday ${h.type || 'festival'}">
      <div class="modal-holiday-name">${h.name}</div>
      <div class="modal-holiday-mm">${h.nameMM || ''}</div>
      ${h.description ? `<div class="modal-holiday-desc">${h.description}</div>` : ''}
    </div>
  `).join('');

  content.innerHTML = `
    <div class="modal-date-header">
      <div class="modal-gregorian">
        ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
      <div class="modal-myanmar-main">${formatted.myanmarDateMM}</div>
      <div class="modal-myanmar-year">
        မြန်မာသက္ကရာဇ် ${toMMNum(myanmar.year)} ခုနှစ် • သာသနာနှစ် ${toMMNum(myanmar.sasanaYear)} BE
      </div>
    </div>

    ${holidaysHtml ? `
      <div class="modal-section">
        <div class="modal-section-title">Holidays & Observances (ပွဲတော်/အားလပ်ရက်များ)</div>
        ${holidaysHtml}
      </div>
    ` : ''}

    <div class="modal-section">
      <div class="modal-section-title">Auspicious & Traditional Signs (မင်္ဂလာဆိုင်ရာ အချက်အလက်များ)</div>
      <div class="modal-badges">${signsBadges || '<span style="color:var(--text-muted);font-size:12px;">Regular day (သာမန်နေ့)</span>'}</div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Lunisolar & Astrological Attributes (နက္ခတ်ဗေဒင် အသေးစိတ်)</div>
      <div class="modal-grid-2">
        <div class="modal-info-item">
          <span class="modal-info-label">Moon Phase (လဆန်း/လဆုတ်)</span>
          <span class="modal-info-value">${myanmar.moonPhaseName} (${myanmar.moonPhaseNameMM} ${toMMNum(myanmar.fortnightDay)} ရက်)</span>
        </div>
        <div class="modal-info-item">
          <span class="modal-info-label">Month & Year Type (ဝါထပ်အမျိုးအစား)</span>
          <span class="modal-info-value">${myanmar.watatLabel}</span>
        </div>
        <div class="modal-info-item">
          <span class="modal-info-label">Uposatha Sabbath (ဥပုသ်/အဖိတ်)</span>
          <span class="modal-info-value">${auspicious.sabbathStrMM || 'သာမန်နေ့'}</span>
        </div>
        <div class="modal-info-item">
          <span class="modal-info-label">Mahabote House (မဟာဘုတ် အိမ်)</span>
          <span class="modal-info-value mm">${auspicious.mahaboteMM} (${auspicious.mahabote})</span>
        </div>
        <div class="modal-info-item">
          <span class="modal-info-label">Nagahle Head Heading (နဂါးခေါင်းလှည့်)</span>
          <span class="modal-info-value mm">${auspicious.nagahleMM} (${auspicious.nagahle})</span>
        </div>
        <div class="modal-info-item">
          <span class="modal-info-label">Nakhat 12 Zodiac (နဂါးစက်ဝိုင်း)</span>
          <span class="modal-info-value">${astrology.nakhat12.emoji} ${astrology.nakhat12.nameMM} (${astrology.nakhat12.name})</span>
        </div>
        <div class="modal-info-item">
          <span class="modal-info-label">3-Nakhat Being (နက္ခတ် ၃ မျိုး)</span>
          <span class="modal-info-value mm">${astrology.nakhat3.nameMM} (${astrology.nakhat3.name})</span>
        </div>
        <div class="modal-info-item">
          <span class="modal-info-label">Planetary Ruler (ဂြိုဟ်မင်း)</span>
          <span class="modal-info-value">${astrology.planetaryRuler.planetMM} (${astrology.planetaryRuler.name})</span>
        </div>
      </div>
    </div>
  `;

  overlay.classList.add('visible');
}

function closeModal() {
  $('modal-overlay').classList.remove('visible');
}

// ─── Auspicious Date Finder Logic ─────────────────────────────────────────────

async function searchAuspiciousDates() {
  const container = $('finder-results-list');
  const countEl = $('finder-results-count');
  container.innerHTML = '<div class="result-placeholder">Searching calendar engine for optimal auspicious dates...</div>';

  try {
    const year = parseInt($('finder-year-select')?.value) || state.currentYear;
    const month = parseInt($('finder-month-select')?.value) || state.currentMonth;
    const purpose = state.finderPurpose || 'wedding';

    const results = await window.myanmarCalendar.findAuspiciousDates(purpose, year, month, 12);

    if (!results || results.length === 0) {
      container.innerHTML = '<div class="result-placeholder">No matching dates found for this criteria in the selected range.</div>';
      if (countEl) countEl.textContent = '0 dates found';
      return;
    }

    if (countEl) countEl.textContent = `${results.length} auspicious dates found`;
    container.innerHTML = '';

    results.forEach(res => {
      const item = document.createElement('div');
      item.className = 'finder-result-item';

      const reasonsHtml = res.matchReasons.map(r => `<span class="reason-tag">✓ ${r}</span>`).join('');
      const cautionsHtml = (res.cautions || []).map(c => `<span class="caution-tag">⚠️ ${c}</span>`).join('');

      item.innerHTML = `
        <div class="result-date-col">
          <div class="result-gregorian-text">${res.gregorianStr}</div>
          <div class="result-myanmar-text">${res.myanmarDateMM}</div>
          <div class="result-english-sub">${res.myanmarDateStr}</div>
        </div>
        <div class="result-reasons-col">
          ${reasonsHtml}
          ${cautionsHtml}
        </div>
        <div class="result-score-col">
          <div class="score-badge">${res.score}</div>
          <div class="score-label">Favorable Score</div>
        </div>
      `;

      item.addEventListener('click', async () => {
        const fullDate = await window.myanmarCalendar.getMyanmarDate(res.date);
        showDayModal(fullDate);
      });

      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<div style="color:var(--pyathada-color);padding:20px;">Error finding dates: ${err.message}</div>`;
  }
}

// ─── Bidirectional Date Converter ─────────────────────────────────────────────

async function convertToMyanmar() {
  const input = $('gregorian-input').value;
  if (!input) return;

  try {
    const info = await window.myanmarCalendar.getMyanmarDate(input);
    if (!info || !info.myanmar) {
      $('myanmar-result').innerHTML = '<div style="color:var(--pyathada-color)">Conversion failed</div>';
      return;
    }

    const { myanmar, auspicious, astrology, formatted } = info;
    const moonSymbols = ['🌙', '🌕', '🌗', '🌑'];

    const badges = [];
    if (auspicious) {
      if (auspicious.isYatyaza)       badges.push({ cls: 'yatyaza',       label: '⭐ Yatyaza (ရက်ရာဇာ)' });
      if (auspicious.isPyathada)      badges.push({ cls: 'pyathada',      label: '⚠️ Pyathada (ပြဿဒါး)' });
      if (auspicious.isAmyeittasote)  badges.push({ cls: 'amyeittasote',  label: '💎 Amyeittasote (အမြိုက်စိုတ်)' });
      if (auspicious.isWarameittugyi) badges.push({ cls: 'warameittugyi', label: '🌟 Warameittugyi' });
      if (auspicious.isNagapor)       badges.push({ cls: 'nagapor',       label: '🐉 Nagapor (နဂါးပေါ်)' });
      if (auspicious.sabbath === 1)   badges.push({ cls: 'sabbath',       label: '☸️ Sabbath (ဥပုသ်)' });
    }

    $('myanmar-result').innerHTML = `
      <div class="result-main">${formatted.myanmarDateMM}</div>
      <div class="result-sub">
        <strong>${formatted.myanmarDate}</strong><br>
        Myanmar Year: <strong>${myanmar.year} ME (သာသနာနှစ် ${toMMNum(myanmar.sasanaYear)} BE)</strong><br>
        Moon Phase: ${moonSymbols[myanmar.moonPhase]} ${myanmar.moonPhaseName} (${myanmar.moonPhaseNameMM})<br>
        Mahabote House: <strong>${auspicious.mahaboteMM} (${auspicious.mahabote})</strong> • Nagahle: <strong>${auspicious.nagahleMM}</strong><br>
        Weekday: ${astrology ? astrology.weekdayName + ' (' + astrology.weekdayNameMM + ')' : '—'}
      </div>
      <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;">
        ${badges.map(b => `
          <span class="modal-badge ${b.cls}">${b.label}</span>
        `).join('')}
      </div>
    `;
  } catch (err) {
    $('myanmar-result').innerHTML = `<div style="color:var(--pyathada-color)">Error: ${err.message}</div>`;
  }
}

async function convertToGregorian() {
  const myYear = parseInt($('myanmar-year-input').value, 10);
  const myMonth = parseInt($('myanmar-month-input').value, 10);
  const moonPhase = parseInt($('moon-phase-input').value, 10);
  const moonDay = parseInt($('moon-day-input').value, 10) || 1;

  if (!myYear || isNaN(myYear)) {
    $('gregorian-result').innerHTML = '<div style="color:var(--pyathada-color)">Please enter a valid Myanmar year</div>';
    return;
  }

  // Calculate month day (md from 1 to 30) based on moon phase
  let md;
  if (moonPhase === 0) {
    md = moonDay; // Waxing 1-14
  } else if (moonPhase === 1) {
    md = 15;      // Full Moon
  } else if (moonPhase === 2) {
    md = 15 + moonDay; // Waning 1-14 (day 16-29)
  } else {
    md = 30;      // New Moon (or 29 for odd months)
  }

  try {
    const res = await window.myanmarCalendar.convertMyanmarToGregorian(myYear, myMonth, md);
    if (!res || !res.gregorian) {
      $('gregorian-result').innerHTML = '<div style="color:var(--pyathada-color)">Calculation failed</div>';
      return;
    }

    const g = res.gregorian;
    const gregDate = new Date(g.year, g.month - 1, g.day);
    const dateStr = gregDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    $('gregorian-result').innerHTML = `
      <div class="result-main">${dateStr}</div>
      <div class="result-sub">
        Exact Julian Day Number: <strong>${res.jdn}</strong><br>
        Myanmar Date: <strong>${res.myanmarDate.formatted.myanmarDateMM}</strong><br>
        Signs: ${res.myanmarDate.auspicious.signsMM.join(', ') || 'Regular Day'}<br>
        Sasana Year: <strong>${toMMNum(res.myanmarDate.myanmar.sasanaYear)} BE</strong>
      </div>
    `;
  } catch (err) {
    $('gregorian-result').innerHTML = `<div style="color:var(--pyathada-color)">Error: ${err.message}</div>`;
  }
}

// ─── Festivals & iCal Export ──────────────────────────────────────────────────

async function renderFestivals(year, monthsData) {
  const container = $('festivals-container');
  container.innerHTML = '';

  for (const { month, holidays } of monthsData) {
    if (!holidays || holidays.length === 0) continue;

    const section = document.createElement('div');
    section.className = 'festival-month';

    section.innerHTML = `
      <div class="festival-month-title">
        ${GREGORIAN_MONTHS[month - 1]} ${year}
      </div>
    `;

    holidays.forEach(h => {
      const date = h.date ? new Date(h.date) : null;
      const dayNum = date ? date.getDate() : '?';
      const weekday = date ? WEEKDAY_NAMES[date.getDay()].slice(0, 3) : '';

      const item = document.createElement('div');
      item.className = 'festival-item';
      item.innerHTML = `
        <div class="festival-day">
          <div class="festival-day-num">${dayNum}</div>
          <div class="festival-day-weekday">${weekday}</div>
        </div>
        <div>
          <div class="festival-name">${h.name || ''}</div>
          <div class="festival-name-mm">${h.nameMM || ''}</div>
          ${h.description ? `<div class="festival-desc">${h.description}</div>` : ''}
        </div>
        <span class="festival-type-badge ${h.type || 'festival'}">${h.type || 'Festival'}</span>
      `;
      section.appendChild(item);
    });

    container.appendChild(section);
  }

  if (container.children.length === 0) {
    container.innerHTML = `
      <div style="color:var(--text-muted);text-align:center;padding:40px">
        No holidays recorded for ${year}
      </div>
    `;
  }
}

async function exportIcal(year) {
  try {
    const res = await window.myanmarCalendar.exportIcal(year);
    if (res && res.success) {
      showToast(`✅ Exported Myanmar holidays to: ${res.filePath}`);
    } else if (res && res.canceled && res.reason) {
      // PWA mode — generate ICS and trigger browser download
      if (typeof window.MyanmarCalendarEngine !== 'undefined') {
        const icsData = window.MyanmarCalendarEngine.generateIcsCalendar(year);
        const blob = new Blob([icsData], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `myanmar-holidays-${year}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`✅ Downloaded myanmar-holidays-${year}.ics`);
      }
    } else if (res && !res.canceled) {
      showToast('⚠️ Export canceled or failed');
    }
  } catch (err) {
    showToast(`❌ Export error: ${err.message}`);
  }
}

// ─── 8-Mansion Astrology & Mahabote ───────────────────────────────────────────

function renderNakhatGrid() {
  const grid = $('nakhat-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const today = new Date();
  const currentMyanmarYear = today.getFullYear() - 638;
  const currentNakhatIdx = ((currentMyanmarYear % 12) + 12) % 12;

  NAKHAT_12.forEach((animal, idx) => {
    const item = document.createElement('div');
    const isCurrent = (idx === currentNakhatIdx);
    item.className = `nakhat-item${isCurrent ? ' current-year' : ''}`;
    item.innerHTML = `
      <div class="nakhat-animal">${animal.emoji}</div>
      <div class="nakhat-name">${animal.name} (${animal.nameMM})</div>
      <div class="nakhat-year">${animal.element} • ${animal.my}</div>
      ${isCurrent ? '<div style="font-size:9px;color:var(--accent-primary);margin-top:2px;font-weight:700;">★ THIS YEAR</div>' : ''}
    `;
    grid.appendChild(item);
  });
}

async function calculateMahaboteChart() {
  const birthInput = $('birth-date-input').value;
  if (!birthInput) {
    showToast('Please select a birth date first.');
    return;
  }

  const date = new Date(birthInput);
  const weekday = date.getDay(); // 0=Sun..6=Sat
  const my = date.getFullYear() - 638;

  try {
    const chart = await window.myanmarCalendar.get8MansionChart(my, weekday, state.isWednesdayPM);
    if (!chart || !chart.ruler) return;

    const container = $('mahabote-chart-container');
    const ruler = chart.ruler;

    const mansionsHtml = chart.mansions.map(m => `
      <div class="mansion-card${m.isBirthHouse ? ' birth-house' : ''}">
        ${m.isBirthHouse ? '<span class="birth-house-badge">Birth House</span>' : ''}
        <div class="mansion-house-name">${m.key}</div>
        <div class="mansion-house-mm">${m.nameMM}</div>
        <div class="mansion-theme">${m.theme}</div>
        <div class="mansion-ruler">Ruler: ${m.planetRuler}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:8px;line-height:1.3;">${m.desc}</div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="mahabote-header-summary">
        <div class="summary-pill">
          <div class="summary-pill-label">Planetary Ruler (ဂြိုဟ်မင်း)</div>
          <div class="summary-pill-val" style="color:${ruler.color}">${ruler.name} (${ruler.planetMM})</div>
        </div>
        <div class="summary-pill">
          <div class="summary-pill-label">Animal Symbol (ရာသီသတ္တဝါ)</div>
          <div class="summary-pill-val">${ruler.animal}</div>
        </div>
        <div class="summary-pill">
          <div class="summary-pill-label">Lucky Direction (အရပ်မျက်နှာ)</div>
          <div class="summary-pill-val">${ruler.direction}</div>
        </div>
        <div class="summary-pill">
          <div class="summary-pill-label">Lucky Numbers (ကံကောင်းသောဂဏန်း)</div>
          <div class="summary-pill-val">${ruler.luckyNum.join(', ')}</div>
        </div>
      </div>

      <div class="mansions-grid">
        ${mansionsHtml}
      </div>
    `;
  } catch (err) {
    showToast(`Chart calculation error: ${err.message}`);
  }
}

// ─── Toast Helper ─────────────────────────────────────────────────────────────

function showToast(msg) {
  const container = $('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── View Switching ───────────────────────────────────────────────────────────

function switchView(viewName) {
  // Sync desktop sidebar nav buttons
  $$('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Sync mobile bottom tab bar
  $$('.tab-item').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === viewName);
  });

  $$('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${viewName}`);
  });

  state.currentView = viewName;

  if (viewName === 'year' && !state.yearData) {
    loadYearView(state.yearViewYear);
  }
  if (viewName === 'festivals') {
    loadFestivals(state.festivalsYear);
  }
  if (viewName === 'finder') {
    searchAuspiciousDates();
  }

  // Auto-close drawer on mobile after navigating
  closeMobileDrawer();
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('theme', state.theme);
  updateThemeUI();
}

function updateThemeUI() {
  const isDark = state.theme === 'dark';
  const icon = $('theme-icon');
  const label = $('theme-label');
  const mobileIcon = $('mobile-theme-icon');
  if (icon) icon.textContent = isDark ? '☀️' : '🌙';
  if (label) label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  if (mobileIcon) mobileIcon.textContent = isDark ? '☀️' : '🌙';
}

// ─── Mobile Drawer Helpers ────────────────────────────────────────────────────

function openMobileDrawer() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = $('sidebar-backdrop');
  if (sidebar) sidebar.classList.add('drawer-open');
  if (backdrop) backdrop.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeMobileDrawer() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = $('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('drawer-open');
  if (backdrop) backdrop.classList.remove('visible');
  document.body.style.overflow = '';
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

function setupEventListeners() {
  // Navigation buttons
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Month navigation
  $('prev-month')?.addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 1) { state.currentMonth = 12; state.currentYear--; }
    loadMonthView(state.currentYear, state.currentMonth);
  });

  $('next-month')?.addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 12) { state.currentMonth = 1; state.currentYear++; }
    loadMonthView(state.currentYear, state.currentMonth);
  });

  $('goto-today')?.addEventListener('click', () => {
    const today = new Date();
    state.currentYear = today.getFullYear();
    state.currentMonth = today.getMonth() + 1;
    loadTodayInfo();
    loadMonthView(state.currentYear, state.currentMonth);
  });

  // Year navigation
  $('prev-year')?.addEventListener('click', () => {
    state.yearViewYear--;
    $('year-title').textContent = state.yearViewYear;
    $('year-subtitle-mm').textContent = `မြန်မာသက္ကရာဇ် ${toMMNum(state.yearViewYear - 638)} ခုနှစ်`;
    loadYearView(state.yearViewYear);
  });

  $('next-year')?.addEventListener('click', () => {
    state.yearViewYear++;
    $('year-title').textContent = state.yearViewYear;
    $('year-subtitle-mm').textContent = `မြန်မာသက္ကရာဇ် ${toMMNum(state.yearViewYear - 638)} ခုနှစ်`;
    loadYearView(state.yearViewYear);
  });

  $('goto-year-today')?.addEventListener('click', () => {
    state.yearViewYear = new Date().getFullYear();
    $('year-title').textContent = state.yearViewYear;
    $('year-subtitle-mm').textContent = `မြန်မာသက္ကရာဇ် ${toMMNum(state.yearViewYear - 638)} ခုနှစ်`;
    loadYearView(state.yearViewYear);
  });

  // Auspicious Finder Purpose buttons
  $$('.purpose-card').forEach(card => {
    card.addEventListener('click', () => {
      $$('.purpose-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.finderPurpose = card.dataset.purpose;
      searchAuspiciousDates();
    });
  });

  $('finder-search-btn')?.addEventListener('click', () => searchAuspiciousDates());

  // Date Converter
  $('convert-to-myanmar')?.addEventListener('click', convertToMyanmar);
  $('convert-to-gregorian')?.addEventListener('click', convertToGregorian);

  // Festivals year change
  $('festivals-year-select')?.addEventListener('change', (e) => {
    state.festivalsYear = parseInt(e.target.value, 10);
    loadFestivals(state.festivalsYear);
  });

  // iCal export buttons
  $('export-month-ics')?.addEventListener('click', () => exportIcal(state.currentYear));
  $('export-festivals-ics')?.addEventListener('click', () => exportIcal(state.festivalsYear));

  // Astrology Wednesday AM/PM toggle
  $('wed-am-btn')?.addEventListener('click', () => {
    $('wed-am-btn').classList.add('active');
    $('wed-pm-btn').classList.remove('active');
    state.isWednesdayPM = false;
    calculateMahaboteChart();
  });

  $('wed-pm-btn')?.addEventListener('click', () => {
    $('wed-pm-btn').classList.add('active');
    $('wed-am-btn').classList.remove('active');
    state.isWednesdayPM = true;
    calculateMahaboteChart();
  });

  $('calc-mahabote')?.addEventListener('click', calculateMahaboteChart);

  // Desktop notification test button
  $('notify-test-btn')?.addEventListener('click', async () => {
    if (state.todayInfo) {
      await window.myanmarCalendar.sendNotification({
        title: `🗓️ ${state.todayInfo.formatted.myanmarDateMM}`,
        body: `${state.todayInfo.formatted.fullDateMM} • Signs: ${state.todayInfo.auspicious.signsMM.join(', ') || 'Regular Day'}`,
      });
      showToast('🔔 Notification sent to macOS Notification Center');
    }
  });

  // Theme toggle
  $('theme-toggle')?.addEventListener('click', toggleTheme);

  // Modal close
  $('modal-close')?.addEventListener('click', closeModal);
  $('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === $('modal-overlay')) closeModal();
  });

  // Keyboard shortcuts (Escape to close modal, arrows for month navigation)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (state.currentView === 'month' && !$('modal-overlay').classList.contains('visible')) {
      if (e.key === 'ArrowLeft') $('prev-month')?.click();
      if (e.key === 'ArrowRight') $('next-month')?.click();
    }
  });

  // Automatic date rollover check (every 30 seconds & on window focus)
  function checkDateRollover() {
    const now = new Date();
    if (state.todayInfo && state.todayInfo.gregorian) {
      if (state.todayInfo.gregorian.day !== now.getDate() ||
          state.todayInfo.gregorian.month !== (now.getMonth() + 1) ||
          state.todayInfo.gregorian.year !== now.getFullYear()) {
        loadTodayInfo();
        if (state.currentView === 'month' &&
            state.currentYear === now.getFullYear() &&
            state.currentMonth === (now.getMonth() + 1)) {
          loadMonthView(state.currentYear, state.currentMonth);
        }
      }
    }
  }
  setInterval(checkDateRollover, 30000);
  window.addEventListener('focus', checkDateRollover);

  // ── Mobile Navigation ───────────────────────────────────────────────

  // Bottom tab bar
  $$('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // Hamburger menu: open sidebar drawer
  $('mobile-menu-btn')?.addEventListener('click', openMobileDrawer);
  $('sidebar-backdrop')?.addEventListener('click', closeMobileDrawer);

  // Mobile theme toggle
  $('mobile-theme-btn')?.addEventListener('click', toggleTheme);

  // ── PWA Install Prompt ──────────────────────────────────────────────
  let _pwaInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _pwaInstallPrompt = e;
    const banner = $('pwa-install-banner');
    if (banner && !localStorage.getItem('pwa-install-dismissed')) {
      banner.removeAttribute('hidden');
    }
  });

  $('pwa-install-btn')?.addEventListener('click', async () => {
    if (!_pwaInstallPrompt) return;
    _pwaInstallPrompt.prompt();
    const { outcome } = await _pwaInstallPrompt.userChoice;
    _pwaInstallPrompt = null;
    $('pwa-install-banner').setAttribute('hidden', '');
    if (outcome === 'accepted') {
      showToast('✅ Myanmar Calendar installed!');
    }
  });

  $('pwa-dismiss-btn')?.addEventListener('click', () => {
    $('pwa-install-banner').setAttribute('hidden', '');
    localStorage.setItem('pwa-install-dismissed', '1');
  });

  window.addEventListener('appinstalled', () => {
    $('pwa-install-banner')?.setAttribute('hidden', '');
    showToast('🎉 Myanmar Calendar installed successfully!');
  });
}

// Year View Rendering
function renderYearView(data) {
  const container = $('year-grid');
  if (!container || !data || !data.months) return;
  container.innerHTML = '';

  const miniWeekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  data.months.forEach(m => {
    const monthCard = document.createElement('div');
    monthCard.className = 'mini-month year-month-card glass-card';

    let daysHtml = '';

    // Weekday headers
    miniWeekdays.forEach((wd, i) => {
      const cls = (i === 0) ? 'sunday' : (i === 6) ? 'saturday' : '';
      daysHtml += `<div class="mini-day-header ${cls}">${wd}</div>`;
    });

    // Leading empty days for first day of week
    for (let i = 0; i < m.firstDayOfWeek; i++) {
      daysHtml += `<div class="mini-day empty"></div>`;
    }

    // Days of the month
    m.days.forEach(d => {
      const isSunday = d.gregorian.weekday === 0;
      const isSaturday = d.gregorian.weekday === 6;
      const hasHoliday = d.holidays && d.holidays.length > 0;
      const isFullMoon = d.myanmar && d.myanmar.moonPhase === 1;
      const isSabbath = d.auspicious && d.auspicious.sabbath === 1;

      let classes = ['mini-day'];
      if (d.isToday) classes.push('today', 'today-mini');
      if (isSunday) classes.push('sunday-mini');
      if (isSaturday) classes.push('saturday-mini');
      if (hasHoliday) classes.push('has-holiday');

      let dotCls = '';
      if (hasHoliday) dotCls = 'holiday';
      else if (isFullMoon) dotCls = 'full-moon';
      else if (isSabbath) dotCls = 'sabbath';
      else if (d.auspicious && d.auspicious.isYatyaza) dotCls = 'yatyaza';
      else if (d.auspicious && d.auspicious.isPyathada) dotCls = 'pyathada';

      daysHtml += `
        <div class="${classes.join(' ')}" title="${d.gregorian.day} ${GREGORIAN_MONTHS[m.month - 1]} — ${d.formatted.myanmarDateMM}">
          <span class="mini-day-num">${d.gregorian.day}</span>
          ${dotCls ? `<span class="mini-dot ${dotCls}"></span>` : ''}
        </div>
      `;
    });

    monthCard.innerHTML = `
      <div class="mini-month-header year-month-header">
        <h4 class="mini-month-title">${GREGORIAN_MONTHS[m.month - 1]}</h4>
        <span class="mini-month-mm year-month-mm">${m.primaryMMMonthMM}</span>
      </div>
      <div class="mini-grid mini-calendar-grid">
        ${daysHtml}
      </div>
    `;

    monthCard.addEventListener('click', () => {
      state.currentYear = data.year;
      state.currentMonth = m.month;
      switchView('month');
      loadMonthView(state.currentYear, state.currentMonth);
    });

    container.appendChild(monthCard);
  });
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', init);
