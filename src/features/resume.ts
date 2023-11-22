import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import OpenAI from "openai";
import { CHANNELS } from "../constants/channels";
import { openAiKey } from "../helpers/env";
import { sleep } from "../helpers/misc";
import { logger } from "./log";

// export const resumeResources = () => {};

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
    deferred.edit("Found a resume! Downloading…");
    const response = await fetch(resume.url);
    deferred.edit("Found a resume! Uploading…");
    const file = await openai.files
      .create({
        file: response,
        purpose: "assistants",
      })
      .catch((e) => {
        deferred.edit(
          "Oops, something went wrong. [Is it an outage?(https://status.openai.com/)",
        );
        throw e;
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
        content.at(0)?.slice(0, 1995) ?? "Oops! Something went wrong.";
      logger.log("[RESUME]", `Feedback given:`);
      logger.log("", trimmed);
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
