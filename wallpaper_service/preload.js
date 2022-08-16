const {ipcRenderer, contextBridge } = require("electron")

contextBridge.exposeInMainWorld("save", {
    "get": async () => {
        const save = await ipcRenderer.invoke("getSave")
        setup(save)
    }
})

ipcRenderer.on("saveUpdated", (e, save) => setup(save))

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
        const mediaContainer = document.getElementById("media-container")
        blank.classList.remove("d-none")

        const e = document.createElement(wallpaperType)
        e.src = wallpaper.file
        e.classList.add("wallpaper")
        e.style.objectFit = wallpaper.fit

        if(mediaContainer.firstElementChild){
            mediaContainer.firstElementChild.src = ""
            mediaContainer.firstElementChild.remove()
        }
        mediaContainer.appendChild(e)

        if(wallpaperType == "video"){
            e.loop = true
            e.volume = parseInt(wallpaper.volume) / 100
            e.oncanplay = () => e.play()
        }
    }catch(e) {
        console.error(e)
    }
}