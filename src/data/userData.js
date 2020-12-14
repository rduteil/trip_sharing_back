const nedb = require("nedb");
const path = require("path");

class UserData {
  constructor() {
    this.db = new nedb({
      filename: path.join(__dirname, "../../nedb/users.db"),
      autoload: true
    });
    this.db.ensureIndex({ fieldName: "mail", unique: true });
  }

  create(user) {
    return new Promise((resolve) => {
      this.db.insert(user, (error) => {
        if (error !== null) {
          resolve({ code: -1 });
        } else {
          resolve({ code: 0 });
        }
      });
    });
  }

  update(user) {
    return new Promise((resolve) => {
      this.db.update({ _id: user._id }, user, (error) => {
        if (error !== null) {
          resolve({ code: -2 });
        } else {
          resolve({ code: 0 });
        }
      });
    });
  }

  findOne(field) {
    return new Promise((resolve) => {
      this.db.findOne(field, (error, user) => {
        if (error !== null) {
          resolve({ code: -2 });
        } else {
          resolve({ code: 0, value: user });
        }
      });
    });
  }

  findAll() {
    return new Promise((resolve) => {
      this.db.find({}, (error, users) => {
        if (error !== null) {
          resolve({ code: -2 });
        } else {
          resolve({ code: 0, value: users });
        }
      });
    });
  }

  removeOne(field) {
    return new Promise((resolve) => {
      this.db.remove(field, {}, (error) => {
        if (error !== null) {
          resolve({ code: -2 });
        } else {
          resolve({ code: 0 });
        }
      });
    });
  }

  removeAll() {
    return new Promise((resolve) => {
      this.db.remove({}, { multi: true }, (error) => {
        if (error !== null) {
          resolve({ code: -2 });
        } else {
          resolve({ code: 0 });
        }
      });
    });
  }
}

module.exports = UserData;
