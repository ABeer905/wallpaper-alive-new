const unsavedChangesAlert = new bootstrap.Modal(document.getElementById("unsaved-modal"))
window.top.postMessage({type: 'config', method: 'get'})
window.onmessage = (e) => {
    if(e.data.type == "save") displayConfig(e.data.data)
    if(e.data.type == "navigation") alertUnsavedChanges()
}

var settings;
const displayConfig = (data) => {
    settings = data.save
    document.getElementById("pause-options").children[data.save.pauseOn].selected = "selected"
    document.getElementById("mute-options").children[data.save.muteOn].selected = "selected"
    shortcut.value = data.save.shortcut
}

const alertUnsavedChanges = (resolve=false, save=false) => {
    if(resolve){
        window.top.postMessage({type: "navigation"})
        return
    }

    if(parseInt(document.getElementById("pause-options").value) != settings.pauseOn || 
       parseInt(document.getElementById("mute-options").value) != settings.muteOn ||
       shortcut.value != settings.shortcut)
    {
        unsavedChangesAlert.show()
    }else
    {
        window.top.postMessage({type: "navigation"})
    }
}