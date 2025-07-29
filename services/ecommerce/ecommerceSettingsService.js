const asyncHandler = require("express-async-handler");
const sharp = require("sharp");
const { default: mongoose } = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const ApiError = require("../../utils/apiError");
const multer = require("multer");
const ecommerceSettingsModel = require("../../models/ecommerce/ecommerceSettingsModel");

// Multer options setup
const multerOptions = () => {
  const multerStorage = multer.memoryStorage();
  const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new Error("Only images allowed"), false);
    }
  };
  return multer({ storage: multerStorage, fileFilter: multerFilter });
};

const upload = multerOptions().any(); // Accept all fields

// Middleware to handle file uploads and resizing
exports.uploadSliderImages = upload;

// ############## Slider section start
exports.resizeSliderImages = asyncHandler(async (req, res, next) => {
  if (req.files && req.files.length > 0) {
    req.body.slider = req.body.slider || [];

    for (let key in req.body) {
      if (key.startsWith("slider[") && key.endsWith("]name")) {
        const match = key.match(/slider\[(\d+)\]name/);
        if (match) {
          const sliderIndex = parseInt(match[1]);
          req.body.slider[sliderIndex] = req.body.slider[sliderIndex] || {
            images: [],
          };
          req.body.slider[sliderIndex].name = req.body[key];
        }
      }
    }

    await Promise.all(
      req.files.map(async (file) => {
        const imageName = `slider-${uuidv4()}-${Date.now()}.png`;

        await sharp(file.buffer)
          .toFormat("png")
          .png({ quality: 70 })
          .toFile(`uploads/slider/${imageName}`);

        const fieldName = file.fieldname;
        const match = fieldName.match(/slider\[(\d+)\]\[(\d+)\]images/);
        if (match) {
          const sliderIndex = parseInt(match[1]);
          req.body.slider[sliderIndex] = req.body.slider[sliderIndex] || {
            images: [],
          };
          req.body.slider[sliderIndex].images.push(imageName);
        } else {
          console.log("No match for fieldname:", fieldName);
        }
      })
    );
  } else {
    console.log("No files received");
  }
  next();
});

exports.getSlider = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const settings = await ecommerceSettingsModel.findOne(
    { companyId },
    "slider"
  );
  res.status(200).json({ status: "success", data: settings.slider });
});

exports.updataSlider = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  const existingSettings = await ecommerceSettingsModel.findOne({ companyId });

  if (!existingSettings) {
    return res
      .status(404)
      .json({ status: "fail", message: "Settings not found" });
  }

  const updatedSliders = existingSettings.slider.map((slider, index) => {
    if (index === parseInt(req.body.sliderIndex)) {
      return { ...slider, ...req.body.slider[index] };
    }
    return slider;
  });

  existingSettings.slider = updatedSliders;

  const updatedSettings = await existingSettings.save();
  res.status(200).json({ status: "success", data: updatedSettings.slider });
});

// ############## Page section start
exports.getPage = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const settings = await ecommerceSettingsModel.findOne({ companyId }, "page");
  res.status(200).json({ status: "success", data: settings });
});

exports.getOnePage = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  // Fetch the document containing the page array
  const settings = await ecommerceSettingsModel.find({ companyId });
  if (!settings) {
    return next(new ApiError(`There is no page with this id ${id}`, 404));
  }

  // Extract the specific page using its ID
  const page = settings[0].page.find((p) => p._id.toString() == id);
  if (!page) {
    return next(new ApiError(`Page not found with id ${id}`, 404));
  }

  res.status(200).json({
    status: "true",
    data: page,
  });
});

exports.updatePage = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const { id } = req.params;

  // Find the document containing the page array and update the specific page by its ID
  const updatedSettings = await ecommerceSettingsModel.findOneAndUpdate(
    { "page._id": id, companyId },
    {
      $set: {
        "page.$": req.body,
      },
    },
    { new: true }
  );

  if (!updatedSettings) {
    return next(new ApiError(`Page with id ${id} not found`, 404));
  }

  // Return the updated page object
  const updatedPage = updatedSettings.page.id(id);

  res.status(200).json({
    status: "success",
    data: updatedPage,
  });
});

// ############## Contact Us section start
exports.getContactUs = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const settings = await ecommerceSettingsModel.findOne(
    { companyId },
    "contactUs"
  );
  res.status(200).json({ status: "success", data: settings.contactUs });
});

exports.updateContactUs = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const updatedSettings = await ecommerceSettingsModel.findOneAndUpdate(
    { companyId },
    { contactUs: req.body, companyId },
    { new: true }
  );
  res.status(200).json({ status: "success", data: updatedSettings.contactUs });
});
