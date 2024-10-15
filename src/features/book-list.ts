import { SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../helpers/discord";
import { og } from "../helpers/og-tags";

const fetchMetadata = async ({
  title,
  url,
}: {
  title: string;
  url: string;
}) => {
  const { result, error } = await og({ url });

  if (error) {
    console.log(
      "[BOOKS]",
      `Failed to fetch og tags for ${title}. Error: '${result.error}'`,
    );
    return { description: undefined, image: undefined };
  }

  return {
    description: result.ogDescription,
    image: result.ogImage?.at(0)?.url,
  };
};

const initBooks = (async () => {
  return (
    await Promise.all(
      [
        {
          title: "The Coding Career Handbook",
          url: "https://learninpublic.org/?c=REACTIFLUX30",
        },
        {
          title: "Letters to a New Developer",
          url: "https://bookshop.org/a/88607/9781484260739",
        },
        {
          title: "Unwritten Laws of Engineering",
          url: "https://bookshop.org/a/88607/9780791861967",
        },
        {
          title: "Moral Mazes: The World of Corporate Managers",
          url: "https://bookshop.org/a/88607/9780199729883",
        },
        {
          title: "The 5 Dysfunctions of a Team",
          url: "https://bookshop.org/a/88607/9780787960759",
        },
        {
          title: "Multipliers",
          url: "https://bookshop.org/a/88607/9780062663078",
        },
        {
          title: "The Tech Resume Inside Out",
          url: "https://thetechresume.com",
        },
        {
          title: "Staff Engineer: Leadership Beyond the Management Track",
          url: "https://staffeng.com/book",
        },
        {
          title: "Designing Data-Intensive Applications",
          url: "https://bookshop.org/a/88607/9781449373320",
        },
        {
          title: "Head First Design Patterns",
          url: "https://bookshop.org/a/88607/9781492078005",
        },
        {
          title: "Understanding Software",
          url: "https://bookshop.org/a/88607/9781788628815",
        },
        {
          title: "Code Complete",
          url: "https://bookshop.org/a/88607/9780735619678",
        },
        {
          title: "The Effective Engineer",
          url: "https://bookshop.org/a/88607/9780996128100",
        },
        {
          title: "The Principles of Product Development Flow",
          url: "https://www.amazon.com/Principles-Product-Development-Flow-Generation/dp/1935401009?_encoding=UTF8&qid=&sr=&linkCode=ll1&tag=&linkId=132dbd1d0409bf8c34f07722a28f50c2&language=en_US&ref_=as_li_ss_tl",
        },
        {
          title: "Managers Path",
          url: "https://bookshop.org/a/88607/9781491973899",
        },
        {
          title: "Engineering Management for the Rest of Us",
          url: "https://bookshop.org/a/88607/9798986769301",
        },
        {
          title: "Phoenix Project",
          url: "https://bookshop.org/a/88607/9781942788294",
        },
        {
          title: "Managing Humans",
          url: "https://bookshop.org/a/88607/9781484271155",
        },
        {
          title: "The Mythical Man Month",
          url: "https://bookshop.org/a/88607/9780201835953",
        },
        {
          title: "The Making of a Manager",
          url: "https://bookshop.org/a/88607/9780735219564",
        },
        {
          title: "Atomic Habits",
          url: "https://bookshop.org/a/88607/9781471050206",
        },
        {
          title: "Difficult Conversations",
          url: "https://bookshop.org/a/88607/9780143118442",
        },
        {
          title: "Deep Work",
          url: "https://bookshop.org/a/88607/9781455586677",
        },
        {
          title: "Non-Violent Communication",
          url: "https://bookshop.org/a/88607/9781892005281",
        },
        {
          title: "The Design of Everyday Things",
          url: "https://bookshop.org/a/88607/9780465050659",
        },
        {
          title: "Good to Great",
          url: "https://bookshop.org/a/88607/9780066620992",
        },
        {
          title: "Traction",
          url: "https://bookshop.org/a/88607/9781591848363",
        },
        {
          title: "The Right It",
          url: "https://bookshop.org/a/88607/9780062884657",
        },
      ].map(async (b) => {
        const metadata = await fetchMetadata(b);

        return { ...b, lcTitle: b.title.toLowerCase(), ...metadata };
      }),
    )
  ).filter((b) => b.description);
})();

const SOURCE_LINK =
  "-# [source](https://github.com/reactiflux/reactibot/blob/main/src/features/book-list.ts)";

export const recommendBookCommand: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("book")
    .setDescription("Recommend a book")
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("What book?")
        .setRequired(true)
        .setAutocomplete(true),
    ) as SlashCommandBuilder,
  handler: async (interaction) => {
    const searchTitle = interaction.options.get("title")?.value;

    const books = await initBooks;
    const { url, description, title, image } =
      books.find((b) => b.title === searchTitle) ?? {};
    console.log(searchTitle, url, image);
    if (!url) {
      console.log(`no link found for ${title}`);
      return;
    }
    interaction.reply({
      embeds: [
        {
          thumbnail: image ? { url: image } : undefined,
          description: `## [${title}](${url})

> ${description?.slice(0, 600)}…

${SOURCE_LINK} · some books use affiliate links`,
        },
      ],
      allowedMentions: { users: [] },
    });
  },
  autocomplete: async (interaction) => {
    const partial = interaction.options.getFocused();
    const partialRegex = new RegExp(`^${partial.split("").join(".*")}`);
    const filtered = (await initBooks)
      .filter((b) => partial === "" || partialRegex.test(b.lcTitle))
      .slice(0, 20);

    await interaction.respond(
      filtered.map((b) => ({ name: b.title, value: b.title })),
    );
  },
};
