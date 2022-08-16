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
        return "image"
    }
}

const setup = async (save) => {
    try{
        const wallpaper = save.wallpapers[await ipcRenderer.invoke("id")]
        const wallpaperType = type(wallpaper.file)
        if(wallpaperType == "video"){
            img.src = ""
            img.classList.add("d-none")

            vid.src = wallpaper.file
            vid.volume = parseInt(wallpaper.volume) / 100
            vid.style.objectFit = wallpaper.fit
            vid.classList.remove("d-none")
            vid.play()
        }else if(wallpaperType == "image"){
            vid.src = ""
            vid.classList.add("d-none")

            img.src = wallpaper.file
            img.style.objectFit = wallpaper.fit
            img.classList.remove("d-none")
        }
    }catch(e) {
        console.error(e)
    }
}