class UserService {
  constructor(model, data) {
    this.model = model;
    this.data = new data();
  }

  create(mail, hash) {
    let user = new this.model(mail, hash);
    return this.data.create(user);
  }

  update(user, fields) {
    let updated = Object.assign({}, user, { ...fields });
    return this.data.update(updated);
  }

  removeOne(field) {
    return this.data.removeOne(field);
  }

  verify(user) {
    let verified = Object.assign({}, user, { verified: true });
    return this.data.update(verified);
  }

  findOne(field) {
    return this.data.findOne(field);
  }

  findAll() {
    return this.data.findAll();
  }

  removeAll() {
    return this.data.removeAll();
  }
}

module.exports = UserService;
