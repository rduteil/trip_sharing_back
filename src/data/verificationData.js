const nedb = require("nedb");

let verificationsDb = new nedb({
  filename: "../../nedb/verifications.db",
  autoload: true
});
verificationsDb.ensureIndex({ fieldName: "userId", unique: true });

class VerificationData {
  create(verification) {
    return new Promise(resolve => {
      verificationsDb.insert(verification, error => {
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
      verificationsDb.find(fields, {}, (error, verification) => {
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
      verificationsDb.remove(fields, {}, error => {
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
