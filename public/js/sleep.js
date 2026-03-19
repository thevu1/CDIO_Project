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

  await fetch("/api/update-sleep-time", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ time })
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
let reminderOn = true;

function toggleReminder() {

  const toggle = document.querySelector(".toggle");

  reminderOn = !reminderOn;

  if (reminderOn) {

    toggle.classList.remove("off");

  } else {

    toggle.classList.add("off");

  }

}

let hour = 22
let minute = 30

const hourSelect = document.getElementById("hourSelect")
const minuteSelect = document.getElementById("minuteSelect")

/* INIT PICKER */

for (let i = 0; i < 24; i++) {

  let opt = document.createElement("option")

  opt.value = i
  opt.text = i.toString().padStart(2, "0")

  hourSelect.appendChild(opt)

}

for (let i = 0; i < 60; i++) {

  let opt = document.createElement("option")

  opt.value = i
  opt.text = i.toString().padStart(2, "0")

  minuteSelect.appendChild(opt)

}

/* OPEN */

function openPicker() {

  document.getElementById("timeModal").style.display = "flex"

  hourSelect.value = hour
  minuteSelect.value = minute

}

/* CLOSE */

function closePicker() {

  document.getElementById("timeModal").style.display = "none"

}

/* CONFIRM */

function confirmTime() {

  hour = parseInt(hourSelect.value)
  minute = parseInt(minuteSelect.value)

  updateUI()

  closePicker()

}

/* SAVE */

function saveSleepTime() {

  updateUI()

}

/* UPDATE */

function updateUI() {

  let h = hour.toString().padStart(2, "0")
  let m = minute.toString().padStart(2, "0")

  document.getElementById("sleepHour").innerText = h
  document.getElementById("sleepMinute").innerText = m

  document.getElementById("timeDisplay").value = h + ":" + m

  /* reminder */

  let total = hour * 60 + minute - 30

  let rh = Math.floor(total / 60)
  let rm = total % 60

  document.getElementById("reminderTime").innerText =
    rh.toString().padStart(2, "0") + ":" + rm.toString().padStart(2, "0")

}

/* TOGGLE */

function toggleReminder() {

  document.querySelector(".toggle").classList.toggle("off")

}
function populateTimeOptions() {
  const hourSelect = document.getElementById("hourSelect");
  const minuteSelect = document.getElementById("minuteSelect");

  for (let h = 0; h < 24; h++) {
    const option = document.createElement("option");
    option.value = h;
    option.textContent = h.toString().padStart(2, '0');
    hourSelect.appendChild(option);
  }

  for (let m = 0; m < 60; m++) {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = m.toString().padStart(2, '0');
    minuteSelect.appendChild(option);
  }

  hourSelect.selectedIndex = 19; // ví dụ: 19 giờ
  minuteSelect.selectedIndex = 24; // ví dụ: 24 phút
}

document.addEventListener("DOMContentLoaded", populateTimeOptions);
