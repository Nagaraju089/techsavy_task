let express = require('express');
let router = express.Router(); 
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
let ProductController = require('../../controllers/products/product.controller');
let authMiddleware = require('../../middleware/auth.middleware');

router.post('/upload-csv', authMiddleware.authMiddleware, upload.single('file'), ProductController.uploadFile); //upload csv file route
router.post('/report/campaign', authMiddleware.authMiddleware, ProductController.getCampaignData); //get products data based on campaign name or ad_group_id, fsn_id, product_name
router.post('/report/adGroupID', authMiddleware.authMiddleware, ProductController.getProductsGroupId); //get products data based on ad_group_id
router.post('/report/fsnID', authMiddleware.authMiddleware, ProductController.getProductsFSN); //get products data based on fsn number
router.post('/report/productName', authMiddleware.authMiddleware, ProductController.getProductsNameBased); //get products data based on product name

module.exports = router;