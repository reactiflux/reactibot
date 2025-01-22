# Reactibot

Useful saved commands, auto-moderation tools, and more, for the Reactiflux server.

## Contributing

Contact @vcarl (`@vcarl#7694` in Discord) for help getting into the test server.

See [the contributing guide](./CONTRIBUTING.md) for specific instructions.

### Adding a new environment variable

This is dumb and I hate it but it's how the tools work together.

New secrets need to be added in a bunch of different places in order to work in production:

- the GitHub [secrets config for Reactibot in settings](https://github.com/reactiflux/reactibot/settings/secrets/actions)
- [env.ts](https://github.com/reactiflux/reactibot/blob/main/src/helpers/env.ts) to load it from the environment (please do not freely use `process.env`)
- [our deployment action](https://github.com/reactiflux/reactibot/blob/main/.github/workflows/node.js.yml#L88), under the Kubernetes secret creation step
- [the Kubernetes deployment config](https://github.com/reactiflux/reactibot/blob/main/cluster/deployment.yaml#L18)

## Testing deployment

You must have a working `.env` file that enables you to run the bot locally. With the values in `.env`, create a `reactibot-env` secret in your local minikube cluster. Everything must be provided a value, but it's okay if some of them are just random strings.

```bash
$ kubectl create secret generic reactibot-env \
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

```bash
$ docker run -d -p 5000:5000 --name registry registry:2.7
```

`-d` means this will run in "detached mode", so it will exit without logs after pulling required images and starting. You can view logs for it with `docker logs -f registry`.

Create a file, `k8s-context`, in the project root, alongside the Dockerfile, with an IMAGE variable for kubectl to use.

```bash
$ echo IMAGE=reactibot:latest > k8s-context
```

Run a docker build and tag it. We need to retrieve the image ID of the build we run, which complicates the command.

```bash
$ docker build . -t reactibot
$ docker tag $(docker images reactibot:latest | tr -s ' ' | cut -f3 -d' ' | tail -n 1) localhost:5000/reactibot
```

Run a local deploy.

```bash
$ kubectl apply -k .
```

If it doesn't deploy correctly (e.g. `kubectl get pods` shows a status other than success), you can debug it with `kubectl describe pod reactibot-deployment`

### Testing with GHCR

I actually couldn't get a local registry working so I fell back on using ghcr.io, GitHub container registry.

[Create a Personal Access Token (Classic)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic) and log in to ghcr.io. Use the PAT(C) as your password.

```bash
$ docker login ghcr.io
```

Create a file, `k8s-context`, in the project root, alongside the Dockerfile, with an IMAGE variable for kubectl to use.

```bash
$ echo IMAGE=ghcr.io/<your gh>/reactibot:test > k8s-context
```

Run a docker build, tag it, and push to the registry. We need to retrieve the image ID of the build we run, which complicates the command.

```bash
$ docker build . -t <your gh>/reactibot:test
$ docker tag $(docker images <your gh>/reactibot:test | tr -s ' ' | cut -f3 -d' ' | tail -n 1) ghcr.io/<your gh>/reactibot:test
$ docker push ghcr.io/<your gh>/reactibot:test
```

Run a local deploy.

```bash
$ kubectl apply -k .
```

If it doesn't deploy correctly (e.g. `kubectl get pods` shows a status other than success), you can debug it with `kubectl describe pod reactibot-deployment`

# Inspecting the production operations

```bash
$ kubectl get ingress
NAME                CLASS   HOSTS                 ADDRESS   PORTS     AGE
mod-bot-ingress     nginx   euno.reactiflux.com   ….….….…   80, 443   …
reactibot-ingress   nginx   api.reactiflux.com    ….….….…   80, 443   …

$ kubectl get svc
NAME                TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
kubernetes          ClusterIP   10.….….…     <none>        443/TCP   …
mod-bot-service     ClusterIP   10.….….…     <none>        80/TCP    …
reactibot-service   ClusterIP   10.….….…     <none>        80/TCP    …

$ kubectl get pods --all-namespaces
NAMESPACE        NAME                          READY   STATUS    RESTARTS   AGE
cert-manager     cert-manager-…-…-…            1/1     Running   0          …
cert-manager     cert-manager-…-…              1/1     Running   0          …
cert-manager     cert-manager-webhook-…-…      1/1     Running   0          …
default          mod-bot-set-0                 1/1     Running   0          …
default          reactibot-deployment-…-…      1/1     Running   0          …
ingress-nginx    ingress-nginx-controller-…-…  1/1     Running   0          …
```

## Useful diagnostic references

```bash
# Create a debug pod
$ kubectl run tmp-shell --rm -i --tty --image nicolaka/netshoot -- /bin/bash

# Then from inside the pod:
curl http://mod-bot-service
curl http://reactibot-service

# Check service endpoints
# This should show the IP addresses of your pods. If empty, the service isn't finding the pods.
$ kubectl get endpoints mod-bot-service reactibot-service
NAME                ENDPOINTS           AGE
mod-bot-service     10.244.0.231:3000   58d
reactibot-service   10.244.0.244:3000   6d4h

# View the logs for the ingress controller
$ kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=100

# Check if the pods are actually listening on port 3000
# mod-bot, a Stateful Set
$ kubectl exec -it mod-bot-set-0 -- netstat -tulpn | grep 3000
# reactibot, a Deployment
$ kubectl exec -it $(kubectl get pod -l app=reactibot -o jsonpath='{.items[0].metadata.name}') -- netstat -tulpn | grep 3000
```
