const express = require("express")
const path = require("path")
const db = require("../database/db")
const fs = require("fs")
const app = express.Router()


/* ======================
   PAGES
====================== */

function checkLogin(req,res,next){

    if(!req.session.user){
        return res.redirect("/login")
    }

    next()
}


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"))
})

app.get("/index", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"))
})

app.get("/walk", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/walk.html"))
})

app.get("/sleep", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/sleep.html"))
})

app.get("/screen", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/screen.html"))
})

app.get("/focus", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/focus.html"))
})

/* ======================
   PLAYER GAME DATA
====================== */

app.get("/api/player", (req, res) => {

    db.query("SELECT xp, level, streak FROM users WHERE id = 1",
        (err, result) => {

            if (err) return res.status(500).json(err)

            res.json(result[0])

        })

})

/* ======================
   ADD XP
====================== */

app.post("/api/add-xp", (req, res) => {

    const { xp } = req.body

    db.query(
        "UPDATE users SET xp = xp + ? WHERE id = 1",
        [xp],
        (err) => {

            if (err) return res.status(500).json(err)

            res.json({ success: true })

        })

})

/* ======================
   TASKS
====================== */

app.get("/api/tasks", (req, res) => {

    db.query("SELECT * FROM daily_tasks",
        (err, result) => {

            if (err) return res.status(500).json(err)

            res.json(result)

        })

})

app.post("/api/complete-task", (req, res) => {

    const { id, type } = req.body

    db.query(
        `UPDATE daily_tasks SET ${type}=1 WHERE id=?`,
        [id],
        (err) => {

            if (err) return res.status(500).json(err)

            db.query("UPDATE users SET xp = xp + 20 WHERE id=1")

            res.json({ success: true })

        })

})

/* ======================
   FOCUS SESSION
====================== */

app.post("/api/focus", (req, res) => {

    const { minutes } = req.body

    db.query(
        "INSERT INTO focus_session(user_id,minutes) VALUES (1,?)",
        [minutes],
        (err) => {

            if (err) return res.status(500).json(err)

            db.query("UPDATE users SET xp = xp + 30 WHERE id=1")

            res.json({ success: true })

        })

})

/* ======================
   SCREEN TIME
====================== */

app.get("/api/screen", (req, res) => {

    db.query("SELECT * FROM screen_usage",
        (err, result) => {

            if (err) return res.status(500).json(err)

            res.json(result)

        })

})

/* ======================
   LEADERBOARD
====================== */

app.get("/api/leaderboard", (req, res) => {

    db.query(
        "SELECT name, avatar, xp FROM users ORDER BY xp DESC LIMIT 10",
        (err, rows) => {

            if (err) {
                console.log(err)
                return res.status(500).json({error:"database error"})
            }

            res.json(rows)

        })

})
//XP from tasks
app.get("/api/player", (req, res) => {

    db.query(
        "SELECT xp, level, streak FROM users WHERE id=1",
        (err, rows) => {

            if(err) return res.status(500).json(err)

            res.json(rows[0])

        }
    )

})
module.exports = app