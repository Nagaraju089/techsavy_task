const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const UserService = require('../../services/users/users.services');
const GlobalStrings = require('../../../GlobalStrings');

module.exports = {
    //add user
    add: async (req, res) => {
        try {
            //check the request body for object which has keys user_name, email_id, password
            if (Object.keys(req.body) && Object.keys(req.body).length > 0 && req.body.user_name && req.body.email_id && req.body.password) {
                if (req.body.password.length > 8) {
                    // Hash password using jwt bcrypt
                    const hashedPassword = await bcrypt.hash(req.body.password, 10);
                    const userData = { ...req.body, password: hashedPassword };
                    let [state, result] = await UserService.insertData(userData);
                    return res.status(200).send({ status: 200, data: result })
                }
                else {
                    return res.status(400).send({ status: 400, message: GlobalStrings.Messages.VALID_PASSWORD_MESSAGE });
                }
            }
            else {
                return res.status(400).send({ status: 400, message: GlobalStrings.Messages.INVALID_REQUEST });
            }
        } catch (err) {
            return res.status(500).send({ status: 500, message: err.message });
        }
    },
    //get users data, if  one user data to be retrieved, query user_id can be passed
    getUserData: async (req, res) => {
        try {
            let queryObj = {};
            if (req.query && req.query.user_id) {
                queryObj.where = { user_id: req.query.user_id };
            }
            let [userState, userData] = await UserService.getData(queryObj);
            if (userState && userData.length > 0) {
                return res.status(200).send({ status: 200, data: userData });
            }
            else {
                return res.status(200).send({ status: 200, message: GlobalStrings.Messages.NO_USERS });
            }
        } catch (err) {
            return res.status(500).send({ status: 500, message: err.message });
        }
    },
    //update user data
    updateUser: async (req, res) => {
        try {
            if (Object.keys(req.body) && Object.keys(req.body).length > 0 && (req.body.user_name || req.body.email_id)) {
                let [updateState, updatedUser] = await UserService.update(req.params.user_id, req.body);
                if (updateState) {
                    return res.status(200).send({ status: 200, message: GlobalStrings.Messages.UPDATE_SUCCESS });
                }
                else {
                    return res.status(200).send({ status: 200, message: updatedUser });
                }
            }
            else {
                return res.status(400).send({ status: 400, message: GlobalStrings.Messages.UDATE_FAIL });
            }
        } catch (err) {
            return res.status(500).send({ status: 500, message: err.message });
        }
    },
    //delete user(hard delete)
    deleteUser: async (req, res) => {
        try {
            let [userState, userData] = await UserService.delete(req.params.user_id);
            return res.status(200).send({ status: 200, message: userData });
        } catch (err) {
            return res.status(500).send({ status: 500, message: err.message });
        }
    },
    login: async (req, res) => {
        try {
            if (Object.keys(req.body) && Object.keys(req.body).length > 0 && req.body.user_name && req.body.password) {
                let [userState, userData] = await UserService.getData({ where: { user_name: req.body.user_name }, attributes: ['user_name', 'user_id', 'password', 'email_id'] }) //check user add user already exists
                if (userState && userData.length > 0) {
                    let userInfo = JSON.parse(JSON.stringify(userData[0]));
                    let passwordMatch = await bcrypt.compare(req.body.password, userInfo.password);
                    if (passwordMatch) {
                        jwt.sign({ user_id: userInfo.user_id, email_id: userInfo.email_id }, process.env.JWT_SECRET, { expiresIn: (24 * 60 * 60) }, (err, token) => {
                            if (err) {
                                return res.status(400).send({ status: 400, message: err.message });
                            }
                            else {
                                return res.status(200).send({ status: 200, message: GlobalStrings.Messages.LOGIN_SUCCESS, token: token });
                            }
                        });
                    }
                    else {
                        return res.status(401).send({ status: 401, message: GlobalStrings.Messages.INCORRECT_PASS });
                    }
                }
                else {
                    return res.status(200).send({ status: 200, message: GlobalStrings.Messages.NO_USERS });
                }
            }
            else {
                return res.status(400).send({ status: 400, message: GlobalStrings.Messages.INVALID_REQUEST });
            }
        } catch (err) {
            return res.status(500).send({ status: 500, message: err.message });
        }
    }
}