const express = require("express");
const authService = require("../../services/authService");
const {
  createRawMaterial,
  getAllRawMaterials,
  getOneRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
} = require("../../services/resturant_management/rawMaterialsServices");

const router = express.Router();
router.use(authService.protect);

router.route("/").get(getAllRawMaterials).post(createRawMaterial);
router
  .route("/:id")
  .get(getOneRawMaterial)
  .put(updateRawMaterial)
  .delete(deleteRawMaterial);

module.exports = router;
