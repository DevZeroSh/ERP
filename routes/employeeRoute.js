const express = require("express");
const {
  getEmployees,
  createEmployee,
  deleteEmployee,
  getEmployee,
  updateEmployee,
  createEmployeeInPos,
  updateEmployeePassword,
  uploadEmployeeImage,
  resizerEmployeeImage,
  reSendPassword,
} = require("../services/employeeServices");
const {
  createEmployeeValidator,
  updateEmployeeValidator,
  updateNameValidator,
  getEmployeeVlaidator,
  deleteEmployeeVlaidator,
  updatePasswordValidator,
} = require("../utils/validators/employeeValidator");
const authService = require("../services/authService");

const employeeRoute = express.Router();

employeeRoute
  .route("/")
  .get(getEmployees)
  .post(uploadEmployeeImage, resizerEmployeeImage, createEmployee);
employeeRoute.route("/resendpassword/:email").put(authService.protect, reSendPassword);
employeeRoute.route("/create-employee").post(createEmployee);

employeeRoute
  .route("/:id")
  .delete(authService.protect, deleteEmployeeVlaidator, deleteEmployee)
  .get(authService.protect, getEmployeeVlaidator, getEmployee)
  .put(
    authService.protect,
    uploadEmployeeImage,
    resizerEmployeeImage,
    updateEmployee
  );
employeeRoute
  .route("/updateName/:id")
  .put(authService.protect, /*updateNameValidator, */ updateEmployee);
employeeRoute
  .route("/updatePassword/:id")
  .put(authService.protect, updatePasswordValidator, updateEmployeePassword);

module.exports = employeeRoute;
