/**
 * Myanmar Calendar Engine — Browser-Compatible Bundle
 * Auto-generated from src/myanmar-calendar-engine.js by scripts/build-browser-engine.js
 * DO NOT EDIT DIRECTLY — run: npm run build:engine
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.MyanmarCalendarEngine = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

/**
 * Myanmar Calendar Engine — Production Grade
 * Based on the Canonical Cool-Emerald Algorithm by Dr. Yan Naing Aye
 * References:
 * - http://cool-emerald.blogspot.com/2013/06/algorithm-program-and-calculation-of.html
 * - https://github.com/yan9a/mmcal
 *
 * Implements:
 * 1. Definitive 3-era Watat (intercalary month & day) calculation with historical corrections
 * 2. Exact bidirectional Gregorian <-> Myanmar conversion (JDN <-> Myanmar Civil Date)
 * 3. Buddhist Era (Sasana Year / သာသနာနှစ်)
 * 4. Comprehensive traditional astrological indicators:
 *    - Yatyaza (ရက်ရာဇာ), Pyathada (ပြဿဒါး) & Afternoon Pyathada (မွန်းလွဲပြဿဒါး)
 *    - Amyeittasote (အမြိုက်စိုတ်), Warameittugyi (ဝါရမိတ္တုကြီး), Warameittunge (ဝါရမိတ္တုငယ်)
 *    - Yatpote (ရက်ပုပ်), Thamanyo (သမားညို), Thamaphyu (သမားဖြူ)
 *    - Nagapor (နဂါးပေါ်), Yatyotema (ရက်ယုတ်မာ), Mahayatkyan (မဟာရက်ကြမ်း), Shanyat (ရှမ်းရက်)
 *    - Sabbath (ဥပုသ်နေ့) and Sabbath Eve (အဖိတ်နေ့)
 *    - Nagahle (နဂါးခေါင်းလှည့်ရာ အရပ်)
 *    - Mahabote (မဟာဘုတ် ၇ အိမ်) and 8-Planetary ruler system with Wednesday AM / PM (Rahu)
 *    - 8-Mansion Astrology (Athit Chay / မဟာဘုတ် ၈ ပိုင်း)
 *    - Nakhat 12-animal zodiac & 3-nakhat beings (Ogre, Elf, Human)
 * 5. Precise astronomical Thingyan transit timing (Akya, Atat, Akyo, New Year)
 * 6. Authentic holiday & festival calendar (National, Buddhist, Lunar, Interfaith)
 * 7. Auspicious Date Finder (မင်္ဂလာရက်ရွေးချယ်ရန်) for weddings, housewarming, business, travel
 * 8. iCalendar (.ics) export engine
 * 9. In-memory LRU caching for high performance
 */

'use strict';

// ─── Calendrical Constants ───────────────────────────────────────────────────
const SY = 1577917828.0 / 4320000.0;   // Solar year in days (~365.2587565)
const LM = 1577917828.0 / 53433336.0;  // Lunar month in days (~29.53058795)
const MO = 1954168.050623;             // Myanmar calendar epoch (beginning of 0 ME in MMT JDN)
const SE3 = 1312;                      // Start of 3rd era (1312 ME / 1950 CE)

// Month index mapping:
// 0 = 1st Waso (ပထမဝါဆို) - only in watat years
// 1 = Tagu (တန်ခူး), 2 = Kason (ကဆုန်), 3 = Nayon (နယုန်)
// 4 = 2nd Waso (ဒုတိယဝါဆို - or regular Waso in common years)
// 5 = Wagaung (ဝါခေါင်), 6 = Tawthalin (တော်သလင်း), 7 = Thadingyut (သီတင်းကျွတ်)
// 8 = Tazaungmon (တန်ဆောင်မုန်း), 9 = Nadaw (နတ်တော်), 10 = Pyatho (ပြာသို)
// 11 = Tabodwe (တပို့တွဲ), 12 = Tabaung (တပေါင်း)
// 13 = Late Tagu (နှောင်းတန်ခူး), 14 = Late Kason (နှောင်းကဆုန်)

const MYANMAR_MONTHS = [
  'First Waso', 'Tagu', 'Kason', 'Nayon', 'Second Waso',
  'Wagaung', 'Tawthalin', 'Thadingyut', 'Tazaungmon',
  'Nadaw', 'Pyatho', 'Tabodwe', 'Tabaung',
  'Late Tagu', 'Late Kason'
];

const MYANMAR_MONTHS_MM = [
  'ပထမဝါဆို', 'တန်ခူး', 'ကဆုန်', 'နယုန်', 'ဒုတိယဝါဆို',
  'ဝါခေါင်', 'တော်သလင်း', 'သီတင်းကျွတ်', 'တန်ဆောင်မုန်း',
  'နတ်တော်', 'ပြာသို', 'တပို့တွဲ', 'တပေါင်း',
  'နှောင်းတန်ခူး', 'နှောင်းကဆုန်'
];

const MOON_PHASES = ['Waxing', 'Full Moon', 'Waning', 'New Moon'];
const MOON_PHASES_MM = ['လဆန်း', 'လပြည့်', 'လဆုတ်', 'လကွယ်'];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_MM = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MYANMAR_NUMERALS = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];

// ─── 12 Nakhat Animals (Authentic Myanmar Zodiac / နဂါးစက်ဝိုင်း) ─────────────
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

// 3 Nakhat Beings (ဘီလူး၊ နတ်၊ လူ)
const NAKHAT_3 = [
  { id: 0, name: 'Ogre (Bilu)',  nameMM: 'ဘီလူး', desc: 'Powerful, fierce, ambitious, highly energetic' },
  { id: 1, name: 'Deva (Nath)',  nameMM: 'နတ်',   desc: 'Noble, gracious, generous, blessed with fortune' },
  { id: 2, name: 'Human (Lu)',   nameMM: 'လူ',    desc: 'Adaptable, practical, industrious, grounded' },
];

// 8 Planetary Rulers (Myanmar 8-Day Week including Wednesday PM / Rahu)
const PLANETARY_RULERS = {
  0: { id: 'sun',      name: 'Sun',       nameMM: 'တနင်္ဂနွေ',  planetMM: 'နေမင်း',   animal: 'Garuda (ဂဠုန်)',     direction: 'North-East', luckyNum: [1, 6], color: '#f59e0b', mahabote: 'Binga',   mahaboteMM: 'ဗင်္ဃ' },
  1: { id: 'moon',     name: 'Moon',      nameMM: 'တနင်္လာ',    planetMM: 'လမင်း',    animal: 'Tiger (ကျား)',       direction: 'East',       luckyNum: [2, 7], color: '#93c5fd', mahabote: 'Atun',    mahaboteMM: 'အသွဉ်' },
  2: { id: 'mars',     name: 'Mars',      nameMM: 'အင်္ဂါ',      planetMM: 'အင်္ဂါဂြိုဟ်', animal: 'Lion (ခြင်္သေ့)',     direction: 'South-East', luckyNum: [3, 8], color: '#f87171', mahabote: 'Yaza',    mahaboteMM: 'ရာဇ' },
  3: { id: 'mercury',  name: 'Mercury',   nameMM: 'ဗုဒ္ဓဟူး (မနက်)', planetMM: 'ဗုဒ္ဓဟူးဂြိုဟ်', animal: 'Tusked Elephant (ဆင်)', direction: 'South', luckyNum: [4, 9], color: '#34d399', mahabote: 'Adipati', mahaboteMM: 'အဓိပတိ' },
  'rahu': { id: 'rahu', name: 'Rahu',     nameMM: 'ရာဟု (ဗုဒ္ဓဟူး ညနေ)', planetMM: 'ရာဟုဂြိုဟ်', animal: 'Tuskless Elephant (ဟိုင်းဆင်)', direction: 'North-West', luckyNum: [8, 0], color: '#c084fc', mahabote: 'Rahu', mahaboteMM: 'ရာဟု' },
  4: { id: 'jupiter',  name: 'Jupiter',   nameMM: 'ကြာသပတေး', planetMM: 'ကြာသပတေးဂြိုဟ်', animal: 'Rat (ကြွက်)', direction: 'West', luckyNum: [5, 1], color: '#fbbf24', mahabote: 'Abawta', mahaboteMM: 'အဘောတ / မာရဏ' },
  5: { id: 'venus',    name: 'Venus',     nameMM: 'သောကြာ',    planetMM: 'သောကြာဂြိုဟ်', animal: 'Guinea Pig (ပူး)', direction: 'North', luckyNum: [6, 2], color: '#f472b6', mahabote: 'Okkat',  mahaboteMM: 'အောက်ကတ် / သိကျ' },
  6: { id: 'saturn',   name: 'Saturn',    nameMM: 'စနေ',       planetMM: 'စနေဂြိုဟ်',   animal: 'Naga Dragon (နဂါး)', direction: 'South-West', luckyNum: [7, 3], color: '#94a3b8', mahabote: 'Kiyar',  mahaboteMM: 'ကြာ / ပုတိ' },
};

// ─── Utility Functions ────────────────────────────────────────────────────────

function toMyanmarNumerals(num) {
  return String(num).split('').map(d => {
    const n = parseInt(d, 10);
    return isNaN(n) ? d : MYANMAR_NUMERALS[n];
  }).join('');
}

function gregorianToJDN(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function jdnToGregorian(jdn) {
  const j = Math.floor(jdn + 0.5) - 1721119;
  const y = Math.floor((4 * j - 1) / 146097);
  const j2 = 4 * j - 1 - 146097 * y;
  const d = Math.floor(j2 / 4);
  const j3 = Math.floor((4 * d + 3) / 1461);
  const d2 = 4 * d + 3 - 1461 * j3;
  const d3 = Math.floor((d2 + 4) / 4);
  const m = Math.floor((5 * d3 - 3) / 153);
  const d4 = 5 * d3 - 3 - 153 * m;
  const day = Math.floor((d4 + 5) / 5);
  let year = 100 * y + j3;
  let month;
  if (m < 10) {
    month = m + 3;
  } else {
    month = m - 9;
    year += 1;
  }
  return { year, month, day };
}

// ─── Core Cool-Emerald Algorithm (Yan Naing Aye) ───────────────────────────────

/**
 * Era constants and historical exceptions lookup
 */
function getMyConst(my) {
  let EI, WO, NM, EW = 0;
  let fme = [], wte = [];

  if (my >= 1312) {
    // 3rd Era (after Independence 1312 ME / 1950 CE)
    EI = 3;
    WO = -0.5;
    NM = 8;
    fme = [[1377, 1]];
    wte = [1344, 1345];
  } else if (my >= 1217) {
    // 2nd Era (British Colony 1217 - 1311 ME)
    EI = 2;
    WO = -1;
    NM = 4;
    fme = [[1234, 1], [1261, -1]];
    wte = [1263, 1264];
  } else if (my >= 1100) {
    // 1st Era part 3 (Konbaung 1100 - 1216 ME)
    EI = 1.3;
    WO = -0.85;
    NM = -1;
    fme = [[1120, 1], [1126, -1], [1150, 1], [1172, -1], [1207, 1]];
    wte = [1201, 1202];
  } else if (my >= 798) {
    // 1st Era part 2 (Taungoo / Nyaungyan 798 - 1099 ME)
    EI = 1.2;
    WO = -1.1;
    NM = -1;
    fme = [[813, -1], [849, -1], [851, -1], [854, -1], [927, -1], [933, -1], [936, -1], [938, -1], [949, -1], [952, -1], [963, -1], [968, -1], [1039, -1]];
    wte = [];
  } else {
    // 1st Era part 1 (Bagan / Early 0 - 797 ME)
    EI = 1.1;
    WO = -1.1;
    NM = -1;
    fme = [[205, 1], [246, 1], [471, 1], [572, -1], [651, 1], [653, 2], [656, 1], [672, 1], [729, 1], [767, -1]];
    wte = [];
  }

  // Binary search for offset exceptions
  for (let i = 0; i < fme.length; i++) {
    if (fme[i][0] === my) {
      WO += fme[i][1];
      break;
    }
  }
  for (let i = 0; i < wte.length; i++) {
    if (wte[i] === my) {
      EW = 1;
      break;
    }
  }

  return { EI, WO, NM, EW };
}

/**
 * Check Watat (intercalary month) status for a Myanmar year
 * Returns { watat: 0 or 1, fm: full moon JDN of 2nd Waso }
 */
function cal_watat(my) {
  const c = getMyConst(my);
  const TA = (SY / 12 - LM) * (12 - c.NM);
  let ed = (SY * (my + 3739)) % LM;
  if (ed < TA) ed += LM;
  const fm = Math.round(SY * my + MO - ed + 4.5 * LM + c.WO);

  let watat = 0;
  if (c.EI >= 2) {
    const TW = LM - (SY / 12 - LM) * c.NM;
    if (ed >= TW) watat = 1;
  } else {
    watat = (my * 7 + 2) % 19;
    if (watat < 0) watat += 19;
    watat = Math.floor(watat / 12);
  }
  watat ^= c.EW;

  return { watat, fm };
}

/**
 * Check Myanmar year properties
 * Returns { myt: 0=common, 1=little watat (384 days), 2=big watat (385 days), tg1: JDN of Tagu 1, fm, werr }
 */
function cal_my(my) {
  let yd = 0, y1, nd = 0, werr = 0, fm = 0;
  const y2 = cal_watat(my);
  let myt = y2.watat;

  do {
    yd++;
    y1 = cal_watat(my - yd);
  } while (y1.watat === 0 && yd < 3);

  if (myt) {
    nd = (y2.fm - y1.fm) % 354;
    myt = Math.floor(nd / 31) + 1;
    fm = y2.fm;
    if (nd !== 30 && nd !== 31) werr = 1;
  } else {
    fm = y1.fm + 354 * yd;
  }

  const tg1 = y1.fm + 354 * yd - 102;
  return { myt, tg1, fm, werr };
}

/**
 * Month length in days (29 or 30 days)
 * Tagu=29, Kason=30, Nayon=29 (30 in big watat / myt=2), Waso=30, etc.
 */
function cal_mml(mm, myt) {
  let mml = 30 - (mm % 2);
  if (mm === 3) mml += Math.floor(myt / 2); // Nayon gets 30 days in big watat
  return mml;
}

/**
 * Apparent length of year in days (354, 384, or 385)
 */
function cal_myl(myt) {
  return 354 + (1 - Math.floor(1 / (myt + 1))) * 30 + Math.floor(myt / 2);
}

/**
 * Moon phase: 0=Waxing (လဆန်း), 1=Full Moon (လပြည့်), 2=Waning (လဆုတ်), 3=New Moon (လကွယ်)
 */
function cal_mp(md, mm, myt) {
  const mml = cal_mml(mm, myt);
  return Math.floor((md + 1) / 16) + Math.floor(md / 16) + Math.floor(md / mml);
}

/**
 * Fortnight day (1 to 15)
 */
function cal_mf(md) {
  return md - 15 * Math.floor(md / 16);
}

/**
 * Convert JDN to Myanmar date
 * Returns { myt, my, mm, md }
 */
function j2m(jdn) {
  jdn = Math.round(jdn);
  const my = Math.floor((jdn - 0.5 - MO) / SY);
  const yo = cal_my(my);
  let dd = jdn - yo.tg1 + 1;
  const b = Math.floor(yo.myt / 2);
  const c = Math.floor(1 / (yo.myt + 1));
  const myl = 354 + (1 - c) * 30 + b;
  const mmt = Math.floor((dd - 1) / myl);
  dd -= mmt * myl;

  const a = Math.floor((dd + 423) / 512);
  let mm = Math.floor((dd - b * a + c * a * 30 + 29.26) / 29.544);
  const e = Math.floor((mm + 12) / 16);
  const f = Math.floor((mm + 11) / 16);
  const md = dd - Math.floor(29.544 * mm - 29.26) - b * e + c * f * 30;
  mm += f * 3 - e * 4 + 12 * mmt;

  return { myt: yo.myt, my, mm, md };
}

/**
 * Convert Myanmar date to Julian Day Number (Exact)
 */
function m2j(my, mm, md) {
  const yo = cal_my(my);
  const mmt = Math.floor(mm / 13);
  let m = (mm % 13) + mmt;
  const b = Math.floor(yo.myt / 2);
  const c = 1 - Math.floor((yo.myt + 1) / 2);
  m += 4 - Math.floor((m + 15) / 16) * 4 + Math.floor((m + 12) / 16);
  let dd = md + Math.floor(29.544 * m - 29.26) - c * Math.floor((m + 11) / 16) * 30 + b * Math.floor((m + 12) / 16);
  const myl = 354 + (1 - c) * 30 + b;
  dd += mmt * myl;
  return dd + yo.tg1 - 1;
}

/**
 * Convert Myanmar Year to Buddhist Era / Sasana Year (သာသနာနှစ်)
 * 2026 CE = 1388 ME = 2570 BE
 */
function my2sy(my, mm, md, k = 0) {
  let buddhistEraOffset = 1182;
  if (k === 1) {
    if (mm >= 13) buddhistEraOffset = 1183;
  } else if (k === 2) {
    if (mm === 1 || (mm === 2 && md < 15)) buddhistEraOffset = 1181;
  }
  return my + buddhistEraOffset;
}

// ─── Astrological Calculations ────────────────────────────────────────────────

// Sabbath (ဥပုသ်နေ့ = 1, အဖိတ်နေ့ = 2, 0 = regular)
function cal_sabbath(md, mm, myt) {
  const mml = cal_mml(mm, myt);
  let s = 0;
  if (md === 8 || md === 15 || md === 23 || md === mml) s = 1;     // Sabbath (ဥပုသ်)
  if (md === 7 || md === 14 || md === 22 || md === mml - 1) s = 2; // Sabbath Eve (အဖိတ်)
  return s;
}

// Yatyaza (ရက်ရာဇာ = 1, 0 = else)
function cal_yatyaza(mm, wd) {
  const m1 = mm % 4;
  const wd1 = Math.floor(m1 / 2) + 4;
  const wd2 = (1 - Math.floor(m1 / 2) + (m1 % 2)) * (1 + 2 * (m1 % 2));
  return (wd === wd1 || wd === wd2) ? 1 : 0;
}

// Pyathada (1 = full pyathada, 2 = afternoon pyathada / မွန်းလွဲပြဿဒါး, 0 = else)
function cal_pyathada(mm, wd) {
  const m1 = mm % 4;
  let pyathada = 0;
  const wda = [1, 3, 3, 0, 2, 1, 2]; // Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6, Sat=0
  if (m1 === 0 && wd === 4) pyathada = 2; // afternoon pyathada on Thursday in Waso-cycle
  if (m1 === wda[wd]) pyathada = 1;
  return pyathada;
}

// Amyeittasote (အမြိုက်စိုတ် = 1)
function cal_amyeittasote(md, wd) {
  const mf = cal_mf(md);
  const wda = [5, 8, 3, 7, 2, 4, 1]; // matching fortnight day per weekday
  return (mf === wda[wd]) ? 1 : 0;
}

// Warameittugyi (ဝါရမိတ္တုကြီး = 1)
function cal_warameittugyi(md, wd) {
  const mf = cal_mf(md);
  const wda = [7, 1, 4, 8, 9, 6, 3];
  return (mf === wda[wd]) ? 1 : 0;
}

// Warameittunge (ဝါရမိတ္တုငယ် = 1)
function cal_warameittunge(md, wd) {
  const mf = cal_mf(md);
  const wn = (wd + 6) % 7;
  return (12 - mf === wn) ? 1 : 0;
}

// Yatpote (ရက်ပုပ် = 1)
function cal_yatpote(md, wd) {
  const mf = cal_mf(md);
  const wda = [8, 1, 4, 6, 9, 8, 7];
  return (mf === wda[wd]) ? 1 : 0;
}

// Thamaphyu (သမားဖြူ = 1)
function cal_thamaphyu(md, wd) {
  const mf = cal_mf(md);
  const wda = [1, 2, 6, 6, 5, 6, 7];
  if (mf === wda[wd]) return 1;
  const wdb = [0, 1, 0, 0, 0, 3, 3];
  if (mf === wdb[wd]) return 1;
  if (mf === 4 && wd === 5) return 1;
  return 0;
}

// Thamanyo (သမားညို = 1)
function cal_thamanyo(mm, wd) {
  const mmt = Math.floor(mm / 13);
  let m = (mm % 13) + mmt;
  if (m <= 0) m = 4;
  const m1 = m - 1 - Math.floor(m / 9);
  const wd1 = (m1 * 2 - Math.floor(m1 / 8)) % 7;
  const wd2 = (wd + 7 - wd1) % 7;
  return wd2 <= 1 ? 1 : 0;
}

// Nagapor (နဂါးပေါ် = 1)
function cal_nagapor(md, wd) {
  const wda = [26, 21, 2, 10, 18, 2, 21];
  if (md === wda[wd]) return 1;
  const wdb = [17, 19, 1, 0, 9, 0, 0];
  if (md === wdb[wd]) return 1;
  if ((md === 2 && wd === 1) || ((md === 12 || md === 4 || md === 18) && wd === 2)) {
    return 1;
  }
  return 0;
}

// Yatyotema (ရက်ယုတ်မာ = 1)
function cal_yatyotema(mm, md) {
  const mmt = Math.floor(mm / 13);
  let m = (mm % 13) + mmt;
  if (m <= 0) m = 4;
  const mf = cal_mf(md);
  let m1 = m % 2 ? m : (m + 9) % 12;
  m1 = ((m1 + 4) % 12) + 1;
  return mf === m1 ? 1 : 0;
}

// Mahayatkyan (မဟာရက်ကြမ်း = 1)
function cal_mahayatkyan(mm, md) {
  let m = mm;
  if (m <= 0) m = 4;
  const mf = cal_mf(md);
  const m1 = ((Math.floor((m % 12) / 2) + 4) % 6) + 1;
  return mf === m1 ? 1 : 0;
}

// Shanyat (ရှမ်းရက် = 1)
function cal_shanyat(mm, md) {
  const mmt = Math.floor(mm / 13);
  let m = (mm % 13) + mmt;
  if (m <= 0) m = 4;
  const mf = cal_mf(md);
  const sya = [8, 8, 2, 2, 9, 3, 3, 5, 1, 4, 7, 4];
  return mf === sya[m - 1] ? 1 : 0;
}

// Nagahle (နဂါးခေါင်းလှည့်ရာ အရပ်: 0=West, 1=North, 2=East, 3=South)
function cal_nagahle(mm) {
  let m = mm;
  if (m <= 0) m = 4;
  return Math.floor((m % 12) / 3);
}

const NAGAHLE_DIRECTIONS = ['West (အနောက်)', 'North (မြောက်)', 'East (အရှေ့)', 'South (တောင်)'];
const NAGAHLE_DIRECTIONS_MM = ['အနောက်', 'မြောက်', 'အရှေ့', 'တောင်'];

// Mahabote House for a given year & weekday: (year - weekday) % 7
const MAHABOTE_HOUSES = ['Binga', 'Atun', 'Yaza', 'Adipati', 'Marana', 'Thike', 'Puti'];
const MAHABOTE_HOUSES_MM = ['ဗင်္ဃ', 'အသွဉ်', 'ရာဇ', 'အဓိပတိ', 'မာရဏ', 'သိကျ', 'ပုတိ'];

function cal_mahabote_house(my, wd) {
  const idx = ((my - wd) % 7 + 7) % 7;
  return {
    house: MAHABOTE_HOUSES[idx],
    houseMM: MAHABOTE_HOUSES_MM[idx],
    index: idx
  };
}

/**
 * Comprehensive Mahabote & 8-Planet Astrological Ruler
 * Supports Wednesday AM (Adipati) vs Wednesday PM (Rahu)
 */
function getMahaboteRuler(weekday, isWednesdayPM = false) {
  if (weekday === 3 && isWednesdayPM) {
    return PLANETARY_RULERS['rahu'];
  }
  return PLANETARY_RULERS[weekday] || PLANETARY_RULERS[0];
}

/**
 * 8-Mansion Astrology (မဟာဘုတ် ၈ ပိုင်း / အဓိပတိ၊ ဗင်္ဃ၊ အသွဉ် စသည်)
 * Computes complete life-chart mansions for a birth year & weekday (or a date input)
 */
function get8MansionChart(myOrDate, weekday, isWednesdayPM = false) {
  let my = myOrDate;
  let stdWeekday = weekday;

  if (typeof myOrDate === 'string' || myOrDate instanceof Date || (typeof myOrDate === 'object' && myOrDate !== null && myOrDate.year && myOrDate.month)) {
    const info = getMyanmarDate(myOrDate);
    my = info.myanmar.year;
    stdWeekday = info.gregorian.weekday;
  }

  const ruler = getMahaboteRuler(stdWeekday, isWednesdayPM);
  // Convert standard Gregorian weekday (0=Sun..6=Sat) to Myanmar astrological weekday (0=Sat, 1=Sun, 2=Mon..6=Fri)
  const wd_mm = (stdWeekday + 1) % 7;
  const houseData = cal_mahabote_house(my, wd_mm);

  // House positions in traditional 7-house chart:
  // Order: Binga, Atun, Yaza, Adipati, Marana, Thike, Puti
  const mansionOrder = [
    { key: 'Binga',   nameMM: 'ဗင်္ဃ',    theme: 'Leadership & Crown', desc: 'Prestige, honor, royal favor, high rank. High authority and respect.' },
    { key: 'Atun',    nameMM: 'အသွဉ်',    theme: 'Ascent & Expansion', desc: 'Rising fortunes, prosperity, education, spiritual growth, fame.' },
    { key: 'Yaza',    nameMM: 'ရာဇ',      theme: 'King & Victory',     desc: 'Success in competition, courage, overcoming enemies, decisive victory.' },
    { key: 'Adipati', nameMM: 'အဓိပတိ',  theme: 'Mastery & Influence', desc: 'Supreme master, command, business dominance, executive acumen.' },
    { key: 'Marana',  nameMM: 'မာရဏ',    theme: 'Destruction & Renewal', desc: 'Caution in health and travel, resilience through hardship, hidden depth.' },
    { key: 'Thike',   nameMM: 'သိကျ',     theme: 'Treasure & Wealth',   desc: 'Material abundance, financial acumen, luxury, beauty and harmony.' },
    { key: 'Puti',    nameMM: 'ပုတိ',     theme: 'Decay & Sacrifice',   desc: 'Patience, spiritual renunciation, endurance, overcoming obstacles.' },
  ];

  return {
    birthWeekday: stdWeekday,
    isWednesdayPM,
    ruler,
    birthHouse: houseData,
    mansions: mansionOrder.map((m, idx) => {
      // Traditional Mahabote house-planet placement for year 'my':
      // House 'idx' is occupied by the planet with astrological day ((my - idx) % 7 + 7) % 7
      const planetWd = ((my - idx) % 7 + 7) % 7; // 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
      const stdDay = (planetWd + 6) % 7;         // 0=Sun, 1=Mon, ..., 6=Sat
      const isBirthHouse = m.key === houseData.house;
      const mansionRuler = (isBirthHouse && stdWeekday === 3 && isWednesdayPM)
        ? PLANETARY_RULERS['rahu']
        : PLANETARY_RULERS[stdDay];

      return {
        ...m,
        isBirthHouse,
        planetRuler: mansionRuler?.planetMM || ''
      };
    })
  };
}

// ─── Precise Thingyan Calculation (Astronomical Surya Siddhanta) ──────────────

/**
 * Precise Thingyan calculation based on solar transit of Pisces to Aries
 */
function getThingyan(gregorianYear) {
  const my = gregorianYear - 638;
  const ja = SY * my + MO; // Atat moment (solar JDN)
  const jk = (my >= SE3) ? (ja - 2.169918982) : (ja - 2.1675); // Akya moment

  const akyaJDN = Math.round(jk);
  const atatJDN = Math.round(ja);
  const akyoJDN = akyaJDN - 1;
  const newYearJDN = atatJDN + 1;

  // Exact transit hours and minutes
  const akyaTimeFract = (jk + 0.5) % 1;
  const atatTimeFract = (ja + 0.5) % 1;

  const akyaHours = Math.floor(akyaTimeFract * 24);
  const akyaMins = Math.floor((akyaTimeFract * 24 - akyaHours) * 60);

  const atatHours = Math.floor(atatTimeFract * 24);
  const atatMins = Math.floor((atatTimeFract * 24 - atatHours) * 60);

  const akyoDate = jdnToGregorian(akyoJDN);
  const akyaDate = jdnToGregorian(akyaJDN);
  const atatDate = jdnToGregorian(atatJDN);
  const newYearDate = jdnToGregorian(newYearJDN);

  // Akyat days (between Akya and Atat)
  const akyatDates = [];
  for (let j = akyaJDN + 1; j < atatJDN; j++) {
    const d = jdnToGregorian(j);
    akyatDates.push(new Date(d.year, d.month - 1, d.day));
  }
  // Standard minimum 1 akyat day if adjacent
  if (akyatDates.length === 0) {
    const d = jdnToGregorian(akyaJDN + 1);
    akyatDates.push(new Date(d.year, d.month - 1, d.day));
  }

  return {
    myanmarYear: my,
    sasanaYear: my2sy(my, 1, 1),
    akyoDate: new Date(akyoDate.year, akyoDate.month - 1, akyoDate.day),
    akyaDate: new Date(akyaDate.year, akyaDate.month - 1, akyaDate.day),
    atatDate: new Date(atatDate.year, atatDate.month - 1, atatDate.day),
    newYearDate: new Date(newYearDate.year, newYearDate.month - 1, newYearDate.day),
    akyatDates,
    transitTiming: {
      akyaTimeStr: `${String(akyaHours).padStart(2, '0')}:${String(akyaMins).padStart(2, '0')} MMT`,
      atatTimeStr: `${String(atatHours).padStart(2, '0')}:${String(atatMins).padStart(2, '0')} MMT`,
    },
    mythology: {
      desc: `Thagyamin (King of Devas) descends to earth on Akya Day at ${String(akyaHours).padStart(2, '0')}:${String(akyaMins).padStart(2, '0')}, recording mortals' deeds, and returns to Tavatimsa heaven on Atat Day.`,
      descMM: `သကြားမင်းကြီးသည် သင်္ကြန်ကျချိန်တွင် လူ့ပြည်သို့ ဆင်းသက်၍ ကောင်းမှုမကောင်းမှုတို့ကို မှတ်တမ်းတင်ပြီး သင်္ကြန်တက်ချိန်တွင် တာဝတိံသာသို့ ပြန်လည်တက်ကြွတော်မူပါသည်။`
    }
  };
}

// ─── Public Holidays & Festival Engine ────────────────────────────────────────

/**
 * Comprehensive Myanmar Holidays and Festivals for a given Gregorian month/year
 */
function getMyanmarHolidays(gregorianYear, gregorianMonth) {
  const holidays = [];
  const daysInMonth = new Date(gregorianYear, gregorianMonth, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const jdn = gregorianToJDN(gregorianYear, gregorianMonth, d);
    const mm = j2m(jdn);
    const mp = cal_mp(mm.md, mm.mm, mm.myt);
    const dateObj = new Date(gregorianYear, gregorianMonth - 1, d);

    // 1. Gregorian Fixed Public Holidays
    if (gregorianMonth === 1 && d === 4) {
      holidays.push({ name: 'Independence Day', nameMM: 'လွတ်လပ်ရေးနေ့', type: 'public', date: dateObj });
    } else if (gregorianMonth === 2 && d === 12) {
      holidays.push({ name: 'Union Day', nameMM: 'ပြည်ထောင်စုနေ့', type: 'public', date: dateObj });
    } else if (gregorianMonth === 3 && d === 2) {
      holidays.push({ name: "Peasants' Day", nameMM: 'တောင်သူလယ်သမားနေ့', type: 'public', date: dateObj });
    } else if (gregorianMonth === 3 && d === 27) {
      holidays.push({ name: 'Armed Forces Day', nameMM: 'တပ်မတော်နေ့', type: 'public', date: dateObj });
    } else if (gregorianMonth === 5 && d === 1) {
      holidays.push({ name: 'Labour / Workers Day', nameMM: 'အလုပ်သမားနေ့', type: 'public', date: dateObj });
    } else if (gregorianMonth === 7 && d === 19) {
      holidays.push({ name: "Martyrs' Day", nameMM: 'အာဇာနည်နေ့', type: 'public', date: dateObj });
    } else if (gregorianMonth === 12 && d === 25) {
      holidays.push({ name: 'Christmas Day', nameMM: 'ခရစ္စမတ်နေ့', type: 'public', date: dateObj });
    } else if (gregorianMonth === 1 && d === 1) {
      holidays.push({ name: "International New Year's Day", nameMM: 'နိုင်ငံတကာနှစ်သစ်ကူးနေ့', type: 'public', date: dateObj });
    }

    // 2. Thingyan Water Festival & New Year (Solar Transit)
    const tg = getThingyan(gregorianYear);
    if (dateObj.toDateString() === tg.akyoDate.toDateString()) {
      holidays.push({ name: 'Thingyan A-kyo Day', nameMM: 'သင်္ကြန်အကြိုနေ့', type: 'festival', description: 'Thagyamin descends', date: dateObj });
    } else if (dateObj.toDateString() === tg.akyaDate.toDateString()) {
      holidays.push({ name: 'Thingyan A-kya Day', nameMM: 'သင်္ကြန်အကျနေ့', type: 'festival', description: `Thagyamin transit at ${tg.transitTiming.akyaTimeStr}`, date: dateObj });
    } else if (tg.akyatDates.some(ad => ad.toDateString() === dateObj.toDateString())) {
      holidays.push({ name: 'Thingyan A-kyat Day', nameMM: 'သင်္ကြန်အကြတ်နေ့', type: 'festival', description: 'Water festival celebration', date: dateObj });
    } else if (dateObj.toDateString() === tg.atatDate.toDateString()) {
      holidays.push({ name: 'Thingyan A-tat Day', nameMM: 'သင်္ကြန်အတက်နေ့', type: 'festival', description: `Thagyamin ascends at ${tg.transitTiming.atatTimeStr}`, date: dateObj });
    } else if (dateObj.toDateString() === tg.newYearDate.toDateString()) {
      holidays.push({ name: "Myanmar New Year's Day", nameMM: 'မြန်မာနှစ်ဆန်းတစ်ရက်နေ့', type: 'public', description: `Myanmar Year ${mm.my} ME begins`, date: dateObj });
    }

    // 3. Myanmar Lunisolar Holidays & Festivals
    // Kason Full Moon (Buddha Day / Watering the Sacred Bodhi Tree)
    if (mm.mm === 2 && mp === 1) {
      holidays.push({ name: 'Full Moon of Kason (Buddha Day)', nameMM: 'ကဆုန်လပြည့် (ဗုဒ္ဓနေ့)', type: 'public', description: 'Birth, Enlightenment & Parinibbana of Buddha', date: dateObj });
    }
    // Nayon Mahasamaya Day (Full Moon)
    if (mm.mm === 3 && mp === 1) {
      holidays.push({ name: 'Nayon Full Moon (Maha Samaya Day)', nameMM: 'နယုန်လပြည့် (မဟာသမယနေ့)', type: 'religious', description: 'Festival of recitation of Maha Samaya Sutta', date: dateObj });
    }
    // Waso Full Moon (Beginning of Buddhist Lent / Vassa / Dhammacakka Day)
    if ((mm.mm === 4 || mm.mm === 0) && mp === 1) {
      holidays.push({ name: 'Full Moon of Waso (Dhammacakka Day / Vassa Begins)', nameMM: 'ဝါဆိုလပြည့် (ဓမ္မစကြာနေ့)', type: 'public', description: 'First sermon of Buddha & Beginning of Buddhist Lent', date: dateObj });
    }
    // Wagaung Metta Day (Full Moon) & Lot-Casting Festival (စာရေးတံမဲပွဲ)
    if (mm.mm === 5 && mp === 1) {
      holidays.push({ name: 'Wagaung Full Moon (Metta Day)', nameMM: 'ဝါခေါင်လပြည့် (မေတ္တာအခါတော်နေ့)', type: 'religious', description: 'Metta Sutta Recitation & Lot-casting robe offering', date: dateObj });
    }
    // Tawthalin Garudhamma Day (Full Moon) & Royal Regatta Festival
    if (mm.mm === 6 && mp === 1) {
      holidays.push({ name: 'Tawthalin Full Moon (Garudhamma Day)', nameMM: 'တော်သလင်းလပြည့် (ဂရုဓမ္မအခါတော်နေ့)', type: 'religious', description: 'Boat racing festival & observance of moral precepts', date: dateObj });
    }
    // Thadingyut Festival of Lights (End of Buddhist Lent / Abhidhamma Day)
    if (mm.mm === 7 && mm.md === 14) {
      holidays.push({ name: 'Thadingyut Eve', nameMM: 'သီတင်းကျွတ်အဖိတ်နေ့', type: 'festival', description: 'Festival of Lights Eve', date: dateObj });
    } else if (mm.mm === 7 && mp === 1) {
      holidays.push({ name: 'Full Moon of Thadingyut (Abhidhamma Day / Festival of Lights)', nameMM: 'သီတင်းကျွတ်လပြည့် (အဘိဓမ္မာအခါတော်နေ့)', type: 'public', description: 'End of Buddhist Lent, Buddha descends from heaven', date: dateObj });
    } else if (mm.mm === 7 && mm.md === 16) {
      holidays.push({ name: 'Thadingyut Holiday', nameMM: 'သီတင်းကျွတ်လပြည့်ကျော် ၁ ရက်', type: 'public', description: 'Post-Full Moon holiday', date: dateObj });
    }
    // Tazaungmon Festival (Kathina Robe Offering / Samannaphala Day)
    if (mm.mm === 8 && mm.md === 14) {
      holidays.push({ name: 'Tazaungdaing Eve', nameMM: 'တန်ဆောင်မုန်းအဖိတ်နေ့', type: 'festival', description: 'Weaving competition & Kathina eve', date: dateObj });
    } else if (mm.mm === 8 && mp === 1) {
      holidays.push({ name: 'Full Moon of Tazaungmon (Samannaphala Day)', nameMM: 'တန်ဆောင်မုန်းလပြည့် (သာမညဖလအခါတော်နေ့)', type: 'public', description: 'Tazaungdaing Festival of Lights & Robe offering', date: dateObj });
    }
    // National Day (အမျိုးသားနေ့ = Tazaungmon Waning 10 / md: 25)
    if (mm.mm === 8 && mm.md === 25) {
      holidays.push({ name: 'National Day', nameMM: 'အမျိုးသားနေ့', type: 'public', description: '1920 Rangoon University Boycott commemoration', date: dateObj });
    }
    // Nadaw Literature Day (Full Moon)
    if (mm.mm === 9 && mp === 1) {
      holidays.push({ name: 'Nadaw Full Moon (Sasana & Writers Day)', nameMM: 'နတ်တော်လပြည့် (စာဆိုတော်နေ့)', type: 'religious', description: 'Honoring traditional writers and literary scholars', date: dateObj });
    }
    // Karen New Year (Pyatho Waxing 1 / md: 1)
    if (mm.mm === 10 && mm.md === 1) {
      holidays.push({ name: "Karen New Year's Day", nameMM: 'ကရင်နှစ်သစ်ကူးနေ့', type: 'public', description: 'Traditional Karen national celebration', date: dateObj });
    }
    // Pyatho Shin Gautama Day (Full Moon)
    if (mm.mm === 10 && mp === 1) {
      holidays.push({ name: 'Pyatho Full Moon (Shin Gautama Day)', nameMM: 'ပြာသိုလပြည့် (ရှင်ဂေါတမအခါတော်နေ့)', type: 'religious', description: 'Equestrian festival and homage to Buddha', date: dateObj });
    }
    // Tabodwe Htamane Festival (Full Moon)
    if (mm.mm === 11 && mp === 1) {
      holidays.push({ name: 'Tabodwe Full Moon (Htamane Festival / Ovada Patimokkha Day)', nameMM: 'တပို့တွဲလပြည့် (ဩဝါဒပါတိမောက်အခါတော်နေ့)', type: 'festival', description: 'Sticky rice delicacy offering festival', date: dateObj });
    }
    // Tabaung Full Moon (Pagoda Festival / Maha Parinibbana / Shwedagon Festival)
    if (mm.mm === 12 && mp === 1) {
      holidays.push({ name: 'Full Moon of Tabaung (Shwedagon Pagoda Festival)', nameMM: 'တပေါင်းလပြည့် (ရွှေတိဂုံဘုရားပွဲတော်)', type: 'public', description: 'All pagoda festivals & building of stupas', date: dateObj });
    }

    // 4. Interfaith Observances (Approximate traditional dates)
    // Deepavali (Tazaungmon New Moon / Dark Day)
    if (mm.mm === 8 && mp === 3) {
      holidays.push({ name: 'Deepavali Festival', nameMM: 'ဒီဝါလီနေ့', type: 'religious', description: 'Hindu Festival of Lights', date: dateObj });
    }
    // Eid al-Fitr (approximate lunar calendar integration)
    // In Myanmar government public calendar, Eid is determined by lunar moon sighting
    if (gregorianYear === 2026 && gregorianMonth === 3 && d === 20) {
      holidays.push({ name: 'Eid al-Fitr Day', nameMM: 'ဣဒ်ဖိတ်ရ် (အိဒ်နေ့)', type: 'public', description: 'Islamic festival marking the end of Ramadan', date: dateObj });
    }
    if (gregorianYear === 2026 && gregorianMonth === 5 && d === 27) {
      holidays.push({ name: 'Eid al-Adha Day', nameMM: 'အီဒုလ်အသွာဟာ (ကုရ်ဘာနီနေ့)', type: 'religious', description: 'Feast of Sacrifice', date: dateObj });
    }
  }

  return holidays.sort((a, b) => a.date - b.date);
}

// ─── Complete Myanmar Date API (Primary Entrypoint) ───────────────────────────

// LRU Cache for performance
const DATE_CACHE = new Map();
const MAX_CACHE_SIZE = 500;

function getCachedDate(key, calculator) {
  if (DATE_CACHE.has(key)) return DATE_CACHE.get(key);
  const result = calculator();
  if (DATE_CACHE.size >= MAX_CACHE_SIZE) {
    const firstKey = DATE_CACHE.keys().next().value;
    DATE_CACHE.delete(firstKey);
  }
  DATE_CACHE.set(key, result);
  return result;
}

/**
 * Get full Myanmar calendar info for a Gregorian Date
 */
function getMyanmarDate(dateInput) {
  let year, month, day;
  if (!dateInput) {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
    day = now.getDate();
  } else if (dateInput instanceof Date) {
    year = dateInput.getFullYear();
    month = dateInput.getMonth() + 1;
    day = dateInput.getDate();
  } else if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      day = parseInt(match[3], 10);
    } else {
      const d = new Date(dateInput);
      year = d.getFullYear();
      month = d.getMonth() + 1;
      day = d.getDate();
    }
  } else if (typeof dateInput === 'object' && dateInput.year) {
    year = dateInput.year;
    month = dateInput.month;
    day = dateInput.day;
  } else {
    const d = new Date(dateInput);
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }

  const cacheKey = `date_${year}_${month}_${day}`;

  return getCachedDate(cacheKey, () => {
    const jdn = gregorianToJDN(year, month, day);
    const weekday = (jdn + 1) % 7; // 0=Sun, 1=Mon, ..., 6=Sat
    const wd_mm = (jdn + 2) % 7;   // Astrological weekday: 0=Sat, 1=Sun, ..., 6=Fri

    // Myanmar Date conversion
    const mm = j2m(jdn);
    const mml = cal_mml(mm.mm, mm.myt);
    const moonPhase = cal_mp(mm.md, mm.mm, mm.myt);
    const fortnightDay = cal_mf(mm.md);
    const sasanaYear = my2sy(mm.my, mm.mm, mm.md);

    // Astrological computations
    const sabbath = cal_sabbath(mm.md, mm.mm, mm.myt);
    const isYatyaza = cal_yatyaza(mm.mm, wd_mm) === 1;
    const pyathadaStatus = cal_pyathada(mm.mm, wd_mm);
    const isPyathada = pyathadaStatus === 1;
    const isAfternoonPyathada = pyathadaStatus === 2;
    const isAmyeittasote = cal_amyeittasote(mm.md, wd_mm) === 1;
    const isWarameittugyi = cal_warameittugyi(mm.md, wd_mm) === 1;
    const isWarameittunge = cal_warameittunge(mm.md, wd_mm) === 1;
    const isYatpote = cal_yatpote(mm.md, wd_mm) === 1;
    const isThamanyo = cal_thamanyo(mm.mm, wd_mm) === 1;
    const isThamaphyu = cal_thamaphyu(mm.md, wd_mm) === 1;
    const isNagapor = cal_nagapor(mm.md, wd_mm) === 1;
    const isYatyotema = cal_yatyotema(mm.mm, mm.md) === 1;
    const isMahayatkyan = cal_mahayatkyan(mm.mm, mm.md) === 1;
    const isShanyat = cal_shanyat(mm.mm, mm.md) === 1;

    // Directional & house energy
    const nagahleIdx = cal_nagahle(mm.mm);
    const mahaboteHouse = cal_mahabote_house(mm.my, wd_mm);

    // Nakhat 12 & 3
    const nakhat12Idx = ((mm.my % 12) + 12) % 12;
    const nakhat12 = NAKHAT_12[nakhat12Idx];
    const nakhat3Idx = ((mm.my % 3) + 3) % 3;
    const nakhat3 = NAKHAT_3[nakhat3Idx];

    // Month Names
    const monthName = MYANMAR_MONTHS[mm.mm] || 'Unknown';
    const monthNameMM = MYANMAR_MONTHS_MM[mm.mm] || 'အမည်မသိ';
    const moonPhaseName = MOON_PHASES[moonPhase];
    const moonPhaseNameMM = MOON_PHASES_MM[moonPhase];

    // Formatted Strings
    let myanmarDayStr, myanmarDayStrMM;
    if (moonPhase === 1) {
      myanmarDayStr = `Full Moon of ${monthName}`;
      myanmarDayStrMM = `${monthNameMM} လပြည့်`;
    } else if (moonPhase === 3) {
      myanmarDayStr = `New Moon (Dark) of ${monthName}`;
      myanmarDayStrMM = `${monthNameMM} လကွယ်`;
    } else {
      myanmarDayStr = `${moonPhaseName} ${fortnightDay}, ${monthName}`;
      myanmarDayStrMM = `${monthNameMM} ${moonPhaseNameMM} ${toMyanmarNumerals(fortnightDay)} ရက်`;
    }

    // Watat string label
    const watatLabel = mm.myt === 2 ? 'Big Watat (ဝါကြီးထပ်)' :
                       mm.myt === 1 ? 'Little Watat (ဝါငယ်ထပ်)' : 'Common Year (ဝါရိုး)';

    // Astrological signs array
    const signs = [];
    const signsMM = [];
    if (isYatyaza) { signs.push('Yatyaza'); signsMM.push('ရက်ရာဇာ'); }
    if (isPyathada) { signs.push('Pyathada'); signsMM.push('ပြဿဒါး'); }
    if (isAfternoonPyathada) { signs.push('Afternoon Pyathada'); signsMM.push('မွန်းလွဲပြဿဒါး'); }
    if (isAmyeittasote) { signs.push('Amyeittasote'); signsMM.push('အမြိုက်စိုတ်'); }
    if (isWarameittugyi) { signs.push('Warameittugyi'); signsMM.push('ဝါရမိတ္တုကြီး'); }
    if (isWarameittunge) { signs.push('Warameittunge'); signsMM.push('ဝါရမိတ္တုငယ်'); }
    if (isNagapor) { signs.push('Nagapor'); signsMM.push('နဂါးပေါ်'); }
    if (isYatpote) { signs.push('Yatpote'); signsMM.push('ရက်ပုပ်'); }
    if (isThamanyo) { signs.push('Thamanyo'); signsMM.push('သမားညို'); }
    if (isThamaphyu) { signs.push('Thamaphyu'); signsMM.push('သမားဖြူ'); }
    if (isYatyotema) { signs.push('Yatyotema'); signsMM.push('ရက်ယုတ်မာ'); }
    if (isMahayatkyan) { signs.push('Mahayatkyan'); signsMM.push('မဟာရက်ကြမ်း'); }
    if (isShanyat) { signs.push('Shanyat'); signsMM.push('ရှမ်းရက်'); }

    // Sabbath label
    let sabbathStr = null;
    let sabbathStrMM = null;
    if (sabbath === 1) {
      sabbathStr = 'Sabbath Day (Uposatha)';
      sabbathStrMM = 'ဥပုသ်နေ့';
    } else if (sabbath === 2) {
      sabbathStr = 'Sabbath Eve';
      sabbathStrMM = 'အဖိတ်နေ့';
    }

    return {
      gregorian: {
        year, month, day, weekday,
        isoString: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      },
      myanmar: {
        year: mm.my,
        sasanaYear,
        month: mm.mm,
        monthName,
        monthNameMM,
        monthLength: mml,
        day: mm.md,
        fortnightDay,
        moonPhase,
        moonPhaseName,
        moonPhaseNameMM,
        yearType: mm.myt,
        isWatat: mm.myt > 0,
        watatLabel,
      },
      auspicious: {
        isYatyaza,
        isPyathada,
        isAfternoonPyathada,
        isAmyeittasote,
        isWarameittugyi,
        isWarameittunge,
        isNagapor,
        isYatpote,
        isThamanyo,
        isThamaphyu,
        isYatyotema,
        isMahayatkyan,
        isShanyat,
        sabbath,
        sabbathStr,
        sabbathStrMM,
        mahabote: mahaboteHouse.house,
        mahaboteMM: mahaboteHouse.houseMM,
        nagahle: NAGAHLE_DIRECTIONS[nagahleIdx],
        nagahleMM: NAGAHLE_DIRECTIONS_MM[nagahleIdx],
        signs,
        signsMM,
      },
      astrology: {
        nakhat12,
        nakhat3,
        weekdayName: WEEKDAYS[weekday],
        weekdayNameMM: WEEKDAYS_MM[weekday],
        planetaryRuler: PLANETARY_RULERS[weekday],
      },
      formatted: {
        myanmarDate: myanmarDayStr,
        myanmarDateMM: myanmarDayStrMM,
        myanmarYearStr: `${mm.my} ME (${sasanaYear} BE)`,
        myanmarYearStrMM: `${toMyanmarNumerals(mm.my)} မြန်မာသက္ကရာဇ် (သာသနာနှစ် ${toMyanmarNumerals(sasanaYear)})`,
        fullDateEN: `${WEEKDAYS[weekday]}, ${myanmarDayStr}, ${mm.my} ME`,
        fullDateMM: `${WEEKDAYS_MM[weekday]}၊ ${myanmarDayStrMM}၊ ${toMyanmarNumerals(mm.my)} ခုနှစ်`,
      },
      jdn
    };
  });
}

/**
 * Get complete data for an entire Gregorian month
 */
function getMonthDataBase(gregorianYear, gregorianMonth) {
  const cacheKey = `month_base_${gregorianYear}_${gregorianMonth}`;
  return getCachedDate(cacheKey, () => {
    const firstDay = new Date(gregorianYear, gregorianMonth - 1, 1);
    const lastDay = new Date(gregorianYear, gregorianMonth, 0);
    const totalDays = lastDay.getDate();
    const days = [];

    const holidays = getMyanmarHolidays(gregorianYear, gregorianMonth);

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(gregorianYear, gregorianMonth - 1, d);
      const mmd = getMyanmarDate(date);

      const dayHolidays = holidays.filter(h => {
        return h.date && h.date.getDate() === d;
      });

      days.push({
        ...mmd,
        holidays: dayHolidays,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }

    const thingyanInfo = getThingyan(gregorianYear);

    // Identify dominant Myanmar month(s) in this Gregorian month
    const primaryMMMonth = days[Math.floor(days.length / 2)].myanmar.monthName;
    const primaryMMMonthMM = days[Math.floor(days.length / 2)].myanmar.monthNameMM;
    const primaryMMYear = days[Math.floor(days.length / 2)].myanmar.year;
    const primarySasanaYear = days[Math.floor(days.length / 2)].myanmar.sasanaYear;

    return {
      year: gregorianYear,
      month: gregorianMonth,
      firstDayOfWeek: firstDay.getDay(),
      totalDays,
      days,
      holidays,
      thingyanInfo,
      primaryMMMonth,
      primaryMMMonthMM,
      primaryMMYear,
      primarySasanaYear,
    };
  });
}

/**
 * Get complete data for an entire Gregorian month with dynamic isToday
 */
function getMonthData(gregorianYear, gregorianMonth) {
  const base = getMonthDataBase(gregorianYear, gregorianMonth);
  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth() + 1;
  const currentD = now.getDate();

  return {
    ...base,
    days: base.days.map(d => ({
      ...d,
      isToday: (d.gregorian.year === currentY && d.gregorian.month === currentM && d.gregorian.day === currentD),
    })),
  };
}

/**
 * Full year data
 */
function getYearData(gregorianYear) {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    months.push(getMonthData(gregorianYear, m));
  }
  return {
    year: gregorianYear,
    months,
    thingyan: getThingyan(gregorianYear)
  };
}

/**
 * Thingyan countdown
 */
function getThingyanCountdown() {
  const today = new Date();
  const currentYear = today.getFullYear();

  let thingyan = getThingyan(currentYear);
  if (today > thingyan.newYearDate) {
    thingyan = getThingyan(currentYear + 1);
  }

  const msUntilAkyo = thingyan.akyoDate.getTime() - today.getTime();
  const daysUntil = Math.ceil(msUntilAkyo / (1000 * 60 * 60 * 24));

  const isNow = today >= thingyan.akyoDate && today <= thingyan.newYearDate;

  return {
    thingyan,
    daysUntil: Math.max(0, daysUntil),
    isNow,
    akyoDateStr: thingyan.akyoDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    newYearDateStr: thingyan.newYearDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

// ─── Auspicious Date Finder (မင်္ဂလာရက်ရွေးချယ်သည့် အင်ဂျင်) ───────────────────

/**
 * Auspicious Date Finder Engine
 * Searches upcoming dates for auspicious combinations tailored by purpose:
 * - wedding (မင်္ဂလာဆောင်)
 * - housewarming (အိမ်တက်/အိမ်ဆောက်)
 * - business (ဆိုင်ဖွင့်/စီးပွားစတင်)
 * - travel (ခရီးထွက်)
 * - ordination (ရှင်ပြု/ရဟန်းခံ)
 * - general (အထွေထွေ မင်္ဂလာ)
 */
function findAuspiciousDates(purpose = 'general', startYear, startMonth, maxResults = 10) {
  const results = [];
  const start = (startYear && startMonth) ? new Date(startYear, startMonth - 1, 1) : new Date();
  const current = new Date(start);

  let scannedDays = 0;
  const maxScanDays = 365; // scan up to 1 year forward

  while (results.length < maxResults && scannedDays < maxScanDays) {
    const info = getMyanmarDate(current);
    const { auspicious, myanmar, astrology, gregorian } = info;

    let score = 0;
    const matchReasons = [];
    const cautions = [];

    // Base auspicious boosts
    if (auspicious.isYatyaza) {
      score += 40;
      matchReasons.push('Yatyaza Day (ရက်ရာဇာ)');
    }
    if (auspicious.isAmyeittasote) {
      score += 35;
      matchReasons.push('Amyeittasote (အမြိုက်စိုတ် — Nectar Day)');
    }
    if (auspicious.isWarameittugyi) {
      score += 25;
      matchReasons.push('Warameittugyi (ဝါရမိတ္တုကြီး)');
    }
    if (auspicious.isWarameittunge) {
      score += 15;
      matchReasons.push('Warameittunge (ဝါရမိတ္တုငယ်)');
    }

    // Inauspicious deductions
    if (auspicious.isPyathada) {
      score -= 50;
      cautions.push('Pyathada (ပြဿဒါး — Fiery Obstacle)');
    }
    if (auspicious.isAfternoonPyathada) {
      score -= 25;
      cautions.push('Afternoon Pyathada (မွန်းလွဲပြဿဒါး — Morning favored)');
    }
    if (auspicious.isNagapor) {
      score -= 40;
      cautions.push('Nagapor (နဂါးပေါ် — Dragon Day Taboo)');
    }
    if (auspicious.isYatpote) {
      score -= 30;
      cautions.push('Yatpote (ရက်ပုပ် — Rotten Day)');
    }
    if (auspicious.isYatyotema) {
      score -= 30;
      cautions.push('Yatyotema (ရက်ယုတ်မာ)');
    }
    if (auspicious.isMahayatkyan) {
      score -= 35;
      cautions.push('Mahayatkyan (မဟာရက်ကြမ်း)');
    }
    if (auspicious.isThamanyo) {
      score -= 20;
      cautions.push('Thamanyo (သမားညို)');
    }

    // Purpose-specific filters and weightings
    let eligible = false;

    if (purpose === 'wedding') {
      // Weddings require Yatyaza or Amyeittasote, strict avoidance of Pyathada, Nagapor, Yatpote
      if ((auspicious.isYatyaza || auspicious.isAmyeittasote || auspicious.isWarameittugyi) &&
          !auspicious.isPyathada && !auspicious.isNagapor && !auspicious.isYatpote &&
          !auspicious.isYatyotema && !auspicious.isMahayatkyan && auspicious.sabbath !== 1) {
        eligible = true;
        // Waxing moon preferred for weddings
        if (myanmar.moonPhase === 0) {
          score += 20;
          matchReasons.push('Waxing Moon (လဆန်းရက် — Growing fortune)');
        }
      }
    } else if (purpose === 'housewarming') {
      // Housewarming: Yatyaza / Amyeittasote, avoid Nagapor, Yatpote
      if ((auspicious.isYatyaza || auspicious.isAmyeittasote) &&
          !auspicious.isPyathada && !auspicious.isNagapor && !auspicious.isYatpote) {
        eligible = true;
        if (myanmar.moonPhase === 0 || myanmar.moonPhase === 1) score += 15;
      }
    } else if (purpose === 'business') {
      // Business opening: Yatyaza, Amyeittasote, Warameittugyi
      if ((auspicious.isYatyaza || auspicious.isAmyeittasote || auspicious.isWarameittugyi) &&
          !auspicious.isPyathada && !auspicious.isYatpote) {
        eligible = true;
        score += 10;
      }
    } else if (purpose === 'travel') {
      // Travel: avoid Pyathada, Nagapor, and consider Nagahle direction
      if (!auspicious.isPyathada && !auspicious.isNagapor && !auspicious.isYatpote && !auspicious.isMahayatkyan) {
        eligible = true;
        matchReasons.push(`Safe Travel Direction (Avoid traveling towards ${auspicious.nagahle})`);
      }
    } else if (purpose === 'ordination') {
      // Ordination: Full Moon or Sabbath day, Waxing moon, Amyeittasote
      if ((auspicious.sabbath === 1 || myanmar.moonPhase === 1 || auspicious.isAmyeittasote) && !auspicious.isPyathada) {
        eligible = true;
        if (myanmar.moonPhase === 1) { score += 25; matchReasons.push('Full Moon Sacred Day'); }
        if (auspicious.sabbath === 1) { score += 20; matchReasons.push('Uposatha Sabbath Day'); }
      }
    } else {
      // General Auspicious
      if ((auspicious.isYatyaza || auspicious.isAmyeittasote || auspicious.isWarameittugyi) && !auspicious.isPyathada) {
        eligible = true;
      }
    }

    if (eligible && score > 20) {
      results.push({
        date: new Date(current),
        gregorianStr: current.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
        myanmarDateStr: info.formatted.myanmarDate,
        myanmarDateMM: info.formatted.myanmarDateMM,
        score,
        matchReasons,
        cautions,
        auspicious,
        astrology,
      });
    }

    current.setDate(current.getDate() + 1);
    scannedDays++;
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

// ─── iCalendar (.ics) Generator ───────────────────────────────────────────────

/**
 * Generate iCalendar format for Myanmar holidays & major festivals
 */
function generateIcsCalendar(year) {
  const events = [];
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  for (let m = 1; m <= 12; m++) {
    const holidays = getMyanmarHolidays(year, m);
    for (const h of holidays) {
      if (!h.date) continue;
      const y = h.date.getFullYear();
      const mStr = String(h.date.getMonth() + 1).padStart(2, '0');
      const dStr = String(h.date.getDate()).padStart(2, '0');
      const dtStart = `${y}${mStr}${dStr}`;
      const uid = `mmcal-${y}-${mStr}-${dStr}-${encodeURIComponent(h.name)}@myanmarcalendar`;

      events.push([
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `SUMMARY:${h.name} (${h.nameMM})`,
        `DESCRIPTION:${h.description || h.nameMM}`,
        'STATUS:CONFIRMED',
        'TRANSP:TRANSPARENT',
        'END:VEVENT'
      ].join('\r\n'));
    }
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Myanmar Calendar Desktop macOS//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Myanmar Calendar Holidays',
    'X-WR-TIMEZONE:Asia/Yangon',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');
}



  // ─── Browser Exports ──────────────────────────────────────────────────────────
  return {
    // Primary API (matches Electron IPC surface)
    getMyanmarDate,
    getMonthData,
    getYearData,
    getThingyan,
    getThingyanCountdown,
    getMyanmarHolidays,
    findAuspiciousDates,
    generateIcsCalendar,
    getMahaboteRuler,
    get8MansionChart,
    convertMyanmarToGregorian: function(my, mm, md) {
      const jdn = m2j(my, mm, md);
      const g = jdnToGregorian(jdn);
      return { gregorian: g, myanmarDate: getMyanmarDate(new Date(g.year, g.month - 1, g.day)), jdn };
    },

    // Low-level math
    gregorianToJDN, jdnToGregorian,
    j2m, m2j, cal_watat, cal_my, cal_mml, cal_myl, cal_mp, cal_mf, my2sy,
    cal_sabbath, cal_yatyaza, cal_pyathada, cal_amyeittasote, cal_warameittugyi,
    cal_warameittunge, cal_yatpote, cal_thamaphyu, cal_thamanyo, cal_nagapor,
    cal_yatyotema, cal_mahayatkyan, cal_shanyat, cal_nagahle,
    cal_mahabote_house, toMyanmarNumerals,

    // Constants
    MYANMAR_MONTHS, MYANMAR_MONTHS_MM, MOON_PHASES, MOON_PHASES_MM,
    WEEKDAYS, WEEKDAYS_MM, WEEKDAYS_SHORT, NAKHAT_12, NAKHAT_3,
    PLANETARY_RULERS, NAGAHLE_DIRECTIONS, NAGAHLE_DIRECTIONS_MM,
    MAHABOTE_HOUSES, MAHABOTE_HOUSES_MM,
  };
}));
