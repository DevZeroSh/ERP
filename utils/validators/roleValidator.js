const { check, body, param } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const Role = require("../../models/roleModel");


//reate role validator
exports.createRoleVlaidator = [
  check("name")
    .notEmpty()
    .withMessage("Name of role can not bwe empty")
    .isLength({ min: 2 })
    .withMessage("The Name of role is too short")
    .isLength({ max: 30 })
    .withMessage("The name of role is too long"),
    check()
    .custom((value, { req }) => {

      if(
        (!req.body.rolesDashboard || req.body.rolesDashboard.length === 0) &&
        (!req.body.rolesPos || req.body.rolesPos.length === 0)
      ){
        throw new Error('At least one item is required in Dashboard roles or Pos roles');
      }
     return true;
    }),
    validatorMiddleware,
];

//when update a rol
exports.updateRoleVlaidator = [
  param("id").isMongoId().withMessage("Invalid role id"),
  check("name")
   .notEmpty()
    .withMessage("Name of role can not bwe empty")
    .isLength({ min: 2 })
    .withMessage("The Name of role is too short")
    .isLength({ max: 30 })
    .withMessage("The name of role is too long"),
    check()
    .custom((value, { req }) => {
      if(
        (!req.body.rolesDashboard || req.body.rolesDashboard.length === 0) &&
        (!req.body.rolesPos || req.body.rolesPos.length === 0)
      ){
        throw new Error('At least one item is required in Dashboard roles or Pos roles');
      }
     return true;
    }),
    validatorMiddleware,
];

//Validator to id when get one role
exports.getRolVlaidator = [
  check('id').isMongoId().withMessage("Invalid role id"),
  validatorMiddleware,
];

//Validator to id when delete a role
exports.deleteRoleVlaidator = [
  check('id').isMongoId().withMessage("Invalid role id"),
  validatorMiddleware,
];