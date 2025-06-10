const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const sequelize = require('sequelize');
const ProductService = require('../../services/products/products.services');
const GlobalStrings = require('../../../GlobalStrings');
const { Op } = require('sequelize');

module.exports = {
    //upload csv file only
    uploadFile: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).send({ status: 400, message: GlobalStrings.Messages.NO_FILE_PROVIDED });
            }
            // Get the original file name and extension
            const originalName = req.file.originalname;
            const fileExt = path.extname(originalName).toLowerCase();
            const fileName = path.basename(originalName, fileExt);

            // Validate file type
            if (fileExt !== '.csv') {
                fs.unlinkSync(req.file.path);
                return res.status(400).send({ status: 400, message: GlobalStrings.Messages.CSV_ALLOW_ERROR });
            }

            // Create file path with extension
            const newFilePath = path.join(path.dirname(req.file.path), `${fileName}${fileExt}`);
            // Rename the uploaded file to include the extension
            fs.renameSync(req.file.path, newFilePath);
            // parse the CSV file
            const results = [];
            fs.createReadStream(newFilePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', async () => {
                    try {
                        const [uploadStatus, result] = await ProductService.insertData(results);

                        if (!uploadStatus) {
                            fs.unlinkSync(newFilePath);
                        }
                        return res.status(200).send({
                            status: 200,
                            message: result
                        });
                    } catch (error) {
                        fs.unlinkSync(newFilePath);
                        console.log(error);
                        return res.status(500).send({
                            status: 500,
                            message: GlobalStrings.Messages.FILE_UPLOAD_ERROR
                        });
                    }
                })
                .on('error', (error) => {
                    fs.unlinkSync(newFilePath);
                    return res.status(400).send({
                        status: 400,
                        message: GlobalStrings.Messages.FILE_PROCESSING_ERROR
                    });
                });
        } catch (err) {
            if (req.file?.path) {
                fs.unlinkSync(req.file.path);
            }
            console.error("Error in uploadFile:", err);
            return res.status(500).send({ status: 500, message: GlobalStrings.Messages.SOMETHING_WENT_WRONG });
        }
    },
    /*get products data based on campaign_name, additionl filters 
    /ad_group_id/fsn_id/product_name can alo be passed in req body */
    getCampaignData: async (req, res) => {
        try {
            // Validate request body
            if (!req.body || Object.keys(req.body).length === 0 || (!req.body.campaign_name && !req.body.ad_group_id && !req.body.fsn_id &&
                !req.body.product_name && !req.body.search)) {
                return res.status(400).send({ status: 400, message: GlobalStrings.Messages.INVALID_REQUEST });
            }
            // Prepare query object based on request body
            const { campaign_name, ad_group_id, fsn_id, product_name } = req.body;
            const queryObj = {
                where: { [Op.or]: [] },
                attributes: ['campaign_name', 'ad_spend', 'views', 'clicks',
                    'direct_revenue', 'indirect_revenue', 'direct_units', 'indirect_units']
            };
            if (campaign_name) queryObj.where[Op.or].push({ campaign_name });
            if (ad_group_id) queryObj.where[Op.or].push({ ad_group_id });
            if (fsn_id) queryObj.where[Op.or].push({ fsn_id });
            if (product_name) queryObj.where[Op.or].push({ product_name });

            // Search filter(matching across multiple fields)
            if (req.query.search) {
                queryObj.where[Op.or].push(
                    {
                        [Op.or]: [
                            { campaign_name: { [Op.like]: `%${req.query.search}%` } },
                            { product_name: { [Op.like]: `%${req.query.search}%` } },
                            sequelize.where(
                                sequelize.cast(sequelize.col('ad_group_id'), 'TEXT'),
                                { [Op.like]: `%${req.query.search}%` }
                            )
                        ]
                    }
                );
            }

            // Check if pagination is requested via query params
            if (req.query.page) {
                const page = parseInt(req.query.page) || 1;
                const pageSize = parseInt(req.query.pageSize) || 10;
                const offset = (page - 1) * pageSize;

                // First get total count (without pagination)
                const countQuery = { where: queryObj.where };
                const [countSuccess, totalCount] = await ProductService.getCount(countQuery);

                if (!countSuccess) {
                    return res.status(400).send({ status: 400, message: GlobalStrings.Messages.COUNT_RECORD_ERROR });
                }

                // Then get paginated data
                queryObj.limit = pageSize;
                queryObj.offset = offset;
                const [productState, products] = await ProductService.getData(queryObj);

                if (!productState || !products || products.length === 0) {
                    return res.status(200).send({ status: 200, message: GlobalStrings.Messages.NO_MATCHING_RECORDS });
                }

                return res.status(200).send({
                    status: 200,
                    data: processProductMetrics(products),
                    pagination: {
                        totalItems: totalCount,
                        totalPages: Math.ceil(totalCount / pageSize),
                        currentPage: page,
                        pageSize: pageSize,
                        hasNextPage: page < Math.ceil(totalCount / pageSize),
                        hasPreviousPage: page > 1
                    }
                });
            } else {
                // No pagination requested - return all matching records
                const [productState, products] = await ProductService.getData(queryObj);

                if (!productState || !products || products.length === 0) {
                    return res.status(200).send({ status: 200, message: GlobalStrings.Messages.NO_MATCHING_RECORDS });
                }

                return res.status(200).send({
                    status: 200,
                    data: processProductMetrics(products)
                });
            }
        } catch (err) {
            console.error("Error in getCampaignData:", err);
            return res.status(500).send({ status: 500, message: GlobalStrings.Messages.SOMETHING_WENT_WRONG });
        }
    },
    /* get products data based on ad group id 
    additional filters like campaign_name/fsn_id/product_name can be passed in req body */
    getProductsGroupId: async (req, res) => {
        try {
            if (Object.keys(req.body) && Object.keys(req.body).length > 0 && (req.body.ad_group_id || req.body.campaign_name || req.body.fsn_id || req.body.product_name)) {
                const { campaign_name, ad_group_id, fsn_id, product_name } = req.body;
                //prepare query object
                const queryObj = { where: { [Op.or]: [] }, attributes: ['campaign_name', 'ad_spend', 'views', 'clicks', 'direct_revenue', 'indirect_revenue', 'direct_units', 'indirect_units'] };
                if (campaign_name) queryObj.where[Op.or].push({ campaign_name });
                if (ad_group_id) queryObj.where[Op.or].push({ ad_group_id });
                if (fsn_id) queryObj.where[Op.or].push({ fsn_id });
                if (product_name) queryObj.where[Op.or].push({ product_name });

                // Search filter (fuzzy matching across multiple fields)
                if (req.query.search) {
                    queryObj.where[Op.or].push(
                        {
                            [Op.or]: [
                                { campaign_name: { [Op.like]: `%${req.query.search}%` } },
                                { product_name: { [Op.like]: `%${req.query.search}%` } },
                                sequelize.where(
                                    sequelize.cast(sequelize.col('ad_group_id'), 'TEXT'),
                                    { [Op.like]: `%${req.query.search}%` }
                                )
                            ]
                        }
                    );
                }
                // Check if pagination is requested via query params
                if (req.query.page) {
                    // Get paginated data and total count
                    const [productState, products] = await ProductService.getData(queryObj);
                    const page = parseInt(req.query.page) || 1;
                    const pageSize = parseInt(req.query.pageSize) || 10;
                    const offset = (page - 1) * pageSize;

                    if (!productState || !products || products.length === 0) {
                        return res.status(200).send({ status: 200, message: GlobalStrings.Messages.NO_MATCHING_RECORDS });
                    }
                    // Add pagination to query
                    queryObj.limit = pageSize;
                    queryObj.offset = offset;

                    const [state, totalCount] = await ProductService.getCount(queryObj);
                    const totalPages = Math.ceil(totalCount / pageSize);

                    return res.status(200).send({
                        status: 200,
                        data: processProductMetrics(products),
                        pagination: {
                            totalItems: totalCount,
                            totalPages: totalPages,
                            currentPage: page,
                            pageSize: pageSize,
                            hasNextPage: page < totalPages,
                            hasPreviousPage: page > 1
                        }
                    });
                } else {
                    // No pagination requested - return all matching records
                    const [productState, products] = await ProductService.getData(queryObj);

                    if (!productState || !products || products.length === 0) {
                        return res.status(200).send({ status: 200, message: GlobalStrings.Messages.NO_MATCHING_RECORDS });
                    }

                    return res.status(200).send({
                        status: 200,
                        data: processProductMetrics(products)
                    });
                }
            }
            else {
                return res.status(400).send({ status: 400, message: GlobalStrings.Messages.INVALID_REQUEST });
            }
        } catch (err) {
            console.error("Error in getProductsGroupId:", err);
            return res.status(500).send({ status: 500, message: GlobalStrings.Messages.SOMETHING_WENT_WRONG });
        }
    },
    //get products based on fsn id
    getProductsFSN: async (req, res) => {
        try {
            if (Object.keys(req.body) && Object.keys(req.body).length > 0 && (req.body.ad_group_id || req.body.campaign_name || req.body.fsn_id || req.body.product_name)) {
                const { campaign_name, ad_group_id, fsn_id, product_name } = req.body;
                let queryObj = {
                    where: { [Op.or]: [] },
                    attributes: ['campaign_name', 'ad_spend', 'views', 'clicks', 'direct_revenue', 'indirect_revenue', 'direct_units', 'indirect_units']
                };
                if (campaign_name) queryObj.where[Op.or].push({ campaign_name });
                if (ad_group_id) queryObj.where[Op.or].push({ ad_group_id });
                if (fsn_id) queryObj.where[Op.or].push({ fsn_id });
                if (product_name) queryObj.where[Op.or].push({ product_name });

                // Search filter (matching across multiple fields)
                if (req.query.search) {
                    queryObj.where[Op.or].push(
                        {
                            [Op.or]: [
                                { campaign_name: { [Op.like]: `%${req.query.search}%` } },
                                { product_name: { [Op.like]: `%${req.query.search}%` } },
                                sequelize.where(
                                    sequelize.cast(sequelize.col('fsn_id'), 'TEXT'), //applies case-insensitive partial string match (LIKE '%search%') to the fsn_id column after converting it to TEXT
                                    { [Op.like]: `%${req.query.search}%` }
                                )
                            ]
                        }
                    );
                }
                // Check if pagination is requested via query params
                if (req.query.page) {
                    // Get paginated data and total count
                    const [productState, products] = await ProductService.getData(queryObj);
                    const page = parseInt(req.query.page) || 1;
                    const pageSize = parseInt(req.query.pageSize) || 10;
                    const offset = (page - 1) * pageSize;

                    if (!productState || !products || products.length === 0) {
                        return res.status(200).send({ status: 200, message: GlobalStrings.Messages.NO_MATCHING_RECORDS });
                    }
                    // Add pagination to query
                    queryObj.limit = pageSize;
                    queryObj.offset = offset;

                    const [state, totalCount] = await ProductService.getCount(queryObj);
                    const totalPages = Math.ceil(totalCount / pageSize);

                    return res.status(200).send({
                        status: 200,
                        data: processProductMetrics(products),
                        pagination: {
                            totalItems: totalCount,
                            totalPages: totalPages,
                            currentPage: page,
                            pageSize: pageSize,
                            hasNextPage: page < totalPages,
                            hasPreviousPage: page > 1
                        }
                    });
                } else {
                    // No pagination requested - return all matching records
                    const [productState, products] = await ProductService.getData(queryObj);

                    if (!productState || !products || products.length === 0) {
                        return res.status(200).send({ status: 200, message: GlobalStrings.Messages.NO_MATCHING_RECORDS });
                    }

                    return res.status(200).send({
                        status: 200,
                        data: processProductMetrics(products)
                    });
                }
            }
            else {
                return res.status(400).send({ status: 400, message:GlobalStrings.Messages.INVALID_REQUEST });
            }
        } catch (err) {
            console.error("Error in getProductsFSN:", err);
            return res.status(500).send({ status: 500, message: GlobalStrings.Messages.SOMETHING_WENT_WRONG });
        }
    },
    //get product data based on product name
    getProductsNameBased: async (req, res) => {
        try {
            if (Object.keys(req.body) && Object.keys(req.body).length > 0 && (req.body.ad_group_id || req.body.campaign_name || req.body.fsn_id || req.body.product_name)) {
                const { campaign_name, ad_group_id, fsn_id, product_name } = req.body;
                const queryObj = {
                    where: { [Op.or]: [] },
                    attributes: ['campaign_name', 'ad_spend', 'views', 'clicks', 'direct_revenue', 'indirect_revenue', 'direct_units', 'indirect_units']
                };
                if (campaign_name) queryObj.where[Op.or].push({ campaign_name });
                if (ad_group_id) queryObj.where[Op.or].push({ ad_group_id });
                if (fsn_id) queryObj.where[Op.or].push({ fsn_id });
                if (product_name) queryObj.where[Op.or].push({ product_name });

                // Search filter (matching across multiple fields)
                if (req.query.search) {
                    queryObj.where[Op.or].push(
                        {
                            [Op.or]: [
                                { campaign_name: { [Op.like]: `%${req.query.search}%` } },
                                { product_name: { [Op.like]: `%${req.query.search}%` } },
                                sequelize.where(
                                    sequelize.cast(sequelize.col('product_name'), 'TEXT'), //applies case-insensitive partial string match (LIKE '%search%') to the product_name column after converting it to TEXT
                                    { [Op.like]: `%${req.query.search}%` }
                                )
                            ]
                        }
                    );
                }
                // Check if pagination is requested via query params
                if (req.query.page) {
                    // Get paginated data and total count
                    const [productState, products] = await ProductService.getData(queryObj);
                    const page = parseInt(req.query.page) || 1;
                    const pageSize = parseInt(req.query.pageSize) || 10;
                    const offset = (page - 1) * pageSize;

                    if (!productState || !products || products.length === 0) {
                        return res.status(200).send({ status: 200, message: GlobalStrings.Messages.NO_MATCHING_RECORDS });
                    }
                    // Add pagination to query
                    queryObj.limit = pageSize;
                    queryObj.offset = offset;

                    const [state, totalCount] = await ProductService.getCount(queryObj);
                    const totalPages = Math.ceil(totalCount / pageSize);

                    return res.status(200).send({
                        status: 200,
                        data: processProductMetrics(products),
                        pagination: {
                            totalItems: totalCount,
                            totalPages: totalPages,
                            currentPage: page,
                            pageSize: pageSize,
                            hasNextPage: page < totalPages,
                            hasPreviousPage: page > 1
                        }
                    });
                } else {
                    // No pagination requested - return all matching records
                    const [productState, products] = await ProductService.getData(queryObj);

                    if (!productState || !products || products.length === 0) {
                        return res.status(200).send({ status: 200, message: GlobalStrings.Messages.NO_MATCHING_RECORDS });
                    }

                    return res.status(200).send({
                        status: 200,
                        data: processProductMetrics(products)
                    });
                }
            }
            else {
                return res.status(400).send({ status: 400, message: GlobalStrings.Messages.INVALID_REQUEST });
            }
        } catch (err) {
            console.error("Error in getProductsNameBased:", err);
            return res.status(500).send({ status: 500, message: GlobalStrings.Messages.SOMETHING_WENT_WRONG });
        }
    },
}
//common function to modify the response for calcualtions
const processProductMetrics = (products) => {
    return products.map(item => {
        const views = parseFloat(item.views) || 0;
        const clicks = parseFloat(item.clicks) || 0;
        const adSpend = parseFloat(item.ad_spend) || 0;
        const directRevenue = parseFloat(item.direct_revenue) || 0;
        const indirectRevenue = parseFloat(item.indirect_revenue) || 0;
        const directUnits = parseFloat(item.direct_units) || 0;
        const indirectUnits = parseFloat(item.indirect_units) || 0;

        // Calculate metrics
        const CTR = views > 0 ? (clicks / views) * 100 : 0;
        const totalRevenue = directRevenue + indirectRevenue;
        const totalOrders = directUnits + indirectUnits;
        const ROAS = adSpend > 0 ? totalRevenue / adSpend : 0;

        return {
            ...item.dataValues,
            CTR: parseFloat(CTR.toFixed(2)),
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            totalOrders,
            ROAS: parseFloat(ROAS.toFixed(2))
        };
    });
};
