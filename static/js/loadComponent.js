async function loadComponent(id, file) {
    const res = await fetch(file);
    const html = await res.text();
    document.getElementById(id).innerHTML = html;
}

// load bottom nav
document.addEventListener("DOMContentLoaded", () => {
    loadComponent("bottomNavContainer", "./static/components/bottom-nav.html");
});