# Myanmar Calendar — မြန်မာပြက္ခဒိန် (v2.0 Pro)

A **production-grade Myanmar (Burmese) Lunisolar Calendar & Astrology** desktop application for macOS, built with Electron, Vanilla CSS glassmorphism, and the canonical **Cool-Emerald v2.3 algorithm** by Dr. Yan Naing Aye.

---

## Key Features

### 📅 Core Lunisolar Engine
- **Accurate 3-Era Watat (Leap Year) Calculation**: Exact historical intercalary months and day shifts (Era 1 Bagan/Taungoo, Era 2 British colonial, Era 3 post-independence 1312 ME+).
- **Exact Bidirectional Conversion**: Julian Day Number (JDN) ↔ Myanmar Civil Date (`j2m` and `m2j`).
- **Buddhist Era / Sasana Year (သာသနာနှစ်)**: Automatically calculated (`BE = ME + 1182`, e.g., 2026 CE = 1388 ME = 2570 BE).
- **True Lunar Phases**: Fortnight calculation (Waxing, Full Moon, Waning, New Moon / လဆန်း၊ လပြည့်၊ လဆုတ်၊ လကွယ်).

### ✨ Traditional Auspicious & Inauspicious Days Engine
- **Yatyaza (ရက်ရာဇာ)** — Royal auspicious days favorable for weddings, business, and celebrations.
- **Pyathada & Afternoon Pyathada (ပြဿဒါး နှင့် မွန်းလွဲပြဿဒါး)** — Fiery obstacle days traditionally avoided for contracts and journeys.
- **Amyeittasote (အမြိုက်စိုတ်)** — Nectar days bringing exceptional longevity, health, and peace.
- **Warameittugyi & Warameittunge (ဝါရမိတ္တုကြီး / ဝါရမိတ္တုငယ်)** — Great lucky days for merit-making and rituals.
- **Nagapor (နဂါးပေါ်)** — Dragon taboo days (avoid travel, agriculture, laying building foundations).
- **Yatpote (ရက်ပုပ်)**, **Thamanyo (သမားညို)**, **Thamaphyu (သမားဖြူ)**, **Yatyotema (ရက်ယုတ်မာ)**, **Mahayatkyan (မဟာရက်ကြမ်း)**, and **Shanyat (ရှမ်းရက်)**.
- **Uposatha Sabbath (ဥပုသ်နေ့)** and **Sabbath Eve (အဖိတ်နေ့)**.
- **Nagahle (နဂါးခေါင်းလှည့်ရာ အရပ်)** — Seasonal dragon heading directions (West, North, East, South) for travel planning.

### 🔍 Auspicious Date Finder (မင်္ဂလာရက် ရွေးချယ်ရန်)
- Dedicated purpose-driven recommendation engine:
  - 💍 **Wedding (မင်္ဂလာဆောင်)**: Favorable waxing moon, Yatyaza/Amyeittasote, strictly filters out Pyathada, Nagapor, Yatpote, and Sabbath.
  - 🏡 **Housewarming (အိမ်တက်/အိမ်ဆောက်)**: Prosperity days and favorable houses.
  - 💼 **Business Opening (ဆိုင်ဖွင့်/စီးပွားစတင်)**: Commercial prosperity, Yatyaza, Warameittugyi.
  - ✈️ **Travel (ခရီးသွား/ခရီးထွက်)**: Safe passage, checks against Nagahle direction.
  - 🧘 **Ordination (ရှင်ပြု/ရဟန်းခံ)**: Full moon days and Uposatha Sabbath observances.
  - ⭐ **General Auspicious (အထွေထွေ မင်္ဂလာ)**: All favorable days ranked by score.

### 🔮 Myanmar Astrology & 8-Mansion Life Chart (မဟာဘုတ် ၈ ပိုင်း)
- **8-Day Traditional Myanmar Week**: Full support for the Wednesday morning (Mercury / အဓိပတိ) vs Wednesday afternoon (Rahu / ရာဟု) split.
- **Interactive 7-House Life Chart**: Maps birth year & weekday energy into Binga (ဗင်္ဃ), Atun (အသွဉ်), Yaza (ရာဇ), Adipati (အဓိပတိ), Marana (မာရဏ), Thike (သိကျ), and Puti (ပုတိ).
- **Zodiac Rulers & Guidance**: Lucky numbers, lucky directions, lucky colors, planetary rulers, and animal symbols.
- **Authentic 12 Nakhat Animals (နဂါးစက်ဝိုင်း ၁၂ ကောင်)**: Garuda, Kayar, Tiger, Rabbit, Naga, Elephant, Horse, Goat, Monkey, Crow, Dog, Pig.
- **3-Nakhat Cosmic Beings**: Ogre (ဘီလူး), Deva (နတ်), and Human (လူ).

### 💧 Precise Astronomical Thingyan Transit
- Solar transit calculations (Pisces to Aries) computing exact MMT hours & minutes for **Akya time (ကျချိန်)** and **Atat time (တက်ချိန်)**.
- Countdown to Thingyan A-kyo Day, with legendary mythos of Thagyamin's descent and ascent.

### 🎊 Holidays, Festivals & iCalendar (.ics) Export
- Complete database of Myanmar gazetted public holidays, Buddhist full-moon festivals, and interfaith observances.
- **One-click iCalendar (.ics) export** to sync all holidays into Apple Calendar on macOS.

### 🔔 macOS Integration
- Desktop Notifications for Uposatha Sabbath and Full Moon days via macOS Notification Center.
- Menu Bar System Tray showing current Myanmar date, year, and quick action shortcuts.
- Native macOS glassmorphism styling (`hiddenInset` titlebar, vibrancy, dark/light themes).

---

## Development & Testing

```bash
# Install dependencies
npm install

# Run unit tests (10/10 test suite verifying engine, watat, conversion, astrology)
npm test

# Run application
npm start

# Run with developer tools
npm run dev

# Build macOS DMG
npm run dist
```

---

## Myanmar Calendar Structure & Months

| Index | Myanmar Month | Myanmar Script | Days | Significance |
|:-----:|---------------|----------------|:----:|--------------|
| 1 | Tagu | တန်ခူး | 29 | Thingyan Water Festival & Myanmar New Year |
| 2 | Kason | ကဆုန် | 30 | Full Moon of Kason (Buddha Day / Bodhi Watering) |
| 3 | Nayon | နယုန် | 29 (30 in Big Watat) | Mahasamaya Day & Pariyatti Exams |
| 0 | First Waso | ပထမဝါဆို | 30 | Intercalary month (Watat years only) |
| 4 | (Second) Waso | (ဒုတိယ) ဝါဆို | 30 | Dhammacakka Day & Buddhist Lent Begins (Vassa) |
| 5 | Wagaung | ဝါခေါင် | 29 | Metta Day & Mahadok Lot-Casting |
| 6 | Tawthalin | တော်သလင်း | 30 | Garudhamma Day & Royal Regatta Boat Races |
| 7 | Thadingyut | သီတင်းကျွတ် | 29 | Abhidhamma Day & Festival of Lights (End of Lent) |
| 8 | Tazaungmon | တန်ဆောင်မုန်း | 30 | Tazaungdaing, Kathina Robe Weaving & National Day |
| 9 | Nadaw | နတ်တော် | 29 | Sasana & Traditional Writers Day |
| 10 | Pyatho | ပြာသို | 30 | Karen New Year & Equestrian Pageantry |
| 11 | Tabodwe | တပို့တွဲ | 29 | Htamane Festival & Ovada Patimokkha Day |
| 12 | Tabaung | တပေါင်း | 30 | Shwedagon & All Pagoda Festivals |

---

## References

- Dr. Yan Naing Aye: *Algorithm, Program, and Calculation of Myanmar Calendar* ([Cool-Emerald](http://cool-emerald.blogspot.com/2013/06/algorithm-program-and-calculation-of.html))
- Canonical open-source implementation: [`yan9a/mmcal`](https://github.com/yan9a/mmcal)
- U Thin Kyi & U Ba Han: *Traditional Burmese Astronomy & Calendar Tables*

---

Built with ❤️ for the Myanmar community and macOS users worldwide.
