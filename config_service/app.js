const { app, BrowserWindow, ipcMain, screen, shell } = require('electron')
const dataTypes = require('../static_global/dataTypes.json')
const fs = require('fs')
const path = require('path')

const savePath = path.join(path.join(__dirname, "..", ".config"))
const validURLS = ["steam://store/2009120", "https://steamcommunity.com/app/2003310/discussions"]

const createWindow = async () => {
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
    title: "Wallpaper Alive",
    autoHideMenuBar: true,
    webPreferences: {
        preload: path.join(__dirname, "static", "scripts", "preload.js")
        } 
    })

    mainWindow.webContents.openDevTools()
    mainWindow.loadFile('templates/index.html')
}

app.enableSandbox()
app.whenReady().then(() => createWindow())

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
    ipcMain.handle("getSave", (e) => save)
}