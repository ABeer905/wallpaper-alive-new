const { app, BrowserWindow, ipcMain, screen, shell } = require('electron')
const dataTypes = require('../static_global/dataTypes.json')
const fs = require('fs')
const path = require('path')

const savePath = path.join(path.join(__dirname, "..", ".config"))
const validURLS = ["steam://store/2009120", "steam://url/SteamWorkshopPage/2009120", "https://steamcommunity.com/app/2003310/discussions", "https://github.com/arbeers1/wallpaper-alive-new"]

const createSplash = () => {
    const splashWindow = new BrowserWindow({
        width: 400,
        height: 200,
        show: false,
        frame: false,
        resizable: false,
        skipTaskbar: true
    })

    splashWindow.loadFile('templates/splash.html')
    splashWindow.once("ready-to-show", e => {
        splashWindow.show()
        createWindow(splashWindow)
    })
}

const createWindow = async (splashWindow) => {
    const save = await loadSave()
    const configuration = {
        save: save,
        displays: screen.getAllDisplays(),
        primaryDisplayID: screen.getPrimaryDisplay().id,
    }
    registerEventHandlers(configuration)

    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 800,
        minHeight: 600,
        show: false,
        title: "Wallpaper Alive",
        icon: path.join(__dirname, "static", "brand.ico"),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "static", "scripts", "preload.js")
        } 
    })

    mainWindow.loadFile('templates/index.html')
    mainWindow.once("ready-to-show", e => {
        splashWindow.close()
        mainWindow.show()
        //mainWindow.webContents.openDevTools()
    })
}

app.enableSandbox()
app.whenReady().then(() => createSplash())

app.on('window-all-closed', () => {
    app.quit()
})

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
                resolve(save)
            })
        }
    })
}

/************API Event Handlers***************/
const registerEventHandlers = (save) => {
    /******************WEB API*******************/
    ipcMain.handle("webContentsRequested", (e, nav) => {
        if(validURLS.includes(nav)) shell.openExternal(nav)
    })

    /******************SAVE API******************/
    ipcMain.handle("getSave", e => save)
    ipcMain.handle("writeSave", (e, saved_settings) => {
        save.save = saved_settings
        write()
    })
    ipcMain.handle("autostart", (e, on) => {
        save.save.autostart = on
        write()
    })
    const write = () => {
        fs.writeFile(savePath, JSON.stringify(save.save), err => {
            if(err) console.error(err)
        }) 
    }

    /****************WORKSHOP API****************/
    ipcMain.handle("getWorkshopItems", e => {
        const content = []
        fake_item = {
            file: "C:\\Users\\C284101\\Downloads\\item-test.gif",
            preview: "C:\\Users\\C284101\\Downloads\\item-test.gif",
            name: "This is a really long title test"
        }
        content.push(fake_item)
        return content
    })
    ipcMain.handle("submitWorkshopItem", (e, item) => {
        console.log(item)
    })
}