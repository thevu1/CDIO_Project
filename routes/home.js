const express = require("express");
const cors = require("cors");
const db = require("../database/db");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");

const app = express.Router();



/* ======================
   CCHECK LOGIN
====================== */
function checkLogin(req,res,next){

    if(!req.session.user){
        return res.redirect("/login")
    }

    next()
}


/* ======================
   PAGES
====================== */

// app.get("/", (req, res) => {
//     if (!req.session.user) {
//         return res.redirect("/login");
//     }
//     res.redirect("/index");
// });
// app.get("/login", (req,checkLogin, res) => {
//     res.sendFile(path.join(__dirname, "../public/login.html"));
// });

app.use(checkLogin);
app.get("/index", (req,res)=>{
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("/walk", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/walk.html"));
});

app.get("/sleep", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/sleep.html"));
});

app.get("/screen", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/screen.html"));
});

app.get("/focus", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/focus.html"));
});

/* ======================
   LEADERBOARD API
====================== */
app.get("/leaderboard", checkLogin, (req, res) => {

    db.query(
        "SELECT name, xp FROM users ORDER BY xp DESC LIMIT 5",
        (err, results) => {

            if (err) {
                console.log(err);
                return res.status(500).json(err);
            }

            res.json(results);

        }
    );

});
/* ======================
   LOGOUT
====================== */

/* ======================
   API EXAMPLE
====================== */

app.post("/api/add-xp", (req, res) => {

    const { xp } = req.body;

    db.query(
        "UPDATE users SET xp = xp + ? WHERE id = 1",
        [xp],
        (err) => {

            if (err) return res.status(500).json(err);

            res.json({ success: true });

        }
    );

});

module.exports = app