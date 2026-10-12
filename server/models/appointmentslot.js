'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AppointmentSlot extends Model {
    static associate(models) {
      // define association here if needed
    }
  }
  AppointmentSlot.init({
    destination: {
      type: DataTypes.STRING,
      allowNull: false
    },
    consular_city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    center_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    earliest_date: {
      type: DataTypes.STRING,
      allowNull: false
    },
    appointment_type: {
      type: DataTypes.STRING,
      defaultValue: 'Standard'
    },
    slots_status: {
      type: DataTypes.STRING,
      defaultValue: 'Available'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'AppointmentSlot',
    tableName: 'AppointmentSlots'
  });
  return AppointmentSlot;
};
