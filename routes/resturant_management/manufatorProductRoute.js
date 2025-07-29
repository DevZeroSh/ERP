const express = require("express");
const authService = require("../../services/authService");
const {
  createmanufactorProduct,
  getAllmanufactorProducts,
  getOnemanufactorProduct,
  updatemanufactorProduct,
  deletemanufactorProduct,
  uploadmanufactorProductImage,
  resizermanufactorProductImage,
} = require("../../services/resturant_management/manufactorProductService");

const router = express.Router();

router
  .route("/")
  .get(getAllmanufactorProducts)
  .post(
    authService.protect,
    uploadmanufactorProductImage,
    resizermanufactorProductImage,
    createmanufactorProduct
  );
router
  .route("/:id")
  .get(getOnemanufactorProduct)
  .put(
    authService.protect,
    uploadmanufactorProductImage,
    resizermanufactorProductImage,
    updatemanufactorProduct
  )
  .delete(authService.protect, deletemanufactorProduct);

module.exports = router;
