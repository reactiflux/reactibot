import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import OpenAI from "openai";
import { CHANNELS } from "../constants/channels";
import { openAiKey } from "../helpers/env";
import { sleep } from "../helpers/misc";

// export const resumeResources = () => {};

const openai = new OpenAI({
  apiKey: openAiKey,
});
const ASSISTANT_ID = "asst_cC1ghvaaMFFTs3C06ycXqjeH";

export const reviewResume = {
  command: new SlashCommandBuilder()
    .setName("review-resume")
    .setDescription(
      "Provides one-shot AI guidance on resumes posted to #resume-review",
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
    deferred.edit("Found one! Uploading…");
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
      deferred.edit({
        content: content.at(0) ?? "Oops! Something went wrong.",
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
