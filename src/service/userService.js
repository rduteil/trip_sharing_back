class UserService {
  constructor(userModel, userData) {
    this.model = userModel;
    this.data = new userData();
  }

  create(mail, hash) {
    let user = new this.model(mail, hash);
    return this.data.persistCreate(user);
  }
}

module.exports = UserService;
