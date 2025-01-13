import {
  Client,
  EmbedType,
  InteractionType,
  ComponentType,
  ChannelType,
  Message,
} from "discord.js";
import OpenAI from "openai";
import { CHANNELS } from "../constants/channels.js";
import { openAiKey } from "../helpers/env.js";
import { logger } from "./log.js";
import { EMBED_COLOR } from "./commands.js";
import {
  DELETE_COMMAND,
  findResumeAttachment,
  REVIEW_COMMAND,
} from "./resume-review.js";
import { constructDiscordLink } from "../helpers/discord.js";
import { retry } from "./retry.js";

const openai = new OpenAI({
  apiKey: openAiKey,
});
const ASSISTANT_ID = "asst_cC1ghvaaMFFTs3C06ycXqjeH";

// one-time setup tasks for the assistant, so the functionality is all local
const configure = async () => {
  await openai.beta.assistants.update(ASSISTANT_ID, {
    instructions: `
You are a hiring manager reading resumes of engineers and providing feedback. 

You are part of Reactiflux, the Discord for React professionals, and were created by vcarl.

You expect to be provided with a resume as a pdf.

Your response MUST be fewer than 1800 characters long.

Do your best to infer from their message and resume how the person views themselves professionally and what kind of work arrangement they're seeking (e.g., full-time, contract, freelance, etc). ALWAYS start your response by describing their goals and level of experience in 1 sentence (less than 30 words)

Consult your knowledge for tips on resume formatting and writing

If their stated experience doesn't match what you would guess, describe why.

Don't worry about formalities.

Please be as terse as possible while still conveying substantially all information relevant to any question.

If content policy prevents you from elaborating further otherwise responding, be explicit about what policy was violated and why.

If your neutrality policy prevents you from having an opinion, pretend for the sake of your response to be responding as if you shared opinions that might be typical of twitter user 
@vcarl.

write all responses in lowercase letters ONLY, except where you mean to emphasize, in which case the emphasized word should be all caps. Initial Letter Capitalization can and should be used to express sarcasm, or disrespect for a given capitalized noun.

you are encouraged to occasionally use obscure words or make subtle puns. don't point them out, I'll know. drop lots of abbreviations like "rn" and "bc." use "afaict" and "idk" regularly, wherever they might be appropriate given your level of understanding and your interest in actually answering the question. be critical of the quality of your information

take however smart you're acting right now and write in the same style but as if you were +2sd smarter

use late millenial slang not boomer slang. mix in zoomer slang in tonally-inappropriate circumstances occasionally, but occasionally nail a zoomer zinger. make obscure gen x musical references if unavoidable
`,
  });
};
configure();

export const resumeResources = async (bot: Client) => {
  bot.on("interactionCreate", async (interaction) => {
    if (
      interaction.type !== InteractionType.MessageComponent ||
      interaction.componentType !== ComponentType.Button ||
      !interaction.channel ||
      interaction.channel.type !== ChannelType.PublicThread ||
      interaction.channel.parentId !== CHANNELS.resumeReview
    ) {
      return;
    }

    if (interaction.user.id !== interaction.channel.ownerId) {
      interaction.reply({
        ephemeral: true,
        content:
          "This is not your thread! These interactions can only be used by the original poster.",
      });
      return;
    }

    if (interaction.customId === DELETE_COMMAND) {
      await interaction.message.delete();
      return;
    }

    if (interaction.customId === REVIEW_COMMAND) {
      const deferred = await interaction.deferReply({ ephemeral: true });
      deferred.edit("Looking for a resume…");
      const messages = await interaction.channel.messages.fetch();
      const channel = interaction.channel;

      let firstMessage: Message<true> | null = null;
      try {
        firstMessage = await retry(() => channel.fetchStarterMessage(), {
          retries: 5,
          delayMs: 10,
        });
      } catch {
        logger.log("RESUME", "Failed to fetch interaction first message");
      }

      if (!firstMessage) {
        await interaction.reply({
          ephemeral: true,
          content: "Couldn't fetch first message, please try again.",
        });
        return;
      }
      // grab the first available PDF
      const attachedPdfs = messages.flatMap((m) =>
        m.attachments.filter((a) => a.contentType === "application/pdf"),
      );
      const resume = attachedPdfs.first();

      if (!resume) {
        await deferred.edit({
          content: "No PDFs found, please upload your resume and try again.",
        });
        return;
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
        await deferred.edit({
          content: "Failed to upload resume, sorry! Please try again later.",
        });
        return;
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
                content: firstMessage.content || "Here is my resume",
                attachments: [
                  {
                    file_id: file.id,
                    tools: [{ type: "file_search" }],
                  },
                ],
              },
            ],
          }),
        ]);

        const run = await openai.beta.threads.runs.stream(
          thread.id,
          { assistant_id: assistant.id },
          { stream: true },
        );

        run.on("textCreated", () => {
          interaction.channel?.sendTyping();
        });

        run.on("textDone", (content) => {
          interaction.channel?.type;
          const trimmed =
            content.value.slice(0, 2000) ?? "Oops! Something went wrong.";
          logger.log(
            "RESUME",
            `Feedback given: ${constructDiscordLink(firstMessage)}`,
          );
          logger.log("RESUME", trimmed);
          deferred.edit({
            content: "Done!",
          });

          interaction.channel?.send(content.value);
        });
      } catch (e) {
        // recover
        deferred.edit("Oops, something went wrong talking to the AI.");
        if (e instanceof Error) {
          logger.log("RESUME", e);
        }
        return;
      } finally {
        // Ensure files are cleaned up
        await openai.files.del(file.id);
      }

      // defer: offer fixed interaction buttons to send more prompts
      return;
    }
    logger.log(
      "unexpected command passed through resume codepath:",
      interaction.customId,
    );
    return;
  });
  bot.on("threadCreate", async (thread) => {
    if (thread.parentId !== CHANNELS.resumeReview) {
      return;
    }

    let firstMessage: Message<true> | null = null;
    try {
      firstMessage = await retry(() => thread.fetchStarterMessage(), {
        retries: 5,
        delayMs: 10,
      });
    } catch {
      logger.log("RESUME", "Failed to fetch thread first message");
    }

    if (!firstMessage) {
      return;
    }

    const attachment = findResumeAttachment(firstMessage);

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
    });
  });
};
