class VerificationService {
  constructor(model, data) {
    this.model = model;
    this.data = new data();
  }

  create(userId, token, type) {
    let verification = new this.model(userId, token, type);
    return this.data.create(verification);
  }

  findOne(token) {
    let fields = { tkoen: token };
    return this.data.findOne(fields);
  }

  removeOne(token) {
    return this.data.remove(token);
  }
}

module.exports = VerificationService;
