'use strict';

/* ═══════════════════════════════════════════════════════════════
   Myanmar Calendar — Renderer Application Logic
   Production-grade frontend with all features
   ═══════════════════════════════════════════════════════════════ */

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
  theme: localStorage.getItem('theme') || 'dark',
};

// ─── DOM References ────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

// ─── Weekday short names ───────────────────────────────────────────────────────
const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const GREGORIAN_MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// ─── Myanmar Astrology Data ───────────────────────────────────────────────────
const NAKHAT_ANIMALS = [
  { emoji: '🐇', name: 'Tagu',    nameMM: 'တန်ခူး',      cycle: 1 },
  { emoji: '🐉', name: 'Kason',   nameMM: 'ကဆုန်',       cycle: 2 },
  { emoji: '🐍', name: 'Nayon',   nameMM: 'နယုန်',        cycle: 3 },
  { emoji: '🐎', name: 'Waso',    nameMM: 'ဝါဆို',       cycle: 4 },
  { emoji: '🐐', name: 'Wagaung', nameMM: 'ဝါခေါင်',     cycle: 5 },
  { emoji: '🐒', name: 'Tawthalin',nameMM: 'တော်သလင်း', cycle: 6 },
  { emoji: '🐓', name: 'Thadingyut',nameMM:'သီတင်းကျွတ်',cycle: 7 },
  { emoji: '🐕', name: 'Tazaungmon',nameMM:'တန်ဆောင်မုန်း',cycle:8},
  { emoji: '🐘', name: 'Nadaw',   nameMM: 'နတ်တော်',      cycle: 9 },
  { emoji: '🐀', name: 'Pyatho',  nameMM: 'ပြာသို',      cycle: 10 },
  { emoji: '🐂', name: 'Tabodwe', nameMM: 'တပို့တွဲ',    cycle: 11 },
  { emoji: '🐯', name: 'Tabaung', nameMM: 'တပေါင်း',     cycle: 12 },
];

const MAHABOTE_DATA = {
  'Binga':    { planet: 'Sun ☀️',    lucky: 'Sunday',     desc: 'Leadership, authority, royalty. Bold decisions, high ambitions.', color: '#f59e0b' },
  'Atun':     { planet: 'Moon 🌙',   lucky: 'Monday',     desc: 'Intuition, creativity, adaptability. Sensitive and empathetic.', color: '#93c5fd' },
  'Yaza':     { planet: 'Mars ♂️',   lucky: 'Tuesday',    desc: 'Energy, courage, action. Warrior spirit, competitive nature.', color: '#f87171' },
  'Adipati':  { planet: 'Mercury ☿', lucky: 'Wednesday',  desc: 'Intelligence, communication, trade. Clever and resourceful.', color: '#86efac' },
  'Marana':   { planet: 'Jupiter ♃', lucky: 'Thursday',   desc: 'Wisdom, spirituality, expansion. Philosophical and generous.', color: '#d8b4fe' },
  'Thike':    { planet: 'Venus ♀',   lucky: 'Friday',     desc: 'Love, beauty, harmony. Artistic and charming personality.', color: '#f9a8d4' },
  'Puti':     { planet: 'Saturn ♄',  lucky: 'Saturday',   desc: 'Discipline, endurance, karma. Patient and hardworking.', color: '#94a3b8' },
};

// ─── App Initialization ───────────────────────────────────────────────────────
async function init() {
  // Apply theme
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeUI();

  // Load initial data
  await Promise.all([
    loadTodayInfo(),
    loadMonthView(state.currentYear, state.currentMonth),
    loadThingyan(),
  ]);

  // Populate festivals year selector
  const select = $('festivals-year-select');
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 2; y <= currentYear + 3; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = `${y} (${y - 638} ME)`;
    if (y === currentYear) opt.selected = true;
    select.appendChild(opt);
  }

  // Initialize Nakhat grid
  renderNakhatGrid();

  // Hide loading
  setTimeout(() => {
    $('loading-overlay').classList.add('hidden');
  }, 600);

  setupEventListeners();
}

// ─── Data Loading ─────────────────────────────────────────────────────────────
async function loadTodayInfo() {
  try {
    const today = new Date();
    const dateStr = today.toISOString();
    const info = await window.myanmarCalendar.getMyanmarDate(dateStr);

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
    console.error('Failed to load thingyan:', err);
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

  // Gregorian date
  $('today-gregorian').textContent =
    `${GREGORIAN_MONTHS[g.month - 1]} ${g.day}, ${g.year}`;

  // Myanmar year
  $('today-myanmar-year').textContent = `${m.year} မြန်မာသက္ကရာဇ်`;

  // Myanmar date
  $('today-myanmar-date').textContent = info.formatted.myanmarDateMM;

  // Moon phase
  const moonSymbols = ['🌙', '🌕', '🌗', '🌑'];
  $('today-moon').textContent = moonSymbols[m.moonPhase] || '🌙';

  // Weekday
  $('today-weekday').textContent = `${ast.weekdayNameMM} • ${ast.weekdayName}`;

  // Auspicious badges
  const container = $('auspicious-items');
  container.innerHTML = '';

  const badges = [];
  if (aup.isYatyaza)      badges.push({ cls: 'yatyaza',       label: 'Yatyaza ⭐' });
  if (aup.isPyathada)     badges.push({ cls: 'pyathada',      label: 'Pyathada ⚠️' });
  if (aup.isAmyeittasote) badges.push({ cls: 'amyeittasote',  label: 'Amyeittasote 💎' });
  if (aup.isWarameittugyi)badges.push({ cls: 'warameittugyi', label: 'Warameittugyi 🌟' });
  if (badges.length === 0) badges.push({ cls: 'none', label: 'Regular Day' });

  badges.forEach(b => {
    const el = document.createElement('span');
    el.className = `ausp-badge ${b.cls}`;
    el.textContent = b.label;
    container.appendChild(el);
  });
}

function renderThingyan(info) {
  if (!info) return;
  const { daysUntil, thingyan, isNow } = info;

  if (isNow) {
    $('thingyan-countdown').textContent = '🎉 NOW!';
    $('thingyan-date').textContent = `Myanmar New Year ${thingyan.myanmarYear} ME`;
  } else {
    $('thingyan-countdown').textContent = `${daysUntil} days`;
    const d = thingyan.akyoDay;
    if (d) {
      $('thingyan-date').textContent =
        `Thingyan ${GREGORIAN_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }
  }
}

// ─── Month View Rendering ─────────────────────────────────────────────────────
function renderMonthView(data) {
  if (!data) return;

  const { year, month, firstDayOfWeek, totalDays, days, holidays } = data;

  // Header
  $('month-title').textContent = `${GREGORIAN_MONTHS[month - 1]} ${year}`;

  // Get Myanmar month name from first day of the month
  const firstDayMM = days[0];
  if (firstDayMM && firstDayMM.myanmar) {
    $('month-subtitle-mm').textContent =
      `${firstDayMM.myanmar.monthNameMM} ၊ ${firstDayMM.myanmar.year} မြန်မာသက္ကရာဇ်`;
  }

  // Build grid
  const grid = $('calendar-grid');
  grid.innerHTML = '';

  const weekdays = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  // Previous month filler days
  const prevMonthDays = firstDayOfWeek;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthTotal = new Date(prevYear, prevMonth, 0).getDate();

  for (let i = prevMonthDays - 1; i >= 0; i--) {
    const dayNum = prevMonthTotal - i;
    const cell = document.createElement('div');
    cell.className = 'cal-day other-month';
    cell.innerHTML = `<div class="day-num">${dayNum}</div>`;
    grid.appendChild(cell);
  }

  // Current month days
  days.forEach((dayInfo, idx) => {
    const dayNum = idx + 1;
    const cell = createDayCell(dayInfo, dayNum, year, month);
    grid.appendChild(cell);
  });

  // Next month filler
  const totalCells = prevMonthDays + totalDays;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remainingCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day other-month';
    cell.innerHTML = `<div class="day-num">${i}</div>`;
    grid.appendChild(cell);
  }
}

function createDayCell(dayInfo, dayNum, year, month) {
  const { myanmar, auspicious, holidays, isToday, isWeekend, gregorian } = dayInfo;
  const weekday = gregorian ? gregorian.weekday : 0;
  const isSunday = weekday === 0;
  const isSaturday = weekday === 6;

  const cell = document.createElement('div');
  let cellClass = 'cal-day';
  if (isToday) cellClass += ' today';
  if (isWeekend) cellClass += ' weekend';
  if (isSunday) cellClass += ' sunday';
  cell.className = cellClass;

  // Indicators
  const indicators = [];
  if (auspicious) {
    if (auspicious.isYatyaza)       indicators.push('<span class="day-indicator yatyaza"></span>');
    if (auspicious.isPyathada)      indicators.push('<span class="day-indicator pyathada"></span>');
    if (auspicious.isAmyeittasote)  indicators.push('<span class="day-indicator amyeittasote"></span>');
    if (auspicious.isWarameittugyi) indicators.push('<span class="day-indicator warameittugyi"></span>');
  }
  if (holidays && holidays.length > 0) {
    indicators.push('<span class="day-indicator holiday"></span>');
  }

  // Moon phase
  let moonHtml = '';
  if (myanmar) {
    const moonPhase = myanmar.moonPhase;
    const moonSymbols = ['', '🌕', '', '🌑'];
    const moonClass = moonPhase === 1 ? 'full' : moonPhase === 3 ? 'new' : '';
    if (moonSymbols[moonPhase]) {
      moonHtml = `<div class="day-moon ${moonClass}">${moonSymbols[moonPhase]}</div>`;
    }
    // Waxing/waning lunar day number
    if (!moonSymbols[moonPhase] && myanmar.moonDay) {
      const phaseChar = moonPhase === 0 ? '↑' : '↓';
      moonHtml = `<div class="day-moon">${phaseChar}${myanmar.moonDay}</div>`;
    }
  }

  // Myanmar date text
  let myanmarHtml = '';
  if (myanmar) {
    const phaseMM = ['လဆန်း','လပြည့်','လဆုတ်','လကွယ်'];
    if (myanmar.moonPhase === 1) {
      myanmarHtml = `${myanmar.monthNameMM}<br>လပြည့်`;
    } else if (myanmar.moonPhase === 3) {
      myanmarHtml = `${myanmar.monthNameMM}<br>လကွယ်`;
    } else {
      myanmarHtml = `${phaseMM[myanmar.moonPhase]} ${myanmar.moonDay}`;
    }
  }

  // Holiday label
  let holidayHtml = '';
  if (holidays && holidays.length > 0) {
    const h = holidays[0];
    holidayHtml = `<div class="day-holiday-label">${h.name}</div>`;
  }

  cell.innerHTML = `
    <div class="day-indicators">${indicators.join('')}</div>
    <div class="day-num">${dayNum}</div>
    ${moonHtml}
    <div class="day-myanmar">${myanmarHtml}</div>
    ${holidayHtml}
  `;

  // Click handler
  cell.addEventListener('click', () => showDayModal(dayInfo, dayNum, year, month));

  return cell;
}

// ─── Year View Rendering ──────────────────────────────────────────────────────
function renderYearView(data) {
  if (!data) return;

  $('year-title').textContent = data.year;
  $('year-subtitle-mm').textContent = `မြန်မာသက္ကရာဇ် ${data.year - 638}`;

  const grid = $('year-grid');
  grid.innerHTML = '';

  data.months.forEach((monthData, idx) => {
    const monthNum = idx + 1;
    const miniEl = createMiniMonth(monthData, data.year, monthNum);
    grid.appendChild(miniEl);
  });
}

function createMiniMonth(monthData, year, month) {
  const container = document.createElement('div');
  container.className = 'mini-month';

  const firstDayMM = monthData.days[0];
  const mmMonthName = firstDayMM?.myanmar?.monthNameMM || '';

  container.innerHTML = `
    <div class="mini-month-title">${GREGORIAN_MONTHS[month - 1]}</div>
    <div class="mini-month-mm">${mmMonthName}</div>
    <div class="mini-grid">
      ${WEEKDAY_SHORT.map(d => `<div class="mini-day-header">${d}</div>`).join('')}
      ${buildMiniDays(monthData, year, month)}
    </div>
  `;

  container.addEventListener('click', () => {
    state.currentYear = year;
    state.currentMonth = month;
    switchView('month');
    loadMonthView(year, month);
  });

  return container;
}

function buildMiniDays(monthData, year, month) {
  const { firstDayOfWeek, totalDays, days } = monthData;
  let html = '';

  // Filler
  for (let i = 0; i < firstDayOfWeek; i++) {
    html += '<div class="mini-day other-m"></div>';
  }

  days.forEach((dayInfo, idx) => {
    const dayNum = idx + 1;
    const weekday = dayInfo.gregorian ? dayInfo.gregorian.weekday : (firstDayOfWeek + idx) % 7;
    let cls = 'mini-day';
    if (dayInfo.isToday) cls += ' today-mini';
    if (dayInfo.holidays && dayInfo.holidays.length > 0) cls += ' has-holiday';
    if (dayInfo.myanmar && dayInfo.myanmar.moonPhase === 1) cls += ' has-full-moon';
    if (weekday === 0) cls += ' sunday-mini';
    if (weekday === 6) cls += ' saturday-mini';
    html += `<div class="${cls}">${dayNum}</div>`;
  });

  return html;
}

// ─── Day Modal ────────────────────────────────────────────────────────────────
function showDayModal(dayInfo, dayNum, year, month) {
  if (!dayInfo || !dayInfo.myanmar) return;

  const { gregorian, myanmar, auspicious, astrology, holidays, formatted } = dayInfo;
  const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const weekday = gregorian ? weekdayNames[gregorian.weekday] : '';
  const moonSymbols = ['🌙', '🌕', '🌗', '🌑'];

  const holidaysHtml = holidays && holidays.length > 0
    ? holidays.map(h => `
        <div class="modal-holiday ${h.type || 'festival'}">
          <div class="modal-holiday-name">${h.name}</div>
          ${h.nameMM ? `<div class="modal-holiday-mm">${h.nameMM}</div>` : ''}
          ${h.description ? `<div class="modal-holiday-desc">${h.description}</div>` : ''}
        </div>
      `).join('')
    : '<div style="color:var(--text-muted);font-size:12px;">No holidays</div>';

  const badges = [];
  if (auspicious) {
    if (auspicious.isYatyaza)       badges.push({ cls: 'yatyaza',       label: '⭐ Yatyaza' });
    if (auspicious.isPyathada)      badges.push({ cls: 'pyathada',      label: '⚠️ Pyathada' });
    if (auspicious.isAmyeittasote)  badges.push({ cls: 'amyeittasote',  label: '💎 Amyeittasote' });
    if (auspicious.isWarameittugyi) badges.push({ cls: 'warameittugyi', label: '🌟 Warameittugyi' });
  }
  const badgesHtml = badges.length > 0
    ? badges.map(b => `<span class="modal-badge ${b.cls}" style="background:var(--${b.cls}-bg);border-color:var(--${b.cls}-color);color:var(--${b.cls}-color)">${b.label}</span>`).join('')
    : '<span style="color:var(--text-muted);font-size:12px;">No special signs today</span>';

  const moonPhaseMM = ['လဆန်း','လပြည့်','လဆုတ်','လကွယ်'];

  $('modal-content').innerHTML = `
    <div class="modal-date-header">
      <div class="modal-gregorian">${weekday}, ${GREGORIAN_MONTHS[month-1]} ${dayNum}, ${year}</div>
      <div class="modal-myanmar-main">${formatted ? formatted.myanmarDateMM : ''}</div>
      <div class="modal-myanmar-year">${myanmar.year} မြန်မာသက္ကရာဇ် ${myanmar.isWatat ? '(Watat Year)' : ''}</div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Myanmar Calendar Details</div>
      <div class="modal-grid-2">
        <div class="modal-info-item">
          <div class="modal-info-label">Myanmar Month</div>
          <div class="modal-info-value mm">${myanmar.monthNameMM}</div>
          <div class="modal-info-value" style="font-size:11px;color:var(--text-muted)">${myanmar.monthName}</div>
        </div>
        <div class="modal-info-item">
          <div class="modal-info-label">Moon Phase</div>
          <div class="modal-info-value">${moonSymbols[myanmar.moonPhase]} ${myanmar.moonPhaseName}</div>
          <div class="modal-info-value mm" style="font-size:11px;color:var(--text-muted)">${moonPhaseMM[myanmar.moonPhase]}</div>
        </div>
        <div class="modal-info-item">
          <div class="modal-info-label">Lunar Day</div>
          <div class="modal-info-value">${myanmar.moonPhase === 1 ? 'Full Moon (15th)' : myanmar.moonPhase === 3 ? 'New Moon (30th)' : `${myanmar.moonPhaseName} ${myanmar.moonDay}`}</div>
        </div>
        <div class="modal-info-item">
          <div class="modal-info-label">Weekday</div>
          <div class="modal-info-value">${weekday}</div>
          <div class="modal-info-value mm" style="font-size:11px;color:var(--text-muted)">${astrology ? astrology.weekdayNameMM : ''}</div>
        </div>
        ${astrology ? `
        <div class="modal-info-item">
          <div class="modal-info-label">Mahabote</div>
          <div class="modal-info-value">${auspicious ? auspicious.mahabote : '—'}</div>
          <div class="modal-info-value mm" style="font-size:11px;color:var(--text-muted)">${auspicious ? auspicious.mahaboteMM : ''}</div>
        </div>
        <div class="modal-info-item">
          <div class="modal-info-label">Nakhat</div>
          <div class="modal-info-value">${astrology.nakhat}</div>
          <div class="modal-info-value mm" style="font-size:11px;color:var(--text-muted)">${astrology.nakhatMM}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Auspicious Signs</div>
      <div class="modal-badges">${badgesHtml}</div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Holidays & Festivals</div>
      ${holidaysHtml}
    </div>
  `;

  $('modal-overlay').classList.add('visible');
}

// ─── Date Converter ───────────────────────────────────────────────────────────
async function convertToMyanmar() {
  const input = $('gregorian-input').value;
  if (!input) return;

  try {
    const info = await window.myanmarCalendar.getMyanmarDate(new Date(input).toISOString());
    if (!info || !info.myanmar) {
      $('myanmar-result').innerHTML = '<div style="color:var(--pyathada-color)">Conversion failed</div>';
      return;
    }

    const { myanmar, auspicious, astrology, formatted } = info;
    const moonSymbols = ['🌙', '🌕', '🌗', '🌑'];

    const badges = [];
    if (auspicious) {
      if (auspicious.isYatyaza)       badges.push({ cls: 'yatyaza',       label: '⭐ Yatyaza' });
      if (auspicious.isPyathada)      badges.push({ cls: 'pyathada',      label: '⚠️ Pyathada' });
      if (auspicious.isAmyeittasote)  badges.push({ cls: 'amyeittasote',  label: '💎 Amyeittasote' });
      if (auspicious.isWarameittugyi) badges.push({ cls: 'warameittugyi', label: '🌟 Warameittugyi' });
    }

    $('myanmar-result').innerHTML = `
      <div class="result-main">${formatted.myanmarDateMM}</div>
      <div class="result-sub">
        <strong>${formatted.myanmarDate}</strong><br>
        Myanmar Year: <strong>${myanmar.year} ME</strong><br>
        Moon Phase: ${moonSymbols[myanmar.moonPhase]} ${myanmar.moonPhaseName}<br>
        Weekday: ${astrology ? astrology.weekdayName + ' (' + astrology.weekdayNameMM + ')' : '—'}
      </div>
      <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:5px;">
        ${badges.map(b => `
          <span class="result-badge"
            style="background:var(--${b.cls}-bg);color:var(--${b.cls}-color);border:1px solid var(--${b.cls}-color)"
          >${b.label}</span>
        `).join('')}
      </div>
    `;
  } catch (err) {
    $('myanmar-result').innerHTML = `<div style="color:var(--pyathada-color)">Error: ${err.message}</div>`;
  }
}

function convertToGregorian() {
  // Simple approximation for Myanmar → Gregorian
  const myYear = parseInt($('myanmar-year-input').value);
  const myMonth = parseInt($('myanmar-month-input').value);
  const moonPhase = parseInt($('moon-phase-input').value);
  const moonDay = parseInt($('moon-day-input').value) || 1;

  if (!myYear || isNaN(myYear)) {
    $('gregorian-result').innerHTML = '<div style="color:var(--pyathada-color)">Please enter a valid Myanmar year</div>';
    return;
  }

  // Approximate Gregorian year
  const gYear = myYear + 638;

  // Myanmar months approximate Gregorian months (starting from Tagu = April)
  const monthOffset = [
    0,  // 2nd Waso (intercalary)
    3,  // Tagu (1) → April
    4,  // Kason (2) → May
    5,  // Nayon (3) → June
    6,  // Waso (4) → July
    7,  // Wagaung (5) → Aug
    8,  // Tawthalin (6) → Sep
    9,  // Thadingyut (7) → Oct
    10, // Tazaungmon (8) → Nov
    11, // Nadaw (9) → Dec
    0,  // Pyatho (10) → Jan (next year)
    1,  // Tabodwe (11) → Feb
    2,  // Tabaung (12) → Mar
  ];

  let gMonth = myMonth === 0 ? 6 : (monthOffset[myMonth] || 0) + 1;
  let adjustedYear = gYear;
  if (myMonth >= 10 && myMonth <= 12) {
    adjustedYear = gYear + 1; // These months fall in next Gregorian year
  }

  // Approximate day
  let gDay;
  if (moonPhase === 0) gDay = moonDay;         // Waxing
  else if (moonPhase === 1) gDay = 15;          // Full moon
  else if (moonPhase === 2) gDay = 15 + moonDay; // Waning
  else gDay = 30;                               // New moon

  // Clamp to valid range
  const maxDay = new Date(adjustedYear, gMonth, 0).getDate();
  gDay = Math.min(gDay, maxDay);

  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];
  const MOON_NAMES = ['Waxing','Full Moon','Waning','New Moon'];
  const MYANMAR_MONTH_NAMES = [
    'Second Waso','Tagu','Kason','Nayon','Waso',
    'Wagaung','Tawthalin','Thadingyut','Tazaungmon',
    'Nadaw','Pyatho','Tabodwe','Tabaung'
  ];

  $('gregorian-result').innerHTML = `
    <div class="result-main">~${MONTH_NAMES[gMonth - 1]} ${gDay}, ${adjustedYear}</div>
    <div class="result-sub">
      Approximate Gregorian date for:<br>
      <strong>${MOON_NAMES[moonPhase]} ${moonPhase !== 1 && moonPhase !== 3 ? moonDay : ''} of ${MYANMAR_MONTH_NAMES[myMonth]}, ${myYear} ME</strong><br>
      <em style="font-size:10px;color:var(--text-muted)">Note: Exact conversion requires precise astronomical calculation. This is an approximation.</em>
    </div>
  `;
}

// ─── Festivals Rendering ──────────────────────────────────────────────────────
async function renderFestivals(year, monthsData) {
  const container = $('festivals-container');
  container.innerHTML = '';

  const WEEKDAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // Also load Thingyan for this year
  const thingyan = await window.myanmarCalendar.getThingyanCountdown();

  for (const { month, holidays } of monthsData) {
    if (!holidays || holidays.length === 0) continue;

    const section = document.createElement('div');
    section.className = 'festival-month';

    const myanmarMonthName = holidays[0]?.myanmar?.monthNameMM || '';

    section.innerHTML = `
      <div class="festival-month-title">
        ${GREGORIAN_MONTHS[month - 1]} ${year}
        <span class="festival-month-badge" style="background:rgba(244,185,66,0.1);color:var(--accent-primary);border:1px solid rgba(244,185,66,0.3)">
          ${myanmarMonthName}
        </span>
      </div>
    `;

    holidays.forEach(h => {
      const date = h.date ? new Date(h.date) : null;
      const dayNum = date ? date.getDate() : '?';
      const weekday = date ? WEEKDAY_NAMES[date.getDay()] : '';

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
        No festivals data available for ${year}
      </div>
    `;
  }
}

// ─── Astrology Views ──────────────────────────────────────────────────────────
function renderNakhatGrid() {
  const grid = $('nakhat-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const today = new Date();
  const currentMyanmarYear = today.getFullYear() - 638;
  const currentNakhat = currentMyanmarYear % 12;

  NAKHAT_ANIMALS.forEach((animal, idx) => {
    const year = today.getFullYear() - (currentNakhat - idx + 12) % 12;
    const item = document.createElement('div');
    item.className = `nakhat-item${idx === currentNakhat ? ' current-year' : ''}`;
    item.innerHTML = `
      <div class="nakhat-animal">${animal.emoji}</div>
      <div class="nakhat-name">${animal.name}</div>
      <div class="nakhat-year">${year} ME~</div>
    `;
    grid.appendChild(item);
  });
}

async function calculateMahabote() {
  const input = $('birth-date-input').value;
  if (!input) return;

  try {
    const info = await window.myanmarCalendar.getMyanmarDate(new Date(input).toISOString());
    if (!info || !info.auspicious) return;

    const { auspicious, astrology, myanmar } = info;
    const mahabote = auspicious.mahabote;
    const data = MAHABOTE_DATA[mahabote];

    $('mahabote-result').innerHTML = `
      <div class="mahabote-name">${mahabote}</div>
      <div class="mahabote-mm">${auspicious.mahaboteMM}</div>
      ${data ? `
        <div class="mahabote-desc">
          <strong>Ruling Planet:</strong> ${data.planet}<br>
          <strong>Lucky Day:</strong> ${data.lucky}<br>
          <strong>Nakhat:</strong> ${astrology.nakhat} (${astrology.nakhatMM})<br>
          <strong>Myanmar Year:</strong> ${myanmar.year} ME<br>
          <br>${data.desc}
        </div>
      ` : ''}
    `;
  } catch (err) {
    $('mahabote-result').innerHTML = `<div style="color:var(--pyathada-color)">Error: ${err.message}</div>`;
  }
}

// ─── View Switching ───────────────────────────────────────────────────────────
function switchView(viewName) {
  // Update sidebar nav
  $$('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Update views
  $$('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${viewName}`);
  });

  state.currentView = viewName;

  // Load view data if needed
  if (viewName === 'year' && !state.yearData) {
    loadYearView(state.yearViewYear);
  }
  if (viewName === 'festivals') {
    loadFestivals(state.festivalsYear);
  }
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
  if (icon) icon.textContent = isDark ? '☀️' : '🌙';
  if (label) label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
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
    loadMonthView(state.currentYear, state.currentMonth);
  });

  // Year navigation
  $('prev-year')?.addEventListener('click', () => {
    state.yearViewYear--;
    loadYearView(state.yearViewYear);
  });

  $('next-year')?.addEventListener('click', () => {
    state.yearViewYear++;
    loadYearView(state.yearViewYear);
  });

  $('goto-year-today')?.addEventListener('click', () => {
    state.yearViewYear = new Date().getFullYear();
    loadYearView(state.yearViewYear);
  });

  // Date converter
  $('convert-to-myanmar')?.addEventListener('click', convertToMyanmar);
  $('convert-to-gregorian')?.addEventListener('click', convertToGregorian);

  // Gregorian input auto-convert
  $('gregorian-input')?.addEventListener('change', () => {
    if ($('gregorian-input').value) convertToMyanmar();
  });

  // Set today's date as default in converter
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const gregInput = $('gregorian-input');
  if (gregInput) gregInput.value = todayStr;
  const birthInput = $('birth-date-input');
  if (birthInput) birthInput.value = todayStr;

  // Mahabote calculator
  $('calc-mahabote')?.addEventListener('click', calculateMahabote);

  // Festivals year selector
  $('festivals-year-select')?.addEventListener('change', (e) => {
    state.festivalsYear = parseInt(e.target.value);
    loadFestivals(state.festivalsYear);
  });

  // Modal close
  $('modal-close')?.addEventListener('click', closeModal);
  $('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === $('modal-overlay')) closeModal();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft' && state.currentView === 'month') {
      $('prev-month')?.click();
    }
    if (e.key === 'ArrowRight' && state.currentView === 'month') {
      $('next-month')?.click();
    }
  });

  // Theme toggle
  $('theme-toggle')?.addEventListener('click', toggleTheme);
}

function closeModal() {
  $('modal-overlay').classList.remove('visible');
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init().catch(console.error);
});
