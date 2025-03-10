# Contributing

## Setting up the bot

1. Create a new Discord bot [in the developer portal](https://discord.com/developers/applications)
1. Fork the repository
1. Clone your fork to your computer
   1. If you'd like to get a tour of the codebase and a second pair of eyes during setup, snag a slot on [the calendar](https://calendly.com/vcarl/bots)
1. Copy `.env.example` to `.env`
1. Configure env variable by going through the settings in the bots you created
   1. From the General Information page:
      1. <img width="328" alt="discord-general-settings" src="https://user-images.githubusercontent.com/1551487/221075576-e03f6d76-903f-4005-adf6-40a93b10183f.png">
      1. Copy the Application ID as `DISCORD_APP_ID`
      1. Copy the Public Key as `DISCORD_PUBLIC_KEY`
   1. From the Bot page:
      1. <img width="335" alt="discord-bot-settings" src="https://user-images.githubusercontent.com/1551487/221075742-17794152-ad14-4437-8680-87d7050fd829.png">
      1. Reset the bot's token and paste the new one as `DISCORD_HASH`
      1. <img width="300" alt="discord-token" src="https://user-images.githubusercontent.com/1551487/221075839-93f5bc23-cdb2-4e43-8b8c-d596cea0b6af.png">
   1. (optional) Request access token for Amplitude metrics from vcarl#7694 and paste the token as `AMPLITUDE_KEY`
   1. (optional) Go to your [Github Settings](https://github.com/settings/tokens) and create a personal access token with the scope "gist", and paste the
1. Go to the Installation tab and do the following:
   1. User Install off
   1. Guild Install on
   1. Install Link set to None
   1. Save changes at the end
1. From the Bot page: 3 settings off, 2 settings on
   1. Public Bot off
   1. Requires OAuth2 Code Grant off
   1. Presence Intent off
   1. Server Members Intent on
   1. Message Content Intent on
   1. Save changes at the end
1. `npm install`
1. `npm run dev`
1. Look for the following message in the logs, and open the URL in a browser where you're logged into Discord.
   - `Bot started. If necessary, add it to your test server:`
   - Make sure to not install this bot directly on Reactiflux but on the Reactiflux Test Server. Ask for the correct role in RF's #reactibot channel

# Implementation notes

There are subtle issues when making some chaings. These are notes for steps to take to make sure it's done correctly when needed.

Generating images for #resume-review requires GraphicsMagick installed. [Brew](https://formulae.brew.sh/formula/graphicsmagick), [Linux](http://www.graphicsmagick.org/)

## Environment variables

Adding a new environment variable needs to be done in several places to work corectly and be predictable for new developers:

- Add a suitable example to `.env.example`
- Add to your own `.env` (and restart the dev server)
- Add to the action in `.github/workflows/node.js.yml`
- Add to the Kubernetes config under `cluster/deployment.yml
