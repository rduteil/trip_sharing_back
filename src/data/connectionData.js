const nedb = require("nedb");
const path = require("path");

class ConnectionData {
  constructor() {
    this.db = new nedb({
      filename: path.join(__dirname, "../../nedb/connections.db"),
      autoload: true
    });
    this.db.ensureIndex({ fieldName: "mail", unique: false });
  }

  create(connection) {
    return new Promise((resolve) => {
      this.db.insert({ ...connection }, (error) => {
        if (error !== null) {
          resolve(-2);
        } else {
          resolve(0);
        }
      });
    });
  }

  update(connection) {
    return new Promise((resolve) => {
      this.db.update({ _id: connection._id }, connection, (error) => {
        if (error !== null) {
          resolve(-2);
        } else {
          resolve(0);
        }
      });
    });
  }

  check(fields) {
    return new Promise((resolve) => {
      this.db.find(fields, {}, (error, connection) => {
        if (error !== null) {
          resolve(0);
        } else if (connection == null) {
          resolve(-1);
        } else {
          if (connection.trust) {
            resolve(0);
          } else {
            resolve(-2, connection.token);
          }
        }
      });
    });
  }

  removeOne(fields) {
    return new Promise((resolve) => {
      this.db.remove(fields, {}, (error) => {
        if (error !== null) {
          resolve(-2);
        } else {
          resolve(0);
        }
      });
    });
  }

  removeAll(fields) {
    return new Promise((resolve) => {
      this.db.remove(fields, { multi: true }, (error) => {
        if (error !== null) {
          resolve(-2);
        } else {
          resolve(0);
        }
      });
    });
  }
}

module.exports = ConnectionData;
