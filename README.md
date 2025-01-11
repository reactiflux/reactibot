# Reactibot

Useful saved commands, auto-moderation tools, and more, for the Reactiflux server.

## Contributing

Contact @vcarl (`@vcarl#7694` in Discord) for help getting into the test server.

See [the contributing guide](./CONTRIBUTING.md) for specific instructions.

## Testing deployment locally

Set up minikube. It's kinda hard.

Get the bot working, with a functional `.env` file. With the values in that file, create a `reactibot-env` secret in your local minikube cluster.

```
kubectl create secret generic reactibot-env \
  --from-literal=DISCORD_HASH=
  --from-literal=DISCORD_PUBLIC_KEY=
  --from-literal=DISCORD_APP_ID=
  --from-literal=GUILD_ID=
  --from-literal=OPENAI_KEY=<only needed if testing resume review>
  --from-literal=GH_READ_TOKEN=<optional>
  --from-literal=AMPLITUDE_KEY=<optional>
```
