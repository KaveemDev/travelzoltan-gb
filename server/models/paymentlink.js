'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PaymentLink extends Model {
    static associate(models) {
      // Standalone model for custom payment links created by admin
    }
  }

  PaymentLink.init(
    {
      link_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      short_url: {
        type: DataTypes.STRING,
        allowNull: false
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'GBP'
      },
      customer_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      customer_email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      customer_phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      reference_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'created'
      },
      payment_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      notes: {
        type: DataTypes.JSON,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'PaymentLink',
      tableName: 'PaymentLinks',
      underscored: true,
      timestamps: true
    }
  );

  return PaymentLink;
};
