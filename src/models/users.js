const { DataTypes } = require("sequelize");

exports.getSchema = function() {
  return {
    user_id: { type: DataTypes.CHAR(36),primaryKey: true,defaultValue: DataTypes.UUIDV4 },
    user_name: {type: DataTypes.STRING},
    email_id:{ type: DataTypes.STRING},
    password:{type: DataTypes.STRING}
  };
};

exports.getTableName = function(){
  return {
    tableName:'users'
  }
};