const mongoose = require("mongoose");

const roleDashboardSchema = new mongoose.Schema({
  title: String,
  info: String,
  desc: String,
  type: String,
  sync: { type: Boolean, default: false },
});

module.exports = mongoose.model("RoleDashboard", roleDashboardSchema);
