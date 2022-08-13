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