const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  guardarRegistro: (data) => ipcRenderer.invoke('guardar-registro', data),
  obtenerRegistros: (data) => ipcRenderer.invoke('get-registros', data),
  eliminarRegistro: (id) => ipcRenderer.invoke('eliminar-registro', id),
  exportarPDF: (data) => ipcRenderer.invoke('exportar-pdf', data),
  exportarCSV: (data) => ipcRenderer.invoke('exportarCSV', data),
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  registerUser: (data) => ipcRenderer.invoke('register-user', data),
  loginUser: (data) => ipcRenderer.invoke('login-user', data),
  logoutUser: () => ipcRenderer.invoke('logout-user'),
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
  updateUser: (data) => ipcRenderer.invoke('update-user', data),
  setReminder: (data) => ipcRenderer.invoke('set-reminder', data),
  getReminders: () => ipcRenderer.invoke('get-reminders'),
  deleteReminder: (reminderId) => ipcRenderer.invoke('delete-reminder', reminderId),
  setAlerts: (enabled) => ipcRenderer.invoke('set-alerts', enabled),
  getTrends: (data) => ipcRenderer.invoke('get-trends', data),
  importCSV: () => ipcRenderer.invoke('importCSV'),
  on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
});