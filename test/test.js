const supertet = require("supertest");
const app = require("../src/index.js");

describe("GET /", function() {
  it("Cannot GET /", function(done) {
    supertet(app)
      .get("/")
      .expect("Cannot GET /", done);
  });
});