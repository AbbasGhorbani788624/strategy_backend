require("dotenv").config();
const request = require("supertest");
const app = require("../../src/app");

const agent = () => request(app);

const withAuthCookie = (req, token) =>
  req.set("Cookie", [`access_token=${token}`]);

module.exports = {
  app,
  agent,
  withAuthCookie,
};
