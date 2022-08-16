const {app, BrowserWindow, screen} = require("electron")
const path = require("path")
const fs = require("fs")

const lock = app.requestSingleInstanceLock

if(!lock) app.quit()

const createWallpapers = () => {
    const displays = screen.getAllDisplays()
    displays.forEach(disp => {
        disp.bounds = screen.dipToScreenRect(null, disp.bounds)
        const win = new BrowserWindow({
            show: false,
            frame: false,
            skipTaskbar: true,
            x: disp.bounds.x,
            y: disp.bounds.y,
            width: disp.size.width,
            height: disp.size.height,
            icon: path.join(__dirname, "..", "static_global", "brand.ico"),
            webPreferences: {
                preload: path.join(__dirname, "preload.js")
            }
        })

        win.loadFile("index.html")
        win.once("ready-to-show", e => win.show())
    })
}

app.enableSandbox()
app.whenReady().then(() => createWallpapers())

app.on('window-all-closed', () => app.quit())
