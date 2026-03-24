let timer = null
let seconds = 45 * 60

function formatTime(sec) {

    let m = Math.floor(sec / 60)
    let s = sec % 60

    return m + ":" + (s < 10 ? "0" : "") + s

}

function startFocus(mode) {

    /* Ẩn 2 card */

    document.getElementById("modeGrid").style.display = "none"

    /* Hiện thanh timer */

    document.getElementById("focusBar").style.display = "flex"

    timer = setInterval(() => {

        seconds--

        document.getElementById("timer").innerText =
            formatTime(seconds)

        if (seconds <= 0) {

            clearInterval(timer)

            alert("Hoàn thành 45 phút tập trung!")

            stopFocus()

        }

    }, 1000)

}

function stopFocus() {
    clearInterval(timer)
    seconds = 45 * 60
    document.getElementById("timer").innerText = "45:00"
    /* Hiện lại card */
    document.getElementById("modeGrid").style.display = "grid"
    /* Ẩn timer */
    document.getElementById("focusBar").style.display = "none"
}

// Dropdown chế độ tập trung
function toggleMenu() {

    const menu = document.getElementById("modeMenu");
    const arrow = document.getElementById("arrow");

    menu.classList.toggle("show");
    arrow.classList.toggle("rotate");
}

function selectMode(mode) {

    document.querySelector(".mode-title").innerHTML =
        "Chọn chế độ tập trung (" + mode + ") <span class='arrow rotate'>⌄</span>";

    document.getElementById("modeMenu").classList.remove("show");
}
function openPopup() {

    document.getElementById("focusPopup").style.display = "flex"

}

function closePopup() {

    document.getElementById("focusPopup").style.display = "none"

}