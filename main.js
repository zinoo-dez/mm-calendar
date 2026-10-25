'use strict';

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const engine = require('./src/myanmar-calendar-engine');

let mainWindow;
let tray;
let isQuitting = false;

// ─── App Configuration ────────────────────────────────────────────────────────
app.setName('Myanmar Calendar');

// ─── Window Creation ──────────────────────────────────────────────────────────
function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 920,
    minHeight: 660,
    title: 'Myanmar Calendar — မြန်မာပြက္ခဒိန်',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#0d0f14',
    transparent: false,
    frame: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    center: true,
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── System Tray ─────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let trayIcon;

  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createFromDataURL(getDefaultTrayIcon());
    }
  } catch {
    trayIcon = nativeImage.createFromDataURL(getDefaultTrayIcon());
  }

  tray = new Tray(trayIcon.resize({ width: 18, height: 18, quality: 'best' }));

  updateTrayTitle();
  setInterval(updateTrayTitle, 60000); // Update every minute

  const today = new Date();
  const mmd = engine.getMyanmarDate(today);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Myanmar Calendar', click: showWindow },
    { type: 'separator' },
    {
      label: `${mmd.formatted.myanmarDate}`,
      enabled: false,
    },
    {
      label: `${mmd.myanmar.year} ME (${mmd.myanmar.sasanaYear} BE)`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Check Auspicious Days...',
      click: () => {
        showWindow();
        if (mainWindow) {
          mainWindow.webContents.send('navigate-to', 'finder');
        }
      }
    },
    {
      label: 'Export Holidays (.ics)...',
      click: async () => {
        const year = new Date().getFullYear();
        await exportIcalFile(year);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`Myanmar Calendar — ${mmd.formatted.myanmarDate}`);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        showWindow();
      }
    }
  });
}

function updateTrayTitle() {
  const today = new Date();
  const mmd = engine.getMyanmarDate(today);
  if (tray) {
    tray.setTitle('');
    tray.setToolTip(`Myanmar Calendar — ${mmd.formatted.myanmarDate} (${mmd.myanmar.sasanaYear} BE)`);
  }
}

function showWindow() {
  if (!mainWindow) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
    if (process.platform === 'darwin' && app.dock) {
      app.dock.show();
    }
  }
}

function getDefaultTrayIcon() {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAQCAYAAAAmlE46AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADRSURBVCiRY2AYdICRgYGBgQEDA8P/f//+MzAyMDAwMDEw/P/////MzMzM////n4GBgYGBiYHhPwMDAwMDEwPDfwYGBgYGJgaG/wwMDAwMTAwM/xkYGBgYmBgY/jMwMDAwMDEw/GdgYGBgYGJg+M/AwMDAwMTAwH8GBgYGBiYGhv8MDAwMDExMDP8ZGBgYGJgYGP4zMDAwMDAxMPxnYGBgYGBiYPjPwMDAwMDEwPCfgYGBgYGJgeE/AwMDAwMTE8N/BgYGBgYmBob/DAwMDAxMTAz/GRgYGBiYGP4PABvGEhvHJM8AAAAASUVORK5CYII=';
}

async function exportIcalFile(year) {
  const targetYear = year || new Date().getFullYear();
  const defaultPath = `myanmar_calendar_holidays_${targetYear}.ics`;

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Myanmar Holidays to iCalendar (.ics)',
    defaultPath,
    filters: [
      { name: 'iCalendar File (*.ics)', extensions: ['ics'] }
    ]
  });

  if (canceled || !filePath) return { success: false, canceled: true };

  const icsData = engine.generateIcsCalendar(targetYear);
  fs.writeFileSync(filePath, icsData, 'utf-8');

  return { success: true, filePath };
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('get-myanmar-date', (event, dateStr) => {
  try {
    return engine.getMyanmarDate(dateStr || undefined);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('get-month-data', (event, year, month) => {
  try {
    return engine.getMonthData(year, month);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('get-year-data', (event, year) => {
  try {
    return engine.getYearData(year);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('get-thingyan-countdown', () => {
  try {
    return engine.getThingyanCountdown();
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('get-holidays', (event, year, month) => {
  try {
    return engine.getMyanmarHolidays(year, month);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('get-today', () => {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
    isoString: today.toISOString(),
  };
});

// Phase 2 IPC handlers
ipcMain.handle('find-auspicious-dates', (event, purpose, year, month, count) => {
  try {
    return engine.findAuspiciousDates(purpose, year, month, count || 10);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('export-ical', async (event, year) => {
  try {
    return await exportIcalFile(year);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('get-8mansion-chart', (event, my, weekday, isWednesdayPM) => {
  try {
    return engine.get8MansionChart(my, weekday, isWednesdayPM);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('convert-myanmar-to-gregorian', (event, my, mm, md) => {
  try {
    const jdn = engine.m2j(my, mm, md);
    const greg = engine.jdnToGregorian(jdn);
    const fullDate = engine.getMyanmarDate(new Date(greg.year, greg.month - 1, greg.day));
    return {
      gregorian: greg,
      myanmarDate: fullDate,
      jdn
    };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('send-notification', (event, options) => {
  try {
    if (Notification.isSupported()) {
      new Notification({
        title: options.title || 'Myanmar Calendar',
        body: options.body || '',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        silent: options.silent || false
      }).show();
      return { success: true };
    }
    return { success: false, reason: 'Notifications not supported' };
  } catch (err) {
    return { error: err.message };
  }
});

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Set macOS Dock Icon dynamically (works for both dev mode and production)
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    if (fs.existsSync(iconPath)) {
      try {
        app.dock.setIcon(iconPath);
      } catch (e) {
        console.error('Failed to set dock icon:', e);
      }
    }
  }

  createWindow();
  createTray();

  // Check today's special day on launch (Sabbath or Full Moon notification)
  const today = new Date();
  const mmd = engine.getMyanmarDate(today);
  if (mmd.auspicious.sabbath === 1 || mmd.myanmar.moonPhase === 1) {
    setTimeout(() => {
      if (Notification.isSupported()) {
        const title = mmd.myanmar.moonPhase === 1
          ? `🌕 ${mmd.formatted.myanmarDateMM} (Full Moon Day)`
          : `✨ Today is ${mmd.auspicious.sabbathStrMM} (Uposatha Sabbath)`;
        const body = `${mmd.formatted.fullDateMM} — Auspicious merit-making day.`;
        new Notification({ title, body, icon: path.join(__dirname, 'assets', 'icon.png') }).show();
      }
    }, 2000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});
