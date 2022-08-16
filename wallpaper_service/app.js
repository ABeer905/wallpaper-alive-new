const {app, BrowserWindow, Menu, Tray, ipcMain, screen} = require("electron")
const dataTypes = require("../static_global/dataTypes.json")
const windows = require("./build/Release/windows_service")
const { exec } = require("child_process")
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
    const wallpapers = []
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
        wallpapers.push(win)

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
    listenForSaveChange(wallpapers)
}

app.enableSandbox()
app.whenReady().then(async () => {
    const save = await loadSave()
    createWallpapers(save)

    const tray = new Tray(`${__dirname}/../static_global/brand.ico`)
    tray.setToolTip('Wallpaper Alive')
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Edit Wallpaper', click: e => openMenu() },
        { label: 'Turn Off Wallpaper', click: e => app.quit() }
    ]))
    tray.on("click", () => tray.popUpContextMenu())
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
            const save = dataTypes.save
            fs.writeFile(savePath, JSON.stringify(save), err => {
                if(err) { console.error(err); return; }
                openMenu()
            })
            resolve(save)
        }
    })
}

const listenForSaveChange = (wallpapers) => {
    let lastTimestamp = Date.now()
    fs.watch(savePath, {}, e => {
        if(Date.now() - lastTimestamp <= 100) return
        lastTimestamp = Date.now()
        loadSave().then(save => {
            wallpapers.forEach(w => w.webContents.send("saveUpdated", save))
        })
    })
}

const openMenu = () => {
    const devEnvironment = true
    if(devEnvironment){
        exec("cd ../config_service & npm start", (err, stdout, stderr) => {})
    }
}

const handleToInt = (handle) => {
    return os.endianness() == "LE" ? handle.readInt32LE() : handle.readInt32BE()
}
