const asyncHandler = require("express-async-handler");
const silderSchema = require("../../models/ecommerce/sliderModel");
const { default: mongoose } = require("mongoose");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const ApiError = require("../../utils/apiError");
const multer = require("multer");

const multerOptions = () => {
  const multerStorage = multer.memoryStorage();

  const multerFilter = function (req, file, cb) {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new ApiError("Only images Allowed", 400), false);
    }
  };

  const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

  return upload;
};

const uploadMixOfImages = (arrayOfFilelds) =>
  multerOptions().fields(arrayOfFilelds);

exports.uploadSliderImages = uploadMixOfImages([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 5 },
]);

exports.resizeSliderImages = asyncHandler(async (req, res, next) => {
  if (req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (img, index) => {
        const imagesName = `slider-${uuidv4()}-${Date.now()}-${index + 1}.png`;
        await sharp(img.buffer)
          .toFormat("png")
          .png({ quality: 70 })
          .toFile(`uploads/sldier/${imagesName}`);

        //save image into our db
        req.body.images.push(imagesName);
      })
    );
  }
  next();
});

exports.getSliders = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const sliders = await sliderModel.find({ companyId });
  res
    .status(200)
    .json({ status: "success", results: sliders.length, data: sliders });
});

exports.createSlider = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const slider = await sliderModel.create(req.body);
  res.status(201).json({ status: "success", data: slider });
});

exports.getOneSlider = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;

  const sliders = await sliderModel.findOne({ _id: id, companyId });

  if (!sliders) {
    return next(new ApiError(`No sliders found for id ${id}`, 404));
  }
  res.status(200).json({ status: "success", data: sliders });
});

exports.updataSlider = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const sliders = await sliderModel.findOneAndUpdate(
    { _id: req.params.id, companyId },
    req.body,
    {
      new: true,
    }
  );

  if (!sliders) {
    return next(new ApiError(`No sliders found for id ${id}`, 404));
  }
  res.status(200).json({ status: "success", data: sliders });
});

exports.deleteSlider = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;

  const sliders = await sliderModel.findOneAndDelete({ id, companyId });

  if (!sliders) {
    return next(new ApiError(`No sliders found for id ${id}`, 404));
  }
  res.status(200).json({ status: "success", message: "Slider Deleted" });
});
