const productQuestionsModel = require("../../models/ecommerce/productQuestionsModel");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");

function padZero(value) {
  return value < 10 ? `0${value}` : value;
}

const getFormattedDateTime = () => {
  const now = new Date();
  return `${now.getFullYear()}-${padZero(now.getMonth() + 1)}-${padZero(
    now.getDate()
  )} ${padZero(now.getHours())}:${padZero(now.getMinutes())}:${padZero(
    now.getSeconds()
  )}`;
};

//@desc Get list of questions
//@route GET /api/questions
//@accsess Public
exports.getQuestions = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const questions = await productQuestionsModel
    .find({ companyId })
    .populate("product")
    .populate({ path: "customar", select: "name" });
  res
    .status(200)
    .json({ status: "success", results: questions.length, data: questions });
});

//@desc Get one question
//@route GET /api/questions/:id
//@accsess Public
exports.getOneQuestion = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  const { id } = req.params;
  if (!id) {
    return next(new ApiError(`No question found for this ID: ${id}`, 404));
  }

  const productQuestions = await productQuestionsModel
    .findOne({ _id: id, companyId })
    .populate("product")
    .populate({ path: "customar", select: "name" });

  res.status(200).json({
    status: "success",
    results: productQuestions.length,
    data: productQuestions,
  });
});

//@desc Create a question
//@route POST /api/questions
//@accsess Private
exports.createQuestion = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  try {
    const productQuestion = await productQuestionsModel.create({
      ...req.body,
      updateTime: getFormattedDateTime(),
    });

    res.status(200).json({ status: "success", data: productQuestion });
  } catch (error) {
    next(error);
  }
});

//@desc Answer a question
//@route PUT /api/questions/productQuestions/:id
//@accsess Private
exports.updateQuestion = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const productQuestion = await productQuestionsModel.findByIdAndUpdate(
    { _id: req.params.id, companyId },
    { ...req.body, updateTime: getFormattedDateTime() },
    {
      new: true,
    }
  );
  if (!productQuestion) {
    return res.status(200).json({ status: "noQuestions" });
  }
  res.status(200).json({
    status: "success",
    data: productQuestion,
  });
});

//@desc Update approved status
//@route PUT /api/questions/approve/:id
//@accsess Private
exports.updateApprovedStatus = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  const { approved } = req.body;

  const productQuestion = await productQuestionsModel.findOneAndUpdate(
    { _id: req.params.id, companyId },
    { approved, updateTime: getFormattedDateTime() },
    {
      new: true,
    }
  );

  if (!productQuestion) {
    return res.status(200).json({ status: "noQuestions" });
  }

  res.status(200).json({ status: "success" });
});

//@desc Delete a question
//@route DELETE /api/questions/:id
//@accsess Private
exports.deleteQuestion = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  if (!id) {
    return next(new ApiError(`You need to pass an ID`, 400));
  }

  const productQuestion = await productQuestionsModel.findOneAndDelete({
    _id: id,
    companyId,
  });

  if (!productQuestion) {
    return res.status(200).json({ status: "noQuestions" });
  }

  res.status(200).json({ status: "success", message: "Question Deleted" });
});

//@desc Get all questions for a product
//@route GET /api/questions/productQuestions/:id
//@accsess Public
exports.getQuestionsByProduct = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  const pageSize = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const { id } = req.params;

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  let productId = id;

  if (!isObjectId) {
    const product = await productModel.findOne({ slug: id }).select("_id");
    if (!product) {
      throw new Error("Product not found");
    }
    productId = product._id;
  }

  let query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id, companyId }
    : { slug: id, companyId };

  // Determine the sort order based on the query parameter
  const sortOrder = req.query.sort === "desc" ? -1 : 1;

  // Fetch the total number of questions for this product
  const totalItems = await productQuestionsModel.countDocuments({
    product: productId,
    companyId,
  });

  // Calculate the total number of pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Fetch the questions with pagination and sorting
  const questions = await productQuestionsModel
    .find({ product: productId, companyId })
    .populate({ path: "customar" })
    .sort({ updateTime: sortOrder })
    .skip(skip)
    .limit(pageSize);

  // If no questions exist, return only the product details
  const product = await productModel.findOne(query).populate("category brand");
  if (questions.length === 0) {
    if (!product) {
      return res.status(404).json({
        status: "fail",
        message: `No product found with ID: ${id}`,
      });
    }

    return res.status(200).json({
      status: "noQuestions",
      results: 0,
      Pages: totalPages,
      product,
    });
  }

  // Return the paginated questions with pagination info
  res.status(200).json({
    status: "success",
    results: questions.length,
    Pages: totalPages,
    data: questions,
    product,
  });
});
