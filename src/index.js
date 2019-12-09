const moment = require("moment");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const nedb = require("nedb");

let usersDb = new nedb({ filename: "./nedb/users.db", autoload: true });
usersDb.ensureIndex({ fieldName: "username", unique: true });

const app = express();

const corsOptions = {
  origin: ["https://k6m98.csb.app"],
  methods: ["GET", "POST"],
  optionsSuccessStatus: 200
};

app.use(bodyParser.json());

app.options("/register", cors(corsOptions));

app.post("/register", cors(corsOptions), (req, res) => {
  bcrypt.genSalt(10, (error, salt) => {
    if (error === null) {
      bcrypt.hash(req.body.password, salt, (error, hash) => {
        if (error === null) {
          usersDb.insert(
            {
              username: req.body.username,
              password: hash,
              salt: salt,
              failedAttempts: 0,
              allowedFrom: moment().format()
            },
            error => {
              if (error === null) {
                res.json({
                  msg: "User " + req.body.username + " succesfully created"
                });
              } else {
                res.json({
                  msg: "User " + req.body.username + " cannot be created"
                });
              }
            }
          );
        } else {
          res.json({ msg: "Unable to hash password, try again" });
        }
      });
    } else {
      res.json({ msg: "Unable to hash password, try again" });
    }
  });
});

app.options("/login", cors(corsOptions));

app.post("/login", cors(corsOptions), (req, res) => {
  usersDb.findOne({ username: req.body.username }, (error, user) => {
    if (error !== null) {
      res.json({ msg: error });
    } else if (user === null) {
      res.json({
        msg: "Wrong credentials, check them and try again"
      });
    } else if (user.allowedFrom > moment().format()) {
      res.json({
        msg:
          " Too many failed attempts, try again " +
          moment(user.allowedFrom).fromNow()
      });
    } else {
      bcrypt.compare(req.body.password, user.password, (error, value) => {
        if (error !== null) {
          res.json({ msg: error });
        } else if (value) {
          usersDb.update(
            { username: req.body.username },
            { $set: { failedAttempts: 0 } },
            {},
            () => {
              res.json({ msg: "Authentification success" });
            }
          );
        } else {
          let failedAttempts = user.failedAttempts + 1;
          let allowedFrom = moment()
            .add(Math.max(0, failedAttempts - 3) * 10, "minutes")
            .format();
          usersDb.update(
            { username: req.body.username },
            {
              $set: { failedAttempts: failedAttempts, allowedFrom: allowedFrom }
            },
            () => {
              res.json({
                msg: "Wrong credentials, check them and try again"
              });
            }
          );
        }
      });
    }
  });
});

app.listen(3000);
