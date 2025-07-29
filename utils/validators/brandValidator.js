const { check, body } = require("express-validator");
const { default: slugify } = require("slugify");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");

exports.createBrandValidator = [
  check("name").notEmpty().withMessage("product reqired"),
  check("description")
    .optional()
    .isLength({ min: 10 })
    .withMessage("must be at laeast 10 chars")
    .isLength({ max: 100 })
    .withMessage("too long"),
  validatorMiddleware,
];
exports.getBrandValidator = [
  check("id").isMongoId().withMessage("invalid ID formate"),
  validatorMiddleware,
];
exports.updataBrandValidator = [
  check("id").isMongoId().withMessage("invalid ID formate"),
  body("name")
    .optional()
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  validatorMiddleware,
];

exports.deleteBrandValidator = [
  check("id").isMongoId().withMessage("Invalid ID formate"),
  validatorMiddleware,
];
