# Myanmar Calendar — မြန်မာပြက္ခဒိန်

A **production-grade Myanmar (Burmese) Calendar** desktop app for macOS, built with Electron.

## Features

- 📅 **Full Myanmar Lunisolar Calendar** — Accurate waxing/waning moon phases, Watat (leap) years
- 🌙 **Moon Phase Tracking** — Full moon, new moon, waxing, and waning display
- ✨ **Auspicious Days Engine** — Yatyaza, Pyathada, Amyeittasote, Warameittugyi
- 💧 **Thingyan Countdown** — Myanmar New Year Water Festival countdown
- 🎊 **Festivals & Holidays** — All public holidays and traditional festivals
- 🔄 **Date Converter** — Gregorian ↔ Myanmar date conversion
- 🔮 **Myanmar Astrology** — Mahabote planetary energy, Nakhat zodiac animals
- 📆 **Year Overview** — Full year mini-calendar grid
- 🌓 **Dark/Light Mode** — Premium glassmorphism dark theme with gold accents
- 🇲🇲 **Bilingual** — English and Myanmar script throughout
- 🖥️ **macOS Native** — Vibrancy, hiddenInset titlebar, system tray

## Algorithm

The calendar engine is based on the **Cool-Emerald algorithm** by Yan Naing Aye, implementing:
- Julian Day Number (JDN) conversion
- Watat (intercalary month) year detection
- Lunar month calculations using the synodic month period
- Thingyan (solar transit into Aries) computation

## Myanmar Calendar Structure

| Myanmar Month | Gregorian Equivalent | Major Festival |
|--------------|---------------------|----------------|
| Tagu (တန်ခူး) | April–May | Thingyan New Year |
| Kason (ကဆုန်) | May–June | Kason Full Moon |
| Nayon (နယုန်) | June–July | — |
| Waso (ဝါဆို) | July–Aug | Buddhist Lent begins |
| Wagaung (ဝါခေါင်) | Aug–Sep | — |
| Tawthalin (တော်သလင်း) | Sep–Oct | Boat Races |
| Thadingyut (သီတင်းကျွတ်) | Oct–Nov | Festival of Lights |
| Tazaungmon (တန်ဆောင်မုန်း) | Nov | Kathina |
| Nadaw (နတ်တော်) | Dec–Jan | — |
| Pyatho (ပြာသို) | Jan–Feb | — |
| Tabodwe (တပို့တွဲ) | Feb–Mar | Htamane Festival |
| Tabaung (တပေါင်း) | Mar–Apr | Pagoda Festivals |

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Build macOS DMG
npm run build
```

## Project Structure

```
Myanmar-calendar-Mac-Os/
├── main.js                          # Electron main process
├── preload.js                       # Secure IPC bridge
├── src/
│   └── myanmar-calendar-engine.js  # Core algorithm
├── renderer/
│   ├── index.html                  # App UI
│   ├── styles.css                  # Premium CSS
│   └── app.js                      # Frontend logic
└── assets/
    └── icon.png                    # App icon
```

## Auspicious Days Reference

| Day Type | Myanmar | Meaning |
|----------|---------|---------|
| Yatyaza | ရက်ရာဇာ | Royal days — best for weddings, business |
| Pyathada | ပြဿဒါး | Fiery days — avoid major events |
| Amyeittasote | အမြိုက်စိုတ် | Nectar days — exceptional luck |
| Warameittugyi | ဝါရမိတ္တုကြီး | Great lucky days |

## Myanmar Year Conversion

Myanmar Year ≈ Gregorian Year − 638 (after Thingyan/April 17)
Myanmar Year ≈ Gregorian Year − 639 (before Thingyan)

Current: **2026 CE = 1388 ME**

---

Built with ❤️ for the Myanmar community
