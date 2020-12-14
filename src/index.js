const moment = require("moment");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const geoip = require("geoip-lite");
const crypto = require("crypto");
const graphqlHTTP = require("express-graphql");
const { buildSchema } = require("graphql");
const swaggerUi = require("swagger-ui-express");
const yaml = require("yamljs");

//////// THIS PART FOR TESTS ONLY
const serviceFactory = require("./serviceFactory");
const enums = require("./helpers/enums");

let service = serviceFactory(
  enums.DATABASE_SERVICE.NEDB,
  enums.MAIL_SERVICE.GMAIL,
  enums.PASSWORD_SERVICE.BCRYPT,
  enums.TOKEN_SERVICE.JWT
);
/////////////////////////////////

// Return a promise indicating if the given token is valid
const checkToken = (token, payload, action) => {
  return new Promise((resolve) => {
    let options = {};

    switch (action) {
      case enums.JWT_ACTIONS.LOGIN: {
        options = {
          issuer: "prod-paper-44c0v",
          subject: payload.mail,
          audience: payload.audience,
          expiresIn: "2h",
          algorithm: ["RS256"]
        };
        break;
      }
      case enums.JWT_ACTIONS.VERIFY_ACCOUNT: {
        options = {
          issuer: "prod-paper-44c0v",
          expiresIn: "12h",
          algorithm: ["RS256"]
        };
        break;
      }
      case enums.JWT_ACTIONS.ALLOW_CONNECTION: {
        options = {
          issuer: "prod-paper-44c0v",
          algorithm: ["RS256"]
        };
        break;
      }
      case enums.JWT_ACTIONS.RESET_PASSWORD: {
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
    // Get the public key
    let publicKey = fs.readFileSync("./keys/public.pem", "utf8");

    // Verify the token
    service.token.verify(token, publicKey, options).then((verifyResult) => {
      if (verifyResult.code === 0) {
        service.user.findOne({ mail: payload.mail }).then((userResult) => {
          // If no user has been found, reject
          if (userResult.code !== 0 || userResult.value === null) {
            resolve(false);
          }
          // If a user allowed before this token was issued is found, resolve
          else if (verifyResult.value.iat > moment(userResult.value.allowedFrom).valueOf() / 1000) {
            resolve(true);
          }
          // Else, reject
          else {
            resolve(false);
          }
        });
      } else {
        resolve(false);
      }
    });
  });
};

// Hosting address of the front-end application
const frontEnd = ["https://9jelk.csb.app", "https://vg06i.csb.app"];

// Instanciate the application
const app = express();

app.set("trust proxy", true);

// Serve the swagger
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(yaml.load("./documentation/swagger.yaml")));

// Enable requests comming from the front-end server
app.use(cors({ origin: frontEnd, methods: ["GET", "POST"], optionsSuccessStatus: 200 }));

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(enums.HTTP_STATUS.OK).json({ message: "Hello world" });
});

app.post("/register", (req, res) => {
  // Generate password salt
  service.password.salt(10).then((saltResult) => {
    if (saltResult.code === 0) {
      // Generate password hash
      service.password.hash(req.body.password, saltResult.value).then((hashResult) => {
        if (hashResult.code === 0) {
          // Generate token
          let tokenOptions = {
            issuer: "prod-paper-44c0v",
            expiresIn: "12h",
            algorithm: "RS256"
          };
          service.token
            .sign({ mail: req.body.mail }, fs.readFileSync("./keys/private.pem", "utf8"), tokenOptions)
            .then((tokenResult) => {
              if (tokenResult.code === 0) {
                let user = {
                  mail: req.body.mail,
                  firstName: "",
                  lastName: "",
                  photo: "",
                  failedAttempts: 0,
                  allowedFrom: moment.utc().format(),
                  verified: false,
                  password: hashResult.value
                };
                service.user.create(user).then((userResult) => {
                  if (userResult.code === 0) {
                    let verification = {
                      mail: req.body.mail,
                      token: tokenResult.value,
                      type: 0
                    };
                    // Add validation token to database
                    service.verification.create(verification).then((verificationResult) => {
                      if (verificationResult.code === 0) {
                        // Send verification mail to user
                        let mailOptions = {
                          from: "trip.sharing.2k19@gmail.com",
                          to: req.body.mail,
                          subject: "[Trip Sharing 2k19] E-mail verification",
                          html:
                            "<p> Hey, thank you for registering on our website !</p>" +
                            "<p> If you want to use your account now, please follow this <a href=" +
                            frontEnd +
                            "/validate/0/" +
                            encodeURI(tokenResult.value) +
                            ">link</a></p>"
                        };

                        service.mail.send(mailOptions).then((mailResult) => {
                          if (mailResult.code === 0) {
                            // Add current user device to whitelist
                            service.connection.create(
                              {
                                mail: req.body.mail,
                                fingerprint: req.body.fingerprint,
                                trust: true,
                                token: ""
                              },
                              () => {
                                // Everything is ok, warn the user
                                res.status(enums.HTTP_STATUS.CREATED).json({ code: mailResult.code });
                              }
                            );
                          } else {
                            // Remove newly created user
                            service.user.removeOne({ mail: req.body.mail }).then(() => {
                              res.json({ code: mailResult.code });
                            });
                          }
                        });
                      } else {
                        // Remove newly created user
                        service.user.removeOne({ mail: req.body.mail }).then(() => {
                          res.json({ code: verificationResult.code });
                        });
                      }
                    });
                  } else {
                    res.json({ code: userResult.code });
                  }
                });
              } else {
                res.json({ code: tokenResult.code });
              }
            });
        } else {
          res.json({ code: hashResult.code });
        }
      });
    } else {
      res.json({ code: saltResult.code });
    }
  });
});

app.post("/login", (req, res) => {
  service.user.findOne({ mail: req.body.mail }, (error, user) => {
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
          service.connection.check(req.body.mail, req.body.fingerprint).then((trust, formerToken) => {
            switch (trust) {
              case -2: {
                let currentDate = new Date();
                let location = geoip.lookup(req.ip);

                // Warn the user that a forbidden connection has already been tried
                let mailOptions = {
                  from: "trip.sharing.2k19@gmail.com",
                  to: req.body.mail,
                  subject: "[Trip Sharing 2k19] Connection attempt from an untrusted source",
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
                    "<p> If you made this attempt, you can allow this connection by clicking <a href=" +
                    frontEnd +
                    "/validate/1/" +
                    encodeURI(formerToken) +
                    ">here</a></p>" +
                    "<p> Otherwise, you might consider changing your password, it has probably been compromised </p>"
                };

                // Warn the user
                service.mail.send(mailOptions, () => {
                  res.json({ code: -13 });
                });
                break;
              }
              case -1: {
                let tokenOptions = {
                  issuer: "prod-paper-44c0v",
                  algorithm: "RS256"
                };
                let newToken = jwt.sign({ mail: req.body.mail }, fs.readFileSync("./keys/private.pem", "utf8"), tokenOptions);

                let location = geoip.lookup(req.ip);
                service.connection.create(
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
                      subject: "[Trip Sharing 2k19] Connection attempt from an unkwnown source",
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
                        "<p> If you made this attempt, you can allow this connection by clicking <a href=" +
                        frontEnd +
                        "/validate/1/" +
                        encodeURI(newToken) +
                        ">here</a></p>"
                    };

                    service.mail.send(mailOptions, () => {
                      // Warn the user
                      res.json({ code: -12 });
                    });
                  }
                );
                break;
              }
              case 0: {
                service.user.update({ mail: req.body.mail }, { $set: { failedAttempts: 0 } }, {}, () => {
                  let payload = {
                    mail: req.body.mail,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    photo: user.photo
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
                });
                break;
              }
              default: {
                res.json({ code: -2 });
                break;
              }
            }
          });
        } else {
          let failedAttempts = user.failedAttempts + 1;
          let allowedFrom = moment
            .utc()
            .add(Math.max(0, failedAttempts - 3) * 10, "minutes")
            .format();
          service.user.update(
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
  if (checkToken(req.body.token, undefined, enums.JWT_ACTIONS.VERIFY_ACCOUNT)) {
    // Get the user
    service.verification.findOne({ token: req.body.token }, (error, verification) => {
      if (error !== null) {
        res.json({ code: -2 });
        return;
      } else if (verification === null || verification.type !== 0) {
        res.json({ code: -8 });
        return;
      } else {
        service.verification.remove({ token: req.body.token }, {}, () => {
          service.user.update({ mail: verification.mail }, { $set: { verified: true } }, {}, (error) => {
            if (error !== null) {
              res.json({ code: -2 });
              return;
            } else {
              res.json({ code: 0 });
              return;
            }
          });
        });
      }
    });
  } else {
    // Token is invalid
    res.json({ code: -8 });
    return;
  }
});

app.post("/allow", (req, res) => {
  if (checkToken(req.body.token, undefined, enums.JWT_ACTIONS.ALLOW_CONNECTION)) {
    service.connection.findOne(
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
          service.connection.update({ token: req.body.token }, { $set: { trust: true } }, (error) => {
            if (error !== null) {
              res.json({ code: -2 });
              return;
            } else {
              res.json({ code: 0 });
              return;
            }
          });
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
  checkToken(req.body.token, { mail: payload.mail, audience: req.body.audience }, enums.JWT_ACTIONS.LOGIN).then((isOk) => {
    if (isOk) {
      service.user.findOne({ mail: payload.mail }, (error, user) => {
        if (error != null) {
          res.json({ code: -2 });
          return;
        } else if (user === null) {
          res.json({ code: -3 });
          return;
        } else {
          service.user.update(
            { mail: payload.mail },
            {
              $set: {
                mail: req.body.mail,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                photo: req.body.photo
              }
            },
            (error) => {
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
  service.user.findOne({ mail: req.body.mail }, (error, user) => {
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
      let token = jwt.sign({ mail: req.body.mail }, fs.readFileSync("./keys/private.pem", "utf8"), signOptions);

      let cipher = crypto.createCipher("aes256", "key");
      let encoded = cipher.update(req.body.mail + "/" + token, "utf8", "hex") + cipher.final("hex");

      let mailOptions = {
        from: "trip.sharing.2k19@gmail.com",
        to: req.body.mail,
        subject: "[Trip Sharing 2k19] Reset password",
        html:
          "<p> Hey, thank you for using our website !</p>" +
          "<p> To reset your password, please follow this <a href=" +
          frontEnd +
          "/reset/" +
          encodeURI(encoded) +
          ">link</a></p>"
      };
      service.mail.send(mailOptions, () => {
        // Warn the user
        res.json({ code: 0 });
      });
    }
  });
});

app.post("/reset/set", (req, res) => {
  let decipher = crypto.createDecipher("aes256", "key");
  let decoded = decipher.update(req.body.cipher, "hex", "utf8") + decipher.final("utf8");

  let [mail, token] = decoded.split("/");
  service.user.findOne({ mail: mail }, (error, user) => {
    if (error !== null) {
      res.json({ code: -2 });
      return;
    } else if (user === null) {
      res.json({ code: -3 });
      return;
    } else {
      checkToken(token, { mail: mail, audience: req.body.audience }, enums.JWT_ACTIONS.RESET_PASSWORD).then((isOk) => {
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
              service.user.update(
                { mail: mail },
                {
                  $set: {
                    failedAttempts: 0,
                    allowedFrom: moment.utc().format(),
                    password: hash
                  }
                },
                (error) => {
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
app.use("/graphql", graphqlHTTP({ schema: schema, rootValue: root, graphiql: true }));

// Start server
app.listen(3000);

module.exports = app;
