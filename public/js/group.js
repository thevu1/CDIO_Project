let groups = JSON.parse(localStorage.getItem("groups")) || [
    { group_id: "1", name: "Running Team", sport: "Chạy bộ" },
    { group_id: "2", name: "Gym Club", sport: "Thể hình" }
]

function save() {
    localStorage.setItem("groups", JSON.stringify(groups))
}

function renderGroups(list = groups) {
    let html = ""

    if (list.length === 0) {
        html = '<div class="empty-state">Không tìm thấy nhóm nào</div>'
    } else {
        list.forEach(g => {
            html += `
      <div class="group" onclick="goRoom('${g.group_id}','${g.name}')">
        <div class="group-name">${g.name}</div>
        <div class="group-sport">${g.sport}</div>
      </div>
      `
        })
    }

    document.getElementById("groupList").innerHTML = html
}

function searchGroup() {
    let keyword = document.getElementById("searchInput").value.toLowerCase()

    let filtered = groups.filter(g =>
        g.name.toLowerCase().includes(keyword) ||
        g.sport.toLowerCase().includes(keyword)
    )

    renderGroups(filtered)
}

function goRoom(id, name) {
    window.location.href = `room.html?group_id=${id}&name=${encodeURIComponent(name)}`
}

function openCreate() {
    document.getElementById("createModal").style.display = "flex"
}

function createGroup() {
    let name = document.getElementById("createName").value
    let sport = document.getElementById("createSport").value

    if (!name || !sport) {
        alert("Nhập đầy đủ")
        return
    }

    groups.push({
        group_id: Date.now().toString(),
        name,
        sport
    })

    save()
    renderGroups()

    document.getElementById("createName").value = ""
    document.getElementById("createSport").value = ""

    closeModal("createModal")
}

function openJoin() {
    document.getElementById("joinModal").style.display = "flex"
}

function joinGroup() {
    let groupId = document.getElementById("joinID").value

    if (!groupId) {
        alert("Nhập Group ID")
        return
    }

    alert("Demo join thành công")

    document.getElementById("joinID").value = ""

    closeModal("joinModal")
}

function closeModal(id) {
    document.getElementById(id).style.display = "none"
}

function clickOutside(e, id) {
    if (e.target.classList.contains("modal")) {
        closeModal(id)
    }
}

renderGroups()
