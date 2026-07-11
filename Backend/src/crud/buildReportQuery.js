import { getModel } from "../utils/appRegistry.js";
import { getDefaultPopulateFields } from "../Config/defaultPopulateFields.js";
import { aggregateValidator } from "../utils/Validator.js";
import { getPolicy } from "../utils/cache.js";

export default async function buildReportQuery(ctx) {
  let {
    modelName,
    filter = {},
    fields,
    populateFields,
    body = {},
    policy,
    user
  } = ctx;

  const role = user?.role;
  const userId = user?.id;

  const Model = getModel(modelName);
  if (!Model) throw new Error(`Model "${modelName}" not found`);

  try {
    const pipeline = [];

    // Match stage (filter)
    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }

    // Helper for robustly checking populate selection
    const hasPopulate = (field) => {
      if (!populateFields) return false;
      if (Array.isArray(populateFields)) return populateFields.includes(field);
      if (typeof populateFields === 'object') return !!populateFields[field];
      if (typeof populateFields === 'string') return populateFields.split(',').includes(field);
      return false;
    };

    // Date range filter
    if (body.dateRange) {
      const { startDate, endDate, dateField = 'createdAt' } = body.dateRange;
      const matchStage = {};
      if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        matchStage[dateField] = dateFilter;
        pipeline.push({ $match: matchStage });
      }
    }

    // Add population lookups BEFORE grouping
    if (body.populate && Array.isArray(body.populate)) {
      // console.log('Adding populate lookups for:', body.populate);
      body.populate.forEach(field => {
        const lookupModel = getModelForField(field);
        // console.log(`Field: ${field}, LookupModel: ${lookupModel}`);
        if (lookupModel) {
          // Get default fields for this populate
          const selectFields = getDefaultPopulateFields('tasks', field) || 'name';
          // console.log(`SelectFields for ${field}:`, selectFields);

          const lookupStage = {
            $lookup: {
              from: lookupModel,
              localField: field,
              foreignField: '_id',
              as: field + 'Data',
              pipeline: [
                {
                  $project: selectFields.split(',').reduce((acc, f) => {
                    acc[f.trim()] = 1;
                    return acc;
                  }, { _id: 1 })
                }
              ]
            }
          };
          // console.log(`Lookup stage for ${field}:`, JSON.stringify(lookupStage, null, 2));
          pipeline.push(lookupStage);

          // Unwind array fields like assignedTo to create separate documents for each assignee
          if (field === 'assignedTo') {
            pipeline.push({ $unwind: { path: `$${field}`, preserveNullAndEmptyArrays: true } });
            pipeline.push({ $unwind: { path: `$${field}Data`, preserveNullAndEmptyArrays: true } });
          }
        }
      });
      // console.log('Pipeline after populate:', JSON.stringify(pipeline, null, 2));
    }

    // Handle type-based responses
    const type = body.type || 'summary'; // summary or details

    if (type === 'summary' && body.groupBy) {
      // Handle subGroupBy for nested grouping
      if (body.subGroupBy) {
        // Use populated data for grouping if available
        let groupByField = `$${body.groupBy}`;
        if (hasPopulate(body.groupBy)) {
          if (body.groupBy === 'assignedTo') {
            groupByField = `$assignedToData.basicInfo.firstName`;
          } else if (body.groupBy.endsWith('Id')) {
            groupByField = `$${body.groupBy}Data.name`;
          } else {
            groupByField = `$${body.groupBy}Data.name`;
          }
        }

        let subGroupByField = `$${body.subGroupBy}`;
        if (hasPopulate(body.subGroupBy)) {
          if (body.subGroupBy === 'assignedTo') {
            subGroupByField = `$${body.subGroupBy}Data.basicInfo.firstName`;
          } else if (body.subGroupBy.endsWith('Id')) {
            subGroupByField = `$${body.subGroupBy}Data.name`;
          } else {
            subGroupByField = `$${body.subGroupBy}Data.name`;
          }
        }

        // First group by main field and subfield
        pipeline.push({
          $group: {
            _id: {
              main: groupByField,
              sub: subGroupByField,
              originalTaskId: '$_id' // Keep original task ID for unique counting
            },
            count: { $sum: 1 }
          }
        });

        // Add the original task ID to the next stage
        pipeline.push({
          $addFields: {
            originalTaskId: '$_id.originalTaskId'
          }
        });

        // Regroup to get proper structure
        pipeline.push({
          $group: {
            _id: {
              main: '$_id.main',
              sub: '$_id.sub'
            },
            count: { $sum: '$count' },
            originalTaskId: { $first: '$originalTaskId' }
          }
        });
        // console.log('Pipeline after first group:', JSON.stringify(pipeline, null, 2));  

        // Then group by main field and create sub counts
        const groupStage = {
          _id: '$_id.main',
          total: { $sum: 1 },
          uniqueTasks: { $addToSet: '$originalTaskId' } // Track unique task IDs
        };

        // Create dynamic fields for each sub group value
        pipeline.push({
          $group: {
            ...groupStage,
            subGroups: {
              $push: {
                key: '$_id.sub',
                count: '$count'
              }
            }
          }
        });

        // Add actual unique task count
        pipeline.push({
          $addFields: {
            total: { $size: '$uniqueTasks' }
          }
        });

        // Convert subGroups array to object fields
        pipeline.push({
          $addFields: {
            subGroupsObj: {
              $arrayToObject: {
                $map: {
                  input: '$subGroups',
                  as: 'item',
                  in: {
                    k: {
                      $cond: {
                        if: { $eq: ['$$item.key', null] },
                        then: 'Unknown',
                        else: {
                          $cond: {
                            if: { $isArray: '$$item.key' },
                            then: { $arrayElemAt: ['$$item.key', 0] },
                            else: { $toString: '$$item.key' }
                          }
                        }
                      }
                    },
                    v: '$$item.count'
                  }
                }
              }
            }
          }
        });

        // Merge subGroupsObj fields into root
        pipeline.push({
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                { _id: '$_id', total: '$total' },
                '$subGroupsObj'
              ]
            }
          }
        });

      } else {
        // Simple groupBy without subGroupBy
        const groupStage = {
          _id: `$${body.groupBy}`,
          count: { $sum: 1 }
        };

        // Add sum operations if specified
        if (body.sum) {
          if (Array.isArray(body.sum)) {
            body.sum.forEach(field => {
              groupStage[field] = { $sum: `$${field}` };
            });
          } else {
            groupStage[body.sum] = { $sum: `$${body.sum}` };
          }
        }

        pipeline.push({ $group: groupStage });
      }

      // Add lookup for populated field names
      if (hasPopulate(body.groupBy)) {
        const lookupModel = getModelForField(body.groupBy);
        if (lookupModel) {
          pipeline.push({
            $lookup: {
              from: lookupModel.toLowerCase() + 's',
              localField: '_id',
              foreignField: '_id',
              as: 'groupData'
            }
          });
          pipeline.push({
            $project: {
              _id: 1,
              count: 1,
              name: { $arrayElemAt: ['$groupData.name', 0] },
              ...Object.keys(groupStage).filter(k => k !== '_id' && k !== 'count').reduce((acc, k) => {
                acc[k] = 1;
                return acc;
              }, {})
            }
          });
        }
      }

      // Sort by count descending
      pipeline.push({ $sort: { count: -1 } });

    } else if (type === 'details' || type === 'list') {
      // Return detailed records with population
      if (body.populate && Array.isArray(body.populate)) {
        body.populate.forEach(field => {
          const lookupModel = getModelForField(field);
          if (lookupModel) {
            // Get default fields for this populate
            const selectFields = getDefaultPopulateFields(lookupModel.replace('s', ''), field) || 'name';

            pipeline.push({
              $lookup: {
                from: lookupModel,
                localField: field,
                foreignField: '_id',
                as: field + 'Data',
                pipeline: [
                  {
                    $project: selectFields.split(',').reduce((acc, f) => {
                      acc[f.trim()] = 1;
                      return acc;
                    }, { _id: 1 })
                  }
                ]
              }
            });
          }
        });
      }

      // Field selection
      if (fields) {
        const projection = {};
        fields.split(' ').forEach(field => {
          projection[field] = 1;
        });
        pipeline.push({ $project: projection });
      }
    }

    // Apply sorting
    if (body.sort) {
      pipeline.push({ $sort: body.sort });
    }

    // Apply limit
    if (body.limit) {
      pipeline.push({ $limit: body.limit });
    }

    // Apply skip for pagination
    if (body.skip) {
      pipeline.push({ $skip: body.skip });
    }

    // --- APPLY POLICY VALIDATION ---
    const filterStub = { aggregate: true, stages: pipeline };
    aggregateValidator({ 
      filter: filterStub, 
      role, 
      action: 'read', // validating lookups requires read access to target models
      modelName, 
      getPolicy 
    });

    const result = await Model.aggregate(pipeline);
    return result;

  } catch (error) {
    throw new Error(`Report query failed: ${error.message}`);
  }
}

// Helper function to get model name for field
function getModelForField(field) {
  const fieldModelMap = {
    'employee': 'employees',
    'user': 'employees',
    'assignedTo': 'employees',
    'createdBy': 'employees',
    'client': 'clients',
    'clientId': 'clients',
    'department': 'departments',
    'role': 'roles',
    'leaveType': 'leavetypes',
    'taskType': 'tasktypes',
    'taskTypeId': 'tasktypes',
    'projectType': 'projecttypes',
    'projectTypeId': 'projecttypes'
  };
  return fieldModelMap[field];
}