/**
 * Build Script: Browser-Compatible Engine Bundle
 * Wraps src/myanmar-calendar-engine.js as renderer/myanmar-engine.js (UMD)
 * Run: npm run build:engine
 */
'use strict';

const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'src', 'myanmar-calendar-engine.js');
const outPath = path.join(__dirname, '..', 'renderer', 'myanmar-engine.js');

if (!fs.existsSync(srcPath)) {
  if (fs.existsSync(outPath)) {
    console.log('ℹ️ src/myanmar-calendar-engine.js not found in build environment; using existing pre-built bundle.');
    process.exit(0);
  }
  throw new Error(`Engine source not found at: ${srcPath}`);
}

const engineSrc = fs.readFileSync(srcPath, 'utf8');

// Strip 'use strict' and the CommonJS module.exports block
const stripped = engineSrc
  .replace(/^'use strict';\n\n/, '')
  .replace(/\/\/ ─── Exports ─+\n\nmodule\.exports = \{[\s\S]*\};?\n*$/, '');

const umd = `/**
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

${stripped}

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
`;

fs.writeFileSync(outPath, umd, 'utf8');
console.log(`✅ Browser engine bundle built: ${outPath}`);
console.log(`   Size: ${(umd.length / 1024).toFixed(1)} KB`);
