const moment = require("moment");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const nedb = require("nedb");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const mailer = require("nodemailer");
const geoip = require("geoip-lite");
const crypto = require("crypto");
const graphqlHTTP = require("express-graphql");
const { buildSchema } = require("graphql");

let usersDb = new nedb({
  filename: "./nedb/users.db",
  autoload: true
});
usersDb.ensureIndex({ fieldName: "mail", unique: true });

let verificationsDb = new nedb({
  filename: "./nedb/verifications.db",
  autoload: true
});
verificationsDb.ensureIndex({ fieldName: "mail", unique: true });

let connectionsDb = new nedb({
  filename: "./nedb/connections.db",
  autoload: true
});
connectionsDb.ensureIndex({ fieldName: "mail", unique: false });

let friendShipsDb = new nedb({
  filename: "./nedb/friendships.db",
  autoload: true
});
connectionsDb.ensureIndex({ fieldName: "asker", unique: false });

const transporter = mailer.createTransport({
  service: "Gmail",
  auth: {
    user: "trip.sharing.2k19@gmail.com",
    pass: "NiqueLesUkrainiens"
  }
});

// Return a promise indicating if the current device's fingerprint matches a known one
const allowConnection = (mail, fingerprint) => {
  return new Promise(resolve => {
    connectionsDb.findOne(
      {
        mail: mail,
        fingerprint: fingerprint
      },
      (error, connection) => {
        if (error !== null) {
          resolve(0);
        } else if (connection === null) {
          resolve(-1);
        } else {
          if (connection.trust) {
            resolve(0);
          } else {
            resolve(-2, connection.token);
          }
        }
      }
    );
  });
};

// Enum containing actions validated by a json web token
const jwtActions = {
  LOGIN: "LOGIN",
  VERIFY_ACCOUNT: "VERIFY_ACCOUNT",
  ALLOW_CONNECTION: "ALLOW_CONNECTION",
  RESET_PASSWORD: "RESET_PASSWORD"
};

// Return a promise indicating if the given token is valid
const checkToken = (token, payload, action) => {
  return new Promise(resolve => {
    let options = {};

    switch (action) {
      case jwtActions.LOGIN: {
        options = {
          issuer: "prod-paper-44c0v",
          subject: payload.mail,
          audience: payload.audience,
          expiresIn: "2h",
          algorithm: ["RS256"]
        };
        break;
      }
      case jwtActions.VERIFY_ACCOUNT: {
        options = {
          issuer: "prod-paper-44c0v",
          expiresIn: "12h",
          algorithm: ["RS256"]
        };
        break;
      }
      case jwtActions.ALLOW_CONNECTION: {
        options = {
          issuer: "prod-paper-44c0v",
          algorithm: ["RS256"]
        };
        break;
      }
      case jwtActions.RESET_PASSWORD: {
        options = {
          issuer: "prod-paper-44c0v",
          subject: payload.mail,
          audience: payload.audience,
          expiresIn: "1h",
          algorithm: ["RS256"]
        };
        break;
      }
      default: {
        resolve(false);
      }
    }
    // Check if the token is valid
    try {
      let publicKey = fs.readFileSync("./keys/public.pem", "utf8");
      let decode = jwt.verify(token, publicKey, options);
      usersDb.findOne({ mail: payload.mail }, (error, user) => {
        if (error !== null || user === null) {
          resolve(false);
        } else if (decode.iat > moment(user.allowedFrom).valueOf() / 1000) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    } catch (error) {
      resolve(false);
    }
  });
};

const app = express();

// Enable requests comming from the front-end server
app.use(
  cors({
    origin: ["https://jiz13.csb.app"],
    methods: ["GET", "POST"],
    optionsSuccessStatus: 200
  })
);

app.set("trust proxy", true);

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.post("/register", (req, res) => {
  // Generate Bcrypt salt
  bcrypt.genSalt(10, (error, salt) => {
    if (error === null) {
      // Generate Bcrypt hash
      bcrypt.hash(req.body.password, salt, (error, hash) => {
        if (error === null) {
          // Generate JWT for validation
          let tokenOptions = {
            issuer: "prod-paper-44c0v",
            expiresIn: "12h",
            algorithm: "RS256"
          };
          let token = jwt.sign(
            { mail: req.body.mail },
            fs.readFileSync("./keys/private.pem", "utf8"),
            tokenOptions
          );

          // Add user to database
          usersDb.insert(
            {
              mail: req.body.mail,
              firstName: "",
              lastName: "",
              photo: "",
              failedAttempts: 0,
              allowedFrom: moment.utc().format(),
              verified: false,
              password: hash
            },
            error => {
              if (error === null) {
                // Add validation token to database
                verificationsDb.insert(
                  {
                    mail: req.body.mail,
                    token: token,
                    type: 0
                  },
                  error => {
                    if (error === null) {
                      // Send verification mail to user
                      let mailOptions = {
                        from: "trip.sharing.2k19@gmail.com",
                        to: req.body.mail,
                        subject: "[Trip Sharing 2k19] E-mail verification",
                        html:
                          "<p> Hey, thank you for registering on our website !</p>" +
                          "<p> If you want to use your account now, please follow this <a href=https://jiz13.csb.app/validate/0/" +
                          encodeURI(token) +
                          ">link</a></p>"
                      };

                      transporter.sendMail(mailOptions, error => {
                        if (error === null) {
                          // Add current user device to whitelist
                          connectionsDb.insert(
                            {
                              mail: req.body.mail,
                              fingerprint: req.body.fingerprint,
                              trust: true,
                              token: ""
                            },
                            () => {
                              // Everything is ok, warn the user
                              res.json({ code: 0 });
                            }
                          );
                        } else {
                          res.json({ code: -7 });
                        }
                      });
                    } else {
                      // Remove newly created user
                      usersDb.remove({ mail: req.body.mail }, {}, () => {
                        res.json({ code: -1 });
                      });
                    }
                  }
                );
              } else {
                res.json({ error: error, code: -1 });
              }
            }
          );
        } else {
          res.json({ code: -2 });
        }
      });
    } else {
      res.json({ code: -2 });
    }
  });
});

app.post("/login", (req, res) => {
  usersDb.findOne({ mail: req.body.mail }, (error, user) => {
    if (error !== null) {
      res.json({ code: -2 });
    } else if (user === null) {
      res.json({ code: -3 });
    } else if (user.allowedFrom > moment.utc().format()) {
      res.json({ code: -4, time: moment(user.allowedFrom).fromNow() });
    } else if (!user.verified) {
      res.json({ code: -10 });
    } else {
      // Check the password
      bcrypt.compare(req.body.password, user.password, (error, value) => {
        if (error !== null) {
          res.json({ code: -2 });
        } else if (value) {
          // Check if the connection is in the whitelist
          allowConnection(req.body.mail, req.body.fingerprint).then(
            (trust, formerToken) => {
              switch (trust) {
                case -2: {
                  let currentDate = new Date();
                  let location = geoip.lookup(req.ip);

                  // Warn the user that a forbidden connection has already been tried
                  let mailOptions = {
                    from: "trip.sharing.2k19@gmail.com",
                    to: req.body.mail,
                    subject:
                      "[Trip Sharing 2k19] Connection attempt from an untrusted source",
                    html:
                      "<p> Hey, thank you for using our website !</p>" +
                      "<p> A connection attempt has been detected from an untrusted source today at " +
                      currentDate.getHours() +
                      ":" +
                      currentDate.getMinutes() +
                      ":" +
                      currentDate.getSeconds() +
                      ", from a device localised <a href=https://maps.google.com/?q=" +
                      location.ll[0] +
                      "," +
                      location.ll[1] +
                      ">here</a></p>" +
                      "<p> If you made this attempt, you can allow this connection by clicking <a href=https://jiz13.csb.app/validate/1/" +
                      encodeURI(formerToken) +
                      ">here</a></p>" +
                      "<p> Otherwise, you might consider changing your password, it has probably been compromised </p>"
                  };

                  // Warn the user
                  transporter.sendMail(mailOptions, () => {
                    res.json({ code: -13 });
                  });
                  break;
                }
                case -1: {
                  let tokenOptions = {
                    issuer: "prod-paper-44c0v",
                    algorithm: "RS256"
                  };
                  let newToken = jwt.sign(
                    { mail: req.body.mail },
                    fs.readFileSync("./keys/private.pem", "utf8"),
                    tokenOptions
                  );

                  let location = geoip.lookup(req.ip);
                  connectionsDb.insert(
                    {
                      mail: req.body.mail,
                      fingerprint: req.body.fingerprint,
                      trust: false,
                      token: newToken
                    },
                    () => {
                      let currentDate = new Date();

                      // Warn the user that a new connection has been attempted
                      let mailOptions = {
                        from: "trip.sharing.2k19@gmail.com",
                        to: req.body.mail,
                        subject:
                          "[Trip Sharing 2k19] Connection attempt from an unkwnown source",
                        html:
                          "<p> Hey, thank you for using our website !</p>" +
                          "<p> A connection attempt has been detected from an unknown source today at " +
                          currentDate.getHours() +
                          ":" +
                          currentDate.getMinutes() +
                          ":" +
                          currentDate.getSeconds() +
                          ', from a device localised <a href="https://maps.google.com/?q=' +
                          location.ll[0] +
                          "," +
                          location.ll[1] +
                          '">here</a></p>' +
                          "<p> If you made this attempt, you can allow this connection by clicking <a href=https://jiz13.csb.app/validate/1/" +
                          encodeURI(newToken) +
                          ">here</a></p>"
                      };

                      transporter.sendMail(mailOptions, () => {
                        // Warn the user
                        res.json({ code: -12 });
                      });
                    }
                  );
                  break;
                }
                case 0: {
                  usersDb.update(
                    { mail: req.body.mail },
                    { $set: { failedAttempts: 0 } },
                    {},
                    () => {
                      let payload = {
                        mail: req.body.mail,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        photo: user.photo
                      };
                      let privateKey = fs.readFileSync(
                        "./keys/private.pem",
                        "utf8"
                      );
                      let signOptions = {
                        issuer: "prod-paper-44c0v",
                        subject: req.body.mail,
                        audience: req.body.audience,
                        expiresIn: "2h",
                        algorithm: "RS256"
                      };
                      let token = jwt.sign(payload, privateKey, signOptions);
                      res.json({
                        code: 0,
                        token: token
                      });
                    }
                  );
                  break;
                }
                default: {
                  res.json({
                    code: -2
                  });
                  break;
                }
              }
            }
          );
        } else {
          let failedAttempts = user.failedAttempts + 1;
          let allowedFrom = moment
            .utc()
            .add(Math.max(0, failedAttempts - 3) * 10, "minutes")
            .format();
          usersDb.update(
            {
              mail: req.body.mail
            },
            {
              $set: {
                failedAttempts: failedAttempts,
                allowedFrom: allowedFrom
              }
            },
            () => {
              res.json({ code: -3 });
            }
          );
        }
      });
    }
  });
});

app.post("/verify", (req, res) => {
  // Check the token
  if (checkToken(req.body.token, undefined, jwtActions.VERIFY_ACCOUNT)) {
    // Get the user
    verificationsDb.findOne(
      { token: req.body.token },
      (error, verification) => {
        if (error !== null) {
          res.json({ code: -2 });
          return;
        } else if (verification === null || verification.type !== 0) {
          res.json({ code: -8 });
          return;
        } else {
          verificationsDb.remove({ token: req.body.token }, {}, () => {
            usersDb.update(
              { mail: verification.mail },
              { $set: { verified: true } },
              {},
              error => {
                if (error !== null) {
                  res.json({ code: -2 });
                  return;
                } else {
                  res.json({ code: 0 });
                  return;
                }
              }
            );
          });
        }
      }
    );
  } else {
    // Token is invalid
    res.json({ code: -8 });
    return;
  }
});

app.post("/allow", (req, res) => {
  if (checkToken(req.body.token, undefined, jwtActions.ALLOW_CONNECTION)) {
    connectionsDb.findOne(
      {
        token: req.body.token
      },
      (error, connection) => {
        if (error !== null) {
          res.json({ code: -2 });
          return;
        } else if (connection === null) {
          res.json({ code: -8 });
          return;
        } else if (connection.trust) {
          res.json({ code: -9 });
          return;
        } else {
          connectionsDb.update(
            { token: req.body.token },
            { $set: { trust: true } },
            error => {
              if (error !== null) {
                res.json({ code: -2 });
                return;
              } else {
                res.json({ code: 0 });
                return;
              }
            }
          );
        }
      }
    );
  } else {
    res.json({ code: -8 });
    return;
  }
});

app.post("/update/user", (req, res) => {
  let payload = jwt.decode(req.body.token);
  checkToken(
    req.body.token,
    { mail: payload.mail, audience: req.body.audience },
    jwtActions.LOGIN
  ).then(isOk => {
    if (isOk) {
      usersDb.findOne({ mail: payload.mail }, (error, user) => {
        if (error != null) {
          res.json({ code: -2 });
          return;
        } else if (user === null) {
          res.json({ code: -3 });
          return;
        } else {
          usersDb.update(
            { mail: payload.mail },
            {
              $set: {
                mail: req.body.mail,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                photo: req.body.photo
              }
            },
            error => {
              if (error !== null) {
                res.json({ code: -1 });
              } else {
                let payload = {
                  mail: req.body.mail,
                  firstName: req.body.firstName,
                  lastName: req.body.lastName,
                  photo: req.body.photo
                };
                let privateKey = fs.readFileSync("./keys/private.pem", "utf8");
                let signOptions = {
                  issuer: "prod-paper-44c0v",
                  subject: req.body.mail,
                  audience: req.body.audience,
                  expiresIn: "2h",
                  algorithm: "RS256"
                };
                let token = jwt.sign(payload, privateKey, signOptions);
                res.json({
                  code: 0,
                  token: token
                });
                return;
              }
            }
          );
        }
      });
    } else {
      res.json({ code: -8 });
      return;
    }
  });
});

app.post("/update/password", (req, res) => {});

app.post("/reset/get", (req, res) => {
  usersDb.findOne({ mail: req.body.mail }, (error, user) => {
    if (error !== null) {
      res.json({ code: -2 });
      return;
    } else if (user === null) {
      res.json({ code: -3 });
    } else {
      let signOptions = {
        issuer: "prod-paper-44c0v",
        subject: req.body.mail,
        audience: req.body.audience,
        expiresIn: "2h",
        algorithm: "RS256"
      };
      let token = jwt.sign(
        { mail: req.body.mail },
        fs.readFileSync("./keys/private.pem", "utf8"),
        signOptions
      );

      let cipher = crypto.createCipher("aes256", "key");
      let encoded =
        cipher.update(req.body.mail + "/" + token, "utf8", "hex") +
        cipher.final("hex");

      let mailOptions = {
        from: "trip.sharing.2k19@gmail.com",
        to: req.body.mail,
        subject: "[Trip Sharing 2k19] Reset password",
        html:
          "<p> Hey, thank you for using our website !</p>" +
          "<p> To reset your password, please follow this <a href=https://jiz13.csb.app/reset/" +
          encodeURI(encoded) +
          ">link</a></p>"
      };
      transporter.sendMail(mailOptions, () => {
        // Warn the user
        res.json({ code: 0 });
      });
    }
  });
});

app.post("/reset/set", (req, res) => {
  let decipher = crypto.createDecipher("aes256", "key");
  let decoded =
    decipher.update(req.body.cipher, "hex", "utf8") + decipher.final("utf8");

  let [mail, token] = decoded.split("/");
  usersDb.findOne({ mail: mail }, (error, user) => {
    if (error !== null) {
      res.json({ code: -2 });
      return;
    } else if (user === null) {
      res.json({ code: -3 });
      return;
    } else {
      checkToken(
        token,
        { mail: mail, audience: req.body.audience },
        jwtActions.RESET_PASSWORD
      ).then(isOk => {
        if (isOk) {
          bcrypt.genSalt(10, (error, salt) => {
            if (error !== null) {
              res.json({ code: -2 });
              return;
            }
            bcrypt.hash(req.body.password, salt, (error, hash) => {
              if (error !== null) {
                res.json({ code: -2 });
                return;
              }
              usersDb.update(
                { mail: mail },
                {
                  $set: {
                    failedAttempts: 0,
                    allowedFrom: moment.utc().format(),
                    password: hash
                  }
                },
                error => {
                  if (error !== null) {
                    res.json({ code: -2 });
                    return;
                  } else {
                    res.json({ code: 0 });
                    return;
                  }
                }
              );
            });
          });
        } else {
          res.json({ code: -8 });
          return;
        }
      });
    }
  });
});

app.post("/friendship", (req, res) => {});

const schema = buildSchema(`
  type Query {
    hello: String
  }
`);

const root = {
  hello: () => {
    return "Hello world!";
  }
};

// Set graphQL endpoint
app.use(
  "/graphql",
  graphqlHTTP({ schema: schema, rootValue: root, graphiql: true })
);

// Start server
app.listen(3000);
