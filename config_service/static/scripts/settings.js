const unsavedChangesAlert = new bootstrap.Modal(document.getElementById("unsaved-modal"))
window.top.postMessage({type: "config", method: "get"})
window.onmessage = (e) => {
    if(e.data.type == "save") displayConfig(e.data.data)
    if(e.data.type == "navigation") alertUnsavedChanges()
}

var settings;
const displayConfig = (data) => {
    settings = data
    document.getElementById("pause-options").children[data.save.pauseOn].selected = "selected"
    document.getElementById("mute-options").children[data.save.muteOn].selected = "selected"
}

const save = () => {
    settings.save.pauseOn = parseInt(document.getElementById("pause-options").value)
    settings.save.muteOn = parseInt(document.getElementById("mute-options").value)
    window.top.postMessage({
        type: "config",
        method: "write",
        body: settings.save
    })
}

const alertUnsavedChanges = (resolve=false, shouldSave=false) => {
    if(resolve){
        if(shouldSave) save()
        window.top.postMessage({type: "navigation"})
        return
    }

    if(parseInt(document.getElementById("pause-options").value) != settings.save.pauseOn || 
       parseInt(document.getElementById("mute-options").value) != settings.save.muteOn)
    {
        unsavedChangesAlert.show()
    }else
    {
        window.top.postMessage({type: "navigation"})
    }
}