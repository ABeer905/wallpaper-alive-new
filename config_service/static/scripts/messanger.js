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
            }else if(e.data.method == "boot"){
                save.save.autostart = e.data.body
                window.config.autostart(e.data.body)
            }
            break
        case("workshop"):
            if(e.data.method == "get"){
                window.workshop.get().then(items => {
                    iframe.contentWindow.postMessage({type: "workshop", data: items})
                })
            }else if(e.data.method == "submit"){
                window.workshop.submit(e.data.body)
            }else{
                window.workshop.open(e.data.body)
            }
            break
        case("quit"):
            window.app.quit()
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