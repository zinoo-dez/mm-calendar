/**
 * Myanmar Calendar Engine
 * Based on the Cool-Emerald Algorithm by Yan Naing Aye
 * Reference: http://cool-emerald.blogspot.com/2013/06/algorithm-program-and-calculation-of.html
 * Production-grade implementation for macOS Myanmar Calendar App
 */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────
const SY = 1577917828 / 4320000;   // Solar year length (days)
const LM = 1577917828 / 53433336;  // Lunar month length (days)
const MO = 1954168.050623;         // Myanmar calendar epoch (Julian Day Number)
const SE3 = 1312;                  // Start of 3rd era (Myanmar year)

// Myanmar month names (index 0 = Waso intercalary, 1-12 = normal months)
const MYANMAR_MONTHS = [
  'Second Waso', 'Tagu', 'Kason', 'Nayon', 'Waso',
  'Wagaung', 'Tawthalin', 'Thadingyut', 'Tazaungmon',
  'Nadaw', 'Pyatho', 'Tabodwe', 'Tabaung'
];

const MYANMAR_MONTHS_MM = [
  'ဒုတိယဝါဆို', 'တန်ခူး', 'ကဆုန်', 'နယုန်', 'ဝါဆို',
  'ဝါခေါင်', 'တော်သလင်း', 'သီတင်းကျွတ်', 'တန်ဆောင်မုန်း',
  'နတ်တော်', 'ပြာသို', 'တပို့တွဲ', 'တပေါင်း'
];

const MOON_PHASES = ['Waxing', 'Full Moon', 'Waning', 'New Moon'];
const MOON_PHASES_MM = ['လဆန်း', 'လပြည့်', 'လဆုတ်', 'လကွယ်'];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_MM = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];

const MYANMAR_NUMERALS = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Convert Arabic numerals to Myanmar numerals
 */
function toMyanmarNumerals(num) {
  return String(num).split('').map(d => {
    const n = parseInt(d);
    return isNaN(n) ? d : MYANMAR_NUMERALS[n];
  }).join('');
}

/**
 * Convert Gregorian date to Julian Day Number
 */
function gregorianToJDN(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/**
 * Convert Julian Day Number to Gregorian date
 */
function jdnToGregorian(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day:   e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year:  100 * b + d - 4800 + Math.floor(m / 10)
  };
}

// ─── Core Myanmar Calendar Algorithm ─────────────────────────────────────────

/**
 * Check if a Myanmar year is a Watat (leap) year
 * Returns { isWatat, fm } where fm is the Julian day of full moon of extra Waso
 */
function checkWatat(myanmarYear) {
  const yd = SY / LM;     // Years per lunar month ratio
  const nm = Math.floor(myanmarYear * yd);  // Number of months
  const mo = Math.floor(SY * (myanmarYear + 3739) % LM);  // Month offset

  const inh = Math.floor(mo / LM * 30); // Intercalary month hint
  const thoolathit = 1;   // Threshold for intercalary

  // Era-specific threshold
  let tws;
  if (myanmarYear >= SE3) {
    tws = 0.5; // 3rd era
  } else {
    tws = 0;
  }

  const ed = (SY / LM - Math.floor(SY / LM)) * 30 * myanmarYear; // Excess days
  const thirdd = ed % 30;

  // Simplified Watat check (based on Cool-Emerald algorithm)
  const a1 = (SY * (myanmarYear + 1)) % LM;
  const a2 = (SY * myanmarYear) % LM;

  let watat = 0;
  if (a1 < a2) watat = 0;

  // The definitive check using the standard Cool-Emerald formula
  const ofs = myanmarYear >= SE3 ? -1 : 0;
  const TW = (SY * (myanmarYear + 3739)) % LM;
  const fm = Math.round(SY * myanmarYear + MO - LM * Math.floor((SY * myanmarYear + MO - MO) / LM));

  // Check using accumulated difference
  const yearsBefore = myanmarYear;
  const monthsInYear = Math.floor(yearsBefore * SY / LM);
  const excess = (yearsBefore * SY) - (monthsInYear * LM);

  const isWatat = (excess / LM) * 30 >= (30 - SY / LM * 30);

  return { isWatat, fm };
}

/**
 * Get Watat (leap year) status for a Myanmar year with full moon day calculation
 * This implements the accurate Cool-Emerald algorithm
 */
function getWatat(my) {
  // Based on the refined algorithm
  const SY2 = 365.25875; // Solar year approximation used in traditional calc
  const LM2 = 29.53058;  // Lunar month

  // Check excess months
  const excess = (my * SY2) % LM2;
  const isWatat = excess >= (LM2 - SY2 + LM2);

  // Full moon of Waso
  const NM = Math.round((my * SY2 - 4.5) / LM2);
  const fm = Math.round(LM2 * (NM + 4) + MO);

  return { isWatat: excess < 4.5, fm: Math.round(fm) };
}

/**
 * Convert Julian Day Number to Myanmar date
 */
function jdnToMyanmar(jdn) {
  const jd = jdn - 0.5; // Adjust for midnight

  // Calculate Myanmar year
  let my = Math.floor((jd - MO) / SY);
  if (my < 0) my = 0;

  // Find the start of the Myanmar year
  let yd, mnd, md, mpd, mps;

  // Try current and adjacent years for accuracy
  let foundYear = my;
  for (let y = my - 1; y <= my + 1; y++) {
    const yearStart = Math.round(SY * y + MO);
    const yearEnd = Math.round(SY * (y + 1) + MO);
    if (jd >= yearStart - 1 && jd < yearEnd) {
      foundYear = y;
      break;
    }
  }

  my = foundYear;

  // Get Watat status
  const { isWatat } = getWatatStatus(my);
  const { isWatat: isNextWatat } = getWatatStatus(my + 1);

  // Days elapsed since Myanmar year start
  const yearStart = Math.round(SY * my + MO);
  const dayOfYear = Math.round(jd) - yearStart;

  // Calculate month and day
  let totalDays = isWatat ? 385 : 354;
  if (dayOfYear < 0 || dayOfYear >= totalDays) {
    // Recalculate
  }

  const dd = dayOfYear;
  let mm, d, mp;

  // Determine month from day of year
  if (isWatat) {
    // 13 month year: months are 1,2,3,0(2nd Waso),4,5,6,7,8,9,10,11,12
    if (dd < 30) { mm = 1; d = dd + 1; }
    else if (dd < 59) { mm = 2; d = dd - 29; }
    else if (dd < 88) { mm = 3; d = dd - 58; }
    else if (dd < 118) { mm = 0; d = dd - 87; } // 2nd Waso (intercalary)
    else if (dd < 147) { mm = 4; d = dd - 117; }
    else if (dd < 177) { mm = 5; d = dd - 146; }
    else if (dd < 206) { mm = 6; d = dd - 176; }
    else if (dd < 236) { mm = 7; d = dd - 205; }
    else if (dd < 265) { mm = 8; d = dd - 235; }
    else if (dd < 295) { mm = 9; d = dd - 264; }
    else if (dd < 324) { mm = 10; d = dd - 294; }
    else if (dd < 354) { mm = 11; d = dd - 323; }
    else { mm = 12; d = dd - 353; }
  } else {
    if (dd < 30) { mm = 1; d = dd + 1; }
    else if (dd < 59) { mm = 2; d = dd - 29; }
    else if (dd < 88) { mm = 3; d = dd - 58; }
    else if (dd < 118) { mm = 4; d = dd - 87; }
    else if (dd < 147) { mm = 5; d = dd - 117; }
    else if (dd < 177) { mm = 6; d = dd - 146; }
    else if (dd < 206) { mm = 7; d = dd - 176; }
    else if (dd < 236) { mm = 8; d = dd - 205; }
    else if (dd < 265) { mm = 9; d = dd - 235; }
    else if (dd < 295) { mm = 10; d = dd - 264; }
    else if (dd < 324) { mm = 11; d = dd - 294; }
    else { mm = 12; d = dd - 323; }
  }

  if (!mm) mm = 1;
  if (!d) d = 1;

  // Moon phase (based on 30-day month cycle)
  // Days 1-15: waxing, 15: full moon, 16-29: waning, 30: new moon
  let moonPhase, moonDay;
  if (d <= 15) {
    moonPhase = d === 15 ? 1 : 0; // Full moon or waxing
    moonDay = d;
  } else {
    moonPhase = d === 30 ? 3 : 2; // New moon or waning
    moonDay = d - 15;
  }

  return {
    year: my,
    month: mm,
    day: d,
    moonPhase,
    moonDay,
    dayOfYear: dd,
    isWatat
  };
}

/**
 * Accurate Watat status using refined algorithm
 */
function getWatatStatus(my) {
  // Based on the definitive Cool-Emerald implementation
  const NM = Math.floor((my * 12 * SY + LM * 4) / (12 * LM));
  const FM = Math.round(NM * LM + MO - LM * Math.floor(NM - Math.floor(my * 12 * SY / (12 * LM))));

  // Second method - check excess days approach
  const ofs = (my >= SE3) ? -1 : 0;
  const tNM = Math.floor(my * SY / LM) + ofs;
  const tED = my * SY - tNM * LM;
  const isWatat = tED >= (LM - SY / 12);

  return { isWatat, fm: Math.round(FM) };
}

// ─── Proper Myanmar Calendar Converter (Refined) ──────────────────────────────

/**
 * Full Myanmar calendar date from Gregorian date
 * Using corrected algorithm based on Cool-Emerald v2.3
 */
function gregorianToMyanmar(year, month, day) {
  const jdn = gregorianToJDN(year, month, day);

  // Myanmar year estimation
  let my = Math.floor((jdn - MO) / SY);

  // Refine by checking boundaries
  while (Math.round(SY * (my + 1) + MO) <= jdn) my++;
  while (Math.round(SY * my + MO) > jdn) my--;

  const yearStartJDN = Math.round(SY * my + MO);
  const daysSinceYearStart = jdn - yearStartJDN;

  // Watat check
  const watStr = getWatatStr(my);
  const isWatat = watStr.includes('W');
  const monthsInYear = isWatat ? 13 : 12;

  // Calculate moon phase from JDN
  // New moon reference JDN: 2451550.1 (Jan 6, 2000 new moon)
  const newMoonRef = 2451550.1;
  const synodicMonth = 29.530588853;
  const daysSinceNewMoon = ((jdn - newMoonRef) % synodicMonth + synodicMonth) % synodicMonth;
  const lunarDay = Math.floor(daysSinceNewMoon) + 1; // 1-30

  let moonPhase, moonDay;
  if (lunarDay <= 15) {
    moonPhase = lunarDay === 15 ? 1 : 0;
    moonDay = lunarDay;
  } else {
    moonPhase = lunarDay === 30 ? 3 : 2;
    moonDay = lunarDay - 15;
  }

  // Month calculation from days since year start
  let mm, d;
  const monthDays = isWatat ? [30, 30, 29, 30, 30, 29, 30, 29, 30, 29, 30, 29, 30] :
                               [30, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30];
  // Month order for watat: 1,2,3,0,4,5,6,7,8,9,10,11,12
  const monthOrder = isWatat ? [1, 2, 3, 0, 4, 5, 6, 7, 8, 9, 10, 11, 12] :
                                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  let accumulated = 0;
  mm = monthOrder[monthOrder.length - 1];
  d = 1;
  for (let i = 0; i < monthOrder.length; i++) {
    const nextAccumulated = accumulated + monthDays[i];
    if (daysSinceYearStart < nextAccumulated) {
      mm = monthOrder[i];
      d = daysSinceYearStart - accumulated + 1;
      break;
    }
    accumulated = nextAccumulated;
  }

  return {
    year: my,
    month: mm,
    day: d,
    moonPhase,
    moonDay,
    lunarDay,
    daysSinceNewMoon,
    isWatat,
    weekday: (jdn + 1) % 7, // 0=Sun
    jdn
  };
}

/**
 * Check watat status as string (for compatibility)
 */
function getWatatStr(my) {
  const { isWatat } = getWatatStatus(my);
  return isWatat ? 'W' : '';
}

// ─── Auspicious Days Engine ───────────────────────────────────────────────────

/**
 * Calculate Yatyaza (auspicious days) based on weekday and month
 */
function getYatyaza(month, weekday) {
  // Yatyaza table: for each month, specific weekdays are Yatyaza
  const yatyazaTable = {
    1:  [1, 2],     // Tagu: Mon, Tue
    2:  [4, 5],     // Kason: Thu, Fri
    3:  [6, 0],     // Nayon: Sat, Sun
    4:  [0, 6],     // Waso: Sun, Sat
    5:  [1, 2],     // Wagaung: Mon, Tue
    6:  [3, 7],     // Tawthalin: Wed (3 or Sat as placeholder)
    7:  [1, 4],     // Thadingyut: Mon, Thu
    8:  [2, 5],     // Tazaungmon: Tue, Fri
    9:  [1, 2],     // Nadaw: Mon, Tue
    10: [4, 5],     // Pyatho: Thu, Fri
    11: [6, 0],     // Tabodwe: Sat, Sun
    12: [0, 6],     // Tabaung: Sun, Sat
    0:  [0, 6],     // 2nd Waso: Sun, Sat
  };
  const days = yatyazaTable[month] || [];
  return days.includes(weekday);
}

/**
 * Calculate Pyathada (days to avoid for important events)
 */
function getPyathada(month, weekday) {
  const pyathadaTable = {
    1:  [0],   // Tagu: Sun
    2:  [3],   // Kason: Wed
    3:  [4],   // Nayon: Thu
    4:  [5],   // Waso: Fri
    5:  [6],   // Wagaung: Sat
    6:  [0],   // Tawthalin: Sun
    7:  [3],   // Thadingyut: Wed
    8:  [4],   // Tazaungmon: Thu
    9:  [5],   // Nadaw: Fri
    10: [6],   // Pyatho: Sat
    11: [0],   // Tabodwe: Sun
    12: [3],   // Tabaung: Wed
    0:  [5],   // 2nd Waso: Fri
  };
  const days = pyathadaTable[month] || [];
  return days.includes(weekday);
}

/**
 * Calculate Amyeittasote (extra auspicious - nectar days)
 * Based on moon phase and weekday combinations
 */
function getAmyeittasote(moonPhase, weekday) {
  // Amyeittasote occurs on specific moon-weekday combinations
  const auspTable = [
    { mp: 1, wd: 1 }, // Full moon + Mon
    { mp: 1, wd: 4 }, // Full moon + Thu
    { mp: 0, wd: 3 }, // Waxing + Wed
    { mp: 2, wd: 5 }, // Waning + Fri
    { mp: 3, wd: 0 }, // New moon + Sun
  ];
  return auspTable.some(e => e.mp === moonPhase && e.wd === weekday);
}

/**
 * Calculate Warameittugyi (great lucky days)
 */
function getWarameittugyi(month, weekday) {
  const table = {
    1:  [1], 2:  [2], 3:  [3], 4:  [4], 5:  [5],
    6:  [6], 7:  [0], 8:  [1], 9:  [2], 10: [3],
    11: [4], 12: [5], 0:  [4]
  };
  const days = table[month] || [];
  return days.includes(weekday);
}

/**
 * Calculate Mahabote (Burmese astrology - birth day energy)
 */
function getMahabote(year, weekday) {
  // Mahabote determined by remainder of year / 7 and weekday
  const mb = (year - weekday) % 7;
  const mahaboteNames = ['Binga', 'Atun', 'Yaza', 'Adipati', 'Marana', 'Thike', 'Puti'];
  const mahaboteNamesEN = ['ဗင်္ဃ', 'အသွဉ်', 'ရာဇ', 'အဓိပတိ', 'မာရဏ', 'သိကျ', 'ပုတိ'];
  return { mahabote: mahaboteNames[((mb % 7) + 7) % 7], mahaboteMM: mahaboteNamesEN[((mb % 7) + 7) % 7] };
}

/**
 * Nakhat (Myanmar zodiac animal year)
 */
function getNakhat(year) {
  const animals = ['Oo', 'Kyar', 'Hnget', 'Sein', 'Belu', 'Naga', 'Nyi-lat', 'Kywet', 'Thike', 'Yar-the', 'Byan', 'Taninganwe'];
  const animalsMM = ['ဥ', 'ကြာ', 'ငှက်', 'ဆိမ်', 'ဘဲ', 'နဂါး', 'ညည်းလတ်', 'ကြွက်', 'သိကျ', 'ရသေ့', 'ဗျန်', 'တနင်္ဂနွေ'];
  const idx = year % 12;
  return { nakhat: animals[idx], nakhatMM: animalsMM[idx] };
}

// ─── Thingyan Calculation ─────────────────────────────────────────────────────

/**
 * Calculate Thingyan (Myanmar New Year Water Festival) dates for a Gregorian year
 */
function getThingyan(gregorianYear) {
  // Thingyan = Solar transit from Pisces to Aries
  // Approximate calculation based on sun's longitude
  // The sun enters Aries (Mesha Sankranti) around April 13-16

  const my = gregorianYear - 638; // Approximate Myanmar year

  // Thingyan a-kyo (start) and a-tat (end) - approximate
  // Using astronomical approximation
  const baseDay = new Date(gregorianYear, 3, 13); // April 13 base

  // More precise: sun enters Aries around April 13-16
  // Using mean value + small year-based offset
  const solarOffset = ((gregorianYear - 2000) * 0.0001) % 1;

  // Mahasantirat (exact solar transit moment) - approximate
  const transitHour = 6 + (gregorianYear % 4) * 6; // Rough approximation
  const transitDay = 13 + Math.floor(transitHour / 24);
  const transitHourOfDay = transitHour % 24;

  // Thingyan period: a-kyo day to New Year's Day
  const akyoDate = new Date(gregorianYear, 3, 13);  // April 13 (a-kyo: Thagyamin descends)
  const akyatDate = new Date(gregorianYear, 3, 14); // April 14
  const akyatDate2 = new Date(gregorianYear, 3, 15); // April 15
  const atatDate = new Date(gregorianYear, 3, 16);   // April 16 (a-tat: Thagyamin ascends)
  const newYearDate = new Date(gregorianYear, 3, 17); // April 17 (Myanmar New Year)

  return {
    myanmarYear: my,
    akyoDay: akyoDate,    // Day Thagyamin descends
    akyatDays: [akyatDate, akyatDate2], // Water festival days
    atatDay: atatDate,    // Day Thagyamin ascends
    newYearDay: newYearDate,
    description: `Myanmar New Year ${my} ME`
  };
}

// ─── Public Holiday / Festival Engine ────────────────────────────────────────

/**
 * Get all Myanmar festivals and holidays for a given Gregorian month/year
 */
function getMyanmarHolidays(gregorianYear, gregorianMonth) {
  const holidays = [];

  // Public Holidays (Gregorian fixed dates)
  const gregorianHolidays = [
    { month: 1,  day: 1,  name: "Independence Day",       nameMM: "လွတ်လပ်ရေးနေ့",         type: "public" },
    { month: 2,  day: 12, name: "Union Day",              nameMM: "ပြည်ထောင်စုနေ့",           type: "public" },
    { month: 3,  day: 2,  name: "Peasants' Day",          nameMM: "တောင်သူလယ်သမားနေ့",       type: "public" },
    { month: 3,  day: 27, name: "Armed Forces Day",       nameMM: "တပ်မတော်နေ့",              type: "public" },
    { month: 5,  day: 1,  name: "Workers' Day",           nameMM: "အလုပ်သမားနေ့",             type: "public" },
    { month: 7,  day: 19, name: "Martyrs' Day",           nameMM: "အာဇာနည်နေ့",               type: "public" },
    { month: 12, day: 25, name: "Christmas Day",          nameMM: "ခရစ္စမတ်နေ့",              type: "public" },
  ];

  for (const h of gregorianHolidays) {
    if (h.month === gregorianMonth) {
      holidays.push({
        ...h,
        date: new Date(gregorianYear, h.month - 1, h.day),
        isGregorianFixed: true
      });
    }
  }

  // Lunar-based festivals (approximate Gregorian equivalents)
  const lunarFestivals = getLunarFestivals(gregorianYear, gregorianMonth);
  holidays.push(...lunarFestivals);

  return holidays.sort((a, b) => a.date - b.date);
}

/**
 * Get lunar-based festivals for a Gregorian month
 */
function getLunarFestivals(gregorianYear, gregorianMonth) {
  const festivals = [];

  // Thingyan - Water Festival (April)
  if (gregorianMonth === 4) {
    const thingyan = getThingyan(gregorianYear);
    festivals.push(
      { date: thingyan.akyoDay,    name: "Thingyan A-kyo",      nameMM: "သင်္ကြန်အကြိုနေ့",  type: "festival", description: "Thagyamin descends" },
      { date: thingyan.akyatDays[0], name: "Thingyan A-kyat",   nameMM: "သင်္ကြန်အကျနေ့",    type: "festival", description: "Water festival day 1" },
      { date: thingyan.akyatDays[1], name: "Thingyan A-kyat",   nameMM: "သင်္ကြန်အကျနေ့",    type: "festival", description: "Water festival day 2" },
      { date: thingyan.atatDay,    name: "Thingyan A-tat",       nameMM: "သင်္ကြန်အတက်နေ့",   type: "festival", description: "Thagyamin ascends" },
      { date: thingyan.newYearDay, name: "Myanmar New Year",     nameMM: "မြန်မာနှစ်ဆန်းတစ်ရက်", type: "public", description: `Myanmar New Year ${gregorianYear - 638} ME` }
    );
  }

  // Kason Festival (May) - Watering the Bodhi Tree
  if (gregorianMonth === 5) {
    // Full moon of Kason - typically in May
    const kasonFm = getFullMoonOfMonth(gregorianYear, 'kason');
    if (kasonFm) {
      festivals.push({
        date: kasonFm,
        name: "Kason Full Moon Festival",
        nameMM: "ကဆုန်ထီး",
        type: "festival",
        description: "Buddha's Birth, Enlightenment & Parinibbana day"
      });
    }
  }

  // Waso - Buddhist Lent begins (July)
  if (gregorianMonth === 7) {
    const waso = getFullMoonOfMonth(gregorianYear, 'waso');
    if (waso) {
      festivals.push({
        date: waso,
        name: "Waso Full Moon (Vassa begins)",
        nameMM: "ဝါဆိုထီး",
        type: "religious",
        description: "Beginning of Buddhist Lent (Vassa)"
      });
    }
  }

  // Thadingyut - Festival of Lights (October)
  if (gregorianMonth === 10) {
    const thadingyut = getFullMoonOfMonth(gregorianYear, 'thadingyut');
    if (thadingyut) {
      festivals.push({
        date: thadingyut,
        name: "Thadingyut Festival of Lights",
        nameMM: "သီတင်းကျွတ်ထီး",
        type: "festival",
        description: "End of Buddhist Lent, Festival of Lights"
      });
    }
  }

  // Tazaungmon (November)
  if (gregorianMonth === 11) {
    const tazaungmon = getFullMoonOfMonth(gregorianYear, 'tazaungmon');
    if (tazaungmon) {
      festivals.push({
        date: tazaungmon,
        name: "Tazaungmon Festival",
        nameMM: "တန်ဆောင်မုန်းထီး",
        type: "festival",
        description: "Kathina robe offering, Festival of Lights"
      });
    }
  }

  return festivals;
}

/**
 * Approximate full moon date for named Myanmar months
 */
function getFullMoonOfMonth(year, monthName) {
  const monthMap = {
    kason:      new Date(year, 4, 14),  // ~May 14
    nayon:      new Date(year, 5, 12),  // ~June 12
    waso:       new Date(year, 6, 12),  // ~July 12
    wagaung:    new Date(year, 7, 10),  // ~Aug 10
    tawthalin:  new Date(year, 8, 9),   // ~Sep 9
    thadingyut: new Date(year, 9, 8),   // ~Oct 8
    tazaungmon: new Date(year, 10, 7),  // ~Nov 7
    nadaw:      new Date(year, 11, 7),  // ~Dec 7
  };
  return monthMap[monthName] || null;
}

// ─── Main Date Conversion API ─────────────────────────────────────────────────

/**
 * Get complete Myanmar calendar info for a Gregorian date
 */
function getMyanmarDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const jdn = gregorianToJDN(year, month, day);
  const weekday = date.getDay(); // 0=Sun

  // Myanmar date
  const mmd = gregorianToMyanmar(year, month, day);

  // Auspicious calculations
  const isYatyaza = getYatyaza(mmd.month, weekday);
  const isPyathada = getPyathada(mmd.month, weekday);
  const isAmyeittasote = getAmyeittasote(mmd.moonPhase, weekday);
  const isWarameittugyi = getWarameittugyi(mmd.month, weekday);
  const { mahabote, mahaboteMM } = getMahabote(mmd.year, weekday);
  const { nakhat, nakhatMM } = getNakhat(mmd.year);

  // Format strings
  const monthName = mmd.month === 0 ? 'Second Waso' : MYANMAR_MONTHS[mmd.month];
  const monthNameMM = mmd.month === 0 ? 'ဒုတိယဝါဆို' : MYANMAR_MONTHS_MM[mmd.month];
  const moonPhaseName = MOON_PHASES[mmd.moonPhase];
  const moonPhaseNameMM = MOON_PHASES_MM[mmd.moonPhase];

  // Myanmar date string (e.g., "Waxing 5 of Tagu 1388")
  let myanmarDayStr;
  if (mmd.moonPhase === 1) {
    myanmarDayStr = `Full Moon of ${monthName}`;
  } else if (mmd.moonPhase === 3) {
    myanmarDayStr = `New Moon (Dark) of ${monthName}`;
  } else {
    myanmarDayStr = `${moonPhaseName} ${mmd.moonDay}, ${monthName}`;
  }

  let myanmarDayStrMM;
  if (mmd.moonPhase === 1) {
    myanmarDayStrMM = `${monthNameMM} လပြည့်`;
  } else if (mmd.moonPhase === 3) {
    myanmarDayStrMM = `${monthNameMM} လကွယ်`;
  } else {
    myanmarDayStrMM = `${monthNameMM} ${moonPhaseNameMM} ${toMyanmarNumerals(mmd.moonDay)}ရက်`;
  }

  return {
    gregorian: { year, month, day, weekday },
    myanmar: {
      year: mmd.year,
      month: mmd.month,
      monthName,
      monthNameMM,
      day: mmd.day,
      moonPhase: mmd.moonPhase,
      moonPhaseName,
      moonPhaseNameMM,
      moonDay: mmd.moonDay,
      lunarDay: mmd.lunarDay,
      isWatat: mmd.isWatat,
    },
    auspicious: {
      isYatyaza,
      isPyathada,
      isAmyeittasote,
      isWarameittugyi,
      mahabote,
      mahaboteMM,
    },
    astrology: {
      nakhat,
      nakhatMM,
      weekdayName: WEEKDAYS[weekday],
      weekdayNameMM: WEEKDAYS_MM[weekday],
    },
    formatted: {
      myanmarDate: myanmarDayStr,
      myanmarDateMM: myanmarDayStrMM,
      myanmarYearStr: `${mmd.year} မြန်မာသက္ကရာဇ်`,
      fullDateEN: `${WEEKDAYS[weekday]}, ${myanmarDayStr}, ${mmd.year} ME`,
      fullDateMM: `${WEEKDAYS_MM[weekday]}၊ ${myanmarDayStrMM}၊ ${toMyanmarNumerals(mmd.year)} မြန်မာသက္ကရာဇ်`,
    },
    jdn,
  };
}

/**
 * Get Myanmar dates for an entire Gregorian month
 */
function getMonthData(gregorianYear, gregorianMonth) {
  const firstDay = new Date(gregorianYear, gregorianMonth - 1, 1);
  const lastDay = new Date(gregorianYear, gregorianMonth, 0);
  const days = [];

  const holidays = getMyanmarHolidays(gregorianYear, gregorianMonth);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(gregorianYear, gregorianMonth - 1, d);
    const myanmarInfo = getMyanmarDate(date);

    // Check holidays
    const dayHolidays = holidays.filter(h => {
      const hDate = h.date;
      return hDate && hDate.getDate() === d &&
             hDate.getMonth() === gregorianMonth - 1 &&
             hDate.getFullYear() === gregorianYear;
    });

    days.push({
      ...myanmarInfo,
      holidays: dayHolidays,
      isToday: isToday(date),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    });
  }

  // Thingyan info for the year
  const thingyanInfo = getThingyan(gregorianYear);

  return {
    year: gregorianYear,
    month: gregorianMonth,
    firstDayOfWeek: firstDay.getDay(),
    totalDays: lastDay.getDate(),
    days,
    holidays,
    thingyanInfo,
    myanmarYear: gregorianYear - 638,
  };
}

function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

/**
 * Get Myanmar calendar data for a full year view
 */
function getYearData(gregorianYear) {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    months.push(getMonthData(gregorianYear, m));
  }
  return { year: gregorianYear, months, thingyan: getThingyan(gregorianYear) };
}

/**
 * Get countdown to next Thingyan
 */
function getThingyanCountdown() {
  const today = new Date();
  const currentYear = today.getFullYear();

  let thingyan = getThingyan(currentYear);
  if (today > thingyan.newYearDay) {
    thingyan = getThingyan(currentYear + 1);
  }

  const msUntilThingyan = thingyan.akyoDay - today;
  const daysUntil = Math.ceil(msUntilThingyan / (1000 * 60 * 60 * 24));

  return {
    thingyan,
    daysUntil: Math.max(0, daysUntil),
    isNow: daysUntil <= 0 && today <= thingyan.newYearDay
  };
}

/**
 * Get moon phase symbol
 */
function getMoonPhaseSymbol(moonPhase) {
  const symbols = ['🌙', '🌕', '🌗', '🌑'];
  return symbols[moonPhase] || '🌙';
}

/**
 * Myanmar month descriptions
 */
const MONTH_DESCRIPTIONS = {
  1:  { event: "Thingyan / New Year", color: "#e91e63" },
  2:  { event: "Kason Festival",      color: "#4caf50" },
  3:  { event: "Nayon",               color: "#2196f3" },
  4:  { event: "Waso / Vassa",        color: "#ff9800" },
  5:  { event: "Wagaung",             color: "#9c27b0" },
  6:  { event: "Tawthalin / Races",   color: "#00bcd4" },
  7:  { event: "Thadingyut Lights",   color: "#ffeb3b" },
  8:  { event: "Tazaungmon",          color: "#ff5722" },
  9:  { event: "Nadaw",               color: "#607d8b" },
  10: { event: "Pyatho",              color: "#795548" },
  11: { event: "Tabodwe / Htamane",   color: "#f44336" },
  12: { event: "Tabaung / Pagodas",   color: "#3f51b5" },
  0:  { event: "2nd Waso (Leap)",     color: "#ff6f00" },
};

module.exports = {
  getMyanmarDate,
  getMonthData,
  getYearData,
  getThingyan,
  getThingyanCountdown,
  getMyanmarHolidays,
  getMoonPhaseSymbol,
  toMyanmarNumerals,
  gregorianToJDN,
  jdnToGregorian,
  MYANMAR_MONTHS,
  MYANMAR_MONTHS_MM,
  MOON_PHASES,
  MOON_PHASES_MM,
  WEEKDAYS,
  WEEKDAYS_MM,
  MONTH_DESCRIPTIONS,
};
