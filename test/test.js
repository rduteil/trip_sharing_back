const supertest = require("supertest");
const app = require("../src/index.js");

describe("GET /", function() {
  it("Cannot GET /", function(done) {
    supertest(app)
      .get("/")
      .expect({ message: "Hello world" }, done);
  });
});
