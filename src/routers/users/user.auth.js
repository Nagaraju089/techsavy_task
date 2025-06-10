let express = require('express');
let router = express.Router();
let UserController = require('../../controllers/users/user.controller');

router.post('/user-login', UserController.login); //user login route, pass user_name and password in body object

module.exports = router;