const {getModels} = require('../../databases/sqlite');

module.exports = {
    //insert data into sqlite
    insertData: async function (obj) {
        try {
            const models = getModels();
            let userData = await models.Users.findAll({ where: {user_name: obj.user_name } });
            if(userData.length > 0) {
                return [false, 'User already exists'];
            }
            else {
                const details = await models.Users.build(obj).save();
                return [true, details]
            }
        } catch (err) {
            console.error('Error inserting data:', err);
            return [false, err];
        }
    },
    //get data based on query
    getData: async function (queryObj) {
        try {
            const models = getModels();
            const details = await models.Users.findAll(queryObj);
            if (details.length > 0) {
                return [true, details];
            }
            return [true, []];
        } catch (err) {
            console.error('Error fetching data:', err);
            return [false, err];
        }
    },
    //update the user data
    update: async function (id, obj) {
        if (!obj) return [false, 'Invalid input'];
        try {
            const models = getModels();
            const user = await models.Users.findOne({ where: { user_id: id } });
            if (user !== null) {
                const result = await user.update(obj);
                return [true, ''];
            }
            else {
                return [false, 'User not found']
            }
        } catch (err) {
            console.error('Error updating user:', err);
            return [false, err.message || err];
        }
    },
    //delete the user
    delete: async function (user_id) {
        try {
            const models = getModels();
            const user = await models.Users.findOne({ where: { user_id: user_id } });
            if (!user) return [false, 'User not found'];
            await user.destroy(); 
            return [true, 'User deleted successfully'];
        } catch (err) {
            console.error('Error deleting user:', err);
            return [false, err.message || err];
        }
    }
};