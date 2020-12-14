const nedb = require("nedb");
const path = require("path");

class VerificationData {
  constructor() {
    this.db = new nedb({
      filename: path.join(__dirname, "../../nedb/verifications.db"),
      autoload: true
    });
    this.db.ensureIndex({ fieldName: "mail", unique: true });
  }

  create(verification) {
    return new Promise((resolve) => {
      this.db.insert(verification, (error) => {
        if (error !== null) {
          resolve({ code: -2 });
        } else {
          resolve({ code: 0 });
        }
      });
    });
  }

  findOne(fields) {
    return new Promise((resolve) => {
      this.db.find(fields, {}, (error, verification) => {
        if (error !== null) {
          resolve({ code: -2 });
        } else {
          resolve({ code: 0, value: verification });
        }
      });
    });
  }

  removeOne(fields) {
    return new Promise((resolve) => {
      this.db.remove(fields, {}, (error) => {
        if (error !== null) {
          resolve({ code: -2 });
        } else {
          resolve({ code: 0 });
        }
      });
    });
  }
}

module.exports = VerificationData;
