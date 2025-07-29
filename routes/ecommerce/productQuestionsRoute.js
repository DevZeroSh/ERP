const express = require("express");

const {
  getQuestions,
  getOneQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionsByProduct,
  updateApprovedStatus,
} = require("../../services/ecommerce/productQuestionsServices");

const questionsRoute = express.Router();

questionsRoute.route("/").get(getQuestions).post(createQuestion);
questionsRoute.route("/productQuestions/:id").get(getQuestionsByProduct);
questionsRoute.route("/approve/:id").put(updateApprovedStatus);
questionsRoute
  .route("/:id")
  .get(getOneQuestion)
  .put(updateQuestion)
  .delete(deleteQuestion);

module.exports = questionsRoute;
