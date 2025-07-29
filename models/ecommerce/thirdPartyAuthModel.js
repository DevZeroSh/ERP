const mongoose = require("mongoose");

const thirdPartyAuthSchema = new mongoose.Schema(
  {
    googleClientID: String,
    googleClientSecret: String,
    facebookAppID: String,
    redirectUri: String,
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ThirdPartyAuth", thirdPartyAuthSchema);
