const mongoose = require("mongoose");

const LinkPanelSchema = new mongoose.Schema(
  {
    name: String,
    accountData: { type: mongoose.Schema.ObjectId, ref: "AccountingTree" },
    link: String,
    sync: { type: Boolean, default: false },
    previewNameEn: String,
    previewNameAr: String,
    previewNameTr: String,
    group: String,
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("linkPanel", LinkPanelSchema);
