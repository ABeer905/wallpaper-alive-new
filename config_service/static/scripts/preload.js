const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld("web", {
    "open": (url) => ipcRenderer.invoke("webContentsRequested", url) 
})

contextBridge.exposeInMainWorld("config", {
    "get": () => ipcRenderer.invoke("getSave"),
    "save": (save) => ipcRenderer.invoke("writeSave", save)
})