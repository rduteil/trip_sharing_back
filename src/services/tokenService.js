class TokenService {
  constructor(manager) {
    this.manager = manager;
  }

  sign(payload, privateKey, options) {
    return this.manager.sign(payload, privateKey, options);
  }

  verify(token, publicKey, options) {
    return this.manager.verify(token, publicKey, options);
  }

  decode(token) {
    return this.manager.decode(token);
  }
}

module.exports = TokenService;
