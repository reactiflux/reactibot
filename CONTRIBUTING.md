# Contributing

## Setting up the bot

1. Fork the repository and clone it to your workstation.
2. Create a `.env` file and copy the contents of `.env.example` into it.
3. Go to your [Github Settings](https://github.com/settings/tokens) and create a personal access token with the scope "gist"
4. Copy the token and put it into the `.env` file as `GITHUB_TOKEN`
5. [Create a new Discord application](https://discord.com/developers/applications)
6. Switch to the "Bot" tab and click "Add Bot"
7. Toggle off the "Public Bot" switch and save.
8. Copy the token and put it into the `.env` file as `DISCORD_HASH`.
9. Go to the OAuth2 Tab and choose the "bot" scope.
10. Check the "Administrator" permission.
11. Copy the url out of the "Scopes" Panel and paste it into your browser.
12. (We recommend to create a new Discord Server before Step 12)
13. Select the server to add your bot.
14. run `npm install` and then `npm run dev`
