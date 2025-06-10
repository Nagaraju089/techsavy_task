let express = require('express');
let router =  express.Router();

//user
router.use('/user', require('./users/user.router'));
//products
router.use('/products', require('./products/product.router'));

module.exports = router;