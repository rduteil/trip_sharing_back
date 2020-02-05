const supertest = require("supertest");
const app = require("../src/index.js");

describe("Get operations", function() {
  it("GET /", function(done) {
    supertest(app)
      .get("/")
      .expect({ message: "Hello world" }, done);
  });
});
