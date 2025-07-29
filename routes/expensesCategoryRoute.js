const express = require("express");

const authService = require("../services/authService");

const expenseCategoriesRoute = express.Router();

const {
  createExpenseCategory,
  getExpenseCategories,
  getOneExpenseCategory,
  deleteOneExpenseCategory,
  updateOneExpenseCategory,
} = require("../services/expensesCategoryService");

expenseCategoriesRoute.use(authService.protect);
expenseCategoriesRoute
  .route("/")
  .post(createExpenseCategory)
  .get(getExpenseCategories);
expenseCategoriesRoute
  .route("/:id")
  .get(getOneExpenseCategory)
  .delete(deleteOneExpenseCategory)
  .put(updateOneExpenseCategory);

module.exports = expenseCategoriesRoute;
