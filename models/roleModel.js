const mongoose = require("mongoose");

const rolesShcema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, " Role name is require"],
    },
    description: {
      type: String,
    },
    rolesDashboard: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "RoleDashboard",
      },
    ],

    superAdmin: { type: Boolean, default: false },
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Roles", rolesShcema);
