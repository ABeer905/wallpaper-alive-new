const info = new bootstrap.Modal(document.getElementById("submitModal"))

window.onmessage = (e) => {
    if(e.data.type == "workshopStatusUpdate"){
        if(e.data.body == "thumbnail"){
            document.getElementById("generating-preview").classList.add("d-none")
            document.getElementById("staging-contents").classList.remove("d-none")
        }
    } 
}

const saveTags = () => {
    let tags = ""
    Array.from(document.getElementsByClassName("bs-brand")).forEach((e) => {
        tags += e.innerText + ", "
    })
    tags = tags.slice(0, -2)
    document.getElementById("tags-selected").value = tags
}

const clearTags = () => {
    const selectedTags = document.getElementById("tags-selected").value
    Array.from(document.getElementsByClassName("bs-brand")).forEach((e) => {
        if(!selectedTags.includes(e.innerText)) e.classList.remove("bs-brand")
    })
}

const submitItem = () => {
    if(title.value == "" || file.files.length < 1) return
    const item = {
        title: title.value,
        desc: description.value,
        tags: document.getElementById("tags-selected").value,
        file: file.files[0].path
    }
    info.show()
    window.top.postMessage({type: "workshop", method: "submit", body: item})
}