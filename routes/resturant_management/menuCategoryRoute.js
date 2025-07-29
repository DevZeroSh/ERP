const express = require("express");

const {
  uploadMenuCategoryImage,
  resizerMenuCategoryImage,
  getMenuCategory,
  createMenuCategory,
  getMenuCategories,
  deleteMenuCategory,
  updataMenuCategory,
} = require("../../services/resturant_management/menuCategoryServuces");
const authService = require("../../services/authService");

const menuCategoryRout = express.Router();

menuCategoryRout
  .route("/")
  .get(getMenuCategories)
  .post(authService.protect, uploadMenuCategoryImage, resizerMenuCategoryImage, createMenuCategory);
menuCategoryRout
  .route("/:id")
  .get(getMenuCategory)
  .put(authService.protect,uploadMenuCategoryImage, resizerMenuCategoryImage, updataMenuCategory)
  .delete(authService.protect,deleteMenuCategory);

module.exports = menuCategoryRout;
