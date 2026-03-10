const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "trolley.proxy.rlwy.net",
    user: "root",
    password: "uoSCVfVWEGTFDoalaRGbHBGCRmyRDMGj",
    database: "railway"
});

db.connect((err) => {
    if (err) {
        console.log("Database connection error:", err);
    } else {
        console.log("MySQL Connected");
    }
});

module.exports = db;