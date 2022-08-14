var save;
(async () => {
    save = await window.config.get()
    document.getElementById('main-menu-frame').src = "sub_pages/browse.html"
})()

const set_location = async (link) => {
    if(document.getElementById('main-menu-frame').src.endsWith("settings.html")){
        await alertUnsavedChanges()
    }

    Array.from(document.getElementsByClassName("nav-link")).forEach((e) => e.classList.remove("active"))
    link.classList.add("active")
    document.getElementById('main-menu-frame').src = `sub_pages/${link.id}.html`
} 

const resize_content = () => {
    const height_space = document.getElementById("horizontal-nav").getBoundingClientRect().height
    document.getElementById("content-container").style.height = `${window.innerHeight - height_space}px`
}
resize_content()

window.addEventListener("resize",() => resize_content())
