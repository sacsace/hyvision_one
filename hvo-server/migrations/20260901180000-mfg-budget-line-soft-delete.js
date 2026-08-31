'use strict';

/** Soft-delete flag for mfg_budget_lines (no hard destroy). */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('mfg_budget_lines').catch(() => null);
    if (!table) return;
    if (!table.is_active) {
      await queryInterface.addColumn('mfg_budget_lines', 'is_active', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('mfg_budget_lines').catch(() => null);
    if (!table?.is_active) return;
    await queryInterface.removeColumn('mfg_budget_lines', 'is_active');
  },
};
