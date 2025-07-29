const offerSchema = require("../models/offersModel");
const { default: mongoose } = require("mongoose");
const ProductModel = require("../models/productModel");
const cron = require("node-cron");
const categorySchema = require("../models/CategoryModel");
const asyncHandler = require("express-async-handler");
const multer = require("multer");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const getAllChildCategories = require("../utils/CategoriesChild");
const currencySchema = require("../models/currencyModel");
// @desc find the categors and what have a subCategor

const multerStorage = multer.memoryStorage();

const multerFilter = function (req, file, cb) {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError("Only images allowed", 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadOfferImages = upload.fields([
  { name: "imageAr", maxCount: 1 },
  { name: "imageTr", maxCount: 1 },
]);

exports.resizeOfferImages = asyncHandler(async (req, res, next) => {
  if (req.files) {
    if (req.files.imageAr) {
      const filenameAr = `offer-${uuidv4()}-${Date.now()}-ar.png`;
      await sharp(req.files.imageAr[0].buffer)
        .toFormat("png")
        .png({ quality: 70 })
        .toFile(`uploads/offers/${filenameAr}`);

      req.body.imageAr = filenameAr;
    }

    if (req.files.imageTr) {
      const filenameTr = `offer-${uuidv4()}-${Date.now()}-tr.png`;
      await sharp(req.files.imageTr[0].buffer)
        .toFormat("png")
        .png({ quality: 70 })
        .toFile(`uploads/offers/${filenameTr}`);

      req.body.imageTr = filenameTr;
    }
  }

  next();
});

const setImageURL = (doc) => {
  if (doc.imageTr) {
    const imageUrlTr = `${process.env.BASE_URL}/offers/${doc.imageTr}`;
    doc.imageTr = imageUrlTr;
  }
  if (doc.imageAr) {
    const imageUrlAr = `${process.env.BASE_URL}/offers/${doc.imageAr}`;
    doc.imageAr = imageUrlAr;
  }
};

// @desc Post Create Offer
// @route Get /api/offer
// @accsess privet
exports.createOffer = async (req, res) => {
  try {
    const offerData = req.body;
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    offerData.companyId = companyId;

    // CASE 1: Category offer
    if (Array.isArray(offerData.cat) && offerData.cat.length > 0) {
      const allCategories = await getAllChildCategories(
        offerData.cat,
        companyId,
        categorySchema
      );

      const products = await ProductModel.find({
        category: { $in: allCategories },
        companyId,
      });

      offerData.applicableProducts = products.map((p) => p._id.toString());
    }

    // CASE 2: Brand offer
    else if (offerData.brand) {
      const products = await ProductModel.find({
        brand: offerData.brand,
        companyId,
      });

      offerData.applicableProducts = products.map((p) => p._id.toString());
    }

    // CASE 3: One product offer
    else if (offerData.oneProduct) {
      await ProductModel.findOneAndUpdate(
        { _id: offerData.oneProduct, companyId },
        {
          haveGift: false,
          soldToWinGift: offerData.soldToWinGift,
        }
      );

      offerData.applicableProducts = [offerData.oneProduct];
      offerData.soldCountToWin = offerData.soldToWinGift;
      offerData.type = "oneProduct";
    }

    // CASE 4: Manual applicableProducts
    else if (Array.isArray(offerData.applicableProducts)) {
      const products = await ProductModel.find({
        _id: { $in: offerData.applicableProducts },
        companyId,
      });

      offerData.applicableProducts = products.map((p) => p._id.toString());
    } else {
      return res.status(400).json({ message: "No valid product selection" });
    }

    // Create offer
    const offer = new Offer(offerData);
    await offer.save();

    res.status(200).json({ status: "success", data: offer });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal server error" });
  }
};

// Function to update offer status for a specific database
// const updateOfferStatusForDatabase = async (companyId) => {

//   try {
//     const currentDate = new Date();
//     const currentHour = new Date(
//       currentDate.getFullYear(),
//       currentDate.getMonth(),
//       currentDate.getDate(),
//       currentDate.getHours() + 3,
//       0,
//       0,
//       0
//     );

//     // Find offers that end or start at the current hour
//     const offersEndDate = await offerSchema.find({ endDate: currentHour, companyId });
//     const offersStartDate = await offerSchema.find({
//       startDate: currentHour,
//       companyId,
//     });

//     if (offersEndDate.length > 0) {
//       for (const offer of offersEndDate) {
//         // Deactivate the offer
//         if (offer.type === "poss") {
//           offer.isActive = false;
//           await offer.save();

//           // Update price in products
//           await Product.updateMany(
//             { _id: { $in: offer.applicableProducts }, companyId },
//             { $set: { priceAftereDiscount: 0 } }
//           );
//         } else if (offer.type === "oneProduct") {
//           offer.isActive = false;
//           await offer.save();
//           await Product.updateMany(
//             { _id: { $in: offer.applicableProducts }, companyId },
//             { $set: { haveGift: false, soldToWinGift: null } }
//           );
//         }
//       }
//     }

//     if (offersStartDate.length > 0) {
//       for (const offer of offersStartDate) {
//         // Activate the offer
//         offer.isActive = true;
//         await offer.save();

//         // Update price in products
//         if (offer.type === "poss") {
//           await Product.updateMany(
//             { _id: { $in: offer.applicableProducts }, companyId },
//             [
//               {
//                 $set: {
//                   priceAftereDiscount: {
//                     $multiply: [
//                       "$taxPrice",
//                       {
//                         $subtract: [
//                           1,
//                           { $divide: [offer.discountPercentage, 100] },
//                         ],
//                       },
//                     ],
//                   },
//                 },
//               },
//             ]
//           );
//         } else if (offer.type === "oneProduct") {
//           await Product.updateMany(
//             {
//               _id: {
//                 $in: offer.applicableProducts,
//               },
//               companyId,
//             },
//             [
//               {
//                 $set: {
//                   haveGift: true,
//                   soldToWinGift: offer.soldCountToWin,
//                 },
//               },
//             ]
//           );
//         } else {
//           await Product.updateMany(
//             { _id: { $in: offer.applicableProducts }, companyId },
//             [
//               {
//                 $set: {
//                   ecommercePriceAftereDiscount: {
//                     $multiply: [
//                       "$ecommercePrice",
//                       {
//                         $subtract: [
//                           1,
//                           { $divide: [offer.discountPercentage, 100] },
//                         ],
//                       },
//                     ],
//                   },
//                 },
//               },
//             ]
//           );
//         }
//       }
//     }
//   } catch (error) {
//     console.error(
//       `Failed to update offer status in database ${databaseName}:`,
//       error
//     );
//   }
// };

// cron.schedule("0 * * * *", async () => {
//   console.log("Running offer status update task for all databases...");


//   for (const dbName of subscriberDatabases) {
//     await updateOfferStatusForDatabase(dbName);
//   }
// });

exports.updateOffer = async (req, res) => {
  const offerId = req.params.id;
  const updateData = req.body;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const updatedOffer = await offerSchema.findOneAndUpdate(
      { _id: offerId, companyId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedOffer) {
      return res.status(404).send({ error: "Offer not found" });
    }
    res.status(200).json({ status: "success", data: updatedOffer });
  } catch (error) {
    res.status(500).send({ error: "Failed to update offer" });
  }
};

exports.deleteOffer = async (req, res) => {
  const offerId = req.params.id;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const offer = await offerSchema.findOneAndDelete({
      _id: offerId,
      companyId,
    });
    const products = await ProductModel.find({
      _id: { $in: offer.applicableProducts },
      companyId,
    });
    for (const product of products) {
      product.priceAftereDiscount = 0;
      await product.save();
    }
    if (!offer) {
      return res.status(404).send({ error: "Offer not found" });
    }

    res.send({ message: "Offer deleted successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

exports.getOffer = async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  try {
    // Use the specified database
    const pageSize = 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * pageSize;
    const Offer = db.model("Offer", offerSchema);

    // Get total count of documents for pagination
    const totalItems = await Offer.countDocuments({ companyId });

    // Apply pagination to the query
    const offers = await offerSchema
      .find({ companyId })
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    // Set image URLs for each offer
    offers.forEach(setImageURL);

    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).json({
      status: "success",
      pages: totalPages,
      results: offers.length,
      data: offers,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

exports.getOneOffer = async (req, res) => {
  const offerId = req.params.id;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const offer = await offerSchema
      .findOne({ _id: offerId, companyId })
      .populate("applicableProducts");

    if (!offer) {
      return res.status(404).send({ error: "Offer not found" });
    }
    if (offer.imageAr) setImageURL(offer?.imageAr);
    if (offer.imageTr) setImageURL(offer?.imageTr);
    res.status(200).json({ status: "success", data: offer });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

exports.getOneOfferByProduct = async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const productId = req.params.id; // Replace this with your dynamic ID if necessary

  try {
    const findOffer = await offerSchema
      .findOne({
        applicableProducts: new mongoose.Types.ObjectId(productId),
        companyId,
      })
      .populate("winProduct")
      .populate({
        path: "winProduct",
        populate: { path: "currency" },
      });

    res.status(200).json({ success: true, data: findOffer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error finding offer" });
  }
};
