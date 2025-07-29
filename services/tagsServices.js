const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { default: slugify } = require("slugify");
const TagModel = require("../models/tagModel");

// @desc Get list of tags
// @route GET /api/tags
// @accsess public
exports.getTags = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const Tag = await TagModel.find({ companyId }).lean();
  res.status(200).json({ status: true, results: Tag.length, data: Tag });
});

// @desc Create tag
// @route POST /api/tags
// @access Private
exports.createTag = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  if (req.body.parentTag == 0) {
    req.body.parentTag = null;
  }

  req.body.slug = slugify(req.body.tagName);

  const Tag = await TagModel.create(req.body);

  if (req.body.parentTag) {
    await TagModel.findOneAndUpdate(
      { _id: req.body.parentTag, companyId },
      {
        $push: { children: Tag._id },
      }
    );
  }
  res
    .status(200)
    .json({ status: "success", message: "Tag inserted", data: Tag });
});

// @desc Get specific tag by ID
// @route GET /api/tags/:id
// @access Public
exports.getTag = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const Tag = await TagModel.findOne({ _id: id, companyId });
  if (!Tag) {
    return next(new ApiError(`No Tag for this ID: ${id}`, 404));
  }
  res.status(200).json({ status: true, data: Tag });
});

// @desc Update specific tag
// @route PUT /api/tags/:id
// @access Private
exports.updateTag = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const oldTag = await TagModel.findOne({ _id: req.params.id, companyId });
  if (!oldTag) {
    return next(new ApiError(`No Tag for this ID ${req.params.id}`, 404));
  }

  const oldParentId = oldTag.parentTag?.toString();
  const newParentId = req.body.parentTag?.toString();

  const updatedTag = await TagModel.findOneAndUpdate(
    { _id: req.params.id, companyId },
    req.body,
    {
      new: true,
    }
  );

  if (oldParentId !== newParentId) {
    if (oldParentId) {
      await TagModel.findOneAndUpdate(
        { _id: oldParentId, companyId },
        {
          $pull: { children: updatedTag._id },
        }
      );
    }

    if (newParentId) {
      await TagModel.findOneAndUpdate(
        { _id: newParentId, companyId },
        {
          $addToSet: { children: updatedTag._id },
        }
      );
    }
  }

  res
    .status(200)
    .json({ status: true, message: "Tag updated", data: updatedTag });
});

// @desc Delete specific tag
// @route DELETE /api/tags/:id
// @access Private
exports.deleteTag = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;

  // Find the tag by ID
  const tag = await TagModel.findOne({ _id: id, companyId });
  if (!tag) {
    return next(new ApiError(`No tag found for this ID ${id}`, 404));
  }

  // Check if the tag has children
  if (tag.children.length > 0) {
    return next(
      new ApiError(
        `Tag has children. Please delete the children before deleting this tag.`,
        400
      )
    );
  }

  // Remove the tag from its parent's children array, if it has a parent
  if (tag.parentTag) {
    await TagModel.findOneAndUpdate(
      { _id: tag.parentTag, companyId },
      {
        $pull: { children: id },
      }
    );
  }

  // Delete the tag
  await TagModel.findOneAndDelete({ _id: id, companyId });

  res.status(200).json({
    status: true,
    message: "Tag deleted successfully",
  });
});
