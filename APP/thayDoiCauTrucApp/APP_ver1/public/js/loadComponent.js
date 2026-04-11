
async function loadComponent(id, file) {
    const res = await fetch(file);
    const html = await res.text();
    document.getElementById(id).innerHTML = html;

    // 👉 gọi hàm set active sau khi load xong
    setActiveNav();
}

function setActiveNav() {
    const currentPath = window.location.pathname;

    const links = document.querySelectorAll(".bottom-nav a");

    links.forEach(link => {
        if (link.getAttribute("href") === currentPath) {
            link.classList.add("active");
        }
    });
}

// load bottom nav
document.addEventListener("DOMContentLoaded", () => {
    loadComponent("bottomNavContainer", "/static/components/bottom-nav.html");
});