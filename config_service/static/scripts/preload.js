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
    "submit": (item) => ipcRenderer.invoke("submitWorkshopItem", item)
})

var alertTimeout;
ipcRenderer.on("alert", (e, args) => {
    if(alertTimeout) clearTimeout(alertTimeout)
    const msg = args[0]
    const danger = args[1]
    notification.innerText = msg
    if(danger) {
        notification.classList.remove("text-success")
        notification.classList.add("text-danger")
    }else{
        notification.classList.remove("text-danger")
        notification.classList.add("text-success")
    }
    notification.style.opacity = "1"
    alertTimeout = setTimeout(() => notification.style.opacity = "0", 3000)
})