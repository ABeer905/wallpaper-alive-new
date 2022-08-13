const iframe = document.getElementById("main-menu-frame")

window.onmessage = async (e) => {
    switch(e.data.type){
        case("open"):
            window.web.open(e.data.url)
            break
        case("config"):
            const res = e.data.method == "get" ? save : window.config.save()
            iframe.contentWindow.postMessage({type: "save", data: res})
            break
    }
}