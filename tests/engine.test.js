/**
 * Unit Test Suite for Myanmar Calendar Engine
 * Tests core Cool-Emerald algorithm, Watat, Bidirectional Conversion,
 * Astrological calculations, Thingyan, Auspicious Finder, and iCal output.
 */

'use strict';

const assert = require('assert');
const engine = require('../src/myanmar-calendar-engine');

console.log('🧪 Starting Myanmar Calendar Engine Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
  }
}

// ─── Test 1: Date conversion for current date (Oct 24, 2026) ───────────────────
test('Oct 24, 2026 conversion accuracy', () => {
  const date = new Date(2026, 9, 24); // Month is 0-indexed: 9 = Oct
  const info = engine.getMyanmarDate(date);

  assert.strictEqual(info.myanmar.year, 1388, 'Year should be 1388 ME');
  assert.strictEqual(info.myanmar.sasanaYear, 2570, 'Sasana Year should be 2570 BE');
  assert.strictEqual(info.myanmar.month, 7, 'Month should be 7 (Thadingyut)');
  assert.strictEqual(info.myanmar.monthName, 'Thadingyut', 'Month name should be Thadingyut');
  assert.strictEqual(info.myanmar.fortnightDay, 13, 'Fortnight day should be 13');
  assert.strictEqual(info.myanmar.moonPhase, 0, 'Moon phase should be 0 (Waxing)');
  assert.strictEqual(info.myanmar.isWatat, true, '1388 ME is a Watat year');
  assert.strictEqual(info.astrology.weekdayName, 'Saturday', 'Weekday should be Saturday');
  assert.strictEqual(info.gregorian.isoString, '2026-10-24', 'isoString must match local date YYYY-MM-DD');
});

// ─── Test 1b: Date conversion for Oct 25, 2026 ─────────────────────────────────
test('Oct 25, 2026 conversion accuracy and dynamic isToday', () => {
  const date = new Date(2026, 9, 25);
  const info = engine.getMyanmarDate(date);

  assert.strictEqual(info.myanmar.year, 1388, 'Year should be 1388 ME');
  assert.strictEqual(info.myanmar.sasanaYear, 2570, 'Sasana Year should be 2570 BE');
  assert.strictEqual(info.myanmar.month, 7, 'Month should be 7 (Thadingyut)');
  assert.strictEqual(info.myanmar.monthName, 'Thadingyut', 'Month name should be Thadingyut');
  assert.strictEqual(info.myanmar.fortnightDay, 14, 'Fortnight day should be 14 (Waxing 14)');
  assert.strictEqual(info.myanmar.moonPhase, 0, 'Moon phase should be 0 (Waxing)');
  assert.strictEqual(info.astrology.weekdayName, 'Sunday', 'Weekday should be Sunday');
  assert.strictEqual(info.gregorian.day, 25, 'Day should be 25');
  assert.strictEqual(info.gregorian.isoString, '2026-10-25', 'isoString must match local date 2026-10-25');
  assert.strictEqual(info.auspicious.sabbath, 2, 'Oct 25, 2026 should be Sabbath Eve (အဖိတ်နေ့)');

  // Verify getMonthData assigns isToday dynamically for today
  const monthData = engine.getMonthData(2026, 10);
  const day25 = monthData.days.find(d => d.gregorian.day === 25);
  const day24 = monthData.days.find(d => d.gregorian.day === 24);

  const today = new Date();
  if (today.getFullYear() === 2026 && today.getMonth() === 9 && today.getDate() === 25) {
    assert.strictEqual(day25.isToday, true, 'Day 25 must have isToday: true when today is Oct 25');
    assert.strictEqual(day24.isToday, false, 'Day 24 must have isToday: false when today is Oct 25');
  }
});

// ─── Test 2: Thadingyut Full Moon in 2026 ───────────────────────────────────────
test('Full Moon of Thadingyut 1388 ME is Oct 26, 2026', () => {
  // Myanmar date for Thadingyut Full Moon: my: 1388, mm: 7, md: 15
  const jdn = engine.m2j(1388, 7, 15);
  const greg = engine.jdnToGregorian(jdn);

  assert.strictEqual(greg.year, 2026, 'Year should be 2026');
  assert.strictEqual(greg.month, 10, 'Month should be 10 (October)');
  assert.strictEqual(greg.day, 26, 'Day should be 26');

  // Verify reverse
  const mmd = engine.getMyanmarDate(new Date(2026, 9, 26));
  assert.strictEqual(mmd.myanmar.moonPhase, 1, 'Oct 26, 2026 should be Full Moon');
  assert.strictEqual(mmd.myanmar.month, 7, 'Oct 26, 2026 should be Thadingyut');
});

// ─── Test 3: Watat (Leap Year) Calculation across Eras ─────────────────────────
test('Watat detection for known historical and contemporary years', () => {
  // 1385 ME is Watat
  const w1385 = engine.cal_watat(1385);
  assert.strictEqual(w1385.watat, 1, '1385 ME must be a Watat year');

  // 1387 ME is Common
  const w1387 = engine.cal_watat(1387);
  assert.strictEqual(w1387.watat, 0, '1387 ME must be a common year');

  // 1388 ME is Watat (Big Watat)
  const my1388 = engine.cal_my(1388);
  assert.strictEqual(my1388.myt, 2, '1388 ME must be Big Watat (myt=2)');

  // 1389 ME is Common
  const w1389 = engine.cal_watat(1389);
  assert.strictEqual(w1389.watat, 0, '1389 ME must be a common year');
});

// ─── Test 4: Bidirectional Conversion (Round-Trip) ────────────────────────────
test('Bidirectional JDN <-> Myanmar Civil Date consistency over 100 days', () => {
  const baseJDN = engine.gregorianToJDN(2026, 1, 1);
  for (let i = 0; i < 100; i++) {
    const jdn = baseJDN + i;
    const mm = engine.j2m(jdn);
    const roundTripJDN = engine.m2j(mm.my, mm.mm, mm.md);
    assert.strictEqual(roundTripJDN, jdn, `JDN round trip failed at JDN ${jdn}`);
  }
});

// ─── Test 5: Month Day Lengths ────────────────────────────────────────────────
test('Myanmar month day length alternating logic', () => {
  // In common year: Tagu(1)=29, Kason(2)=30, Nayon(3)=29, Waso(4)=30, Wagaung(5)=29, Tawthalin(6)=30
  assert.strictEqual(engine.cal_mml(1, 0), 29, 'Tagu common = 29 days');
  assert.strictEqual(engine.cal_mml(2, 0), 30, 'Kason common = 30 days');
  assert.strictEqual(engine.cal_mml(3, 0), 29, 'Nayon common = 29 days');
  assert.strictEqual(engine.cal_mml(4, 0), 30, 'Waso common = 30 days');

  // In big watat (myt=2): Nayon gets 30 days!
  assert.strictEqual(engine.cal_mml(3, 2), 30, 'Nayon in big watat = 30 days');
});

// ─── Test 6: Auspicious Days Flags ────────────────────────────────────────────
test('Astrological calculation flags integrity', () => {
  // Test Sabbath calculation: day 8, 15, 23, and mml are Sabbath
  assert.strictEqual(engine.cal_sabbath(8, 1, 0), 1, 'Day 8 is Sabbath');
  assert.strictEqual(engine.cal_sabbath(15, 1, 0), 1, 'Day 15 is Sabbath');
  assert.strictEqual(engine.cal_sabbath(7, 1, 0), 2, 'Day 7 is Sabbath Eve');
  assert.strictEqual(engine.cal_sabbath(14, 1, 0), 2, 'Day 14 is Sabbath Eve');

  // Verify Yatyaza logic (Tagu: Wed=4 and Fri=6 are Yatyaza)
  assert.strictEqual(engine.cal_yatyaza(1, 4), 1, 'Tagu Wed (4) is Yatyaza');
  assert.strictEqual(engine.cal_yatyaza(1, 6), 1, 'Tagu Fri (6) is Yatyaza');
});

// ─── Test 7: Mahabote Rulers with Wednesday Split ─────────────────────────────
test('Mahabote 8-planet ruler with Wednesday AM vs PM (Rahu)', () => {
  const wedAM = engine.getMahaboteRuler(3, false);
  const wedPM = engine.getMahaboteRuler(3, true);

  assert.strictEqual(wedAM.id, 'mercury', 'Wednesday AM ruler must be Mercury');
  assert.strictEqual(wedPM.id, 'rahu', 'Wednesday PM ruler must be Rahu');
  assert.strictEqual(wedPM.nameMM, 'ရာဟု (ဗုဒ္ဓဟူး ညနေ)', 'Wednesday PM nameMM must be Rahu');
});

// ─── Test 8: Thingyan Solar Calculation ───────────────────────────────────────
test('Thingyan calculation for 2026 and 2027', () => {
  const tg2026 = engine.getThingyan(2026);
  assert.ok(tg2026.akyoDate instanceof Date, 'Akyo date is a Date');
  assert.ok(tg2026.akyaDate instanceof Date, 'Akya date is a Date');
  assert.ok(tg2026.atatDate instanceof Date, 'Atat date is a Date');
  assert.ok(tg2026.newYearDate instanceof Date, 'New Year date is a Date');
  assert.ok(tg2026.akyoDate < tg2026.akyaDate, 'Akyo is before Akya');
  assert.ok(tg2026.akyaDate < tg2026.atatDate, 'Akya is before Atat');
  assert.ok(tg2026.atatDate < tg2026.newYearDate, 'Atat is before New Year');
  assert.ok(tg2026.transitTiming.akyaTimeStr.includes('MMT'), 'Has MMT timing');
});

// ─── Test 9: Auspicious Date Finder ───────────────────────────────────────────
test('Auspicious Date Finder returns valid ranked recommendations', () => {
  const weddingDates = engine.findAuspiciousDates('wedding', 2026, 10, 5);
  assert.ok(Array.isArray(weddingDates), 'Result should be an array');
  assert.ok(weddingDates.length > 0, 'Should find auspicious wedding dates');

  const first = weddingDates[0];
  assert.ok(first.score > 0, 'Score should be positive');
  assert.ok(first.matchReasons.length > 0, 'Should have match reasons');
  assert.strictEqual(first.auspicious.isPyathada, false, 'Auspicious wedding date cannot be Pyathada');
  assert.strictEqual(first.auspicious.isNagapor, false, 'Auspicious wedding date cannot be Nagapor');
});

// ─── Test 10: iCal Generator ──────────────────────────────────────────────────
test('iCal export generates valid VCALENDAR payload', () => {
  const ics = engine.generateIcsCalendar(2026);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'Starts with BEGIN:VCALENDAR');
  assert.ok(ics.includes('BEGIN:VEVENT'), 'Contains VEVENT blocks');
  assert.ok(ics.includes('END:VCALENDAR'), 'Ends with END:VCALENDAR');
  assert.ok(ics.includes('Independence Day'), 'Contains public holidays');
});

// ─── Test 11: Mahabote House Consistency ──────────────────────────────────────
test('Mahabote house consistency between getMyanmarDate and get8MansionChart', () => {
  // Test case from user: Jan 30, 1989 (Monday, 1350 ME)
  const info1989 = engine.getMyanmarDate('1989-01-30');
  assert.strictEqual(info1989.myanmar.year, 1350, 'Jan 30 1989 must be 1350 ME (before Thingyan)');
  assert.strictEqual(info1989.gregorian.weekday, 1, 'Jan 30 1989 must be Monday');
  assert.strictEqual(info1989.auspicious.mahabote, 'Marana', 'Mahabote house must be Marana');
  assert.strictEqual(info1989.auspicious.mahaboteMM, 'မာရဏ', 'Mahabote house MM must be မာရဏ');

  // get8MansionChart using year and weekday
  const chart1 = engine.get8MansionChart(1350, 1);
  assert.strictEqual(chart1.birthHouse.house, 'Marana', 'get8MansionChart(1350, 1) must be Marana');
  assert.strictEqual(chart1.birthHouse.houseMM, 'မာရဏ', 'get8MansionChart(1350, 1) MM must be မာရဏ');

  // get8MansionChart using date string
  const chartDate = engine.get8MansionChart('1989-01-30');
  assert.strictEqual(chartDate.birthHouse.house, 'Marana', 'get8MansionChart("1989-01-30") must be Marana');
  assert.strictEqual(chartDate.birthHouse.houseMM, 'မာရဏ', 'get8MansionChart("1989-01-30") MM must be မာရဏ');

  // Verify the birth house is flagged and ruled by Moon (လမင်း)
  const maranaMansion = chart1.mansions.find(m => m.key === 'Marana');
  assert.strictEqual(maranaMansion.isBirthHouse, true, 'Marana mansion must be birth house');
  assert.strictEqual(maranaMansion.planetRuler, 'လမင်း', 'Marana mansion ruler must be Moon for Monday in 1350 ME');
});


console.log(`\n========================================`);
console.log(`Test Results: ${passedTests}/${totalTests} tests passed`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
