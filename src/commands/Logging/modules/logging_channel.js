import { PermissionsBitField, ChannelType } from 'discord.js';
import { setLogChannel } from '../../../services/loggingService.js';
import { successEmbed } from '../../../utils/embeds.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';

import { replyUserError, ErrorTypes } from '../../../utils/errorHandler.js';

// All available log categories mapped to user-friendly labels
const LOG_CATEGORIES = {
  security: 'Security Logs',
  reactions: 'Reaction Logs',
  'member-join': 'Member Join',
  'member-leave': 'Member Leave',
  boosts: 'Boost Logs',
  nicknames: 'Nickname Logs',
  messages: 'Message Logs',
  roles: 'Role Logs',
  channels: 'Channel Logs',
  voice: 'Voice Logs',
  invites: 'Invite Logs',
  timeouts: 'Timeout Logs',
  kicks: 'Kick Logs',
  bans: 'Ban Logs',
};

export default {
  prefixOnly: false,
  async execute(interaction, config, client) {
    try {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'You need **Manage Server** permissions to configure logging channels.' });
      }

      await InteractionHelper.safeDefer(interaction, { ephemeral: true });

      const category = interaction.options.getString('category');
      const channel = interaction.options.getChannel('channel');
      const disable = interaction.options.getBoolean('disable') ?? false;

      if (disable) {
        await setLogChannel(client, interaction.guildId, category, null);
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [successEmbed(
            'Channel Cleared',
            `The **${LOG_CATEGORIES[category]}** channel has been removed.`,
          )],
        });
      }

      if (!channel || channel.type !== ChannelType.GuildText) {
        return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'Please provide a valid text channel.' });
      }

      const botPerms = channel.permissionsFor(interaction.guild.members.me);
      if (!botPerms?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
        return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: `I need **View Channel**, **Send Messages**, and **Embed Links** in ${channel}.` });
      }

      await setLogChannel(client, interaction.guildId, category, channel.id);

      return InteractionHelper.safeEditReply(interaction, {
        embeds: [successEmbed(
          'Channel Updated',
          `**${LOG_CATEGORIES[category]}** logs will be sent to ${channel}.\nUse \`/logging dashboard\` to toggle event categories.`,
        )],
      });
    } catch (error) {
      logger.error('logging_channel error:', error);
      await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Failed to update the log channel.' });
    }
  },
};

export { LOG_CATEGORIES };
