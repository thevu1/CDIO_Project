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
<<<<<<< HEAD
console.log(process.env);
app.listen(PORT,'0.0.0.0',()=>{
=======

app.listen(3000,'0.0.0.0',()=>{
>>>>>>> e2b080f (new walk)
    console.log("Server running http://localhost:"+PORT)
    
})

