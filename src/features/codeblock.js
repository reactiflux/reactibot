import Gists from "gists";
const gists = new Gists({
  token: process.env.GITHUB_TOKEN,
});

const maxLines = 15;

const jobs = {
  handleMessage: ({ msg, user }) => {
    const blocks = msg.content.toString().match(/```([\s\S]*?)```/g);
    if (!blocks || blocks.length === 0) {
      return;
    }
    let content = msg.content;
    const potentialGists = [];
    blocks.forEach((block) => {
      if (block.split("\n").length > maxLines + 2) {
        content = content.replace(block, "");
        potentialGists.push(block);
      }
    });
    content = content.trim();
    if (!content && blocks.length === potentialGists.length) {
      // there's no other content, just code blocks
      gists
        .create({
          description: `Gist of ${user.username} code`,
          public: false,
          files: potentialGists.reduce((accumulator, item, index) => {
            return Object.assign({}, accumulator, {
              [`file-${index}.js`]: {
                content: item.split("\n").slice(1, -1).join("\n"),
              },
            });
          }, {}),
        })
        .then((d) => {
          msg.channel.send(
            `It looks like you posted quite a long code block. I've removed it and created a GIST of it - please check it at ${d.body.html_url}`,
            {
              reply: msg.author,
            },
          );
          msg.delete();
        })
        .catch((e) => {
          console.log(e);
        });
    }
  },
};

module.exports = {
  default: jobs,
};
