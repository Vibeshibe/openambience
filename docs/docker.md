# Container deployment

OpenAmbience is a static app. The container includes Nginx, the app, the bundled recordings, and their attribution register. It listens on port **8080**, runs as the unprivileged `nginx` user, and supports a read-only root filesystem with writable `/tmp`. Health checks request the app homepage.

## Run a published image

Images live at `ghcr.io/vibeshibe/openambience` and support `linux/amd64` and `linux/arm64`.

```sh
docker run -d --name openambience --restart unless-stopped \
  -p 127.0.0.1:8080:8080 ghcr.io/vibeshibe/openambience:latest
```

Open http://localhost:8080. The `latest` tag first becomes available when the container workflow runs on `main`. Before that, use `ghcr.io/vibeshibe/openambience:dev`.

## Compose

Download [compose.yaml](../compose.yaml), or use it from a checkout:

```sh
docker compose up -d
docker compose ps
docker compose logs -f
```

Optional environment variables (also supported in a local `.env` file):

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAMBIENCE_IMAGE` | `ghcr.io/vibeshibe/openambience:latest` | Select a release, development tag, or image digest. |
| `OPENAMBIENCE_PORT` | `8080` | Host port. |
| `OPENAMBIENCE_BIND` | `127.0.0.1` | Host bind address. Set `0.0.0.0` to expose the port on all IPv4 interfaces. |

For example:

```sh
OPENAMBIENCE_IMAGE=ghcr.io/vibeshibe/openambience:dev OPENAMBIENCE_PORT=8090 docker compose up -d
```

Compose drops Linux capabilities, uses a read-only root filesystem, and mounts a small temporary filesystem at `/tmp`. No persistent server volume is required. Imported recordings and saved mixes are browser data; changing the hostname or port creates a different browser storage origin. Keep the same public URL when upgrading.

To update or stop a published deployment:

```sh
docker compose pull
docker compose up -d
# Stop when needed:
docker compose down
```

Use the same environment settings for each command. Existing app tabs receive the app's normal update notice when a new service-worker version is available. Releases that change runtime files must still increment the cache version in `sw.js`.

## Build from source

```sh
docker build --pull -t openambience:local .
docker run --rm -p 127.0.0.1:8080:8080 openambience:local
```

Or use the Compose build override:

```sh
docker compose -f compose.yaml -f compose.build.yaml up -d --build
```

Use those same two `-f` arguments for subsequent Compose commands managing the local build. The image needs no Node installation or application build step. Only explicitly selected application assets enter the image; source-control data, local environment files, scripts, and tests are excluded.

With a container running, Node.js 22+ can verify its packaged assets and HTTP behavior:

```sh
node scripts/container-check.js http://127.0.0.1:8080/
```

## HTTPS and reverse proxies

For a remote deployment, serve the app through an HTTPS reverse proxy at the root of a hostname, forwarding requests to container port 8080. A proxy on the host can use `127.0.0.1:8080`; a proxy container on the same Docker network can use `openambience:8080`. Configure TLS at that proxy. HTTP on a remote IP does not provide the secure context needed for service workers and installation.

Nginx supports byte-range requests for audio and revalidates stable asset filenames so browsers can discover updates. Offline storage is handled by the existing service worker. Radio streams still load directly in the browser and need compatible HTTPS/CORS support.

The app's canonical and social preview URLs currently identify the project's public GitHub Pages site. If operating a separately branded public instance, update those URLs in `index.html` and bump the service-worker cache before building.

## GitHub Actions publishing

[Container](../.github/workflows/container.yml) first runs syntax/unit checks, validates Compose, builds the image, and smoke-tests it under the Compose restrictions. Pull requests run these checks without publishing. Successful pushes to `dev`, `main`, and `v*.*.*` tags publish multi-platform images, with provenance and an SBOM. Manual dispatch can rebuild those same refs, including refreshing the stable Alpine base image.

| Git ref | Image tags |
| --- | --- |
| `dev` | `dev`, `sha-<full commit>` |
| `main` | `main`, `latest`, `sha-<full commit>` |
| `v0.6.0` (example) | `0.6.0`, `0.6`, `sha-<full commit>` |
| `v0.6.0-alpha.1` (example) | `0.6.0-alpha.1`, `sha-<full commit>` |

Only `main` updates `latest`; prereleases do not change stable tags. Version tags follow the repository's release policy. For an exact deployment, use the image digest shown by the workflow; rebuilding a Git ref may refresh the base image.

The workflow uses the repository's `GITHUB_TOKEN` with `contents: read` and `packages: write`; no Docker Hub account or personal token is needed. Image names follow the repository owner/name in lowercase, so forks publish to their own namespace. Adjust the Compose image name when using a fork.

After the first successful publish, open the repository's linked **Packages → openambience → Package settings → Change visibility → Public** to allow anonymous pulls. GitHub initially creates packages as private, even for public repositories. If reusing an existing package, grant this repository Actions write access in the package settings. See GitHub's [Container registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

The workflow uses Docker's official [multi-platform build actions](https://docs.docker.com/build/ci/github-actions/multi-platform/). This container deployment is independent of the existing GitHub Pages site.
