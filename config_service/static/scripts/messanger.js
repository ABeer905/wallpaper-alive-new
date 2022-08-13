const iframe = document.getElementById("main-menu-frame")

window.addEventListener("message", e => {
    switch(e.data.type){
        case("open"):
            window.web.open(e.data.url)
            break
        case("config"):
            const res = e.data.method == "get" ? save : window.config.save()
            iframe.contentWindow.postMessage({type: "save", data: res})
            break
    }
})

const alertUnsavedChanges = () => {
    return new Promise((resolve) => {
        iframe.contentWindow.postMessage({type: "navigation"})
        window.addEventListener("message", e => {
            if(e.data.type == "navigation") resolve(1)
        })
    })
}