# Node.js security maintenance

## October 21, 2026 security releases

The [official Node.js advisory](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) covers the Brotli decoder issue CVE-2026-111497 and other DNS, TLS, HTTP and runtime fixes. The patched releases are 22.23.4, 24.22.1 and 26.12.1. Node 20 is end of life and should be replaced with a supported release; see the [release schedule](https://github.com/nodejs/Release#release-schedule).

The published OpenAmbience container uses `nginx:stable-alpine`. Its Dockerfile copies static app files and does not install Node.js. Browser audio, radio requests and mix ZIP handling run in the browser. A Node.js security update therefore requires development/CI maintenance, rather than replacing a Node runtime inside the application image. Nginx/Alpine base-image security updates are a separate maintenance task.

## Local development

Use Node 24.22.1 or a later 24.x patch. `.node-version` records the current recommended version. `package.json` excludes older unpatched Node 22/24 releases and accepts the patched Node 26 line starting at 26.12.1 and newer majors. This version constraint documents compatibility; it does not itself upgrade or prevent execution under an older system Node.

After installing from [the official Node.js releases](https://nodejs.org/en/blog/release/v24.22.1), check `node --version` and `npm --version` in a new terminal. Restart development servers to replace any already-running Node processes. Do not assume an isolated tooling directory uses the same binary as the default PATH; check that copy separately.

## GitHub Actions

The Check workflow resolves `>=22.23.4 <23` and `>=24.22.1 <25`. Container validation resolves `>=24.22.1 <25`. Each `setup-node` step enables `check-latest: true`, so a cached earlier patch cannot satisfy a security minimum and a newer matching patch is preferred. See [setup-node's version-selection documentation](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md#check-latest-version).

Keep the minimum versions, `.node-version`, package engine policy and contributor documentation in step when future security releases require new minimums. Review successful workflow setup logs to confirm the resolved versions. The CI matrix deliberately keeps both supported LTS branches covered.
