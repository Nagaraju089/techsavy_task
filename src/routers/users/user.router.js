let express = require('express');
let router = express.Router();
let UserController = require('../../controllers/users/user.controller');
let authMiddleware = require('../../middleware/auth.middleware');

router.post('/user-login', UserController.login); //user login route, pass user_name and password in body object
router.post('/user-add', authMiddleware.authMiddleware, UserController.add); //add user 
router.get('/get-user', authMiddleware.authMiddleware, UserController.getUserData); //get user data
router.put('/user-update/:user_id', authMiddleware.authMiddleware, UserController.updateUser); // update user data
router.post('/user-delete/:user_id', authMiddleware.authMiddleware, UserController.deleteUser); // delete user data

module.exports = router;