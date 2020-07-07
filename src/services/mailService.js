class MailService {
  constructor(transporter) {
    this.transporter = transporter;
  }

  send(from, to, subject, body) {
    this.transporter.send(from, to, subject, body);
  }
}

module.exports = MailService;
