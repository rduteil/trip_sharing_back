const enums = require("./helpers/enums");
const UserService = require("./services/userService");
const ConnectionService = require("./services/connectionService");
const VerificationService = require("./services/verificationService");
const TripService = require("./services/tripService");
const MailService = require("./services/mailService");
const PasswordService = require("./services/passwordService");
const TokenService = require("./services/tokenService");

// nedb (Also used as default) //////////////////
const UserModelNedb = require("./models/userModel");
const UserDataNedb = require("./data/userData");

const ConnectionModelNedb = require("./models/connectionModel");
const ConnectionDataNedb = require("./data/connectionData");

const VerificationModelNedb = require("./models/verificationModel");
const VerificationDataNedb = require("./data/verificationData");

const TripModelNedb = require("./models/tripModel");
const TripDataNedb = require("./data/tripData");

// gmail (Also used as default) /////////////////
const MailDataGmail = require("./data/mailData");

// bcrypt (Also used as default) ////////////////
const PasswordDataBcrypt = require("./data/passwordData");

// jwt (Also used as default) ///////////////////
const TokenDataJwt = require("./data/tokenData");
/////////////////////////////////////////////////

const initialise = (databaseService, mailService, passwordService, tokenService) => {
  let serviceLayer = {};
  switch (databaseService) {
    case enums.DATABASE_SERVICE.NEDB:
    default: {
      serviceLayer = {
        ...serviceLayer,
        user: new UserService(UserModelNedb, UserDataNedb),
        connection: new ConnectionService(ConnectionModelNedb, ConnectionDataNedb),
        verification: new VerificationService(VerificationModelNedb, VerificationDataNedb),
        trip: new TripService(TripModelNedb, TripDataNedb)
      };
      break;
    }
  }

  switch (mailService) {
    case enums.MAIL_SERVICE.GMAIL:
    default: {
      serviceLayer = {
        ...serviceLayer,
        mail: new MailService(MailDataGmail)
      };
      break;
    }
  }

  switch (passwordService) {
    case enums.PASSWORD_SERVICE.BCRYPT:
    default: {
      serviceLayer = {
        ...serviceLayer,
        password: new PasswordService(PasswordDataBcrypt)
      };
      break;
    }
  }

  switch (tokenService) {
    case enums.TOKEN_SERVICE.JWT:
    default: {
      serviceLayer = {
        ...serviceLayer,
        token: new TokenService(TokenDataJwt)
      };
    }
  }

  return serviceLayer;
};

module.exports = initialise;
