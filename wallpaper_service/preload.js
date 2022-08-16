const {ipcRenderer, contextBridge } = require("electron")

contextBridge.exposeInMainWorld("save", {
    "get": async () => {
        const save = await ipcRenderer.invoke("getSave")
        setup(save)
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
        return "img"
    }
}

const setup = async (save) => {
    try{
        const wallpaper = save.wallpapers[await ipcRenderer.invoke("id")]
        const wallpaperType = type(wallpaper.file)
        resetErrMsg()

        const e = document.createElement(wallpaperType)
        e.onerror = (err) => errorAlert(e)
        e.src = wallpaper.file
        e.style.objectFit = wallpaper.fit
        e.classList.add("wallpaper")
        document.getElementById("media-container").replaceChildren(e)

        if(wallpaperType == "video"){
            e.volume = wallpaper.volume
            e.play()
        }
    }catch(e) {
        errorAlert()
    }
}

const resetErrMsg = () => {
    error.classList.add("d-none")
    blank.classList.remove("d-none")
}

const errorAlert = (e=null) => {
    if(e) e.classList.add("d-none")
    blank.classList.add("d-none")
    error.classList.remove("d-none")
}