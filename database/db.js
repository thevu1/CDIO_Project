const mysql = require("mysql2")

const db = mysql.createConnection(process.env.DATABASE_URL)

db.connect(err=>{
    if(err){
        console.log("Database connection error:",err)
    }else{
        console.log("Database connected")
    }
})

module.exports = db