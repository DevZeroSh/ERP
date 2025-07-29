const express = require("express");
const {
  getSupplierVlaidator,
  deleteSupplierVlaidator,
} = require("../utils/validators/supplierValidator");
const {
  createSupplier,
  getSuppliers,
  getSupplier,
  updataSupplier,
  deleteSupplier,
} = require("../services/supplierServices");

const authService = require("../services/authService");
const router = express.Router();
router.use(authService.protect);

router.route("/").post(createSupplier).get(getSuppliers);

router
  .route("/:id")
  .get(getSupplierVlaidator, getSupplier)
  .put(updataSupplier)
  .delete(deleteSupplierVlaidator, deleteSupplier);

module.exports = router;
