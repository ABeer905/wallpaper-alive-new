const wallpaperModal = new bootstrap.Modal(document.getElementById("wallpaper-modal"))
const fileUpload = document.getElementById("upload-file")

window.top.postMessage({type: 'config', method: 'get'})
window.onmessage = (e) => {
    if(e.data.type == "save") displayConfig(e.data.data)
}

fileUpload.oninput = (e) => {
    preview.src = fileUpload.files[0].path
    fileUpload.value = null
    document.getElementById("display-select").children[0].selected = "selected"
    document.getElementById("wallpaper-modal").dataset.mode = "add"
    document.getElementById("object-fit").children[0].selected = "selected"
    volume.value = "100"
    document.getElementById("vol-level").innerText = "100"
    wallpaperModal.show()
}

volume.oninput = (e) => {
    document.getElementById("vol-level").innerText = volume.value
    Array.from(document.getElementsByName("vol")).forEach((e) => e.classList.add("d-none"))
    if(volume.value > 50) {
        document.getElementById("volume-full").classList.remove("d-none")
    }else if(volume.value > 0){
        document.getElementById("volume-mid").classList.remove("d-none")
    }else{
        document.getElementById("volume-none").classList.remove("d-none")
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
}

const setWallpaper = () => {
    const displayType = document.getElementById("display-select").value
    if(displayType == '0'){
        settings.displays.forEach(disp => {
            appendWallpaper(
                disp.id,
                preview.src,
                document.getElementById("object-fit").value,
                document.getElementById("volume").value
            )
        })
    }else{
        appendWallpaper(
            displayType,
            preview.src,
            document.getElementById("object-fit").value,
            document.getElementById("volume").value
        )
    }
}

const appendWallpaper = (display, wallpaperFile, objectFit, volume) => {
    let name = nameFromFile(wallpaperFile)
    if(display == settings.primaryDisplayID){
        document.getElementById("current-wallpaper").innerText = name
    }
    settings.save.wallpapers[display] = {
        file: wallpaperFile,
        name: name,
        fit: objectFit,
        volume: volume
    }
    window.top.postMessage({
        type: "config",
        method: "write",
        body: settings.save
    })
}

const nameFromFile = (file) => {
    return file.substring(file.lastIndexOf("/") + 1, file.lastIndexOf("."))
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
        preview.src = settings.save.wallpapers[disp].file
        volume.value = settings.save.wallpapers[disp].volume
        document.getElementById("vol-level").innerText = settings.save.wallpapers[disp].volume
    }
}

const resize = () => {
    const occupied_space = document.getElementById("info-footer").getBoundingClientRect().height + document.getElementById("search-container").getBoundingClientRect().height
    const wallpapers = document.getElementById("wallpaper-container")
    wallpapers.style.height = `${window.innerHeight - occupied_space}px`
}

window.addEventListener("resize", () => resize())
resize()