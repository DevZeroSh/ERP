const asyncHandler = require("express-async-handler");

const getAllChildCategories = asyncHandler(
  async (parentCategoryId, db, categorySchema) => {
    const Category = db.model("Category", categorySchema);

    // Find the parent category and populate its children
    const parentCategory = await Category.findById(parentCategoryId).populate(
      "children"
    );

    if (!parentCategory) {
      return [];
    }

    // Initialize a Set with the parent category ID
    let allCategories = new Set([parentCategoryId]);

    // Recursively add child categories
    for (let child of parentCategory.children) {
      const nestedChildCategories = await getAllChildCategories(
        child,
        db,
        categorySchema
      );
      nestedChildCategories.forEach((catId) => allCategories.add(catId));
    }

    return Array.from(allCategories);
  }
);
module.exports = getAllChildCategories;
