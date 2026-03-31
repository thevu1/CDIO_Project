const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "123456",
  database: "healthquest"
});

db.connect(err => {
  if (err) {
    console.log("Database error:", err);
  } else {
    console.log("MySQL Connected");
  }
});

module.exports = db;