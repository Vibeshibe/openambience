# Contributing

Use Node.js 22+ and run `npm start`. Keep runtime code dependency-free unless a concrete need justifies a change. Use native controls, descriptive labels, keyboard focus styles, and relative URLs.

Before proposing a change, run `npm run check` and `npm test`, then follow the relevant checks in [docs/testing.md](docs/testing.md). Explain the observable problem, resulting behavior, and validation in your pull request.

For audio contributions, update [docs/assets.md](docs/assets.md) with provenance and license details. Do not copy Ambiphone's recordings, code, or branding. Test transitions and loops with headphones at a comfortable level. Changes to cached app files must increment the service-worker cache version.
