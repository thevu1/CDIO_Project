const API = "http://localhost:3000/api"

/* ======================
  PAGE NAVIGATION
====================== */

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

/* ======================
  PLAYER GAME DATA
====================== */

async function loadPlayer() {

  const res = await fetch(`${API}/player`)
  const data = await res.json()

  const xp = data.xp
  const level = data.level
  const streak = data.streak

  const xpBar = document.getElementById("xpBar")
  const xpText = document.getElementById("xpText")
  const levelText = document.getElementById("levelText")
  const streakText = document.getElementById("streakText")

  if (!xpBar) return

  const nextLevelXP = level * 100
  const percent = (xp % nextLevelXP) / nextLevelXP * 100

  xpBar.style.width = percent + "%"

  xpText.innerText = xp + " XP"
  levelText.innerText = "Level " + level
  streakText.innerText = "🔥 " + streak + " days"

}

/* ======================
  LOAD TASKS
====================== */

async function loadTasks() {

  const list = document.getElementById("tasks")
  if (!list) return

  const res = await fetch(`${API}/tasks`)
  const data = await res.json()

  list.innerHTML = ""

  data.forEach(task => {

    const li = document.createElement("li")

    li.innerHTML = `
          🚶 Walk 5km
          <button onclick="completeTask(${task.id},'walk_completed')">Done</button>
          `

    list.appendChild(li)

  })

}

/* ======================
  COMPLETE TASK
====================== */

async function completeTask(id, type) {

  await fetch(`${API}/complete-task`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id, type })
  })

  loadPlayer()
  loadTasks()

}

/* ======================
  FOCUS TIMER
====================== */

let timer = null
let seconds = 1500

function startFocus() {

  if (timer) return

  timer = setInterval(() => {

    seconds--

    if (seconds <= 0) {

      clearInterval(timer)

      finishFocus()

    }

  }, 1000)

}

async function finishFocus() {

  alert("🎉 Focus Completed")

  await fetch(`${API}/focus`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ minutes: 25 })
  })

  loadPlayer()

}
async function loadLeaderboard() {

  const box = document.getElementById("leaderboard")

  if (!box) return

  const res = await fetch("/api/leaderboard")
  const data = await res.json()

  box.innerHTML = ""

  data.forEach((user, index) => {

    box.innerHTML += `
        <div class="leader-item">

            <div class="leader-left">
                <div class="rank">${index + 1}</div>

                <img class="leader-avatar"
                src="${user.avatar || "https://i.pravatar.cc/40"}">

                <div>${user.name}</div>
            </div>

            <div class="score">${user.xp} XP</div>

        </div>
    `
  })
}
//XP FROM TASKS
async function loadPlayer(){

    const res = await fetch("/api/player")
    const data = await res.json()

    const xp = data.xp
    let level = data.level
    const streak = data.streak

    const xpBar = document.getElementById("xpBar")
    const xpText = document.getElementById("xpText")
    const levelText = document.getElementById("levelText")

    if(!xpBar) return

    /* ===== XP LEVEL SYSTEM ===== */

    const xpNeeded = (level + 1) * 500

    let progressXP = xp

    for(let i=0;i<level;i++){
        progressXP -= (i+1)*500
    }

    const percent = (progressXP / xpNeeded) * 100

    /* ===== UPDATE UI ===== */

    xpBar.style.width = percent + "%"

    xpText.innerText = progressXP + " / " + xpNeeded + " XP"

    levelText.innerText = "Level " + level

}

/* ======================
  AUTO LOAD
====================== */

window.onload = () => {
  loadPlayer()
  loadTasks()
  loadLeaderboard()
}