class PasswordService {
  constructor(implementation) {
    this.implementation = implementation;
  }

  salt(rounds) {
    return this.implementation.salt(rounds);
  }

  hash(salt, password) {
    return this.implementation.hash(salt, password);
  }
}

module.exports = PasswordService;
