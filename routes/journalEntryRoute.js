const express = require("express");

const authService = require("../services/authService");
const {
  uploadFileAndImagejournal,
  processFilesAndImagesjournal,
  getJournals,
  getOneJournal,
  createJournal,
  getOneAccountAndJournal,
  updateJournal,
  getOneJournalByLink,
  updateJournalForInvoice,
} = require("../services/journalEntryServices");

const accountingRoute = express.Router();

accountingRoute.use(authService.protect);

accountingRoute
  .route("/")
  .get(getJournals)
  .post(uploadFileAndImagejournal, processFilesAndImagesjournal, createJournal);
accountingRoute
  .route("/:id")
  .get(getOneJournal)
  .put(uploadFileAndImagejournal, processFilesAndImagesjournal, updateJournal);
accountingRoute.route("/accountwithjournal/:id").get(getOneAccountAndJournal);
accountingRoute
  .route("/link/:linkNum")
  .get(getOneJournalByLink)
  .put(
    uploadFileAndImagejournal,
    processFilesAndImagesjournal,
    updateJournalForInvoice
  );
module.exports = accountingRoute;
