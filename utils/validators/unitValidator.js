const { check, body } = require("express-validator");
const { default: slugify } = require("slugify");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");

exports.createUnitValidator = [
  check("name").notEmpty().withMessage("Unit Name reqired"),
  check("code")
  .notEmpty().withMessage("Code reqired"),
  validatorMiddleware,
];
exports.getUnitValidator = [
  check("id").isMongoId().withMessage("invalid ID formate"),
  validatorMiddleware,
];
exports.updataUnitValidator = [
  check("id").isMongoId().withMessage("invalid ID formate"),
  body("name")
    .optional()
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  body("code").optional(),
  validatorMiddleware,
];

exports.deleteUnitValidator = [
  check("id").isMongoId().withMessage("Invalid ID formate"),
  validatorMiddleware,
];
