const mailer = require("nodemailer");

class MailData {
  constructor() {
    this.transporter = mailer.createTransport({
      service: "Gmail",
      auth: {
        user: "trip.sharing.2k19@gmail.com",
        pass: "TripSharing2k19"
      }
    });
  }

  send(from, to, subject, body) {
    return new Promise(resolve => {
      let options = {
        from: from,
        to: to,
        subject: subject,
        html: body
      };

      this.transporter.sendMail(options, error => {
        resolve(error);
      });
    });
  }
}

module.exports = MailData;
