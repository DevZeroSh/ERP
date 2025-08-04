const mongoose = require("mongoose");
const ApiError = require("../apiError");
// exceptionalCollections, fields,
exports.checkIdIfUsed = async (id, exceptionalCollections, fields, db) => {
    try {
        // Get all collection names except the exceptional ones
        const collections = await db.db.listCollections().toArray();
        const filteredCollections = collections.filter((collection) => !exceptionalCollections.includes(collection.name));
        for (const collection of filteredCollections) {
            const collectionName = collection.name;
            const collectionModel = db.model(collectionName);

            const query = {};
            fields.forEach((field) => {
                query[field] = id;
            });

            const document = await collectionModel.findOne({ $or: [query] });
            if (document) {
                console.log(true);
            } else {
                console.log(false);
            }
            console.log(collection.name);
        }
    } catch (err) {
        console.error("Error checking ID:", err);
        throw err; // Re-throw the error for proper handling
    }
};
