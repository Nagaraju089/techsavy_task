const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
dotenv.config();
const GlobalStrings = require('../../GlobalStrings');

module.exports = {
    authMiddleware: async (req, res, next) => {
        try {
            //check if session token is present in request headers
            if (req.headers && req.headers.session_token) {
                let session_token = req.headers.session_token;
                //token verification using jwt verify if not expired next() is called otherwise user session expired is sent in response
                jwt.verify(session_token, process.env.JWT_SECRET, function (err, decoded) {
                    if (decoded !== undefined) {
                        req.headers.user_id = decoded.user_id;
                        next();
                    }
                    else {
                        return res.status(401).send({ status: 401, message: GlobalStrings.Messages.SESSION_EXP });
                    }
                });
            }
            else {
                return res.status(400).send({ status: 400, message: GlobalStrings.Messages.INVALID_REQUEST });
            }
        } catch (err) {
            console.log(err)
            return res.status(500).send({ status: 500, message: GlobalStrings.Messages.SOMETHING_WENT_WRONG });
        }
    }
}