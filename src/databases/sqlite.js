const Sequelize = require('sequelize');
const fs = require('fs');
const Path = require('path');
const models = {};
let SqliteConnection = null;

// Import all model definitions
const Users = require('../models/users');
const Products = require('../models/products');

const DB_PATH = Path.resolve(__dirname, '../../database.sqlite');

exports.connect = async function () {
    return new Promise((resolve) => {
        try {
            const sequelize = new Sequelize({
                dialect: 'sqlite',
                storage: DB_PATH,
                logging: false,
                define: {
                    charset: 'utf8',
                    collate: 'utf8_general_ci',
                    timestamps: false
                }
            });

            // Define models
           models.Users = sequelize.define('Users', Users.getSchema(), Users.getTableName());
           models.Products = sequelize.define('Products', Products.getSchema(), Products.getTableName());

            sequelize.sync({ alter: true }).then(() => {
                SqliteConnection = sequelize;
                resolve([true, SqliteConnection]);
            }).catch(err => {
               console.log("SQLite error: ", err.message);
                resolve([false, err]);
            });

        } catch (err) {
            console.log(`Error connecting to SQLite: ${err.message}`);
            resolve([false, err]);
        }
    });
};

exports.getModels = () => models;
exports.getSqliteConnection = () => SqliteConnection;
exports.MysqlColse = async function () {
    return new Promise((resolve) => {
        try {
            if (SqliteConnection) {
                SqliteConnection.close();
                resolve([true, {}]);
            } else {
                resolve([false, {}]);
            }
        } catch (err) {
            console.log(`Error connecting to SQLite: ${err.message}`);
            resolve([false, {}]);
        }
    });
};
