'use strict';

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const { getMyanmarDate, getMonthData, getYearData, getThingyanCountdown, getMyanmarHolidays } = require('./src/myanmar-calendar-engine');

let mainWindow;
let tray;
let isQuitting = false;

// ─── App Configuration ────────────────────────────────────────────────────────
app.setName('Myanmar Calendar');

// Hide from dock when minimized (menu bar behavior option)
if (process.platform === 'darwin') {
  app.dock.setIcon(path.join(__dirname, 'assets', 'dock-icon.png'));
}

// ─── Window Creation ──────────────────────────────────────────────────────────
function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 650,
    title: 'Myanmar Calendar',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
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

  // Dev tools in development
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
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let trayIcon;

  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      // Create a simple calendar icon programmatically
      trayIcon = nativeImage.createFromDataURL(getDefaultTrayIcon());
    }
  } catch {
    trayIcon = nativeImage.createFromDataURL(getDefaultTrayIcon());
  }

  tray = new Tray(trayIcon.resize({ width: 18, height: 18 }));

  updateTrayTitle();
  setInterval(updateTrayTitle, 60000); // Update every minute

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Myanmar Calendar', click: showWindow },
    { type: 'separator' },
    {
      label: 'Today\'s Date', enabled: false,
      click: () => {}
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
  tray.setToolTip('Myanmar Calendar');

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
  const mmd = getMyanmarDate(today);
  const title = `${mmd.myanmar.year}`;
  if (tray) {
    tray.setTitle(title);
    tray.setToolTip(`Myanmar Calendar — ${mmd.formatted.myanmarDate}`);
  }
}

function showWindow() {
  if (!mainWindow) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
    if (process.platform === 'darwin') {
      app.dock.show();
    }
  }
}

function getDefaultTrayIcon() {
  // Simple SVG-based icon as base64 PNG fallback
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAQCAYAAAAmlE46AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADRSURBVCiRY2AYdICRgYGBgQEDA8P/f//+MzAyMDAwMDEw/P/////MzMzM////n4GBgYGBiYHhPwMDAwMDEwPDfwYGBgYGJgaG/wwMDAwMTAwM/xkYGBgYmBgY/jMwMDAwMDEw/GdgYGBgYGJg+M/AwMDAwMTAwH8GBgYGBiYGhv8MDAwMDExMDP8ZGBgYGJgYGP4zMDAwMDAxMPxnYGBgYGBiYPjPwMDAwMDEwPCfgYGBgYGJgeE/AwMDAwMTE8N/BgYGBgYmBob/DAwMDAxMTAz/GRgYGBiYGP4PABvGEhvHJM8AAAAASUVORK5CYII=';
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('get-myanmar-date', (event, dateStr) => {
  try {
    const date = dateStr ? new Date(dateStr) : new Date();
    return getMyanmarDate(date);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('get-month-data', (event, year, month) => {
  try {
    return getMonthData(year, month);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('get-year-data', (event, year) => {
  try {
    return getYearData(year);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('get-thingyan-countdown', () => {
  try {
    return getThingyanCountdown();
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('get-holidays', (event, year, month) => {
  try {
    return getMyanmarHolidays(year, month);
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

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();

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
