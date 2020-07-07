const Database = require("./helpers/enums").Database;
const UserService = require("./services/userService");
const ConnectionService = require("./services/connectionService");
const VerificationService = require("./services/verificationService");
const MailService = require("./services/mailService");

// nedb (Also used as default) /////////
const UserModelNedb = require("./models/userModel");
const UserDataNedb = require("./data/userData");

const ConnectionModelNedb = require("./models/connectionModel");
const ConnectionDataNedb = require("./data/connectionData");

const VerificationModelNedb = require("./models/verificationModel");
const VerificationDataNedb = require("./data/verificationData");

const MailDataGmail = require("./data/mailData");
////////////////////////////////////////

const initialise = database => {
  switch (database) {
    case Database.NEDB:
    default: {
      let serviceLayer = {
        user: new UserService(UserModelNedb, UserDataNedb),
        connection: new ConnectionService(ConnectionModelNedb, ConnectionDataNedb),
        verification: new VerificationService(VerificationModelNedb, VerificationDataNedb),
        mail: new MailService(MailDataGmail)
      };
      return serviceLayer;
    }
  }
};

module.exports = initialise();
