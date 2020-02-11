const mailer = require("nodemailer");

class MailService {
  constructor() {
    this.transporter = mailer.createTransport({
      service: "Gmail",
      auth: {
        user: "trip.sharing.2k19@gmail.com",
        pass: "TripSharing2k19"
      }
    });
  }
}

module.exports = MailService;
