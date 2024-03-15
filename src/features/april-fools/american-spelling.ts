import { ChannelHandlers } from "../../types";

const AMERICAN_SPELLING_MAP: Record<string, string> = {
  colour: "color",
  flavour: "flavor",
  honour: "honor",
  humour: "humor",
  labour: "labor",
  neighbour: "neighbor",
  rumour: "rumor",
  savour: "savor",
  valour: "valor",
  behaviour: "behavior",
  favour: "favor",
  harbour: "harbor",
  odour: "odor",
  armour: "armor",
};

const SUPER_SARCASTIC_REPLIES_TO_BRITISH_SPELLING_WORDS = [
  "Oh, splendid, another dose of British charm! But I'm afraid we're strictly American today, darling.",
  "Well, well, well, what do we have here? Looks like someone's trying to add a little extra 'u' to our lives. Nice try!",
  "Oh, lovely attempt at being fancy! But sorry, old chap, we're sticking to our American roots today.",
  "Ah, a bit of British flair, how quaint! But alas, it's not quite the style we're going for today.",
  "Oh, bravo! Another British gem shining through. But sorry, it's strictly red, white, and blue today!",
  "Well, aren't you just a rebel with your extra letters? Sorry, but we're cutting ties with the 'u' today.",
  "Ah, the British invasion continues! But I'm afraid your linguistic imperialism won't fly here today.",
  "Oh, delightful! Another nod to our friends across the pond. But sorry, we're staying true to our American roots today.",
  "Splendid attempt at British sophistication! But sorry, we're keeping it simple and straightforward today.",
  "Oh, look at you being all fancy with your British spellings! But I'm afraid it's strictly Yankee Doodle Dandy around here today.",
];

export default {
  handleMessage: async ({ msg: maybeMessage }) => {
    const msg = maybeMessage.partial
      ? await maybeMessage.fetch()
      : maybeMessage;

    const content = msg.content.toLowerCase();
    const hasBadWord = Object.keys(AMERICAN_SPELLING_MAP).find((word) =>
      content.match(new RegExp(`\\b${word}\\b`, "i")),
    );

    if (!hasBadWord) {
      return;
    }

    await msg.delete();

    msg.channel.send(
      SUPER_SARCASTIC_REPLIES_TO_BRITISH_SPELLING_WORDS[
        Math.floor(
          Math.random() *
            SUPER_SARCASTIC_REPLIES_TO_BRITISH_SPELLING_WORDS.length,
        )
      ],
    );
  },
} as ChannelHandlers;
