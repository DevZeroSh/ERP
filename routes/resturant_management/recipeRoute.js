const express = require("express");
const authService = require("../../services/authService");
const {
  createRecipe,
  updateRecipe,
  getAllRecipes,
  getOneRecipe,
  deleteRecipe,
  
} = require("../../services/resturant_management/recipeService");

const router = express.Router();
router.use(authService.protect);

router.route("/").get(getAllRecipes).post(createRecipe);
router.route("/:id").get(getOneRecipe).put(updateRecipe).delete(deleteRecipe);

module.exports = router;
