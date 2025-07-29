const express = require("express");

const authService = require("../services/authService");
const {
  createUnTracedproductLog,
  getUnTracedproductLog,
  getOneUnTracedproductLog,
  updataUnTracedproductLog,
  deleteUnTracedproductLog,
} = require("../services/unTracedproductServices");
const unTracedproductLogRout = express.Router();

unTracedproductLogRout
  .route("/")
  .get(getUnTracedproductLog)
  .post(authService.protect, createUnTracedproductLog);
unTracedproductLogRout
  .route("/:id")
  .get(getOneUnTracedproductLog)
  .put(authService.protect, updataUnTracedproductLog)
  .delete(authService.protect, deleteUnTracedproductLog);

module.exports = unTracedproductLogRout;
