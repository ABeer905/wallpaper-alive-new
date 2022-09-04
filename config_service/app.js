const { app, BrowserWindow, ipcMain, screen, shell } = require('electron')
const steam = require('./build/Release/steam_service')
const fs = require('fs')
const path = require('path')
const { exec } = require("child_process")

const stagingPath = path.join(__dirname, "publisher_staging")
const validURLS = ["steam://store/2009120", "steam://url/SteamWorkshopPage/2009120", "https://steamcommunity.com/app/2003310/discussions", "https://github.com/arbeers1/wallpaper-alive-new"]
var dataTypes;
var savePath;

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
app.whenReady().then(() => {
    if(app.commandLine.getSwitchValue("dev") == "true"){
        globalResourcesDir = `${__dirname}/../static_global`
    }else{
        globalResourcesDir = `${__dirname}/../../../../static_global`
    }
    dataTypes = require(`${globalResourcesDir}/dataTypes.json`)
    savePath = `${globalResourcesDir}/.config`
    createSplash()
})

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
        if(validURLS.includes(nav) || nav.includes("steam://url/CommunityFilePage/")) shell.openExternal(nav)
    })

    /******************SAVE API******************/
    ipcMain.handle("getSave", e => save)
    ipcMain.handle("writeSave", (e, saved_settings) => {
        save.save = saved_settings
        write("Your settings were updated.")
    })
    ipcMain.handle("autostart", (e, on) => {
        save.save.autostart = on
        const AutoLaunch = require('auto-launch');
        const wallpaperAutoStart = new AutoLaunch({
            name: 'WallpaperAlive',
            path: path.join(__dirname, "..", "wallpaper_service", "WallpaperAlive.exe"),
        })
        on ? wallpaperAutoStart.enable() : wallpaperAutoStart.disable()
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
                        dirFiles.forEach(async (file) => {
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
    ipcMain.handle("meta", async (e, file) => await metaData(file))
    ipcMain.handle("submitWorkshopItem", async (e, item) => {
        if(item.title.length > 128) window.webContents.send("alert", ["Title too long", true])
        if(item.desc.length > 8000) window.webContents.send("alert", ["Description too long", true])

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
        
        const thumbnail = await generateThumbnail(item.file, stage)
        window.webContents.send("workshopStatus", "thumbnail")

        const res = steam.CreateItem(async (status_msg) => {
            if(status_msg == true){
                const meta = await metaData(item.file)
                let tags = item.tags.replace(" ", "")
                tags = item.tags.split(",")
                const fileID = steam.UploadItem(item.title, item.desc, tags, stage, thumbnail, meta.type, meta.res)
                window.webContents.send("workshopStatus", ["complete", fileID])
            }else{
                window.webContents.send("alert", [status_msg, true])
            }
        })

        if(!res){
            window.webContents.send("alert", ["Not connected to Steam", true])
        }
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
        return new Promise((resolve) => {
            if(fileType == "video") {
                exec(`ffmpeg\\ffmpeg -t 8 -i "${file}" -vf "fps=10,scale=200:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${destination}\\preview.gif"`,
                    (error, stdout, stderr) => {
                        if(error) { console.error(error); return }
                        if(stderr) { resolve(`${destination}\\preview.gif`) }
                    })
            }else if(fileType == "image"){
                const fileEnding = file.substring(file.lastIndexOf(".") + 1)
                exec(`ffmpeg\\ffmpeg -i "${file}" -vf scale=200:-1 "${destination}\\preview.${fileEnding}"`,
                (error, stdout, stderr) => {
                    if(error) { console.error(error); return }
                    if(stderr) { resolve(`${destination}\\preview.${fileEnding}`) }
                })
            }
        })
    }
    const metaData = (file) => {
        const fileType = type(file)
        return new Promise((resolve) => {
            const meta = {type: fileType}
            exec(`ffmpeg\\ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${file}"`,
            (error, stdout, stderr) => {
                if(error) { console.error(error); return }
                if(stderr) { console.error(stderr); return }
                if(stdout.includes("1920x1080")){
                    meta.res = "1080p"
                }else if(stdout.includes("3840x2160")){
                    meta.res = "4k"
                }else if(stdout.includes("2560x1440")){
                    meta.res = "1440p"
                }else{
                    meta.res = "Other"
                }
                if((meta.hasOwnProperty("frameRate") && fileType == "video") ||fileType != "video") resolve(meta)
            })
            if(fileType == "video"){
                exec(`ffmpeg\\ffprobe -v error -select_streams v -of default=noprint_wrappers=1:nokey=1 -show_entries stream=r_frame_rate "${file}"`,
                (error, stdout, stderr) => {
                    if(error) { console.error(error); return }
                    if(stderr) { console.error(stderr); return }
                    if(stdout){
                        const div = stdout.indexOf("/")
                        meta.frameRate = parseInt(parseInt(stdout.substring(0, div)) / parseInt(stdout.substring(div+1)))
                    }else{
                        meta.frameRate = false
                    }
                    if(meta.hasOwnProperty("res")) resolve(meta)
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