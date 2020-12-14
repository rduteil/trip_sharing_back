class TripService {
  constructor(model, data) {
    this.model = model;
    this.data = new data();
  }
}

module.exports = TripService;
