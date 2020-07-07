const nedb = require("nedb");

class ConnectionData {
  constructor() {
    this.db = new nedb({
      filename: "../../nedb/connections.db",
      autoload: true
    });
    this.db.ensureIndex({ fieldName: "userId", unique: false });
  }

  create(connection) {
    return new Promise(resolve => {
      this.db.insert({ ...connection }, error => {
        if (error !== null) {
          resolve(-2);
        } else {
          resolve(0);
        }
      });
    });
  }

  update(connection) {
    return new Promise(resolve => {
      this.db.update({ _id: connection._id }, connection, error => {
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
      this.db.find(fields, {}, (error, connection) => {
        if (error !== null) {
          resolve(-2);
        } else {
          resolve(connection);
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

  removeAll(fields) {
    return new Promise(resolve => {
      this.db.remove(fields, { multi: true }, error => {
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
