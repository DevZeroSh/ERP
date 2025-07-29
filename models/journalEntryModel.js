const mongoose = require("mongoose");

const journalEntrySchema = new mongoose.Schema(
  {
    journalName: String,
    journalDate: String,
    journalSerialNum: String,
    journalRefNum: String,
    journalDesc: String,
    journalDebit: Number,
    journalCredit: Number,
    journalAccounts: [
      {
        counter: Number,
        id: String,
        name: String,
        accountDebit: Number,
        accountCredit: Number,
        MainDebit: Number,
        MainCredit: Number,
        accountCurrency: String,
        isPrimary: Boolean,
        accountExRate: Number,
        Desc: String,
        accountType: String,
        code: String,
        _id: false,
      },
    ],
    counter: String,
    linkCounter: String,
    filesArray: [String],
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);
const setfilesURL = (doc) => {
  if (doc.filesArray && Array.isArray(doc.filesArray)) {
    doc.filesArray = doc.filesArray.map(
      (file) => `${process.env.BASE_URL}/journal/${file.fileName || file}`
    );
  }
};

journalEntrySchema.post("save", function (doc) {
  setfilesURL(doc);
});

journalEntrySchema.post("init", function (doc) {
  setfilesURL(doc);
});

module.exports = mongoose.model("journalEntry", journalEntrySchema);
