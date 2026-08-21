// loggingService.js

import { ChannelType } from 'discord.js';
import { getGuildConfig, updateGuildConfig } from './config/guildConfig.js';
import { logger } from '../utils/logger.js';
import {
  appendContentSection,
  buildLogDescription,
  buildStandardLogEmbed,
  fieldsToLines,
  splitComparisonFields,
} from '../utils/logging/logEmbeds.js';

// Legacy destinations (kept for backward compatibility)
const LOG_DESTINATIONS = ['audit', 'applications', 'reports'];

// All available log categories
const LOG_CATEGORIES = {
  security: { label: 'Security Logs', eventTypes: ['moderation.ban', 'moderation.kick', 'moderation.mute', 'moderation.warn', 'moderation.timeout'] },
  reactions: { label: 'Reaction Logs', eventTypes: ['reactionrole.add', 'reactionrole.remove'] },
  'member-join': { label: 'Member Join', eventTypes: ['member.join'] },
  'member-leave': { label: 'Member Leave', eventTypes: ['member.leave'] },
  boosts: { label: 'Boost Logs', eventTypes: ['giveaway.create', 'giveaway.winner'] },
  nicknames: { label: 'Nickname Logs', eventTypes: ['member.namechange'] },
  messages: { label: 'Message Logs', eventTypes: ['message.delete', 'message.edit', 'message.bulkdelete'] },
  roles: { label: 'Role Logs', eventTypes: ['role.create', 'role.delete', 'role.update'] },
  channels: { label: 'Channel Logs', eventTypes: ['moderation.lock', 'moderation.unlock'] },
  voice: { label: 'Voice Logs', eventTypes: [] }, // For future use
  invites: { label: 'Invite Logs', eventTypes: [] }, // For future use
  timeouts: { label: 'Timeout Logs', eventTypes: ['moderation.timeout', 'moderation.untimeout'] },
  kicks: { label: 'Kick Logs', eventTypes: ['moderation.kick'] },
  bans: { label: 'Ban Logs', eventTypes: ['moderation.ban', 'moderation.unban'] },
};

const EVENT_TYPES = {
  MODERATION_BAN: 'moderation.ban',
  MODERATION_KICK: 'moderation.kick',
  MODERATION_MUTE: 'moderation.mute',
  MODERATION_WARN: 'moderation.warn',
  MODERATION_PURGE: 'moderation.purge',
  MODERATION_TIMEOUT: 'moderation.timeout',
  MODERATION_UNTIMEOUT: 'moderation.untimeout',
  MODERATION_UNBAN: 'moderation.unban',
  MODERATION_LOCK: 'moderation.lock',
  MODERATION_UNLOCK: 'moderation.unlock',
  MODERATION_DM: 'moderation.dm',
  MODERATION_CONFIG: 'moderation.config',

  LEVELING_LEVELUP: 'leveling.levelup',
  LEVELING_MILESTONE: 'leveling.milestone',

  MESSAGE_DELETE: 'message.delete',
  MESSAGE_EDIT: 'message.edit',
  MESSAGE_BULK_DELETE: 'message.bulkdelete',

  ROLE_CREATE: 'role.create',
  ROLE_DELETE: 'role.delete',
  ROLE_UPDATE: 'role.update',

  MEMBER_JOIN: 'member.join',
  MEMBER_LEAVE: 'member.leave',
  MEMBER_NAME_CHANGE: 'member.namechange',

  REACTION_ROLE_ADD: 'reactionrole.add',
  REACTION_ROLE_REMOVE: 'reactionrole.remove',
  REACTION_ROLE_CREATE: 'reactionrole.create',
  REACTION_ROLE_DELETE: 'reactionrole.delete',
  REACTION_ROLE_UPDATE: 'reactionrole.update',

  GIVEAWAY_CREATE: 'giveaway.create',
  GIVEAWAY_WINNER: 'giveaway.winner',
  GIVEAWAY_REROLL: 'giveaway.reroll',
  GIVEAWAY_DELETE: 'giveaway.delete',

  COUNTER_UPDATE: 'counter.update',
  COUNTER_CONFIG: 'counter.config',

  APPLICATION_SUBMIT: 'application.submit',
  APPLICATION_REVIEW: 'application.review',

  REPORT_FILE: 'report.file',
};

const EVENT_COLORS = {
  'moderation.ban': 0x721919,
  'moderation.kick': 0xFFA500,
  'moderation.mute': 0xF1C40F,
  'moderation.warn': 0xFEE75C,
  'moderation.purge': 0xE67E22,
  'moderation.timeout': 0xF1C40F,
  'moderation.untimeout': 0x2ecc71,
  'moderation.unban': 0x3498db,
  'moderation.lock': 0xE67E22,
  'moderation.unlock': 0x2ecc71,
  'moderation.dm': 0x3498db,
  'moderation.config': 0x5865F2,
  'leveling.levelup': 0x00ff00,
  'leveling.milestone': 0xFFD700,
  'message.delete': 0x8b0000,
  'message.edit': 0xFFA500,
  'message.bulkdelete': 0xFF0000,
  'role.create': 0x2ecc71,
  'role.delete': 0xe74c3c,
  'role.update': 0x3498db,
  'member.join': 0x2ecc71,
  'member.leave': 0xe74c3c,
  'member.namechange': 0x3498db,
  'reactionrole.add': 0x2ecc71,
  'reactionrole.remove': 0xe74c3c,
  'reactionrole.create': 0x3498db,
  'reactionrole.delete': 0x8b0000,
  'reactionrole.update': 0xFFA500,
  'giveaway.create': 0x57F287,
  'giveaway.winner': 0xFEE75C,
  'giveaway.reroll': 0x3498DB,
  'giveaway.delete': 0xE74C3C,
  'counter.update': 0x0099ff,
  'counter.config': 0x5865F2,
  'application.submit': 0x5865F2,
  'application.review': 0x57F287,
  'report.file': 0xED4245,
};

const EVENT_ICONS = {
  'moderation.ban': '🔨',
  'moderation.kick': '👢',
  'moderation.mute': '🔇',
  'moderation.warn': '⚠️',
  'moderation.purge': '🗑️',
  'moderation.timeout': '⏳',
  'moderation.untimeout': '✅',
  'moderation.unban': '🔓',
  'moderation.lock': '🔒',
  'moderation.unlock': '🔓',
  'moderation.dm': '✉️',
  'moderation.config': '⚙️',
  'leveling.levelup': '📈',
  'leveling.milestone': '🏆',
  'message.delete': '❌',
  'message.edit': '✏️',
  'message.bulkdelete': '🗑️',
  'role.create': '➕',
  'role.delete': '➖',
  'role.update': '🔄',
  'member.join': '👋',
  'member.leave': '👋',
  'member.namechange': '🏷️',
  'reactionrole.add': '✅',
  'reactionrole.remove': '❌',
  'reactionrole.create': '🎭',
  'reactionrole.delete': '🗑️',
  'reactionrole.update': '🔄',
  'giveaway.create': '🎁',
  'giveaway.winner': '🎉',
  'giveaway.reroll': '🔄',
  'giveaway.delete': '🗑️',
  'counter.update': '📊',
  'counter.config': '⚙️',
  'application.submit': '📝',
  'application.review': '📋',
  'report.file': '🚨',
};

const CATEGORY_DESTINATION = {
  application: 'applications',
  report: 'reports',
};

/**
 * Get the category for a given event type
 * @param {string} eventType - The event type (e.g., 'moderation.ban')
 * @returns {string|null} The category or null if not found
 */
function getCategoryForEventType(eventType) {
  for (const [category, config] of Object.entries(LOG_CATEGORIES)) {
    if (config.eventTypes.includes(eventType)) {
      return category;
    }
  }
  return null;
}

export function resolveLogChannel(config, destination) {
  const channels = config?.logging?.channels || {};
  if (destination && channels[destination]) {
    return channels[destination];
  }
  if (destination === 'audit') {
    return channels.audit ?? config?.logging?.channelId ?? config?.logChannelId ?? null;
  }
  return channels[destination] ?? null;
}

export function getIgnoreList(config) {
  return config?.logging?.ignore ?? config?.logIgnore ?? { users: [], channels: [] };
}

export function isEventEnabled(config, eventType) {
  if (!config?.logging?.enabled) {
    return false;
  }

  if (!eventType || typeof eventType !== 'string') {
    return false;
  }

  const category = eventType.split('.')[0];
  const enabledEvents = config.logging.enabledEvents || {};

  if (enabledEvents[eventType] === false) {
    return false;
  }

  if (enabledEvents[`${category}.*`] === false) {
    return false;
  }

  return true;
}

function getLogChannelForEvent(config, eventType, overrideChannelId = null) {
  if (overrideChannelId) {
    return overrideChannelId;
  }

  const channels = config?.logging?.channels || {};

  // First, try to find a per-category channel
  const category = getCategoryForEventType(eventType);
  if (category && channels[category]) {
    return channels[category];
  }

  // Fallback to legacy destinations (application/report)
  const legacyCategory = eventType?.split('.')[0];
  const destination = CATEGORY_DESTINATION[legacyCategory] || 'audit';
  return resolveLogChannel(config, destination);
}

export async function logEvent({
  client,
  guildId,
  eventType,
  data = {},
  attachments = [],
  content = null,
  channelId: overrideChannelId = null,
}) {
  try {
    const guild = client.guilds.cache.get(guildId) ||
      await client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      logger.warn(`logEvent: Guild not found: ${guildId}`);
      return null;
    }

    const config = await getGuildConfig(client, guildId);
    const ignore = getIgnoreList(config);

    if (data?.userId && ignore.users?.includes(data.userId)) {
      return null;
    }
    if (data?.channelId && ignore.channels?.includes(data.channelId)) {
      return null;
    }

    if (!isEventEnabled(config, eventType)) {
      return null;
    }

    const logChannelId = getLogChannelForEvent(config, eventType, overrideChannelId);
    if (!logChannelId) {
      return null;
    }

    const channel = guild.channels.cache.get(logChannelId) ||
      await guild.channels.fetch(logChannelId).catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildText) {
      logger.warn(`logEvent: Invalid log channel ${logChannelId} for guild ${guildId}`);
      return null;
    }

    const permissions = channel.permissionsFor(guild.members.me);
    if (!permissions || !permissions.has(['SendMessages', 'EmbedLinks'])) {
      logger.warn(`logEvent: Missing permissions in channel ${logChannelId}`);
      return null;
    }

    const embed = createLogEmbed(guild, eventType, data);

    const messageOptions = { embeds: [embed] };
    if (content) {
      messageOptions.content = content;
    }
    if (attachments.length > 0) {
      messageOptions.files = attachments;
    }

    const sent = await channel.send(messageOptions);
    logger.info(`Event logged: ${eventType} in guild ${guildId}`);
    return sent;
  } catch (error) {
    logger.error('Error in logEvent:', error);
    return null;
  }
}

function createLogEmbed(guild, eventType, data) {
  const color = data.color ?? EVENT_COLORS[eventType] ?? 0x0099ff;
  const icon = EVENT_ICONS[eventType] || '📌';
  const title = data.title || `${icon} ${formatEventType(eventType)}`;

  const inlineFields = [];
  let description = data.description || '';

  if (data.lines?.length) {
    description = buildLogDescription({
      headline: data.headline || description || undefined,
      lines: data.lines,
      quoted: data.quoted !== false,
      meta: data.meta,
    });

    if (data.fields?.length) {
      const { before, after } = splitComparisonFields(data.fields);
      if (before !== null) inlineFields.push({ name: 'Before', value: before, inline: true });
      if (after !== null) inlineFields.push({ name: 'After', value: after, inline: true });
    }
  } else if (data.fields?.length) {
    const { before, after, rest } = splitComparisonFields(data.fields);

    if (before !== null || after !== null) {
      const metaLines = fieldsToLines(rest);
      description = buildLogDescription({
        headline: description || undefined,
        lines: metaLines,
        quoted: true,
      });

      if (before !== null) {
        inlineFields.push({ name: 'Before', value: before, inline: true });
      }
      if (after !== null) {
        inlineFields.push({ name: 'After', value: after, inline: true });
      }
    } else {
      description = buildLogDescription({
        headline: description || undefined,
        lines: fieldsToLines(data.fields),
        quoted: data.quoted ?? !description,
      });
    }
  } else if (data.meta?.length) {
    description = buildLogDescription({
      headline: description || undefined,
      meta: data.meta,
    });
  }

  if (data.section?.body) {
    description = appendContentSection(description, data.section.title || 'Message', data.section.body);
  }

  if (data.inlineFields?.length) {
    inlineFields.push(...data.inlineFields);
  }

  return buildStandardLogEmbed({
    color,
    title,
    description: description || undefined,
    thumbnail: data.thumbnail || undefined,
    inlineFields,
    fields: data.blockFields || [],
    author: data.author || null,
    timestamp: true,
    footer: data.footer || { text: guild.name, iconURL: guild.iconURL({ dynamic: true }) || undefined },
  });
}

function formatEventType(eventType) {
  if (!eventType || typeof eventType !== 'string') {
    return 'Unknown Event';
  }

  return eventType
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function getLoggingStatus(client, guildId) {
  const config = await getGuildConfig(client, guildId);
  const logging = config.logging || {};

  return {
    enabled: logging.enabled || false,
    channels: logging.channels || {},
    channelId: logging.channels?.audit ?? null,
    ignore: getIgnoreList(config),
    enabledEvents: logging.enabledEvents || {},
    allEventTypes: EVENT_TYPES,
    categories: LOG_CATEGORIES,
  };
}

export async function toggleEventLogging(client, guildId, eventTypes, enabled) {
  try {
    const config = await getGuildConfig(client, guildId);
    const logging = { ...config.logging, enabledEvents: { ...(config.logging?.enabledEvents || {}) } };
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];

    types.forEach((type) => {
      if (type.endsWith('.*')) {
        const category = type.replace('.*', '');
        const matchingTypes = Object.values(EVENT_TYPES).filter(
          (eventType) => eventType.startsWith(`${category}.`),
        );
        matchingTypes.forEach((eventType) => {
          logging.enabledEvents[eventType] = enabled;
        });
        logging.enabledEvents[type] = enabled;
      } else {
        logging.enabledEvents[type] = enabled;
      }
    });

    await updateGuildConfig(client, guildId, { logging });
    return true;
  } catch (error) {
    logger.error('Error toggling event logging:', error);
    return false;
  }
}

/**
 * Set a log channel for a category (new) or destination (legacy)
 * Supports both per-category channels and legacy destination channels
 * @param {*} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} categoryOrDest - Category name (e.g., 'security', 'bans') or legacy destination ('audit', 'applications', 'reports')
 * @param {string|null} channelId - Channel ID or null to disable
 */
export async function setLogChannel(client, guildId, categoryOrDest, channelId) {
  // Allow both new categories and legacy destinations
  const isValidCategory = Object.keys(LOG_CATEGORIES).includes(categoryOrDest);
  const isValidDestination = LOG_DESTINATIONS.includes(categoryOrDest);

  if (!isValidCategory && !isValidDestination) {
    throw new Error(`Invalid log category or destination: ${categoryOrDest}`);
  }

  try {
    const config = await getGuildConfig(client, guildId);
    const logging = {
      ...config.logging,
      channels: { ...(config.logging?.channels || {}), [categoryOrDest]: channelId },
    };

    if (channelId) {
      logging.enabled = true;
    }

    await updateGuildConfig(client, guildId, { logging });
    return true;
  } catch (error) {
    logger.error('Error setting log channel:', error);
    return false;
  }
}

/** @deprecated Use setLogChannel(client, guildId, 'audit', channelId) */
export async function setLoggingChannel(client, guildId, channelId) {
  return setLogChannel(client, guildId, 'audit', channelId);
}

export async function setLoggingEnabled(client, guildId, enabled) {
  try {
    const config = await getGuildConfig(client, guildId);
    const logging = { ...config.logging, enabled };
    await updateGuildConfig(client, guildId, { logging });
    return true;
  } catch (error) {
    logger.error('Error setting logging enabled:', error);
    return false;
  }
}

export async function updateIgnoreList(client, guildId, { action, type, id }) {
  try {
    const config = await getGuildConfig(client, guildId);
    const ignore = { ...getIgnoreList(config) };
    const listKey = type === 'user' ? 'users' : 'channels';
    const current = [...(ignore[listKey] || [])];

    if (action === 'add' && !current.includes(id)) {
      current.push(id);
    } else if (action === 'remove') {
      const index = current.indexOf(id);
      if (index !== -1) {
        current.splice(index, 1);
      }
    }

    ignore[listKey] = current;

    const logging = { ...config.logging, ignore };
    await updateGuildConfig(client, guildId, { logging });
    return true;
  } catch (error) {
    logger.error('Error updating ignore list:', error);
    return false;
  }
}

export function resolveApplicationLogChannel(config, roleSettings = {}, appSettings = {}) {
  return roleSettings.logChannelId
    || config?.logging?.channels?.applications
    || appSettings.logChannelId
    || null;
}

export { EVENT_TYPES, EVENT_COLORS, EVENT_ICONS, LOG_DESTINATIONS, LOG_CATEGORIES };
