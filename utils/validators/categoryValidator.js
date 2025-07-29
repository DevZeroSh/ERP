const { check, body, param } = require("express-validator");
const { default: slugify } = require("slugify");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");

exports.createCategoryVlaidator = [
  check("name")
    .notEmpty()
    .withMessage("Category required")
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  // check("description")
  //   .isLength({ min: 9 })
  //   .withMessage("too short category description")
  //   .isLength({ max: 100 })
  //   .withMessage("too long category description"),

  validatorMiddleware,
];

exports.getCategoryValidator = [
  //1- rules
  param("id").isMongoId().withMessage("Invalid category id"),
  //2- use validatorMiddleware in the router
  validatorMiddleware,
];

exports.updateCategoryValidator = [
  param("id").isMongoId().withMessage("Invalid category id"),
  body("name")
    .optional()
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  validatorMiddleware,
];

exports.deleteCategoryValidator = [
  param("id").isMongoId().withMessage("Invalid category id"),
  validatorMiddleware,
];
