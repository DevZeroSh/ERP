const { check, body } = require("express-validator");
const { default: slugify } = require("slugify");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");

exports.craeteProductValidator = [
  check("name")
    .isLength({ min: 3 })
    .withMessage("must be at laeast 3 chars")
    .notEmpty()
    .withMessage("Product required"),

  check("description").optional(),

  check("sold")
    .optional()
    .isNumeric()
    .withMessage("prodcut quantity mut be a number"),

  check("price")
    .notEmpty()
    .withMessage("product price is reqired")
    .isNumeric()
    .withMessage("product price is required")
    .isFloat(),
  check("priceAftereDiscount")
    .optional()
    .isNumeric()
    .withMessage("Product priceAftereDiscount must be a number")
    .isFloat()
    .custom((value, { req }) => {
      if (req.body.price <= value) {
        throw new Error("priceAftereDiscount must be lower than price");
      }
      return true;
    }),
  check("qr").notEmpty().withMessage("Qr is required"),
  validatorMiddleware,
];
exports.getProdictValidator = [
  check("id").isMongoId().withMessage("invalid ID formate"),
  validatorMiddleware,
];

exports.updateProductValidator = [
  check("id").isMongoId().withMessage("Invalid Id formate"),
  body("name")
    .optional()
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  validatorMiddleware,
];

exports.deleteProductValdiator = [
  check("id").isMongoId().withMessage("Invalid ID formate"),
  validatorMiddleware,
];
