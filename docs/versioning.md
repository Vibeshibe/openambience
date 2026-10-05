# Versioning and branches

OpenAmbience follows [Semantic Versioning 2.0.0](https://semver.org/). The existing starter at commit `eabd551` is the `v0.1.0` baseline.

## Branches

- `main`: released or release-ready work.
- `dev`: ongoing development and research; push small, coherent checkpoints here after the appropriate checks.
- Optional topic branches start from `dev` and return through a pull request when the work benefits from separate review.

To follow ongoing work:

```sh
git fetch origin
git switch dev
git pull --ff-only origin dev
```

Promote a tested release from `dev` to `main` through a pull request. Keep both branches synchronized after a release. Avoid force pushes and rewriting published tags. Regular pushes do not require a release or version bump for every commit.

## Version policy

`package.json` records the app release version; annotated Git tags use `vMAJOR.MINOR.PATCH`. Record unreleased changes in `CHANGELOG.md`, moving them to a dated section when releasing. Development checkpoints are identified by their Git commit; use prerelease versions such as `0.2.0-alpha.1` when distributing a named preview.

Before 1.0, the app is experimental. Our project convention is a minor bump for new capabilities or breaking changes, and a patch bump for compatible fixes. Explicitly describe migration needs, especially changes to saved mixes. Documentation-only checkpoints need no app-version bump; if packaged as a release, they receive a patch version.

From 1.0, use patch versions for compatible fixes, minor versions for compatible additions, and major versions for incompatible changes. The public compatibility contract covers documented saved-mix import/export formats, catalog identifiers referenced by mixes, and documented integration interfaces. Internal source layout is not a public API. Preserve user data through migrations where possible.

An exported mix's `schemaVersion` is independent of the app version. Increment it when changing that data format and define how old files are imported. A catalog entry's stable ID must not change just because its display name changes.

## Release procedure

1. Review the accumulated changes and select a version under the policy above.
2. Update `package.json` and the changelog. Update the service-worker cache version if runtime files changed.
3. Run relevant checks (`npm run check`, `npm test`, and browser checks for runtime changes). For research-only changes, verify sources, data consistency, and Markdown links.
4. Commit the release preparation on `dev`, push it, and promote it to `main`.
5. Tag the released `main` commit as `vX.Y.Z` and push that tag. Never move a published release tag.

The [container workflow](../.github/workflows/container.yml) publishes tested images for pushes to `dev`, `main`, and version tags. `main` updates `latest`; version tags add versioned images. See [container deployment](docker.md). This document does not configure branch protection.
