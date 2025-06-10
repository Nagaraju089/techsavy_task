const { DataTypes } = require("sequelize");

exports.getSchema = function() {
  return {
    campaign_id: { type: DataTypes.STRING(36),primaryKey: true },
    campaign_name: { type: DataTypes.STRING },
    ad_group_id:{ type: DataTypes.STRING},
    fsn_id: { type: DataTypes.STRING },
    product_name: { type: DataTypes.STRING},
    ad_spend: { type:DataTypes.STRING },
    views: { type: DataTypes.STRING },
    clicks: { type: DataTypes.STRING },
    direct_units: { type: DataTypes.STRING },
    indirect_units: { type: DataTypes.STRING },
    direct_revenue: { type: DataTypes.STRING },
    indirect_revenue: { type: DataTypes.STRING }
  };
};

exports.getTableName = function(){
  return {
    indexes:[{
      name:'keys_index',
      index:true,
      fields:['campaign_name','ad_group_id', 'fsn_id']
    }],
    tableName:'products',
  }
};