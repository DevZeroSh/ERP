const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const createToken = require("../utils/createToken");
const { getDashboardRoles } = require("./roleDashboardServices");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const employeeModel = require("../models/employeeModel");
const rolesModel = require("../models/roleModel");
const customarSchema = require("../models/customarModel");
const sendEmail = require("../utils/sendEmail");
const { OAuth2Client } = require("google-auth-library");
const E_user_Schema = require("../models/ecommerce/E_user_Modal");
const { default: axios } = require("axios");
const thirdPartyAuthSchema = require("../models/ecommerce/thirdPartyAuthModel");

// @desc      Login
// @route     POST /api/auth/login
// @access    Public
exports.login = asyncHandler(async (req, res, next) => {
  try {
    // Fetch the user and check email and password in parallel

    const user = await employeeModel
      .findOne({
        email: req.body.email,
        company: {
          $elemMatch: { companyId: req.body.companyId },
        },
      })
      .populate("selectedRoles");

    if (!user) {
      return next(new ApiError("Incorrect email", 401));
    }

    // Check password
    const passwordMatch = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!passwordMatch) {
      return next(new ApiError("Incorrect Password", 401));
    }

    // Check if the user is active
    if (user.archives === "true") {
      return next(new ApiError("The account is not active", 401));
    }

    // Remove the password and pin from the user object
    user.password = undefined;
    user.pin = undefined;

    // Fetch roles in parallel
    const selectedCompany = user.company.find(
      (c) => c.companyId === req.body.companyId
    );

    const roles = await rolesModel.findOne({
      _id: selectedCompany?.selectedRoles,
      companyId: req.body.companyId,
    });

    const [dashRoleName] = await Promise.all([
      getDashboardRoles(roles.rolesDashboard, req.body.companyId),
    ]);

    const token = createToken(user._id);

    res.status(200).json({
      status: "true",
      data: user,
      dashBoardRoles: dashRoleName,
      token,
      companyId: req.body.companyId,
    });
  } catch (error) {
    console.error("Error during login:", error);
    next(error);
  }
});

// @desc   make sure the user is logged in sys
exports.protect = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ApiError("Not login", 401));
  } else {
    try {
      //2- Verify token (no change happens, expired token)
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

      //3-Check if user exists
      const curentUser = await employeeModel.findOne({
        _id: decoded.userId,
        companyId,
      });
      if (!curentUser) {
        return next(new ApiError("The user does not exit", 404));
      }
      req.user = curentUser;
      next();
    } catch (error) {
      // Token verification failed
      console.error("JWT Error:", error.message);
      if (error.name === "TokenExpiredError") {
        return next(new ApiError("Token has expired", 401));
      } else {
        console.error("JWT Error:", error.message);
        return next(new ApiError("Not login", 401));
      }
    }
  }
});

// @desc      Forgot password
// @route     POST /api/auth/forgotpasswordpos
// @access    Public
exports.forgotPasswordPos = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // 1) Get user by email
  const { email } = req.body;
  const user = await employeeModel.findOne({ email, companyId });
  if (!user) {
    return next(
      new ApiError(`There is no user with this email address ${email}`, 404)
    );
  }

  // 2) Generate random reset code and save it in db
  const resetCode = Math.floor(Math.random() * 1000000 + 1).toString();
  // Encrypt the reset code before saving it in db (Security)
  const hashedResetCode = await bcrypt.hash(resetCode, 10);

  user.passwordResetCode = hashedResetCode;
  //10 min
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  user.resetCodeVerified = false;
  await user.save();

  // 3) Send password reset code via email
  const message = `Forgot your password? Submit this reset password code: ${resetCode}\n If you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your Password Reset Code (valid for 10 min)",
      message,
    });

    res.status(200).json({
      status: "Success",
      message: "Reset code sent to your email",
    });
  } catch (err) {
    // If there's an error sending the email, clear the reset code and expiration time
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.log(err);
    return next(
      new ApiError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
});

// @desc      Verify reset password code
// @route     POST /api/auth/verifyresetcodepos
// @access    Public
exports.verifyPasswordResetCodePos = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { resetCode } = req.body;

  const user = await employeeModel.find({
    passwordResetExpires: { $gt: Date.now() },
    companyId,
  });
  if (!user) {
    return next(new ApiError("Reset code is invalid or has expired", 400));
  }
  // 3) Compare the reset code with the hashed code stored in the database
  const isResetCodeValid = await bcrypt.compare(
    resetCode,
    user.passwordResetCode
  );
  if (!isResetCodeValid) {
    return next(new ApiError("Reset code is invalid or has expired", 400));
  }
  // 4) Mark reset code as verified
  user.resetCodeVerified = true;
  await user.save();

  res.status(200).json({
    status: "Success",
  });
});

// @desc      Reset password
// @route     POST /api/auth/resetpasswordpos
// @access    Public
exports.resetPasswordPos = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  // 1) Get user based on email
  const user = await employeeModel.findOne({
    email: req.body.email,
    companyId,
  });
  if (!user) {
    return next(
      new ApiError(
        `There is no user with this email address ${req.body.email}`,
        404
      )
    );
  }
  // Check if user verify the reset code
  if (!user.resetCodeVerified) {
    return next(new ApiError("reset code not verified", 400));
  }
  const hashedResetCode = await bcrypt.hash(req.body.newPassword, 10);

  // 2) Update user password & Hide passwordResetCode & passwordResetExpires from the result
  user.password = hashedResetCode;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.resetCodeVerified = undefined;
  await user.save();

  // 3) If everything ok, send token to client
  const token = createToken(user._id);

  res.status(200).json({ user: user, token });
});

// @desc      Signup
// @route     POST /api/auth/signup
// @access    Public
exports.signup = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);

  const hashedResetCode = await bcrypt.hash(req.body.password, 10);
  const user = await UserModel.create({
    name: req.body.name,
    slug: req.body.slug,
    email: req.body.email,
    phone: req.body.phone,
    password: hashedResetCode,
  });

  const token = createToken(user._id);

  res.status(201).json({ data: user, token });
});

const client = new OAuth2Client(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "https://store.noontek.com"
);

// Function to verify Google ID token
async function verifyGoogleToken(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.CLIENT_ID,
  });
  return ticket.getPayload();
}

exports.googleSignin = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Customer", customarSchema);

  const { name, email } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (user) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY);
      const { password, ...rest } = user._doc;
      res
        .status(200)
        .cookie("access_token", token, {
          httpOnly: true,
        })
        .json(rest);
    } else {
      const generatedPassword =
        Math.round().toString(36).slice(-8) +
        Math.round().toString(36).slice(-8);

      const hashePassword = bcrypt.hashSync(generatedPassword, 10);

      const newUser = new UserModel({
        name: name.toLowerCase().Math.round().toString(9).slice(-4),
        email,
        password: hashePassword,
      });
      await newUser.save();
      const token = createToken(user._id);
      const { password, ...rest } = newUser._doc;

      res
        .status(200)
        .cookie("access_token", token, { httpOnly: true })
        .json(rest);
    }
  } catch (error) {
    console.error("Error during Google Sign-In:", error);
    next(new Error("Google Sign-In failed"));
  }
});
// @desc    Login
// @route   GET /api/v1/auth/login
// @access  Public
exports.EcommerceLogin = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);

  const user = await UserModel.findOne({ email: req.body.email });

  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return next(new ApiError("Incorrect email or password", 401));
  }
  // 3) generate token
  const token = createToken(user._id);
  // console.log(token)
  // Delete password from response
  delete user._doc.password;
  // 4) send response to client side
  res.status(200).json({ data: user, token });
});

// @desc   make sure the user is logged in
exports.ecommerceProtect = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);

  let token;
  let isAnonymous = false;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.headers["x-anonymous-token"]) {
    token = req.headers["x-anonymous-token"];
    isAnonymous = true;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser) {
      req.user = null;
    } else {
      if (currentUser.passwordChangedAt) {
        const passChangedTimestamp = parseInt(
          currentUser.passwordChangedAt.getTime() / 1000,
          10
        );
        if (passChangedTimestamp > decoded.iat) {
          req.user = null;
        }
      }
      req.user = currentUser;
    }
  } catch (error) {
    req.user = null;
  }

  next();
});

// @desc      Request password reset
// @route     POST /api/auth/forgotPassword
// @access    Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);

  // 1) Get user by email
  const { email } = req.body;
  const user = await UserModel.findOne({ email });
  if (!user) {
    return next(
      new ApiError(`There is no user with this email address ${email}`, 404)
    );
  }

  // 2) Generate a reset token
  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(new ApiError("Error generating reset token", 500));
    }
    bcrypt.hash(email, salt, async (err, hashedEmail) => {
      if (err) {
        return next(new ApiError("Error generating reset token", 500));
      }

      // Encode the hashed token to Base64 URL-safe format
      let resetToken = Buffer.from(hashedEmail).toString("base64");
      resetToken = resetToken
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Save the hashed token to the database
      user.passwordResetToken = resetToken;
      // Token expires in 10 minutes
      user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
      await user.save();
      // 3) Send password reset email with the link containing the token
      const resetURL = `${process.env.STORE_BASE_URL}/resetPassword/${resetToken}`;
      const message = `Forgot your password? Click on the link below to reset your password:\n${resetURL}\nIf you didn't ask for password rest, please ignore this email!`;
      try {
        await sendEmail({
          email: user.email,
          subject: "Your Password Reset Link (valid for 10 min)",
          message,
        });

        res.status(200).json({
          status: "Success",
          message: "Reset link sent to your email",
          token: resetToken,
        });
      } catch (err) {
        console.error(err);
        return next(
          new ApiError(
            "There was an error sending the email. Try again later!",
            500
          )
        );
      }
    });
  });
});

// @desc      Verify reset password code
// @route     POST /api/auth/verifyResetCode
// @access    Public
exports.verifyPasswordResetCode = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);

  // 1) Get user based on reset code
  const { resetCode } = req.body; // Assuming resetCode is a string

  // 2) Get user from database
  const user = await UserModel.findOne({
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ApiError("Reset code is invalid or has expired", 400));
  }

  // 3) Compare the reset code with the hashed code stored in the database
  const isResetCodeValid = await bcrypt.compare(
    resetCode,
    user.passwordResetCode
  );

  if (!isResetCodeValid) {
    return next(new ApiError("Reset code is invalid or has expired", 400));
  }

  // 4) Mark reset code as verified
  user.resetCodeVerified = true;
  await user.save();

  res.status(200).json({
    status: "Success",
  });
});

// @desc      Reset password
// @route     POST /api/auth/resetPassword
// @access    Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);

  // Get the reset token from the request parameters
  const resetToken = req.query.token;

  // Find a user with the matching reset token and valid expiration time
  const user = await UserModel.findOne({
    passwordResetToken: resetToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ApiError("Reset token is invalid or has expired", 400));
  }
  const newPassword = req.body.newPassword;

  if (!newPassword) {
    return next(new ApiError("New password is required", 400));
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  res.status(200).json({
    status: "Success",
    message: "Password reset successful",
  });
});

exports.googleLogin = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);
  const thirdPartyModel = db.model("ThirdPartyAuth", thirdPartyAuthSchema);
  const { googleClientID, googleClientSecret, redirectUri } =
    await thirdPartyModel.findOne();

  const { code } = req.body;
  try {
    // Exchange authorization code for tokens
    const { data } = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id: googleClientID,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { id_token, access_token } = data;

    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.CLIENT_ID,
    });

    const { email, name } = ticket.getPayload();

    let user = await UserModel.findOne({ email });
    if (!user) {
      user = await UserModel.create({ email, name });
    }

    const token = createToken(user._id);
    res.status(200).json({ message: "login success", user, token: token });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: "login failed" });
  }
});

exports.facebookLogin = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);
  const { accessToken, userID } = req.body;

  try {
    const response = await axios.get(
      `https://graph.facebook.com/v13.0/${userID}`,
      {
        params: {
          access_token: accessToken,
          fields: "email, name",
        },
      }
    );

    const { email, name } = response.data;

    let user = await UserModel.findOne({ email });

    if (!user) {
      user = await UserModel.create({ email, name });
    }

    const token = createToken(user._id);
    res.status(200).json({ message: "login success", user, token });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: "login failed" });
  }
});
//Permissions
//Verify user permissions
// exports.allowedTo = (role) =>
//     asyncHandler(async (req, res, next) => {
//         const id = req.user._id;
//         const dbName = req.query.databaseName;
//         try {
//             const db = mongoose.connection.useDb(dbName);

//             const employeeModel = db.model("Employee", emoloyeeShcema);
//             const rolesModel = db.model("Roles", rolesShcema);

//             //get all user's roles
//             const employee = await employeeModel
//                 .findById(id)
//                 .populate({ path: "selectedRoles", select: "name _id" });
//             if (!employee) {
//                 return next(new ApiError(`No employee by this id ${id}`, 404));
//             }

//             //4-get all roles
//             const roles = await rolesModel.findById(employee.selectedRoles[0]);

//             if (!roles) {
//                 return next(new ApiError("Roles not found for the user", 404));
//             }

//             const { rolesDashboard, rolesPos } = roles;
//             const [dashRoleName, poseRoleName] = await Promise.all([
//                 getDashboardRoles(rolesDashboard, db),
//                 getPosRoles(rolesPos, db),
//             ]);

//             let allUserRoles = [...dashRoleName, ...poseRoleName];

//             // Use the some method to check if any role in allUserRoles is included in the provided role array
//             if (!allUserRoles.some(userRole => role.includes(userRole))) {
//                 return next(new ApiError("Block access", 403));
//             }
//             next();
//         } catch (error) {
//             return next(error);
//         }
//     });
