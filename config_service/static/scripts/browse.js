const wallpaperModal = new bootstrap.Modal(document.getElementById("wallpaper-modal"))
const fileUpload = document.getElementById("upload-file")

window.top.postMessage({type: 'config', method: 'get'})
window.onmessage = (e) => {
    if(e.data.type == "save") displayConfig(e.data.data)
}

fileUpload.oninput = (e) => {
    preview.src = fileUpload.files[0].path
    fileUpload.value = null
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

const displayConfig = (data) => {
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

const resize = () => {
    const occupied_space = document.getElementById("info-footer").getBoundingClientRect().height + document.getElementById("search-container").getBoundingClientRect().height
    const wallpapers = document.getElementById("wallpaper-container")
    wallpapers.style.height = `${window.innerHeight - occupied_space}px`
}

window.addEventListener("resize", () => resize)
resize()