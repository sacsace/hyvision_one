'use strict';

/**
 * work_board_lists.description / assignee_user_id
 * (모델·런타임 ensure와 스키마 일치)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('work_board_lists').catch(() => null);
    if (!table) return;

    if (!table.description) {
      await queryInterface.addColumn('work_board_lists', 'description', {
        type: Sequelize.STRING(500),
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!table.assignee_user_id) {
      await queryInterface.addColumn('work_board_lists', 'assignee_user_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      await queryInterface
        .addIndex('work_board_lists', ['assignee_user_id'], {
          name: 'work_board_lists_assignee_user_id_idx',
        })
        .catch(() => {});
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('work_board_lists').catch(() => null);
    if (!table) return;
    if (table.description) {
      await queryInterface.removeColumn('work_board_lists', 'description');
    }
    if (table.assignee_user_id) {
      await queryInterface
        .removeIndex('work_board_lists', 'work_board_lists_assignee_user_id_idx')
        .catch(() => {});
      await queryInterface.removeColumn('work_board_lists', 'assignee_user_id');
    }
  },
};
