const nedb = require("nedb");

let usersDb = new nedb({
  filename: "../../nedb/users.db",
  autoload: true
});
usersDb.ensureIndex({ fieldName: "mail", unique: true });

class UserData {
  create(user) {
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

  update(user) {
    return new Promise(resolve => {
      usersDb.update({ _id: user._id }, user, error => {
        if (error !== null) {
          resolve(-2);
        } else {
          resolve(0);
        }
      });
    });
  }

  findOne(field) {
    return new Promise(resolve => {
      usersDb.findOne(field, (error, user) => {
        if (error !== null) {
          resolve(-2);
        } else {
          resolve(user);
        }
      });
    });
  }

  findAll() {
    return new Promise(resolve => {
      usersDb.find({}, (error, users) => {
        if (error !== null) {
          resolve(-2);
        } else {
          resolve(users);
        }
      });
    });
  }

  removeOne(field) {
    return new Promise(resolve => {
      usersDb.remove(field, {}, error => {
        if (error !== null) {
          resolve(-2);
        } else {
          resolve(0);
        }
      });
    });
  }

  removeAll() {
    return new Promise(resolve => {
      usersDb.remove({}, { multi: true }, error => {
        if (error !== null) {
          resolve(-2);
        } else {
          resolve(0);
        }
      });
    });
  }
}

module.exports = UserData;
