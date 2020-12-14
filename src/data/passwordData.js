const bcrypt = require("bcryptjs");

class PasswordData {
  salt(rounds) {
    return new Promise((resolve) => {
      bcrypt.genSalt(rounds, (error, salt) => {
        if (error !== null) {
          resolve({ code: -2 });
        } else {
          resolve({ code: 0, value: salt });
        }
      });
    });
  }

  hash(salt, password) {
    return new Promise((resolve) => {
      bcrypt.hash(password, salt, (error, hash) => {
        if (error !== null) {
          resolve({ code: -2 });
        } else {
          resolve({ code: 0, value: hash });
        }
      });
    });
  }
}

module.exports = PasswordData;
