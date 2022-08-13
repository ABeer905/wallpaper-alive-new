window.top.postMessage({type: 'config', method: 'get'})
window.onmessage = (e) => {
    if(e.data.type == "save") displayConfig(e.data.data)
}

const displayConfig = (data) => {
    document.getElementById("pause-options").children[data.save.pauseOn].selected = "selected"
    document.getElementById("mute-options").children[data.save.muteOn].selected = "selected"
    shortcut.value = data.save.shortcut
}