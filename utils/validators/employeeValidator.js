const bcrypt = require("bcryptjs");
const { check, body, param } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const emoloyeeShcema = require("../../models/employeeModel");
const mongoose = require("mongoose");
const ApiError = require("../apiError");

//Validator for adding an employee
exports.createEmployeeValidator = [
  check("email")
    .notEmpty()
    .withMessage("The email can not be empty")
    .isEmail()
    .withMessage("Invalid email address")

    .custom(async (val, { req }) => {
      const dbName = req.query.databaseName;
      const db = mongoose.connection.useDb(dbName);
      var employeeModel = db.model("Employee", emoloyeeShcema);
      employeeModel.findOne({ email: val }).then((employee) => {
        if (employee) {
          return Promise.reject(new Error("Email already in employee"));
        }
      });
    }),
  check("selectedRoles").custom((value) => {
    // Check if value is an array
    if (value.length === 0) {
      return Promise.reject(new Error("You have to select a rol"));
    }
    return true;
  }),

  validatorMiddleware,
];

//Validator for adding an employee
exports.updateEmployeeValidator = [
  param("id").isMongoId().withMessage("Invalid employee id"),
  check("name")
    .notEmpty()
    .withMessage("The name can not be empty")
    .isLength({ min: 3 })
    .withMessage("The Name is too short")
    .isLength({ max: 30 })
    .withMessage("The name is too long"),
  check("email")
    .notEmpty()
    .withMessage("The email can not be empty")
    .isEmail()
    .withMessage("Invalid email address")

    .custom(async (val, { req }) => {
      const dbName = req.query.databaseName;
      const db = mongoose.connection.useDb(dbName);
      var employeeModel = db.model("Employee", emoloyeeShcema);
      employeeModel
        .findOne({ email: val, _id: { $ne: req.params.id } })
        .then((employee) => {
          if (employee) {
            return Promise.reject(new Error("Email already in employee"));
          }
        });
    }),
  check("selectedRoles").custom((value) => {
    // Check if value is an array
    if (!Array.isArray(value)) {
      return Promise.reject(new Error("There is an error in role"));
    } else if (value.length === 0) {
      return Promise.reject(new Error("You have to select a rol"));
    }
    return true;
  }),

  validatorMiddleware,
];

exports.updateNameValidator = [
  param("id").isMongoId().withMessage("Invalid employee id"),
  check("name")
    .notEmpty()
    .withMessage("The name can not be empty")
    .isLength({ min: 3 })
    .withMessage("The Name is too short")
    .isLength({ max: 30 })
    .withMessage("The name is too long"),
  validatorMiddleware,
];

exports.updatePasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("You must enter your current password"),
  body("passwordConfirm")
    .notEmpty()
    .withMessage("Please enter the password confirmation"),
  body("newPassword")
    .notEmpty()
    .withMessage("Please enter the new password")
    .custom(async (newPass, { req }) => {
      const dbName = req.query.databaseName;
      const db = mongoose.connection.useDb(dbName);
      var employeeModel = db.model("Employee", emoloyeeShcema);
      //1- Verify current password
      const user = await employeeModel.findById(req.user._id);
      if (!user) {
        throw new ApiError("There's no user for this ID", 404);
      }
      const isCorrectPassword = await bcrypt.compare(
        req.body.currentPassword,
        user.password
      );
      if (!isCorrectPassword) {
        throw new ApiError("Your current password is incorrect", 401);
      }
      //2- Verify password confirmation
      if (newPass !== req.body.passwordConfirm) {
        throw new ApiError("Your password confirmation is incorrect", 401);
      }
      return true;
    }),
  validatorMiddleware,
];

//Validator to id when get one Employee
exports.getEmployeeVlaidator = [
  check("id").isMongoId().withMessage("Invalid employee id"),
  validatorMiddleware,
];

//Validator to id when delete an Employee
exports.deleteEmployeeVlaidator = [
  check("id").isMongoId().withMessage("Invalid employee id"),
  validatorMiddleware,
];
