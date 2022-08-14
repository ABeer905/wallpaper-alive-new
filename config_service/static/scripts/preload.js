const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld("web", {
    "open": (url) => ipcRenderer.invoke("webContentsRequested", url) 
})

contextBridge.exposeInMainWorld("config", {
    "get": () => ipcRenderer.invoke("getSave"),
    "save": (save) => ipcRenderer.invoke("writeSave", save),
    "autostart": (on) => ipcRenderer.invoke("autostart", on)
})

contextBridge.exposeInMainWorld("workshop", {
    "get": () => ipcRenderer.invoke("getWorkshopItems"),
    "submit": (item) => ipcRenderer.invoke("submit", item)
})