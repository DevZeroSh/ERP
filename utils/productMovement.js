const mongoose = require("mongoose");
const ProductMovementSchema = require("../models/productMovementModel");
const ApiError = require("./apiError");

const createProductMovement = async (
  productId,
  reference,
  newQuantity,
  quantity,
  newPrice,
  oldPrice,
  type,
  movementType,
  source,
  companyId,
  desc,
  newCurrency,
  oldCurrency
) => {


  try {
    const newMovement = new ProductMovementSchema({
      productId,
      reference,
      quantity,
      newQuantity,
      newPrice,
      oldPrice,
      type,
      movementType,
      source,
      desc,
      newCurrency,
      oldCurrency,
      companyId
    });
    const savedMovement = await newMovement.save();

    return savedMovement;
  } catch (error) {
    console.error("Error saving product movement:", error);
    throw new ApiError(
      `Error creating product movement: ${error.message}`,
      500
    );
  }
};

module.exports = { createProductMovement };
