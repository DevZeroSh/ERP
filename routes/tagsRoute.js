const express = require("express");
const {
  getTags,
  createTag,
  getTag,
  updateTag,
  deleteTag,
} = require("../services/tagsServices");

const authService = require("../services/authService");
const TagRoute = express.Router();

// authService.allowedTo("tag"),
TagRoute.route("/").get(getTags).post(authService.protect, createTag);

TagRoute.route("/:id")
  .get(getTag)
  .put(authService.protect, updateTag)
  .delete(authService.protect, deleteTag);

module.exports = TagRoute;
