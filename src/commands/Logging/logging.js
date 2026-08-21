import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

import dashboard from './modules/logging_dashboard.js';
import channel from './modules/logging_channel.js';

import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
export default {
    data: new SlashCommandBuilder()
        .setName('logging')
        .setDescription('Manage server logging — channels, filters, and event categories.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false)
        .addSubcommand((subcommand) =>
            subcommand
                .setName('dashboard')
                .setDescription('Open the logging dashboard — set channels, filters, and toggle categories.'),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('channel')
                .setDescription('Quick-set a log channel without opening the dashboard.')
                .addStringOption((option) =>
                    option
                        .setName('category')
                        .setDescription('Which log category to configure.')
                        .setRequired(true)
                        .addChoices(
                            { name: '🔒 Security Logs', value: 'security' },
                            { name: '😊 Reaction Logs', value: 'reactions' },
                            { name: '👋 Member Join', value: 'member-join' },
                            { name: '👋 Member Leave', value: 'member-leave' },
                            { name: '🎁 Boost Logs', value: 'boosts' },
                            { name: '🏷️ Nickname Logs', value: 'nicknames' },
                            { name: '💬 Message Logs', value: 'messages' },
                            { name: '🔘 Role Logs', value: 'roles' },
                            { name: '🔒 Channel Logs', value: 'channels' },
                            { name: '🔊 Voice Logs', value: 'voice' },
                            { name: '📨 Invite Logs', value: 'invites' },
                            { name: '⏳ Timeout Logs', value: 'timeouts' },
                            { name: '👢 Kick Logs', value: 'kicks' },
                            { name: '🔨 Ban Logs', value: 'bans' },
                        ),
                )
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('The text channel for logs.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false),
                )
                .addBooleanOption((option) =>
                    option
                        .setName('disable')
                        .setDescription('Set to True to clear this log channel.')
                        .setRequired(false),
                ),
        ),

    async execute(interaction, config, client) {
        try {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'dashboard') {
                return await dashboard.execute(interaction, config, client);
            }

            if (subcommand === 'channel') {
                return await channel.execute(interaction, config, client);
            }

            await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'This subcommand is not recognised.' });
        } catch (error) {
            logger.error('logging command error:', error);
            await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'An unexpected error occurred.' }).catch(() => {});
        }
    },
};
