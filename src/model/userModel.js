const moment = require("moment");

class User {
  constructor(mail, hash) {
    this.mail = mail;
    this.firstName = "";
    this.lastName = "";
    this.photo = "";
    this.failedAttempts = 0;
    this.allowedFrom = moment.utc().format();
    this.verified = false;
    this.password = hash;
  }
}

module.exports = User;
