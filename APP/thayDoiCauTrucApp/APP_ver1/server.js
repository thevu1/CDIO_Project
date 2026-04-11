require("dotenv").config();
const express = require("express")
const session = require("express-session")
const app = express()
app.use(express.json())

const bodyParser = require("body-parser")
const authRoutes = require("./routes/auth")
const homeRoutes = require("./routes/home")


const PORT = 3000



app.use(bodyParser.urlencoded({extended:true}))


app.use(session({
    secret:"healthquest-secret",
    resave:false,
    saveUninitialized:false,
    cookie: { secure: false }
}))

app.use("/static", express.static("public"))
// app.use("/static", express.static("static"))

/* ROUTES */

app.use("/", authRoutes)
app.use("/", homeRoutes)
// console.log(process.env);
app.use((err, req, res, next) => {
    console.error("🔥 Lỗi server:", err.stack);
    res.status(500).json({ error: err.message });
});
app.listen(PORT,'0.0.0.0',()=>{
    console.log("Server running http://localhost:"+PORT)
    
})

