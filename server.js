const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const groupApi = require("./app");
app.use("/api", groupApi);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "groups.html"));
});

app.get("/room", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "room.html"));
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log("Server running at http://localhost:" + PORT);
});