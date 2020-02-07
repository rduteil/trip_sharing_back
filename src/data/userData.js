const nedb = require("nedb");

let usersDb = new nedb({
  filename: "../../nedb/users.db",
  autoload: true
});
usersDb.ensureIndex({ fieldName: "mail", unique: true });

class UserData {
  persistCreate(user) {
    return new Promise(resolve => {
      usersDb.insert({ ...user }, error => {
        if (error !== null) {
          resolve(-1);
        } else {
          resolve(0);
        }
      });
    });
  }
}

module.exports = UserData;
