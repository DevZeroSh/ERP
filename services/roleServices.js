const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const rolesModel = require("../models/roleModel");
const roleDashboardSchema = require("../models/roleDashboardModel");

//@desc Get list of Role
//@route GEt  /api/role
//@accsess Private
exports.getRoles = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const role = await rolesModel
    .find({ companyId })
    .populate({ path: "rolesDashboard", select: "title _id" });
  res.status(200).json({ status: "true", data: role });
});

//@desc Create Role
//@route Post /api/role
//@access Private
exports.createRole = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  req.body.companyId = companyId;
  const role = await rolesModel.create(req.body);
  res
    .status(200)
    .json({ status: "true", message: "Role Inserted", data: role });
});

//@desc Get specific Role by id
//@route Get /api/role/:id
//@access Private
exports.getRole = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const role = await rolesModel
    .findById({ _id: req.params.id, companyId })
    .populate({ path: "rolesDashboard", select: "title _id" });
  if (!role) {
    return next(new ApiError(`No Role for this id ${id}`, 404));
  }
  res.status(201).json({ status: "true", data: role });
});

//@desc update specific Role by id
//@route Put /api/role/:id
//@access Private
exports.updataRole = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const role = await rolesModel.findOneAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
    }
  );

  if (!role) {
    return next(new ApiError(`No Role for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", message: "Role updated", data: role });
});

//@desc Delete specific Role
//@rout Delete /api/role/:id
//@access priveta
exports.deleteRole = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const role = await rolesModel.findByIdAndDelete({ _id: id, companyId });
  if (!role) {
    return next(new ApiError(`No Role for this id ${id}`, 404));
  }

  res.status(200).json({ status: "true", message: "Role Deleted" });
});
