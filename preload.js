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
});
