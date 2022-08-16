const {app, BrowserWindow, ipcMain, screen, globalShortcut} = require("electron")
const windows = require("./build/Release/windows_service")
const os = require("os")
const fs = require("fs")

const savePath = `${__dirname}/../.config`

const lock = app.requestSingleInstanceLock
if(!lock) app.quit()

const createWallpapers = (save) => {
    ipcMain.handle("getSave", e => save)
    ipcMain.handle("id", e => windowToDisplay[e.sender.id])

    const displays = screen.getAllDisplays()
    const windowToDisplay = {}
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
            icon: `${__dirname}/../static_global/brand.ico`,
            webPreferences: {
                preload: `${__dirname}/preload.js`
            }
        })
        windowToDisplay[win.id] = disp.id

        win.loadFile("index.html")
        win.once("ready-to-show", e => {
            windows.setWallpaper(
                handleToInt(win.getNativeWindowHandle()),
                disp.bounds.x,
                disp.bounds.y)
            win.show()
            //win.webContents.openDevTools()
        })
    })
}

app.enableSandbox()
app.whenReady().then(async () => {
    const save = await loadSave()
    if(save){
        const res = globalShortcut.register(save.shortcut, () => {
            //open config menu
        })
    } 
    createWallpapers(save)
})

app.on('window-all-closed', () => app.quit())

const loadSave = () => {
    return new Promise((resolve) => {
        if(fs.existsSync(savePath)){
            fs.readFile(savePath, 'utf8', (err, data) => {
                if(err) { console.error(err); return; }
                resolve(JSON.parse(data))
            })
        }else{
            //Open config service
            resolve(null)
        }
    })
}

const handleToInt = (handle) => {
    return os.endianness() == "LE" ? handle.readInt32LE() : handle.readInt32BE()
}
