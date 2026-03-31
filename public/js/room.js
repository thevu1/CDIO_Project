
/* PARAM */
const params = new URLSearchParams(window.location.search)
const groupID = params.get("group_id")
const groupName = params.get("name")

document.getElementById("groupName").innerText = decodeURIComponent(groupName)

/* MEMBERS */
let members = [
    { name: "Bạn", steps: 8000 },
    { name: "An", steps: 7000 }
]

/* FRIEND LIST */
let friends = ["Bình", "Cường", "Dũng", "Huy"]

let addedMembers = []

/* RENDER MEMBERS */
function renderMembers() {
    let html = ""
    members.forEach(m => {
        html += `
    <div class="member">
      <div class="member-name">${m.name}</div>
      <div class="member-steps">${m.steps}</div>
    </div>`
    })
    document.getElementById("members").innerHTML = html
}

/* CHART */
let chartInstance = null

function renderChart() {
    const ctx = document.getElementById("chart")

    // Destroy previous chart if exists
    if (chartInstance) {
        chartInstance.destroy()
    }

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: members.map(m => m.name),
            datasets: [{
                data: members.map(m => m.steps),
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(251, 146, 60, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(59, 130, 246, 0.8)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(118, 75, 162, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(251, 146, 60, 1)',
                    'rgba(239, 68, 68, 1)',
                    'rgba(59, 130, 246, 1)'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: { size: 11 }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: { size: 11, weight: 'bold' }
                    }
                }
            }
        }
    })
}

renderMembers()
renderChart()

/* MENU */
function toggleMenu() {
    let m = document.getElementById("menu")
    m.style.display = m.style.display === "flex" ? "none" : "flex"
}

// Close menu when clicking outside
document.addEventListener('click', function (event) {
    const menu = document.getElementById("menu")
    const menuBtn = document.querySelector(".menu-btn")

    if (!menu.contains(event.target) && !menuBtn.contains(event.target)) {
        menu.style.display = "none"
    }
})

/* ADD MEMBER */
function openAdd() {
    document.getElementById("menu").style.display = "none"

    let html = ""
    friends.forEach(f => {
        let added = addedMembers.includes(f)

        html += `
    <div class="friend ${added ? "added" : ""}" onclick="addFriend('${f}')">
      ${f} ${added ? "(Đã thêm)" : ""}
    </div>`
    })

    document.getElementById("friendList").innerHTML = html
    document.getElementById("addModal").style.display = "flex"
}

function addFriend(name) {
    if (addedMembers.includes(name)) {
        alert("Đã thêm rồi")
        return
    }

    if (confirm("Thêm " + name + " vào nhóm?")) {
        addedMembers.push(name)

        members.push({
            name: name,
            steps: Math.floor(Math.random() * 5000 + 3000)
        })

        renderMembers()
        renderChart()
        openAdd()
    }
}

/* RENAME */
function renameGroup() {
    document.getElementById("menu").style.display = "none"

    let newName = prompt("Nhập tên mới:")

    if (newName) {
        document.getElementById("groupName").innerText = newName

        let groups = JSON.parse(localStorage.getItem("groups")) || []

        groups.forEach(g => {
            if (g.group_id === groupID) {
                g.name = newName
            }
        })

        localStorage.setItem("groups", JSON.stringify(groups))
    }
}

/* LEAVE */
function leaveGroup() {
    document.getElementById("menu").style.display = "none"

    if (confirm("Bạn chắc chắn rời nhóm?")) {

        let groups = JSON.parse(localStorage.getItem("groups")) || []

        groups = groups.filter(g => g.group_id !== groupID)

        localStorage.setItem("groups", JSON.stringify(groups))

        window.location.href = "groups.html"
    }
}

/* CLOSE MODAL */
function clickOutside(e) {
    if (e.target.classList.contains("modal")) {
        e.target.style.display = "none"
    }
}

function closeAddModal() {
    document.getElementById("addModal").style.display = "none"
}

/* NAV */
function goBack() {
    window.location.href = "groups.html"
}
