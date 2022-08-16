const info = new bootstrap.Modal(document.getElementById("submitModal"))

window.onmessage = (e) => {
    if(e.data.type == "workshopStatusUpdate"){
        if(e.data.body == "staging"){
            document.getElementById("staging-contents").classList.add("d-none")
            document.getElementById("generating-preview").classList.remove("d-none")
        }else if(e.data.body == "thumbnail"){
            document.getElementById("generating-preview").classList.add("d-none")
            document.getElementById("uploading").classList.remove("d-none")
        }else if(e.data.body[0] == "complete"){
            document.getElementById("uploading").classList.add("d-none")
            document.getElementById("view-workshop").dataset.workshopID = e.data.body[1]
            document.getElementById("view-workshop").disabled = false
            document.getElementById("submit-started").classList.remove("d-none")
            loading.classList.add("d-none")
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
    document.getElementById("staging-contents").classList.remove("d-none")
    loading.classList.remove("d-none")
    document.getElementById("generating-preview").classList.add("d-none")
    document.getElementById("uploading").classList.add("d-none")
    document.getElementById("submit-started").classList.add("d-none")
    document.getElementById("view-workshop").disabled = true
    info.show()
    window.top.postMessage({type: "workshop", method: "submit", body: item})
}