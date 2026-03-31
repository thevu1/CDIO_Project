require("dotenv").config();
const express = require("express")
const session = require("express-session")
const bodyParser = require("body-parser")
const authRoutes = require("./routes/auth")
const homeRoutes = require("./routes/home")

const app = express()
const PORT = 3000


app.use(bodyParser.urlencoded({extended:true}))
app.use(express.json())

app.use(session({
    secret:"healthquest-secret",
    resave:false,
    saveUninitialized:false,
    cookie: { secure: false }
}))

app.use("/static", express.static("public"))
app.use("/static", express.static("static"))

/* ROUTES */

app.use("/", authRoutes)
app.use("/", homeRoutes)

app.listen(3000,'0.0.0.0',()=>{
    console.log("Server running http://localhost:"+PORT)
})
