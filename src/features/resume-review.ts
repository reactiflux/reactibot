import { Message } from "discord.js";
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

const sendResumeMessage = async (msg: Message): Promise<true | void> => {
  const attachment = findResumeAttachment(msg);
  if (!attachment) {
    return;
  }

  const builder = await createAttachmentBuilderFromURL(
    attachment.url,
    `${msg.author.username}-resume`,
  );
  if (!builder) {
    logger.log("[RESUME]", "Failed to generate resume PDF in thread");
    return;
  }

  await msg.channel.send({
    files: builder,
  });

  return true;
};

const resumeReviewPdf: ChannelHandlers = {
  handleMessage: async ({ msg }) => {
    // NOTE: This cast is safe as we are fetching the actual message in the index.ts/handleMessage
    const message = msg as Message;
    const cooldownKey = `resume-${msg.channelId}`;

    if (cooldown.hasCooldown(message.author.id, cooldownKey)) {
      return;
    }

    const sucess = await sendResumeMessage(message);
    if (sucess) {
      cooldown.addCooldown(
        message.author.id,
        cooldownKey,
        FIVE_MINUTES_IN_SECONDS,
      );
    }
  },
};

export default resumeReviewPdf;
