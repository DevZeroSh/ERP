const express = require("express");
const {
  getAccountingTree,
  createAccountingTree,
  updateAccountingTree,
  deleteAccountingTree,
  getAccountingTreeNoBalance,
  importAccountingTree,
  changeBalance,
  getOneAccountingTree,
  getAccountingTreeForExport,
} = require("../services/accountingTreeServices");
const authService = require("../services/authService");
const multer = require("multer");
const upload = multer();

const accountingTreeRouter = express.Router();

accountingTreeRouter.use(authService.protect);

// Routes
accountingTreeRouter
  .route("/")
  .get(getAccountingTree)
  .post(createAccountingTree);

accountingTreeRouter.route("/tree").get(getAccountingTreeNoBalance);

accountingTreeRouter
  .route("/import").get(getAccountingTreeForExport)
  .post(upload.single("file"), importAccountingTree);

accountingTreeRouter
  .route("/change/:id")
  .get(getOneAccountingTree)
  .put(changeBalance);

accountingTreeRouter
  .route("/:id")
  .put(updateAccountingTree)
  .get(getAccountingTree)
  .delete(deleteAccountingTree);

module.exports = accountingTreeRouter;
