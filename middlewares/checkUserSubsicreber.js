const axios = require("axios");
const ApiError = require("../utils/apiError");
const employeeModel = require("../models/employeeModel");

const checkUserSubsicreber = async (req, res, next) => {
  try {
    const response = await employeeModel.findOne({ email: req.body.email });

    if (response.active) {
      let userSubscriptions = response.company;

      if (!userSubscriptions || userSubscriptions.length === 0) {
        return next(new ApiError("User has no subscriptions", 401));
      }

      if (response.company.length > 1) {
        res.status(200).json({ status: "true", company: response.company });
      } else {
        req.query = {
          ...req.query,
          companyId: response.company[0]._id,
        };

        res.status(200).json({ status: "true", company: response.company });
      }
    } else {
      return next(new ApiError("authService.js", 401));
    }
  } catch (error) {
    res
      .status(500)
      .json({ status: "false", error: `Internal Server Error ${error}` });
  }
};

module.exports = { checkUserSubsicreber };
