const {app, BrowserWindow, Menu, Tray, ipcMain, screen, shell} = require("electron")
const windows = require("./windows_service/windows.js")
const { exec } = require("child_process")
const fs = require("fs")
const { stdout } = require("process")
var wallpapers = []
var displayMap //map display id to BrowserWindow id for sending communications
var windowToDisplay; //map webContents id to display id for recieving communications from api
var dataTypes;
var globalResourcesDir;
var appsOpen //app state of desktop
var audioPlaying
var pauseFlag = 0
var muteFlag = 0
var noStart

if(app.commandLine.getSwitchValue("restart") == "true"){
    shell.openExternal(app.getPath("exe")).then(() => app.exit(0))
    noStart = true
}else if(!app.requestSingleInstanceLock() || app.commandLine.getSwitchValue("quit") == "true"){
    app.quit()
}else{
    app.on('second-instance', (event, argv, workingDirectory) => {
        if(argv.includes("--quit=true")) app.quit()
    })
}

if(app.commandLine.hasSwitch("disablehw")){
    app.disableHardwareAcceleration()
}

if(app.commandLine.getSwitchValue("dev") == "true"){
    globalResourcesDir = `${__dirname}/../static_global`
}else{
    globalResourcesDir = `${__dirname}/../../../static_global`
}
dataTypes = require(`${globalResourcesDir}/dataTypes.json`)

const createWallpapers = (save, handlers=true) => {
    for(var win of BrowserWindow.getAllWindows()){
        win.close()
    }
    if(handlers){
        ipcMain.handle("getSave", e => save)
        ipcMain.handle("id", e => windowToDisplay[e.sender.id])
    }

    displayMap = {}
    windowToDisplay = {}
    wallpapers = []
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
            icon: `${globalResourcesDir}/brand.ico`,
            webPreferences: {
                preload: `${__dirname}/preload.js`
            }
        })
        windowToDisplay[win.webContents.id] = disp.id
        wallpapers.push(win)

        win.setSize(disp.size.width, disp.size.height)
        win.loadFile("index.html")
        win.once("ready-to-show", e => {
            windows.setWallpaper(
                win.getNativeWindowHandle(),
                disp.bounds.x,
                disp.bounds.y)
            win.show()
            //win.webContents.openDevTools()
        })
        displayMap[disp.id] = win.id
    })
    listenForSaveChange()
}

const loadSave = () => {
    const savePath = `${globalResourcesDir}/.config`
    return new Promise((resolve) => {
        if(fs.existsSync(savePath)){
            fs.readFile(savePath, 'utf8', (err, data) => {
                if(err) { console.error(err); return; }
                var save = JSON.parse(data)
                pauseFlag = save.pauseOn
                muteFlag = save.muteOn
                save = validateSave(save)
                resolve(save)
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

//Verifies save is for most up to date version
const validateSave = (save) => {
    if(!save.hasOwnProperty("hwAcceleration")) save["hwAcceleration"] = true
    return save
}

app.enableSandbox()
if (!noStart) {
    loadSave().then(save => {
        //Restart to disable hardware acceleration
        if(!save.hwAcceleration && !app.commandLine.hasSwitch("disablehw") && !app.commandLine.hasSwitch("dev")) {
            app.releaseSingleInstanceLock()
            app.relaunch({ args: ["--disablehw"] })
            app.exit(0)
        }

        app.whenReady().then(() => {
            createWallpapers(save)
            //Setup listeners for display updates
            screen.on('display-added', () => createWallpapers(save, handlers=false))
            screen.on('display-removed', () => createWallpapers(save, handlers=false))
            screen.on('display-metrics-changed', () => createWallpapers(save, handlers=false))

            //Setup listeners for audio state and app state
            windows.onAppStateChange((data) => {
                const applications = JSON.parse(data)
                appsOpen = applications
                updateVideoPlayer()
            })
            pollAudioInfo()

            //Tray sub menu
            const tray = new Tray(`${globalResourcesDir}/brand.ico`)
            tray.setToolTip('Wallpaper Alive')
            tray.setContextMenu(Menu.buildFromTemplate([
                { label: 'Edit Wallpaper', click: e => openMenu() },
                { label: 'Turn Off Wallpaper', click: e => app.quit() }
            ]))
            tray.on("click", () => tray.popUpContextMenu())
        })
    })
}

app.on("window-all-closed", () => app.quit())
app.on("before-quit", () => windows.quit())

const listenForSaveChange = () => {
    fs.watch(`${globalResourcesDir}/.config`, {}, e => {
        loadSave().then(save => {
            wallpapers.forEach(w => w.webContents.send("saveUpdated", save))
            updateVideoPlayer()
        })
    })
}

const openMenu = () => {
    if(app.commandLine.getSwitchValue("dev") == "true"){
        exec("cd ../config_service & npm start", (err, stdout, stderr) => {})
    }else{
        exec(`\"${__dirname}/../../../config_service/WallpaperAliveMenu.exe\"`, (err, stdout, stderr) => {})
    }
}

const updateVideoPlayer = () => {
    if(!appsOpen) return

    const pauseOn = dataTypes.pauseOn
    const shouldPause = {}
    Object.keys(displayMap).forEach(disp => shouldPause[disp] = false)

    for(var i = 0; i < appsOpen.length; i++){
        let app = appsOpen[i]
        if(pauseOn.noPause == pauseFlag){
            break
        }else if(pauseOn.screenCover == pauseFlag && app.fullscreen){
            const disp = screen.getDisplayNearestPoint({x: app.pos[0], y: app.pos[1]}).id
            shouldPause[disp] = true
        }else if(pauseOn.appOpen == pauseFlag){
            const disp = screen.getDisplayNearestPoint({x: app.pos[0], y: app.pos[1]}).id
            shouldPause[disp] = true
        }else if(pauseOn.screenCoverAllMonitors == pauseFlag && app.fullscreen){
            Object.keys(displayMap).forEach(disp => shouldPause[disp] = true)
            break
        }else if(pauseOn.appOpenAllMonitors == pauseFlag){
            Object.keys(displayMap).forEach(disp => shouldPause[disp] = true)
            break
        }
    }

    for(var display in shouldPause){
        BrowserWindow.fromId(displayMap[display]).webContents.send("pause", shouldPause[display])
    }

    checkMute()
}

const pollAudioInfo = (wallpapers) => {
    const muteOn = dataTypes.muteOn
    windows.initializeAudioMonitor()
    setInterval(() => {
        if(muteFlag == muteOn.appOpenOrSoundPlay || muteFlag == muteOn.soundPlay){
            audioPlaying = windows.isAudioPlaying()
            checkMute()
        }
    }, 333)
}

const checkMute = () => {
    if(!appsOpen) return

    const muteOn = dataTypes.muteOn
    var shouldMute = false
    if((muteOn.appOpenOrSoundPlay == muteFlag && (appsOpen.length > 0 || audioPlaying)) ||
       (muteOn.appOpen == muteFlag && appsOpen.length > 0) || 
       (muteOn.soundPlay == muteFlag && audioPlaying)){
            shouldMute = true
        }
    for(var display in displayMap){
        BrowserWindow.fromId(displayMap[display]).webContents.send("mute", shouldMute)
    }
}

process.on('uncaughtException', function(err) {
    console.log(err);
});
