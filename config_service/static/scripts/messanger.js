const iframe = document.getElementById("main-menu-frame")

window.addEventListener("message", e => {
    switch(e.data.type){
        case("open"):
            window.web.open(e.data.url)
            break
        case("config"):
            if(e.data.method == "get"){
                iframe.contentWindow.postMessage({type: "save", data: save})
            }else if(e.data.method == "write"){
                save.save = e.data.body
                window.config.save(e.data.body)
            }
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