import {
  ButtonBuilder,
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonStyle,
  Message,
} from "discord.js";
import { CHANNELS } from "../constants/channels";
import { createAttachmentBuilderFromURL } from "../helpers/generate-pdf";
import { ChannelHandlers } from "../types";
import cooldown from "./cooldown";
import { logger } from "./log";

const PDF_CONTENT_TYPE = "application/pdf";
const FIVE_MINUTES_IN_SECONDS = 60 * 5;

export const findResumeAttachment = (msg: Message) => {
  return msg.attachments.find(
    (attachment) => attachment.contentType === PDF_CONTENT_TYPE,
  );
};
export const REVIEW_COMMAND = "review-resume";
export const DELETE_COMMAND = "delete-post";

const buildResumeImages = async (
  msg: Message,
): Promise<AttachmentBuilder[]> => {
  const attachment = findResumeAttachment(msg);
  if (!attachment) {
    return [];
  }

  const builder = await createAttachmentBuilderFromURL(
    attachment.url,
    `${msg.author.username}-resume`,
  );
  if (!builder) {
    logger.log("[RESUME]", "Failed to generate resume PDF in thread");
    return [];
  }

  return builder;
};

const resumeReviewPdf: ChannelHandlers = {
  handleMessage: async ({ msg: message }) => {
    if (
      !message.channel.isThread() ||
      message.channel.parentId !== CHANNELS.resumeReview
    ) {
      return;
    }
    const cooldownKey = `resume-${message.channelId}`;

    if (cooldown.hasCooldown(message.author.id, cooldownKey)) {
      message.channel.send(
        "You posted just a few minutes ago. Please wait a bit before creating a new preview.",
      );
      return;
    }

    await message.channel.sendTyping();

    const images = await buildResumeImages(message);
    if (images.length > 0) {
      cooldown.addCooldown(
        message.author.id,
        cooldownKey,
        FIVE_MINUTES_IN_SECONDS,
      );
    }
    await message.channel.send({
      files: images,
      components: [
        // @ts-expect-error Discord.js types appear to be wrong
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(REVIEW_COMMAND)
            .setLabel("AI Review")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(DELETE_COMMAND)
            .setLabel("Delete post")
            .setStyle(ButtonStyle.Danger),
        ),
      ],
    });
  },
};

export default resumeReviewPdf;
