const jwt = require("jsonwebtoken");

class TokenData {
  sign(payload, secret, options) {
    return new Promise((resolve) => {
      try {
        resolve({ code: 0, value: jwt.sign(payload, secret, options) });
      } catch {
        resolve({ code: -2 });
      }
    });
  }

  verify(token, secret, options) {
    return new Promise((resolve) => {
      try {
        resolve({ code: 0, value: jwt.verify(token, secret, options) });
      } catch {
        resolve({ code: -2 });
      }
    });
  }

  decode(token) {
    return new Promise((resolve) => {
      try {
        resolve({ code: 0, value: jwt.decode(token) });
      } catch {
        resolve({ code: -2 });
      }
    });
  }
}

module.exports = TokenData;
