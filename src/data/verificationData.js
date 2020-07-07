const nedb = require("nedb");

class VerificationData {
  constructro() {
    this.db = new nedb({
      filename: "../../nedb/verifications.db",
      autoload: true
    });
    this.db.ensureIndex({ fieldName: "userId", unique: true });
  }
  create(verification) {
    return new Promise(resolve => {
      this.db.insert(verification, error => {
        if (error !== null) {
          resolve(-2);
        } else {
          resolve(0);
        }
      });
    });
  }

  findOne(fields) {
    return new Promise(resolve => {
      this.db.find(fields, {}, (error, verification) => {
        if (error !== null) {
          resolve(-2);
        } else {
          resolve(verification);
        }
      });
    });
  }

  removeOne(fields) {
    return new Promise(resolve => {
      this.db.remove(fields, {}, error => {
        if (error !== null) {
          resolve(-2);
        } else {
          resolve(0);
        }
      });
    });
  }
}

module.exports = VerificationData;
