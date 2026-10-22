# Contributing

Work from `dev` and push coherent checkpoints regularly. Follow the [versioning and release policy](docs/versioning.md) and record changes in [CHANGELOG.md](CHANGELOG.md).

Use Node.js 24.22.1 or a newer 24.x patch (`.node-version` records the default) and run `npm start`. CI also covers patched Node 22 starting at 22.23.4. Keep runtime code dependency-free unless a concrete need justifies a change. Use native controls, descriptive labels, keyboard focus styles, and relative URLs.

Before proposing a change, run `npm run check` and `npm test`, then follow the relevant checks in [docs/testing.md](docs/testing.md). Explain the observable problem, resulting behavior, and validation in your pull request.

For audio contributions, update [docs/assets.md](docs/assets.md) with provenance and license details. Do not copy Ambiphone's recordings, code, or branding. Test transitions and loops with headphones at a comfortable level. Changes to cached app files must increment the service-worker cache version.
