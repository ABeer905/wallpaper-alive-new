const {app, BrowserWindow, ipcMain, screen} = require("electron")
const path = require("path")
const fs = require("fs")

const savePath = path.join(path.join(__dirname, "..", ".config"))

const lock = app.requestSingleInstanceLock
if(!lock) app.quit()

const createWallpapers = async () => {
    const save = await loadSave()
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
            icon: path.join(__dirname, "..", "static_global", "brand.ico"),
            webPreferences: {
                preload: path.join(__dirname, "preload.js")
            }
        })
        windowToDisplay[win.id] = disp.id

        win.loadFile("index.html")
        win.once("ready-to-show", e =>{
            win.show()
            win.webContents.openDevTools()
        })
    })
}

app.enableSandbox()
app.whenReady().then(() => createWallpapers())

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
