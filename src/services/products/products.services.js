const { getModels } = require('../../databases/sqlite');
const { Op } = require('sequelize');

module.exports = {
    //insert data into sqlite
    insertData: async function (dataArray) {
        if (!Array.isArray(dataArray) || dataArray.length === 0) {
            return [false, 'Invalid input'];
        }
        const models = getModels();

        try {
            // Process input and track first unique campaign_id only
            const seenCampaignIds = new Set();
            const normalizedRecords = [];
            const skippedDuplicates = [];
            const requiredFields = ['campaign_id', 'campaign_name', 'ad_group_id', 'fsn_id', 'product_name', 'ad_spend', 'views', 'clicks', 'direct_units', 'indirect_units', 'direct_revenue', 'indirect_revenue'];
            const missingFields = [];

            for (const rawRecord of dataArray) {
                const record = normalizeKeys(rawRecord); //alter the key names according to the column names in the model definition
                const missing = requiredFields.filter(field => record[field] === undefined || record[field] === null || record[field] === '')
                if (missing.length > 0) {
                    missingFields.push({ record, missing });
                    continue;
                }
                if (seenCampaignIds.has(record.campaign_id)) {
                    skippedDuplicates.push(record);
                    continue;
                }
                seenCampaignIds.add(record.campaign_id);
                normalizedRecords.push(record);
            }
            if (missingFields.length > 0) {
                return [false, "Invalid input, please check the fields"];
            }
            if (normalizedRecords.length === 0) {
                return [false, 'All campaign_ids in file are duplicates'];
            }

            //Check against DB for already existing records
            const existingRecords = await models.Products.findAll({
                where: {
                    campaign_id: {
                        [Op.in]: normalizedRecords.map(r => r.campaign_id)
                    }
                },
                attributes: ['campaign_id'],
                raw: true
            });

            const existingIds = new Set(existingRecords.map(r => r.campaign_id));

            const newRecords = normalizedRecords.filter(r => !existingIds.has(r.campaign_id));

            let message = '';
            let success = true;

            if (skippedDuplicates.length > 0) {
                message += `${skippedDuplicates.length} duplicate campaign_id(s) found in file. `;
                success = false;
            }

            if (existingIds.size > 0) {
                message += `${existingIds.size} campaign_id(s) already exist in database. `;
                success = false;
            }

            if (newRecords.length === 0) {
                return [success, message.trim() || 'No new records to insert'];
            }

            //Insert remaining records
            await models.Products.bulkCreate(newRecords, {
                returning: false,
                validate: true
            });

            message += `${newRecords.length} record(s) inserted successfully.`;
            return [true, message.trim()];

        } catch (err) {
            console.error('Error in insertData:', err);
            return [false, 'Operation failed: ' + err.message];
        }
    },
    //get data based on query
    getData: async function (queryObj) {
        try {
            const models = getModels();
            const details = await models.Products.findAll(queryObj);
            if (details.length > 0) {
                return [true, details];
            }
            return [true, []];
        } catch (err) {
            console.error('Error fetching data:', err);
            return [false, err];
        }
    },
    //get items count
    getCount: async function (queryObj) {
        try {
            const models = getModels();

            const countQuery = {
                where: queryObj.where
            };

            const count = await models.Products.count(countQuery);
            return [true, count];
        } catch (err) {
            console.error('Error counting records:', err);
            return [false, err];
        }
    }
};
// Helper function to convert CSV headers to model field names
const normalizeKeys = (record) => {
    return {
        campaign_id: record['Campaign ID'] || record.campaign_id,
        campaign_name: record['Campaign Name'] || record.campaign_name,
        ad_group_id: record['Ad Group ID'] || record.ad_group_id,
        fsn_id: record['FSN ID'] || record.fsn_id,
        product_name: record['Product Name'] || record.product_name,
        ad_spend: record['Ad Spend'] || record.ad_spend,
        views: record['Views'] || record.views,
        clicks: record['Clicks'] || record.clicks,
        direct_units: record['Direct Units'] || record.direct_units,
        indirect_units: record['Indirect Units'] || record.indirect_units,
        direct_revenue: record['Direct Revenue'] || record.direct_revenue,
        indirect_revenue: record['Indirect Revenue'] || record.indirect_revenue
    };
};
