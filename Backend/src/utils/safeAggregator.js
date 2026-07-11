import mongoose from "mongoose";

/**
 * 🧩 Safe Aggregation Utility
 * - Limits heavy stages like $lookup, $unwind, $match
 * - Enables disk use automatically
 * - Gracefully catches and handles errors
 * - Returns fallback data instead of throwing
 */

const safeAggregate = async (model, pipeline = [], options = []) => {
    try {
        const lookupCount = pipeline.filter(stage => stage.$lookup).length;
        const unwindCount = pipeline.filter(stage => stage.$unwind).length;
        const matchCount = pipeline.filter(stage => stage.$match).length;
        const totalStages = pipeline.length;

        // Define safe limits
        const MAX_LOOKUPS = 9;
        const MAX_UNWINDS = 9;
        const MAX_MATCHES = 10;
        const MAX_TOTAL_STAGES = 25;

        // Check against limits
        if (lookupCount > MAX_LOOKUPS ||
            unwindCount > MAX_UNWINDS ||
            matchCount > MAX_MATCHES ||
            totalStages > MAX_TOTAL_STAGES) {
            console.warn(
                `⚠️ Aggregation aborted for ${Model.modelName}: stage limits exceeded.\n` +
                `Lookups=${lookupCount}, Unwinds=${unwindCount}, Matches=${matchCount}, Total=${totalStages}`
            );

            const fallback = await getSchemaAwareFallback(model, 10);
            return {
                warning: "Aggregation aborted: stage limits exceeded.",
                count: fallback.length,
                data: fallback
            };
        }

        // Execute aggregation with disk use enabled   
        const results = await model.aggregate(pipeline, { allowDiskUse: true, ...options });

        return results;
    } catch (error) {
        console.error(`❌ Aggregation error for ${model.modelName}:`, error.message);

        const fallback = await getSchemaAwareFallback(model, 7);
        return {
            error: "Aggregation failed, returned fallback data.",
            count: fallback.length,
            data: fallback
        };
    }
};

export default safeAggregate;

/**
 * Safe Aggregation Utility - Limits heavy stages like $lookup, $unwind, $match
 * Enables disk use automatically
 * Gracefully catches and handles errors
 * Returns fallback data instead of throwing
 */

// Helper to get schema-aware fallback data
async function getSchemaAwareFallback(model, limit) {
    try {
        const schemaPaths = Object.keys(model.schema.paths).filter(
            key => 
                !key.startsWith("_") &&
                !key.includes(".") &&
                ["String", "Number", "Date", "Boolean"].includes(model.schema.paths[key].instance)
        );

        // Default fallback if no suitable fields found
        const safeFields = schemaPaths.length > 0 ? schemaPaths : ["_id"];

        const fallbackData = await model.find({}, safeFields.join(" ")).limit(limit).lean();
        return fallbackData;
    } catch (error) {
        console.error(`❌ Fallback error for ${model.modelName}:`, error.message);
        return [];
    }
}