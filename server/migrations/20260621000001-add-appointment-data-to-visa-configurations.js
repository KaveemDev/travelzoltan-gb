'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('VisaConfigurations', 'appointment_data', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null
      });
    } catch (e) {
      console.warn('[Migration] Could not add appointment_data column (may already exist):', e.message);
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn('VisaConfigurations', 'appointment_data');
    } catch (e) {
      console.warn('[Migration] Could not remove appointment_data column:', e.message);
    }
  }
};
