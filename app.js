const express = require("express");
const router = express.Router();
const db = require("./db");

/* CREATE GROUP */
router.post("/create-group", (req, res) => {

    const { name, sport, description, type, leader_uid } = req.body;

    if (!name || !leader_uid) {
        return res.status(400).send("Missing data");
    }

    const groupID = "GR" + Date.now();

    db.query(
        "INSERT INTO user_groups (group_id,name,sport,description,type,leader_uid) VALUES (?,?,?,?,?,?)",
        [groupID, name, sport, description, type, leader_uid],
        (err) => {

            if (err) {
                console.log(err);
                return res.status(500).send("Create failed");
            }

            // thêm leader vào group_members
            db.query(
                "INSERT INTO group_members (group_id,uid,role,status) VALUES (?,?,?,?)",
                [groupID, leader_uid, "leader", "approved"]
            );

            res.json({
                message: "Group created",
                group_id: groupID
            });
        });
});


/* JOIN GROUP */
router.post("/join-group", (req, res) => {

    const { group_id, uid } = req.body;

    db.query(
        "SELECT type FROM user_groups WHERE group_id=?",
        [group_id],
        (err, result) => {

            if (err) return res.send("Error");

            if (result.length === 0) {
                return res.send("Group not found");
            }

            db.query(
                "SELECT * FROM group_members WHERE group_id=? AND uid=?",
                [group_id, uid],
                (err2, check) => {

                    if (check.length > 0) {
                        return res.send("Already joined");
                    }

                    const status =
                        result[0].type.toLowerCase() === "public"
                            ? "approved"
                            : "pending";

                    db.query(
                        "INSERT INTO group_members (group_id,uid,role,status) VALUES (?,?,?,?)",
                        [group_id, uid, "member", status]
                    );

                    res.send(
                        status === "approved"
                            ? "Joined group"
                            : "Request sent"
                    );
                });
        });
});


/* MY GROUPS */
router.get("/my-groups/:uid", (req, res) => {

    const uid = req.params.uid;

    db.query(
        `SELECT user_groups.* 
         FROM user_groups 
         JOIN group_members 
         ON user_groups.group_id = group_members.group_id 
         WHERE group_members.uid=? AND status='approved'`,
        [uid],
        (err, result) => {

            if (err) {
                console.log(err);
                return res.json([]);
            }

            res.json(result);
        });
});


/* DELETE GROUP */
router.post("/delete-group", (req, res) => {

    const { group_id } = req.body;

    db.query(
        "DELETE FROM group_members WHERE group_id=?",
        [group_id],
        (err) => {

            if (err) {
                console.log(err);
                return res.status(500).send("Delete member error");
            }

            db.query(
                "DELETE FROM user_groups WHERE group_id=?",
                [group_id],
                (err2) => {

                    if (err2) {
                        console.log(err2);
                        return res.status(500).send("Delete group error");
                    }

                    res.send("Group deleted");
                });
        });
});

module.exports = router;