const mongoose = require("mongoose");

const recipeSchema = new mongoose.Schema(
  {
    name: String,
    recipeArray: [
      {
        _id: false,
        rawMatrialId: {
          type: mongoose.Schema.ObjectId,
          ref: "RawMaterial",
          required: true,
        },
        cost: {
          type: Number,

          default: 0,
        },
        unit: {
          type: mongoose.Schema.ObjectId,
          ref: "Unit",
        },
        quantity: {
          type: Number,
        },
        calories: String,
      },
    ],
    overAllCost: {
      type: Number,
      default: 0,
    },
    overAllCalories: String,
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
  { collection: "recipe" }
);

/*recipeSchema.virtual("overAllCost").get(function () {
  return this.recipeArray.reduce(
    (total, item) => total + item.cost * item.quantity,
    0
  );
});

recipeSchema.set("toJSON", { virtuals: true });
recipeSchema.set("toObject", { virtuals: true });
*/
module.exports = mongoose.model("recipe", recipeSchema);
