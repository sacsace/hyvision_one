'use strict';

/** users.pf_calc_mode: cap_1800 | basic_12pct | total_12pct */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');
    if (!table.pf_calc_mode) {
      await queryInterface.addColumn('users', 'pf_calc_mode', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'cap_1800',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('users');
    if (table.pf_calc_mode) {
      await queryInterface.removeColumn('users', 'pf_calc_mode');
    }
  },
};
