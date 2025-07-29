const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const UserModel = require("../../models/ecommerce/E_user_Modal");
const { Search } = require("../../utils/search");
const bcrypt = require("bcrypt");
const createToken = require("../../utils/createToken");
const ApiError = require("../../utils/apiError");
// Create New customer
exports.createUser = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  try {
    const user = await UserModel.create(req.body);
    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});
//Get All Users
exports.getUsers = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const pageSize = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = { companyId: companyId };
  if (req.query.keyword) {
    query.$or = [{ name: { $regex: req.query.keyword, $options: "i" } }];
  }
  const totalItems = await UserModel.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);
  const users = await UserModel.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);
  res.status(200).json({
    status: "true",
    totalPages: totalPages,
    results: totalItems,
    data: users,
  });
});

//Get One user

exports.getOneUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const user = await UserModel.findOne({ _id: id, companyId });

  if (!user) {
    return next(new ApiError(`There is no customar with this id ${id}`, 404));
  } else {
    res.status(200).json({ status: "true", data: user });
  }
});

// Update user
exports.updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  const user = await UserModel.findOne({ _id: id, companyId });
  if (!user) {
    return next(new ApiError(`There is no customer with this id: ${id}`, 404));
  } else {
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: id, companyId },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    res.status(200).json({
      success: true,
      message: "Customer updated",
      data: updatedUser,
    });
  }
});
// updat user Password
exports.updateUserPassword = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  // Update user password based on user payload (req.user._id)
  const user = await UserModel.findOneAndUpdate(
    { _id: req.user._id, companyId },
    {
      password: await bcrypt.hash(req.body.newPassword, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );

  if (!user) {
    return new ApiError("User not found", 404);
  }

  // Generate Token
  const token = createToken(user._id);
  user.password = undefined;
  res.status(200).json({ data: user, token });
});
// Delete user
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const user = await UserModel.findOneAndDelete({ _id: id, companyId });

  if (!user) {
    return next(new ApiError(`There is no user with this id ${id}`, 404));
  } else {
    res.status(200).json({ status: "true", message: "User Deleted" });
  }
});
