const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const generatePassword = require("../utils/tools/generatePassword");
const { getDashboardRoles } = require("./roleDashboardServices");
const axios = require("axios");
const rolesModel = require("../models/roleModel");
const employeeModel = require("../models/employeeModel");
//Tools
const sendEmail = require("../utils/sendEmail");
const isEmail = require("../utils/tools/isEmail");
const createToken = require("../utils/createToken");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const CompanyInfnoModel = require("../models/companyInfoModel");

const multerStorage = multer.memoryStorage();

const multerFilter = function (req, file, cb) {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError("Only images Allowed", 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadEmployeeImage = upload.single("image");

exports.resizerEmployeeImage = asyncHandler(async (req, res, next) => {
  const filename = `image-${uuidv4()}-${Date.now()}.png`;

  if (req.file) {
    await sharp(req.file.buffer)
      .toFormat("webp")
      .png({ quality: 50 })
      .toFile(`uploads/Image/${filename}`);

    //save image into our db
    req.body.image = filename;
  }

  next();
});

//@desc Get list of employee
// @rout Get /api/user
// @access private
exports.getEmployees = asyncHandler(async (req, res) => {
  try {
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const pageSize = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * pageSize;
    let query = { companyId };
    if (req.query.keyword) {
      query.$or = [
        { email: { $regex: req.query.keyword, $options: "i" } },
        { name: { $regex: req.query.keyword, $options: "i" } },
      ];
    }
    const totalItems = await employeeModel.countDocuments(query);

    const totalPages = Math.ceil(totalItems / pageSize);

    //const con = await createConnection(req.query.databaseName);
    const employee = await employeeModel
      .find(query)
      .skip(skip)
      .limit(pageSize)
      .populate({ path: "selectedRoles", select: "name _id" });
    res.status(200).json({
      status: "true",
      Pages: totalPages,
      results: employee.length,
      data: employee,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ status: "false", error: "Internal Server Error" });
  }
});

//@desc Create specific employee
// @rout Post /api/employee
// @access private
exports.createEmployee = asyncHandler(async (req, res, next) => {
  const email = req.body.email;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const findEmployee = await findOne({ email });
  let employee;
  //Check if the email format is true or not
  if (isEmail(email)) {
    //Generate Password
    const employeePass = generatePassword();
    const company = await CompanyInfnoModel.findOne({ companyId });
    req.body.tags = JSON.parse(req.body.tags);
    req.body.stocks = JSON.parse(req.body.stocks);
    req.body.expenseTags = JSON.parse(req.body.expenseTags);
    req.body.purchaseTags = JSON.parse(req.body.purchaseTags);
    req.body.salesTags = JSON.parse(req.body.salesTags);

    //Sned password to email
    if (!findEmployee) {
      req.body.password = await bcrypt.hash(employeePass, 12);
      await sendEmail({
        email: req.body.email,
        subject: "New Password",
        message: `Hello ${req.body.name}, Your password is ${employeePass}`,
      });
    } else {
      req.body.company = [
        {
          companyId: companyId,
          selectedRoles: req.body.selectedRoles,
          companyName: company.companyName,
        },
      ];
      employee = await employeeModel.create(req.body);
    }
    //Create the employee

    // //insert the user on the main server

    // if (req.body.userType && req.body.userType === "normal") {
    //   try {
    //     const createUserOnServer = await axios.post(
    //       `${process.env.BASE_URL_FOR_SUB}:4001/api/allusers`,
    //       {
    //         name: req.body.companyName,
    //         userEmail: req.body.email,
    //         companySubscribtionId: req.body.subscribtion,
    //         userType: req.body.userType,
    //       }
    //     );
    //     //Continue here
    //   } catch (error) {
    //     console.log(error);
    //   }
    // }
    res.status(201).json({
      status: "true",
      message: "Employee Inserted",
      data: employee,
    });
  } else {
    return next(new ApiError("There is an error in email format", 500));
  }
});

exports.createEmployeeInPos = asyncHandler(async (req, res, next) => {
  const email = req.body.email;

  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  req.body.companyId = companyId;

  //Check if the email format is true or not
  if (isEmail(email)) {
    try {
      //Generate Password
      const employeePass = generatePassword();
      const hashedPassword = await bcrypt.hash(employeePass, 12);

      req.body.password = hashedPassword;
      //Sned password to email
      await sendEmail({
        email: req.body.email,
        subject: "New Password",
        message: `Hello ${req.body.name}, Your password is ${employeePass}`,
      });
      //Create the employee
      // //insert the user on the main server

      req.body.companySubscribtionId = req.body.subscribtion;
      req.body.userType = "normal";
      if (req.body.userType && req.body.userType === "normal") {
        const createUserOnServer = await axios.post(
          `${process.env.BASE_URL_FOR_SUB}:4001/api/allusers`,
          {
            email: email,
            subscribtion: [req.body.subscribtion],
            userType: req.body.userType,
          }
        );
        //Continue here
      }
      req.body.tags = JSON.parse(req.body.tags);
      req.body.stocks = JSON.parse(req.body.stocks);
      req.body.expenseTags = JSON.parse(req.body.expenseTags);
      req.body.purchaseTags = JSON.parse(req.body.purchaseTags);
      req.body.salesTags = JSON.parse(req.body.salesTags);
      const employee = await employeeModel.create(req.body);

      res.status(201).json({
        status: 200,
        message: "Employee Inserted",
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  } else {
  }
});

exports.reSendPassword = asyncHandler(async (req, res, next) => {
  const email = req.body.email;

  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  //Check if the email format is true or not

  const findEmployee = await employeeModel.findOne({ email: req.body.email });
  try {
    //Generate Password
    const employeePass = generatePassword();
    const hashedPassword = await bcrypt.hash(employeePass, 12);

    req.body.password = hashedPassword;
    //Sned password to email
    await sendEmail({
      email: req.body.email,
      subject: "New Password",
      message: `Hello ${findEmployee.name}, Your password is ${employeePass}`,
    });
    const employee = await employeeModel.findOneAndUpdate(
      { email: email, companyId },
      { password: hashedPassword },
      { new: true }
    );

    res.status(201).json({
      status: 200,
      message: "Employee Update Password",
      data: employee,
    });
  } catch (error) {
    next(error);
  }
});

//@desc get specific Employee by ID
// @rout Get /api/employee/:id
// @access private
exports.getEmployee = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const employee = await employeeModel
    .findOne({ _id: id, companyId })
    .populate({ path: "selectedRoles", select: "name _id" });
  if (!employee) {
    return next(new ApiError(`No employee by this id ${id}`, 404));
  } else {
    employee.password = undefined;
    employee.pin = undefined;
    employee.createdAt = undefined;
    employee.updatedAt = undefined;

    //4-get all roles
    const roles = await rolesModel.findOne({
      _id: employee.selectedRoles,
      companyId,
    });
    const dashboardRolesIds = roles.rolesDashboard;

    const dashRoleName = await getDashboardRoles(dashboardRolesIds, companyId);

    res.status(200).json({
      status: "true",
      data: employee,
      dashBoardRoles: dashRoleName,
    });
  }
});

// @desc     Update employee password by ID
// @rout     PUT /api/updatePassword
// @access   Private
exports.updateEmployeePassword = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  // Update user password based on user payload (req.user._id)
  const user = await employeeModel.findOneAndUpdate(
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

  res.status(200).json({ data: user, token });
});

//@desc     Update user name
// @rout    Put /api/employee/updateName/
// @access  Private
exports.updateEmployee = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  // Handle ID from either query or params
  const id = req.params.id;

  if (!id) {
    return next(new ApiError("Employee ID is required", 400));
  }
  req.body.tags = JSON.parse(req.body.tags);
  req.body.stocks = JSON.parse(req.body.stocks);
  req.body.expenseTags = JSON.parse(req.body.expenseTags);
  req.body.purchaseTags = JSON.parse(req.body.purchaseTags);
  req.body.salesTags = JSON.parse(req.body.salesTags);
  const employee = await employeeModel.findOneAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
    }
  );

  if (!employee) {
    return next(new ApiError(`There is no employee with this id ${id}`, 404));
  }

  res.status(200).json({
    status: "true",
    message: "Employee updated",
    data: employee,
  });
});

//@desc Delete specific employee
// @rout Delete /api/employee/:id
// @access private
exports.deleteEmployee = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const employeeID = await employeeModel.findById(id);
  const employee = await employeeModel.findOneAndUpdate(
    { _id: id, companyId },
    { active: !employeeID.active },
    { new: true }
  );
  if (!employee) {
    return next(new ApiError(`No employee by this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", message: "Employee Deleted" });
});
