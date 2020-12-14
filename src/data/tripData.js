const nedb = require("nedb");
const path = require("path");

class TripData {
  constructor() {
    this.db = new nedb({
      filename: path.join(__dirname, "../../nedb/trips.db"),
      autoload: true
    });
  }
}

module.exports = TripData;
