const API = "http://localhost:3000/api"

function goWalk() {
  location.href = "/walk"
}

function goSleep() {
  location.href = "/sleep"
}

function goScreen() {
  location.href = "/screen"
}

function goFocus() {
  location.href = "/focus"
}
function goHome() {
    location.href = "/index"
}

async function saveSleepTime() {
    const time = document.getElementById("timePicker").value;

    await fetch("/api/update-sleep-time",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({time})
    });

    document.getElementById("sleepTime").innerText = time;

    // Tính giờ cảnh báo (giờ ngủ - 30 phút)
    const [h, m] = time.split(":");
    let hour = parseInt(h, 10);
    let minute = parseInt(m, 10);
    minute -= 30;
    if (minute < 0) {
        hour -= 1;
        minute += 60;
    }
    if (hour < 0) hour += 24;
    const reminder = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    document.getElementById("reminderTime").innerText = reminder;
}