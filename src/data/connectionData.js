const nedb = require("nedb");

let connectionsDb = new nedb({
  filename: "../../nedb/connections.db",
  autoload: true
});
connectionsDb.ensureIndex({ fieldName: "userId", unique: false });

class ConnectionData {
  create(connection) {
    return new Promise(resolve => {
      connectionsDb.insert({ ...connection }, error => {
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
      connectionsDb.update({ _id: connection._id }, connection, error => {
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
      connectionsDb.find(fields, {}, (error, connection) => {
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
      connectionsDb.remove(fields, {}, error => {
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
      connectionsDb.remove(fields, { multi: true }, error => {
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
