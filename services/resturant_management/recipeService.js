const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const recipeModel = require("../../models/resturant_management/recipeModel");
const UnitSchema = require("../../models/UnitsModel");

// overAllCost

/*exports.getOverAllCost = async function () {
  const Recipe = mongoose.model("Recipe", recipeSchema);
  const recipe = await Recipe.findOne().populate("recipeArray.rawMatrialId");
}*/

// @desc Create Recipe
// @route POST /api/recipe
// @access Private
exports.createRecipe = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  try {
    // Create Recipe with the provided currency
    const recipe = await recipeModel.create(req.body);

    // Respond with success message and created Recipe data
    res.status(201).json({
      status: "true",
      message: "Recipe inserted",
      data: recipe,
    });
  } catch (error) {
    // Handle errors
    console.error(`Error creating Recipe: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
// @desc Get all Recipes
// @route GET /api/recipe
// @access Private
exports.getAllRecipes = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  try {
    // Fetch all Recipes
    const recipes = await recipeModel.find({ companyId }).populate({
      path: "recipeArray.unit",
    });

    // Respond with success message and data
    res.status(200).json({
      status: "true",
      message: "Recipes fetched",
      data: recipes,
    });
  } catch (error) {
    // Handle errors
    console.error(`Error fetching Recipes: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
// @desc Get one Recipe
// @route GET /api/recipe
// @access Private
exports.getOneRecipe = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const recipe = await recipeModel.findOne({ _id: req.params.id, companyId });

    if (!recipe) {
      return res.status(404).json({
        status: false,
        message: "Recipe not found",
      });
    }

    res.status(200).json({
      status: "true",
      message: "Recipe fetched",
      data: recipe,
    });
  } catch (error) {
    console.error(`Error fetching Recipe: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
// @desc Update Recipe
// @route PUT /api/recipe/:id
// @access Private
exports.updateRecipe = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const recipeId = req.params.id;
  const updatedData = req.body;

  try {
    // Find and update the Recipe
    const updatedRecipe = await recipeModel.findOneAndUpdate(
      { _id: recipeId, companyId },
      updatedData,
      { new: true, runValidators: true }
    );

    // If the Recipe is not found
    if (!updatedRecipe) {
      return res.status(404).json({
        status: false,
        message: "Recipe not found",
      });
    }

    // Respond with success message and updated data
    res.status(200).json({
      status: "true",
      message: "Recipe updated",
      data: updatedRecipe,
    });
  } catch (error) {
    // Handle errors
    console.error(`Error updating Recipe: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
// @desc Delete Recipe
// @route DELETE /api/recipe/:id
// @access Private
exports.deleteRecipe = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const recipeId = req.params.id;

  try {
    // Find and delete the Recipe
    const deletedRecipe = await recipeModel.findOneAndDelete({
      _id: recipeId,
      companyId,
    });

    // If the Recipe is not found
    if (!deletedRecipe) {
      return res.status(404).json({
        status: false,
        message: "Recipe not found",
      });
    }

    // Respond with success message
    res.status(200).json({
      status: "true",
      message: "Recipe deleted",
    });
  } catch (error) {
    // Handle errors
    console.error(`Error deleting Recipe: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
