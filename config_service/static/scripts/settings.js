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
    document.getElementById("hwacc-option").checked = data.save.hwAcceleration
}

const save = () => {
    settings.save.pauseOn = parseInt(document.getElementById("pause-options").value)
    settings.save.muteOn = parseInt(document.getElementById("mute-options").value)
    settings.save.hwAcceleration = document.getElementById("hwacc-option").checked
    window.top.postMessage({
        type: "config",
        method: "write",
        body: settings.save
    })
}

const alertUnsavedChanges = (resolve=false, shouldSave=false) => {
    //resolve=true navigates menu after prompting user of unsaved changes
    if(resolve){
        if(shouldSave) save()
        window.top.postMessage({type: "navigation"})
        return
    }

    if(parseInt(document.getElementById("pause-options").value) != settings.save.pauseOn || 
       parseInt(document.getElementById("mute-options").value) != settings.save.muteOn || 
       document.getElementById("hwacc-option").checked != settings.save.hwAcceleration)
    {
        unsavedChangesAlert.show()
    }else
    {
        window.top.postMessage({type: "navigation"})
    }
}