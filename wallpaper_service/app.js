const {app, BrowserWindow, screen} = require("electron")
const path = require("path")
const fs = require("fs")

const lock = app.requestSingleInstanceLock

if(!lock) app.quit()

const createWallpapers = () => {

}

app.enableSandbox()
app.whenReady().then(() => createWallpapers())

app.on('window-all-closed', () => {
    app.quit()
})
