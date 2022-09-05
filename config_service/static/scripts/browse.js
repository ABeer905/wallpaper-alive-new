const wallpaperModal = new bootstrap.Modal(document.getElementById("wallpaper-modal"))
const fileUpload = document.getElementById("upload-file")
const image_preview = document.getElementById("preview-image")
const video_preview = document.getElementById("preview-video")

window.top.postMessage({type: 'config', method: "get"})
window.top.postMessage({type: "workshop", method: "get"})
window.onmessage = (e) => {
    if(e.data.type == "save") { displayConfig(e.data.data) }
    else if(e.data.type == "workshop") { displayWorkshopItems(e.data.data) }
    else if(e.data.type == "meta") {
        console.log(e.data)
        document.getElementById("type").innerText = e.data.data.type
        document.getElementById("res").innerText = e.data.data.res
        document.getElementById("fps").innerText = e.data.data.hasOwnProperty("frameRate") ? ` | ${e.data.data.frameRate} FPS` : ""
    }
}

fileUpload.oninput = e => { configureNewWallpaper(fileUpload.files[0].path) }

volume.oninput = (e) => {
    document.getElementById("vol-level").innerText = volume.value
    setVolIcon()
    document.getElementById("preview-video").volume = parseInt(volume.value) / 100
}

const setVolIcon = () => {
    Array.from(document.getElementsByName("vol")).forEach((e) => e.classList.add("d-none"))
    if(volume.value > 50) {
        document.getElementById("volume-full").classList.remove("d-none")
    }else if(volume.value > 0){
        document.getElementById("volume-mid").classList.remove("d-none")
    }else{
        document.getElementById("volume-none").classList.remove("d-none")
    }
}

searchbar.oninput = (e) => {
    const items = document.getElementsByClassName("wallpaper-item")
    for(var i=0, c=0; i < items.length; i++){
        if(items[i].dataset.title.toLowerCase().includes(searchbar.value.toLowerCase()) ||
           items[i].dataset.title == "nosearch")
        {
            items[i].style.display = ""
            c++
        }
        else
        {
            items[i].style.display = "none"
        }
        if(c == 2){
            query.innerText = searchbar.value
            results.classList.remove("d-none")
        }else{
            results.classList.add("d-none")
        }
    }
}

const displayWorkshopItems = (items) => {
    if(items.length == 0) {
        document.getElementById("wallpapers-loading").classList.add("d-none")
        document.getElementById("no-wallpapers").classList.remove("d-none")
    }else{
        children = []
        items.forEach((item) => {
            const preview = document.createElement("img")
            preview.src = item.preview
            const title = document.createElement("label")
            title.innerText = item.name
            const container = document.createElement("button")
            container.setAttribute("class", "wallpaper-item m-1 rounded")
            container.dataset.title = item.name
            container.dataset.file = item.file
            container.setAttribute("onclick", "configureNewWallpaper(this.dataset.file, this.dataset.title)")
            container.append(preview, title)
            children.push(container)
        })
        document.getElementById("wallpapers-loading").classList.add("d-none")
        document.getElementById("wallpaper-container").append(...children)
    }
}

var settings;
const displayConfig = (data) => {
    settings = data
    setAutostart(data.save.autostart)
    data.displays.forEach((disp, i) => {
        const option = document.createElement("option")
        option.value = disp.id
        option.innerText = `Display ${i+1}: ${disp.size.width}x${disp.size.height}, ${disp.displayFrequency}Hz`
        document.getElementById("display-select").appendChild(option)
    })
    if(data.save.wallpapers.hasOwnProperty(data.primaryDisplayID)){
        document.getElementById("current-wallpaper").innerText = data.save.wallpapers[data.primaryDisplayID].name
    }
}

const setAutostart = (on, save) => {
    const bootStatusIndicator = document.getElementById("boot-status")
    const altOn = document.getElementById("alt-option-on")
    const altOff = document.getElementById("alt-option-off")
    if(on){
        bootStatusIndicator.innerText = "Enabled"
        bootStatusIndicator.classList.remove("text-danger")
        bootStatusIndicator.classList.add("text-success")
        altOn.classList.add("d-none")
        altOff.classList.remove("d-none")
    }else{
        bootStatusIndicator.innerText = "Disabled"
        bootStatusIndicator.classList.remove("text-success")
        bootStatusIndicator.classList.add("text-danger")
        altOff.classList.add("d-none")
        altOn.classList.remove("d-none")
    }
    if(save) window.top.postMessage({type: "config", method: "boot", body: on})
}

const setWallpaper = () => {
    const displayType = document.getElementById("display-select").value
    const file = image_preview.style.display == "none" ? video_preview.src : image_preview.src
    if(file.toLowerCase().endsWith(".gif")) window.top.postMessage({type: "ach", body: "gifWallpaper"})
    if(displayType == '0'){
        settings.displays.forEach((disp, i, arr) => {
            appendWallpaper(
                disp.id,
                file,
                document.getElementById("object-fit").value,
                i == 0 ? document.getElementById("volume").value : 0,
                document.getElementById("file-name").innerText,
                i == arr.length - 1
            )
        })
    }else{
        appendWallpaper(
            displayType,
            file,
            document.getElementById("object-fit").value,
            document.getElementById("volume").value,
            document.getElementById("file-name").innerText,
            true
        )
    }
}

const appendWallpaper = (display, wallpaperFile, objectFit, volume, name, post) => {
    if(display == settings.primaryDisplayID){
        document.getElementById("current-wallpaper").innerText = name
    }
    settings.save.wallpapers[display] = {
        file: wallpaperFile,
        name: name,
        fit: objectFit,
        volume: volume
    }
    if(post){
        window.top.postMessage({
            type: "config",
            method: "write",
            body: settings.save
        })
    }
}

const nameFromFile = (file) => {
    return file.substring(file.lastIndexOf("\\") + 1, file.lastIndexOf("."))
}

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

const configureNewWallpaper = (file, name=null) => {
    const fileType = type(file)
    document.getElementById(`preview-${fileType}`).src = file
    fileUpload.value = null
    startPreview(fileType)

    document.getElementById("file-name").innerText = name ? name : nameFromFile(file)
    document.getElementById("display-select").children[0].selected = "selected"
    document.getElementById("wallpaper-modal").dataset.mode = "add"
    document.getElementById("object-fit").children[0].selected = "selected"
    volume.value = "100"
    setVolIcon()
    document.getElementById("vol-level").innerText = "100"
    wallpaperModal.show()
    window.top.postMessage({type: "meta", body: file })
    if(name) window.top.postMessage({type: "ach", body: "wallpaperInstalled"})
}

const editWallpaper = () => {
    document.getElementById("wallpaper-modal").dataset.mode = "edit"
    Array.from(document.getElementById("display-select").children).forEach(e => {
        if(e.value == settings.primaryDisplayID) e.selected = "selected"
    })
    getSettingsForDisplay(settings.primaryDisplayID)
    wallpaperModal.show()
}

const getSettingsForDisplay = (disp) => {
    if(document.getElementById("wallpaper-modal").dataset.mode == "edit"){
        Array.from(document.getElementById("object-fit").children).forEach(e => {
            if(e.value == settings.save.wallpapers[disp].fit) e.selected = "selected"
        })
        document.getElementById("file-name").innerText = settings.save.wallpapers[disp].name
        const fileType = type(settings.save.wallpapers[disp].file)
        document.getElementById(`preview-${fileType}`).src = settings.save.wallpapers[disp].file
        startPreview(fileType)
        volume.value = settings.save.wallpapers[disp].volume
        setVolIcon()
        document.getElementById("vol-level").innerText = settings.save.wallpapers[disp].volume
        document.getElementById("preview-video").volume = parseInt(volume.value) / 100
        window.top.postMessage({type: "meta", body: settings.save.wallpapers[disp].file })
    }
}

const startPreview = (fileType) => {
    if(fileType == "video"){
        image_preview.style.display = "none"
        video_preview.style.display = ""
        document.getElementById('vol-container').style.display = ""
        video_preview.play()
    }else if(fileType == "image"){
        spinner.classList.add("d-none")
        video_preview.style.display = "none"
        image_preview.style.display = ""
        document.getElementById('vol-container').style.display = "none"
        video_preview.pause()
    }
}

video_preview.onloadstart = e => { spinner.classList.remove("d-none") }
video_preview.oncanplay = e => { spinner.classList.add("d-none") }

document.getElementById("wallpaper-modal").addEventListener("hidden.bs.modal", e => {
    video_preview.src = ""
    image_preview.src = ""
})

const resize = () => {
    const occupied_space = document.getElementById("info-footer").getBoundingClientRect().height + document.getElementById("search-container").getBoundingClientRect().height
    const wallpapers = document.getElementById("wallpaper-container")
    const info = document.getElementById("wallpaper-info-container")
    wallpapers.style.height = `${window.innerHeight - occupied_space}px`
    info.style.height = `${window.innerHeight - occupied_space}px`
}

window.addEventListener("resize", () => resize())
resize()