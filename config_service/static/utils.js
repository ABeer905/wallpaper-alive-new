var save;
(async () => save = await window.config.get())()

const set_location = (link) => {
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
