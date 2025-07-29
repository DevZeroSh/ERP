const express = require("express");
const authService = require("../../services/authService");
const {
  createBatch,
  getAllBatches,
  getOneBatch,
  deleteBatch,
  updateBatch,
} = require("../../services/resturant_management/batchService");


const router = express.Router();
router.use(authService.protect);
router.route("/all/:id").get(getAllBatches)
router.route("/").get(getAllBatches).post(createBatch);
router.route("/:id").get(getOneBatch).put(updateBatch).delete(deleteBatch);

module.exports = router;
