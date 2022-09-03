const { app, BrowserWindow, ipcMain, screen, shell } = require('electron')
const dataTypes = require('../static_global/dataTypes.json')
const steam = require('./build/Release/steam_service')
const fs = require('fs')
const path = require('path')

const savePath = path.join(path.join(__dirname, "..", ".config"))
const stagingPath = path.join(__dirname, "publisher_staging")
const validURLS = ["steam://store/2009120", "steam://url/SteamWorkshopPage/2009120", "https://steamcommunity.com/app/2003310/discussions", "https://github.com/arbeers1/wallpaper-alive-new"]

const lock = app.requestSingleInstanceLock()
if(!lock) app.quit()

const createSplash = () => {
    const splashWindow = new BrowserWindow({
        width: 400,
        height: 200,
        show: false,
        frame: false,
        resizable: false,
        skipTaskbar: true,
        icon: path.join(__dirname, "..", "static_global", "brand.ico")
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

    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 800,
        minHeight: 600,
        show: false,
        title: "Wallpaper Alive",
        icon: path.join(__dirname, "..", "static_global", "brand.ico"),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "static", "scripts", "preload.js")
        } 
    })
    registerEventHandlers(mainWindow, configuration)

    mainWindow.loadFile('templates/index.html')
    mainWindow.once("ready-to-show", e => {
        splashWindow.close()
        mainWindow.show()
        //mainWindow.webContents.openDevTools()
    })

    app.on("second-instance", () => {
        if(mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
    })
}

app.enableSandbox()
app.whenReady().then(() => createSplash())

app.on("window-all-closed", () => app.quit())

const loadSave = () => {
    return new Promise((resolve) => {
        if(fs.existsSync(savePath)){
            fs.readFile(savePath, 'utf8', (err, data) => {
                if(err) { console.error(err); return; }
                resolve(JSON.parse(data))
            })
        }else{
            resolve(dataTypes.save)
        }
    })
}

/************API Event Handlers***************/
const registerEventHandlers = (window, save) => {
    /******************WEB API*******************/
    ipcMain.handle("webContentsRequested", (e, nav) => {
        if(validURLS.includes(nav)) shell.openExternal(nav)
    })

    /******************SAVE API******************/
    ipcMain.handle("getSave", e => save)
    ipcMain.handle("writeSave", (e, saved_settings) => {
        save.save = saved_settings
        write("Your settings were updated.")
    })
    ipcMain.handle("autostart", (e, on) => {
        save.save.autostart = on
        write(`Autostart was turned ${on ? "on": "off"}.`)
    })
    const write = (msg=null, danger=false) => {
        fs.writeFile(savePath, JSON.stringify(save.save), err => {
            if(err) { console.error(err); return }
            if(msg) window.webContents.send("alert", [msg, danger])
        }) 
    }

    /****************WORKSHOP API****************/
    ipcMain.handle("getWorkshopItems", async e => {
        try { cleanStagingDirectory() } catch(e) {}

        const content = []
        if(steam.SteamInit()){
            const res = steam.GetInstalledContent()
            const files = res.split("?f=").filter(element => element)
            if(files.length == 0) return false

            await new Promise((resolve) => {
                files.forEach((dir, index, arr) => {
                    let item = {name: "", preview: "", file: ""}
                    fs.readdir(dir, (err, dirFiles) => {
                        dirFiles.forEach((file) => {
                            if(file.includes("preview.")){
                                item.preview = path.join(dir, file)
                            }else if(file == "info.json"){
                                const info = JSON.parse(fs.readFileSync(path.join(dir, file)))
                                item.name = info.title
                            }else{
                                item.file = path.join(dir, file)
                            }
                        })
                        content.push(item)
                        if (index === arr.length -1) resolve();
                    })
                })
            })
        }else{
            window.webContents.send("alert", ["Not connected to Steam", true])
        }
        return content
    })
    ipcMain.handle("submitWorkshopItem", async (e, item) => {
        const stageName = (Math.floor(100000 + Math.random() * 900000)).toString()
        const stage = await new Promise((resolve) => {
            fs.mkdir(path.join(stagingPath, stageName), {recursive: true}, (err, path) => {
                resolve(path)
            })
        })
        await new Promise((resolve) => {
            let staging_complete = 0
            let fileName = item.file.substring(item.file.lastIndexOf('\\') + 1)
            fs.copyFile(item.file, path.join(stage, fileName), err => {
                if(err) console.error(err)
                staging_complete++
                if(staging_complete == 2) resolve()
            })
            fs.writeFile(path.join(stage, "info.json"), `{"title": "${item.title}"}`, err => {
                if(err) console.error(err)
                staging_complete++;
                if(staging_complete == 2) resolve()
            })
        })
        window.webContents.send("workshopStatus", "staging")
        
        await generateThumbnail(item.file, stage)
        window.webContents.send("workshopStatus", "thumbnail")

        //TODO: post stage to Steam. Delete timeout.
        setTimeout(() => window.webContents.send("workshopStatus", ["complete", "#"]), 3000)
    })
    const type = (file) => {
        file = file.toLowerCase()
        if(file.endsWith(".mp4") || 
           file.endsWith(".ogg") ||
           file.endsWith(".webm")
        )
        {
            return "video"
        }
        else if (file.endsWith(".html") || file.endsWith(".htm"))
        {
            return "script"
        }
        else
        {
            return "image"
        }
    }
    const generateThumbnail = (file, destination) => {
        const fileType = type(file)
        const { exec } = require("child_process")
        return new Promise((resolve) => {
            if(fileType == "video") {
                exec(`ffmpeg\\ffmpeg -t 8 -i "${file}" -vf "fps=10,scale=200:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${destination}\\preview.gif"`,
                    (error, stdout, stderr) => {
                        if(error) { console.error(error); return }
                        if(stderr) { resolve() }
                    })
            }else if(fileType == "image"){
                const fileEnding = file.substring(file.lastIndexOf(".") + 1)
                exec(`ffmpeg\\ffmpeg -i "${file}" -vf scale=200:-1 "${destination}\\preview.${fileEnding}"`,
                (error, stdout, stderr) => {
                    if(error) { console.error(error); return }
                    if(stderr) { resolve() }
                })
            }
        })
    }

    /******************APP API*******************/
    ipcMain.handle("quit", () => {
        const { execSync } = require("child_process")
        execSync("WallpaperAlive.exe --quit=true")
        app.quit()
    })
}

const cleanStagingDirectory = async () => {
    fs.readdir(stagingPath, (err, files) => {
        if(err) console.error(err)
        if(!files) return;
        files.forEach((file) => {
            fs.rm(path.join(stagingPath, file), 
                  {force: true, maxRetries: 3, recursive: true, retryDelay: 5000}, (err) => {
                    console.error(err)
                })
        })
    })
}