# Self-hosted GitHub Actions runner on the NAS (for CD)

The CD job (`deploy` in `.github/workflows/ci.yml`) runs **on the NAS** via a
self-hosted runner. The runner polls GitHub **outbound**, so the NAS needs **no
inbound port** (no SSH/22 exposure) — this is why CD works even though only
80/443 are forwarded.

One runner (registered at the **org** level, `UnikSF`) serves every repo, so set
this up once.

## 1. Create the runner on the NAS

GitHub → `UnikSF` org → **Settings → Actions → Runners → New runner** (Linux x64),
then run the commands it shows **on the NAS over SSH**. They look like:

```sh
mkdir -p /volume2/docker/actions-runner && cd /volume2/docker/actions-runner
curl -o runner.tar.gz -L https://github.com/actions/runner/releases/download/<ver>/actions-runner-linux-x64-<ver>.tar.gz
tar xzf runner.tar.gz
./config.sh --url https://github.com/UnikSF --token <REGISTRATION_TOKEN> --labels nas --name nas-runner --unattended
```

The workflow targets `runs-on: [self-hosted, nas]`, so the **`nas` label is required**.

## 2. Give the runner Docker access

The deploy steps call `docker` / `docker compose`. Run the runner as a user in the
`docker` group (or root):

```sh
# verify the runner user can talk to docker:
docker ps
```

## 3. Run it as a service (survives reboots)

```sh
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

## How a deploy flows

1. PR merged to `main` → `test` job runs on GitHub-hosted Ubuntu (typecheck + tests).
2. On success, `deploy` runs on the `nas` runner: `docker build -t finance-watcher:local .`
   then `docker compose -f stacks/finance.yml up -d --no-build --force-recreate finance-watcher`.
3. It waits on the container's healthcheck (`/finance/login`); a failed health check
   fails the job loudly (and dumps logs) so a bad build is visible.

## Reuse for other repos

Mappy / Odysseus get the same `deploy` job — change the image name, stack file and
service name. The one runner already serves them (org-level + `nas` label).

## Alternative (not used)

Exposing SSH/22 via the DDNS + an SSH key in repo secrets also works, but puts SSH
on the public internet. The self-hosted runner avoids that.
