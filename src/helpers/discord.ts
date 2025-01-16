import {
  Message,
  GuildMember,
  PartialMessage,
  Guild,
  MessageReaction,
  PartialMessageReaction,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
  ChatInputCommandInteraction,
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  APIApplicationCommand,
  APIApplicationCommandOption,
  ForumChannel,
  ChannelType,
  GuildTextThreadCreateOptions,
  AutocompleteInteraction,
} from "discord.js";

export const difference = <T>(a: Set<T>, b: Set<T>) =>
  new Set(Array.from(a).filter((x) => !b.has(x)));

const staffRoles = ["moderator", "admin", "admins"];
const helpfulRoles = ["mvp", "star helper"];

const hasRole = (member: GuildMember, roles: string | string[]) =>
  member.roles.cache.some((role) => {
    const normalizedRole = role.name.toLowerCase();
    return typeof roles === "string"
      ? roles === normalizedRole
      : roles.includes(normalizedRole);
  });

export const isStaff = (member: GuildMember | null | undefined) => {
  if (!member) return false;

  return hasRole(member, staffRoles);
};
export const isHelpful = (member: GuildMember | null | undefined) => {
  if (!member) return false;

  return hasRole(member, helpfulRoles);
};
export const isStaffOrHelpful = (member: GuildMember) => {
  return isStaff(member) || isHelpful(member);
};

export const constructDiscordLink = (message: Message | PartialMessage) =>
  `https://discord.com/channels/${message.guild?.id}/${message.channel.id}/${message.id}`;

export const fetchReactionMembers = (
  guild: Guild,
  reaction: MessageReaction | PartialMessageReaction,
) => {
  try {
    return reaction.users
      .fetch()
      .then((users) =>
        Promise.all(users.map((user) => guild.members.fetch(user.id))),
      );
  } catch (e) {
    return Promise.resolve([] as GuildMember[]);
  }
};

export const createPrivateThreadFromMessage = async (
  msg: Message,
  options: GuildTextThreadCreateOptions<ChannelType.PrivateThread>,
) => {
  options = { ...options, type: ChannelType.PrivateThread };
  if (msg.channel.type === ChannelType.GuildText) {
    return msg.channel.threads.create(options);
  }
  if (
    msg.channel.type === ChannelType.PublicThread &&
    msg.channel.parent?.type === ChannelType.GuildText
  ) {
    return msg.channel.parent.threads.create(options);
  }
  throw new Error(
    `Could not create private thread from message. channel: ${msg.channel.id} type: ${msg.channel.type}`,
  );
};

/*
 * Escape a message and insert markdown quote symbols. Returns a string with
 * backticks escaped to render correctly when sent in a quote.
 */
export const quoteMessageContent = (content: string) => {
  const quoted = `> ${content.replace("`", "\\`").replace(/[\n]/g, "\n> ")}`;
  // If it's longer than the character limit, truncate
  if (quoted.length > 2000) {
    return quoted.slice(0, 2000);
  }
  return quoted;
};

/*
 * Escape content that Discord would otherwise do undesireable things with.
 * Sepecifically, suppresses @-mentions and link previews.
 */
export const escapeDisruptiveContent = (content: string) => {
  return (
    content
      // Silence pings
      .replace(/@(\S*)(\s)?/g, "@ $1$2")
      // Wrap links in <> so they don't make a preview
      .replace(/(https?:\/\/.*)\s?/g, "<$1>")
  );
};

export const quoteAndEscape = (content: string) => {
  return escapeDisruptiveContent(quoteMessageContent(content));
};

export const mapAppliedTagsToTagNames = (
  appliedTags: string[],
  channel: ForumChannel,
) => {
  const { availableTags: tags } = channel;
  const tagLookup = new Map(tags.map((e) => [e.id, e]));

  return appliedTags.map((id) => tagLookup.get(id)?.name ?? "");
};

//
// Types and type helpers for command configs
//
export type MessageContextCommand = {
  command: ContextMenuCommandBuilder;
  handler: (interaction: MessageContextMenuCommandInteraction) => void;
};

export type UserContextCommand = {
  command: ContextMenuCommandBuilder;
  handler: (interaction: UserContextMenuCommandInteraction) => void;
};

export type SlashCommand = {
  command: SlashCommandBuilder;
  handler: (interaction: ChatInputCommandInteraction) => void;
  autocomplete?: (interaction: AutocompleteInteraction) => void;
};

// ********* Discord Command Helpers

export const compareCommands = (
  localCommand: ContextMenuCommandBuilder | SlashCommandBuilder,
  remoteCommand: APIApplicationCommand,
): boolean => {
  const json = localCommand.toJSON();
  if (json.name !== remoteCommand.name) {
    return false;
  }

  if (
    json.type === ApplicationCommandType.User ||
    json.type === ApplicationCommandType.Message
  ) {
    const result =
      json.name === remoteCommand.name &&
      json.type === remoteCommand.type &&
      (json.default_member_permissions ?? null) ===
        (remoteCommand.default_member_permissions ?? null);

    return result;
  }
  if (
    json.type === ApplicationCommandType.ChatInput ||
    json.type === undefined
  ) {
    const remoteOptions =
      remoteCommand.options || ([] as APIApplicationCommandOption[]);
    const localOptions = json.options || ([] as APIApplicationCommandOption[]);

    const typeMatches = !json.type || json.type === remoteCommand.type;
    if (!typeMatches) {
      return false;
    }
    const descriptionMatches =
      "description" in json
        ? json.description === remoteCommand.description
        : true;
    if (!descriptionMatches) {
      return false;
    }
    const remoteOptionsMatch =
      remoteOptions.length > 0
        ? remoteOptions.every((o) =>
            localOptions.some(
              (o2) =>
                o?.name === o2?.name &&
                o?.description === o2?.description &&
                o?.type === o2?.type,
            ),
          )
        : true;
    if (!remoteOptionsMatch) {
      return false;
    }
    const localOptionsMatch =
      localOptions.length > 0
        ? localOptions.every((o) =>
            remoteCommand.options?.some(
              (o2) =>
                o.name === o2.name &&
                o.description === o2.description &&
                o.type === o2.type,
            ),
          )
        : true;
    if (!localOptionsMatch) {
      return false;
    }
    return true;
  }
  throw new Error("Unexpected command type being compared");
};

export const calculateChangedCommands = (
  localCommands: (ContextMenuCommandBuilder | SlashCommandBuilder)[],
  remoteCommands: APIApplicationCommand[],
) => {
  const names = new Set(localCommands.map((c) => c.name));

  // Take the list of names to delete and swap it out for IDs to delete
  const remoteNames = new Set(remoteCommands.map((c) => c.name));
  const deleteNames = [...difference(remoteNames, names)];

  const toDelete = deleteNames
    .map((x) => remoteCommands.find((y) => y.name === x)?.id)
    .filter((x): x is string => Boolean(x));
  const toUpdate = localCommands.filter((localCommand) =>
    // Check all necessary fields to see if any changed. User and Message
    // commands don't have a description.
    {
      const dupe = remoteCommands.find((remoteCommand) =>
        compareCommands(localCommand, remoteCommand),
      );
      return !dupe;
    },
  );

  return { toDelete, didCommandsChange: toUpdate.length > 0 };
};
