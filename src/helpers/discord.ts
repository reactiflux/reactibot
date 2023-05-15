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
} from "discord.js";
import prettyBytes from "pretty-bytes";

export const difference = <T>(a: Set<T>, b: Set<T>) =>
  new Set(Array.from(a).filter((x) => !b.has(x)));

const staffRoles = ["mvp", "moderator", "admin", "admins"];
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

/*
 * Escape a message and insert markdown quote symbols. Returns a string with
 * backticks escaped to render correctly when sent in a quote.
 */
export const quoteMessageContent = (content: string) => {
  return `> ${content.replace("`", "\\`").replace(/[\n]/g, "\n> ")}`;
};

/*
 * Create a message embed that
 */
export const describeAttachments = (attachments: Message["attachments"]) => {
  return attachments.size === 0
    ? ""
    : "Attachments:\n" +
        attachments
          .map(
            ({ size, name, contentType, url }) =>
              // Include size of the file and the filename
              `${prettyBytes(size)}: ${
                // If it's a video or image, include a link.
                // Renders as `1.12mb: [some-image.jpg](<original image url>)`
                contentType?.match(/(image|video)/) ? `[${name}](${url})` : name
              }`,
          )
          .join("\n");
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

//
// Types and type helpers for command configs
//
export type MessageContextCommand = {
  command: ContextMenuCommandBuilder;
  handler: (interaction: MessageContextMenuCommandInteraction) => void;
};
export const isMessageContextCommand = (
  config: MessageContextCommand | UserContextCommand | SlashCommand,
): config is MessageContextCommand =>
  config.command instanceof ContextMenuCommandBuilder &&
  config.command.type === ApplicationCommandType.Message;

export type UserContextCommand = {
  command: ContextMenuCommandBuilder;
  handler: (interaction: UserContextMenuCommandInteraction) => void;
};
export const isUserContextCommand = (
  config: MessageContextCommand | UserContextCommand | SlashCommand,
): config is UserContextCommand =>
  config.command instanceof ContextMenuCommandBuilder &&
  config.command.type === ApplicationCommandType.User;

export type SlashCommand = {
  command: SlashCommandBuilder;
  handler: (interaction: ChatInputCommandInteraction) => void;
};
export const isSlashCommand = (
  config: MessageContextCommand | UserContextCommand | SlashCommand,
): config is SlashCommand => config.command instanceof SlashCommandBuilder;

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
