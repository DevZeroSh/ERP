const { check, body, param } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");

const mongoose = require("mongoose");
const customarSchema = require("../../models/customarModel");
//validator for create one customar
exports.createCustomarVlaidator = [
    check("name")
        .notEmpty()
        .withMessage("The name can not be empty")
        .isLength({ min: 3 })
        .withMessage("The name is too short")
        .isLength({ max: 30 })
        .withMessage("The name is too long"),
    check("phoneNumber").optional().isMobilePhone(["tr-TR"]).withMessage("Invalid phone number Only accepted turkey phone numbers"),
    check("email")
        .optional()
        .custom(async (val, { req }) => {
            const dbName = req.query.databaseName;
            const db = mongoose.connection.useDb(dbName);
            const customarsModel = db.model("Customar", customarSchema);
            customarsModel.findOne({ email: val }).then((customar) => {
                if (customar) {
                    return Promise.reject(new Error("Email already in customar"));
                }
            });
        }),

    validatorMiddleware,
];

//Validator for update an customar
exports.updataCustomarVlaidator = [
    param("id").isMongoId().withMessage("Invalid customar id"),
    check("name")
        .optional()
        .notEmpty()
        .withMessage("The name can not be empty")
        .isLength({ min: 3 })
        .withMessage("The name is too short")
        .isLength({ max: 30 })
        .withMessage("The name is too long"),
    check("phoneNumber").optional().isMobilePhone(["tr-TR"]).withMessage("Invalid phone number Only accepted turkey phone numbers"),
    body("email")
        .optional()
        .custom(async (val, { req }) => {
            const dbName = req.query.databaseName;
            const db = mongoose.connection.useDb(dbName);
            const customarsModel = db.model("Customar", customarSchema);
            customarsModel.findOne({ email: val, _id: { $ne: req.params.id } }).then((customar) => {
                if (customar) {
                    return Promise.reject(new Error("Email already in customar"));
                }
            });
        }),
    // check("phoneNumber")
    //     .optional()
    //     .isMobilePhone(["tr-TR"])
    //     .withMessage("Invalid phone number Only accepted turkey phone numbers"),
    // body("email")
    //     .optional()
    //     .custom((val,{req}) => Customar.findOne({ email: val, _id: { $ne: req.params.id }}).then((customar) => {

    //         if (customar) {
    //           return Promise.reject(new Error("Email already in customar"));
    //         }
    //     })
    //     ),

    validatorMiddleware,
];

//Validator to id when get one customar
exports.getCustomarVlaidator = [check("id").isMongoId().withMessage("Invalid customar id"), validatorMiddleware];

//Validator to id when delete an customar
exports.deleteCustomarVlaidator = [check("id").isMongoId().withMessage("Invalid customar id"), validatorMiddleware];
