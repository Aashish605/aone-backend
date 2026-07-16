'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. user
    await queryInterface.createTable('user', {
      id: { type: Sequelize.TEXT, primaryKey: true },
      name: { type: Sequelize.TEXT, allowNull: false },
      email: { type: Sequelize.TEXT, allowNull: false },
      emailVerified: { type: Sequelize.BOOLEAN, allowNull: false },
      image: { type: Sequelize.TEXT, allowNull: true },
      isAdmin: { type: Sequelize.BOOLEAN, allowNull: false },
      contact: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // 2. channels
    await queryInterface.createTable('channels', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      type: { type: Sequelize.ENUM('facebook', 'instagram', 'whatsapp'), allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      external_account_id: { type: Sequelize.STRING, allowNull: false },
      access_token: { type: Sequelize.TEXT, allowNull: true },
      webhook_verify_token: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.ENUM('active', 'disconnected'), allowNull: false, defaultValue: 'active' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 3. customers
    await queryInterface.createTable('customers', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: true },
      email: { type: Sequelize.STRING, allowNull: true },
      phone: { type: Sequelize.STRING, allowNull: true },
      avatar_url: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 4. customer_channel_identities
    await queryInterface.createTable('customer_channel_identities', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      customer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onDelete: 'CASCADE',
      },
      channel_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'channels', key: 'id' },
        onDelete: 'CASCADE',
      },
      external_user_id: { type: Sequelize.STRING, allowNull: false },
      raw_profile: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('customer_channel_identities', ['channel_id', 'external_user_id'], {
      unique: true,
      name: 'uq_channel_external_user',
    });

    // 5. conversations
    await queryInterface.createTable('conversations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      customer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onDelete: 'CASCADE',
      },
      channel_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'channels', key: 'id' },
        onDelete: 'CASCADE',
      },
      assigned_agent_id: { type: Sequelize.STRING, allowNull: true },
      status: {
        type: Sequelize.ENUM('open', 'pending', 'closed', 'snoozed'),
        allowNull: false,
        defaultValue: 'open',
      },
      last_message_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 6. messages
    await queryInterface.createTable('messages', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      conversation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'conversations', key: 'id' },
        onDelete: 'CASCADE',
      },
      sender_type: {
        type: Sequelize.ENUM('customer', 'agent', 'bot'),
        allowNull: false,
      },
      sender_id: { type: Sequelize.UUID, allowNull: true },
      external_message_id: { type: Sequelize.STRING, allowNull: true },
      content: { type: Sequelize.TEXT, allowNull: true },
      message_type: {
        type: Sequelize.ENUM('text', 'image', 'video', 'audio', 'file', 'template'),
        allowNull: false,
        defaultValue: 'text',
      },
      media_url: { type: Sequelize.STRING, allowNull: true },
      status: {
        type: Sequelize.ENUM('sent', 'delivered', 'read', 'failed'),
        allowNull: false,
        defaultValue: 'sent',
      },
      raw_payload: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 7. webhook_events
    await queryInterface.createTable('webhook_events', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      channel_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'channels', key: 'id' },
        onDelete: 'SET NULL',
      },
      payload: { type: Sequelize.JSONB, allowNull: false },
      processed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('webhook_events');
    await queryInterface.dropTable('messages');
    await queryInterface.dropTable('conversations');
    await queryInterface.dropTable('customer_channel_identities');
    await queryInterface.dropTable('customers');
    await queryInterface.dropTable('channels');
    await queryInterface.dropTable('user');
  },
};
