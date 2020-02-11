class Connection {
  constructor(userId, fingerprint, trusted, token) {
    this.userId = userId;
    this.fingerprint = fingerprint;
    this.trusted = trusted;
    this.token = token;
  }
}

module.exports = Connection;
