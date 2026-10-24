'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer via contextBridge
contextBridge.exposeInMainWorld('myanmarCalendar', {
  getMyanmarDate: (dateStr) => ipcRenderer.invoke('get-myanmar-date', dateStr),
  getMonthData: (year, month) => ipcRenderer.invoke('get-month-data', year, month),
  getYearData: (year) => ipcRenderer.invoke('get-year-data', year),
  getThingyanCountdown: () => ipcRenderer.invoke('get-thingyan-countdown'),
  getHolidays: (year, month) => ipcRenderer.invoke('get-holidays', year, month),
  getToday: () => ipcRenderer.invoke('get-today'),

  // New Phase 2 Production Features
  findAuspiciousDates: (purpose, year, month, count) =>
    ipcRenderer.invoke('find-auspicious-dates', purpose, year, month, count),
  exportIcal: (year) =>
    ipcRenderer.invoke('export-ical', year),
  get8MansionChart: (my, weekday, isWednesdayPM) =>
    ipcRenderer.invoke('get-8mansion-chart', my, weekday, isWednesdayPM),
  convertMyanmarToGregorian: (my, mm, md) =>
    ipcRenderer.invoke('convert-myanmar-to-gregorian', my, mm, md),
  sendNotification: (options) =>
    ipcRenderer.invoke('send-notification', options),
});
