class ConnectionService {
  constructor(model, data) {
    this.model = model;
    this.data = new data();
  }

  add(mail, fingerprint, trusted, token) {
    let connection = new this.connectionModel(mail, fingerprint, trusted, token);
    return this.data.create(connection);
  }

  trust(connection) {
    let updated = Object.assign({}, connection, { trusted: true });
    return this.data.update(updated);
  }

  distrust(connection) {
    let updated = Object.assign({}, connection, { trusted: false });
    return this.data.update(updated);
  }

  check(mail, fingerprint) {
    let fields = { mail: mail, fingerprint: fingerprint };
    return this.data.check(fields);
  }

  removeOne(userId, fingerprint) {
    let fields = { _id: userId, fingerprint: fingerprint };
    return this.data.removeOne(fields);
  }

  removeAll(userId) {
    let fields = { _id: userId };
    return this.data.removeAll(fields);
  }
}

module.exports = ConnectionService;
