import {
  Client,
  CommandInteraction,
  EmbedType,
  SlashCommandBuilder,
  AttachmentBuilder,
  Message,
  Embed,
  APIEmbed,
} from "discord.js";
import OpenAI from "openai";
import { CHANNELS } from "../constants/channels";
import { openAiKey } from "../helpers/env";
import { createAttachmentBuilderFromURL } from "../helpers/generate-pdf";
import { sleep } from "../helpers/misc";
import { logger } from "./log";
import { EMBED_COLOR } from "./commands";

const openai = new OpenAI({
  apiKey: openAiKey,
});
const ASSISTANT_ID = "asst_cC1ghvaaMFFTs3C06ycXqjeH";

// one-time setup tasks for the assistant, so the functionality is all local
const configure = async () => {
  await openai.beta.assistants.update(ASSISTANT_ID, {
    instructions: `
You are a hiring manager reading resumes of engineers and providing feedback. You are part of Reactiflux, the Discord for React professionals, and were created by vcarl. You expect to be provided with a resume as a pdf.

Your response MUST be fewer than 1800 characters long.
Be tactful and kind, but honest and forthright. Be terse, but not rude.
Do not be overly complimentary, your role is to provide actionable feedback for improvements.
Structure your response as a punchlist of feedback, not prose. Every item should be highly personal, do not make general recommendations like grammar and formatting, unless you see specific problems.

Do your best to infer from their message and resume how the person views themselves professionally and what kind of work arrangement they're seeking (e.g., full-time, contract, freelance, etc). ALWAYS start your response by describing their goals and level of experience in 1 sentence (less than 30 words).

Consult your knowledge for tips on resume formatting and writing.

If their stated experience doesn't match what you would guess, describe why you made that inferrence.
`,
  });
};
configure();

export const reviewResume = {
  command: new SlashCommandBuilder()
    .setName("review-resume")
    .setDescription(
      "BETA — AI may not be accurate. Use will upload a PDF resume to OpenAI systems temporarily.",
    ),

  handler: async (interaction: CommandInteraction) => {
    // look at current thread
    // if not started by thread author, abort
    // if no PDF or direct file found, abort
    if (!interaction.inGuild() || !interaction.channel) {
      return await interaction.reply({
        ephemeral: true,
        content: "This must be performed in a guild!",
      });
    }
    if (!interaction.channel.isThread()) {
      return await interaction.reply({
        ephemeral: true,
        content: "Please use this in reply to a thread!",
      });
    }
    const { channel, user } = interaction;
    if (channel.parentId !== CHANNELS.resumeReview) {
      return await interaction.reply({
        ephemeral: true,
        content: `This can only be executed in <#${CHANNELS.resumeReview}>!`,
      });
    }

    const firstMessage = await channel.fetchStarterMessage();
    if (!firstMessage) {
      return await interaction.reply({
        ephemeral: true,
        content: "Couldn't fetch first message, please try again.",
      });
    }

    if (firstMessage.author.id !== user.id) {
      return await interaction.reply({
        ephemeral: true,
        content: "You may only review your own resume.",
      });
    }

    const deferred = await interaction.deferReply({ ephemeral: true });
    deferred.edit("Looking for a resume…");
    const messages = await channel.messages.fetch();
    // grab the first available PDF
    const attachedPdfs = messages.flatMap((m) =>
      m.attachments.filter((a) => a.contentType === "application/pdf"),
    );
    const resume = attachedPdfs.first();

    if (!resume) {
      return await deferred.edit({
        content: "No PDFs found, please upload your resume and try again.",
      });
    }

    // defer: notify that data will be sent, request permissions

    // upload file to GPT
    deferred.edit("Found a resume! Uploading…");
    const response = await fetch(resume.url);
    const file = await openai.files.create({
      file: response,
      purpose: "assistants",
    });
    if (!response.ok || file.status === "error") {
      return await deferred.edit({
        content: "Failed to upload resume, sorry! Please try again later.",
      });
    }

    try {
      deferred.edit("Uploaded! Reviewing…");
      const [assistant, thread] = await Promise.all([
        openai.beta.assistants.retrieve(ASSISTANT_ID),
        openai.beta.threads.create({
          messages: [
            {
              role: "user",
              content:
                "This user has requested help with their resume. Here is their message and resume:",
            },
            {
              role: "user",
              content: firstMessage.content,
              file_ids: [file.id],
            },
          ],
        }),
      ]);

      let run = await openai.beta.threads.runs.create(
        thread.id,
        { assistant_id: assistant.id },
        // { stream: true },
      );

      // TODO: stream responses. OpenAI hasn't released streaming responses for
      // assistant runs as of 2023-11
      // let content = "";
      // for await (const chunk of stream) {
      //   content += chunk.choices[0]?.delta?.content;
      //   sleep(1.5);
      // }
      while (run.status === "queued" || run.status === "in_progress") {
        await sleep(0.5);
        run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        console.log(run.started_at, run.status);
      }
      console.log("run finished:", run.status, JSON.stringify(run, null, 2));

      const messages = await openai.beta.threads.messages.list(thread.id);
      console.log(JSON.stringify(messages.data, null, 2));
      const content: string[] = messages.data
        .filter((d) => d.role === "assistant")
        .flatMap((d) =>
          d.content.map((c) => (c.type === "text" ? c.text.value : "\n\n")),
        );

      console.log({ content });
      const trimmed =
        content.at(0)?.slice(0, 2000) ?? "Oops! Something went wrong.";
      logger.log("[RESUME]", `Feedback given:`);
      logger.log("[RESUME]", trimmed);
      deferred.edit({
        content: trimmed,
      });
    } catch (e) {
      // recover
      console.log(e);
    }
    // Ensure files are cleaned up
    await openai.files.del(file.id);

    // defer: offer fixed interaction buttons to send more prompts

    return;
  },
};

export const resumeResources = async (bot: Client) => {
  bot.on("threadCreate", async (thread) => {
    if (thread.parentId !== CHANNELS.resumeReview) {
      return;
    }
    const firstMessage = await thread.fetchStarterMessage();
    if (!firstMessage) {
      return;
    }

    const attachment = findResumeAttachment(firstMessage);
    const resumeImages = await buildResumeImages(firstMessage);

    await thread.send({
      content: !attachment
        ? `Please upload your resume as a PDF file to receive feedback.`
        : undefined,
      embeds: [
        {
          title: "Writing a outstanding resume",
          type: EmbedType.Rich,
          description: `If you're looking to enhance your resume, consider adopting the practice of maintaining a "brag document." This is a dynamic and detailed compilation of your professional achievements, projects, skills development, and any challenges you've overcome. It's an invaluable tool for developers at any level, not just to track progress but also as a resource when updating your resume or preparing for interviews.

Here's a few reasons why a brag document is beneficial:

- **Comprehensive Achievement Tracking**: Documenting your work helps ensure no project or accomplishment—big or small—is forgotten. This can be especially valuable for highlighting contributions that demonstrate your impact on a project or the team.
- **Skill Development Overview**: Keeping a record of new technologies you've mastered, courses completed, or certifications earned showcases your commitment to professional development and continuous learning.
- **Soft Skills and Leadership**: Don't overlook non-technical achievements. Leadership roles, mentorship, effective teamwork, and problem-solving are highly sought after by employers.
- **Personlized Resume Tailoring**: With a well-maintained brag document, customizing your resume for specific job applications becomes much easier. You can quickly identify and highlight the most relevant experiences and achievements that align with the job description.
### Recommended Resources
- [The Engineers Checklist](https://theengineerschecklist.dev/)
- [Keeping Brag Documents](https://jvns.ca/blog/brag-documents/)
- [Resume X-Y-Z Writing Guide](https://www.inc.com/bill-murphy-jr/google-recruiters-say-these-5-resume-tips-including-x-y-z-formula-will-improve-your-odds-of-getting-hired-at-google.html)
`,
          color: EMBED_COLOR,
        },
      ],
      files: resumeImages,
    });
  });
};

const PDF_CONTENT_TYPE = "application/pdf";
const findResumeAttachment = (msg: Message) => {
  return msg.attachments.find(
    (attachment) => attachment.contentType === PDF_CONTENT_TYPE,
  );
};

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
