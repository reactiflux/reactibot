# Reactibot

Useful saved commands, auto-moderation tools, and more, for the Reactiflux server.

## Contributing

Contact @vcarl (`@vcarl#7694` in Discord) for help getting into the test server.

See [the contributing guide](./CONTRIBUTING.md) for specific instructions.

## Testing deployment

You must have a working `.env` file that enables you to run the bot locally. With the values in `.env`, create a `reactibot-env` secret in your local minikube cluster. Everything must be provided a value, but it's okay if some of them are just random strings.

```sh
kubectl create secret generic reactibot-env \
  --from-literal=DISCORD_HASH= \
  --from-literal=DISCORD_PUBLIC_KEY= \
  --from-literal=DISCORD_APP_ID= \
  --from-literal=GUILD_ID= \
  --from-literal=OPENAI_KEY='<only needed if testing resume review>' \
  --from-literal=GH_READ_TOKEN='<only needed if testing React docs integration>' \
  --from-literal=AMPLITUDE_KEY='<optional, use random string>'
```

(you can delete this secret with `kubectl delete secret reactibot-env`)

### Locally

Set up kubectl and minikube locally. It's kinda hard.

Start up a local Docker image registry.

```sh
docker run -d -p 5000:5000 --name registry registry:2.7
```

`-d` means this will run in "detached mode", so it will exit without logs after pulling required images and starting. You can view logs for it with `docker logs -f registry`.

Create a file, `k8s-context`, in the project root, alongside the Dockerfile, with an IMAGE variable for kubectl to use.

```sh
echo IMAGE=reactibot:latest > k8s-context
```

Run a docker build and tag it. We need to retrieve the image ID of the build we run, which complicates the command.

```sh
docker build . -t reactibot
docker tag $(docker images reactibot:latest | tr -s ' ' | cut -f3 -d' ' | tail -n 1) localhost:5000/reactibot
```

Run a local deploy.

```sh
kubectl apply -k .
```

If it doesn't deploy correctly (e.g. `kubectl get pods` shows a status other than success), you can debug it with `kubectl describe pod reactibot-deployment`

### Testing with GHCR

I actually couldn't get a local registry working so I fell back on using ghcr.io, GitHub container registry.

[Create a Personal Access Token (Classic)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic) and log in to ghcr.io. Use the PAT(C) as your password.

```sh
docker login ghcr.io
```

Create a file, `k8s-context`, in the project root, alongside the Dockerfile, with an IMAGE variable for kubectl to use.

```sh
echo IMAGE=ghcr.io/<your gh>/reactibot:test > k8s-context
```

Run a docker build, tag it, and push to the registry. We need to retrieve the image ID of the build we run, which complicates the command.

```sh
docker build . -t <your gh>/reactibot:test
docker tag $(docker images <your gh>/reactibot:test | tr -s ' ' | cut -f3 -d' ' | tail -n 1) ghcr.io/<your gh>/reactibot:test
```

Run a local deploy.

```sh
kubectl apply -k .
```

If it doesn't deploy correctly (e.g. `kubectl get pods` shows a status other than success), you can debug it with `kubectl describe pod reactibot-deployment`
