const express = require("express");
const authService = require("../../services/authService");
const {
  getAllPositions,
  createPositions,
  getOnePositions,
  updatePositions,
  deletePositions,
} = require("../../services/Hr/positionsServices");

const positionsRout = express.Router();

positionsRout.route("/").get(getAllPositions).post(createPositions);

positionsRout
  .route("/:id")
  .get(getOnePositions)
  .put(updatePositions)
  .delete(deletePositions);

module.exports = positionsRout;
