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

For historical releases before 1.0, our convention was a minor bump for new capabilities or breaking changes, and a patch bump for compatible fixes. Explicitly describe migration needs, especially changes to saved mixes. Documentation-only checkpoints need no app-version bump; if packaged as a release, they receive a patch version.

From 1.0, use patch versions for compatible fixes, minor versions for compatible additions, and major versions for incompatible changes. The public compatibility contract covers documented saved-mix import/export formats, catalog identifiers referenced by mixes, and documented integration interfaces. Internal source layout is not a public API. Preserve user data through migrations where possible.

An exported mix's `schemaVersion` is independent of the app version. Increment it when changing that data format and define how old files are imported. A catalog entry's stable ID must not change just because its display name changes.

## Stable 1.x compatibility contract

Version 1.0.0 establishes the stable baseline. Compatible 1.x updates continue to read valid documented `#mix=v1` links, `openambience-mix` schema version 1 individual ZIPs and `openambience-mixes` schema version 1 collection ZIPs produced by this baseline. See [mix portability](mix-portability.md). New optional formats can be added without dropping these readers. Validation still rejects damaged, incomplete or unsupported input.

Built-in sound IDs referenced by saved mixes and exports remain stable throughout 1.x; a display-name change does not rename an ID or assign it to a different sound. Browser storage remains internal and can evolve with migrations that preserve supported saved mixes and recordings. Moving between origins still requires ZIP transfer because browser storage belongs to its origin.

Patch versions deliver compatible fixes and maintenance, minor versions add compatible capabilities, and a change that breaks this contract requires a new major version. A stable version does not imply universal browser/codec support or a completed accessibility/device audit; the [known limits](../README.md#known-limits) and [validation record](testing.md) remain part of the release documentation.

## Release procedure

1. Review the accumulated changes and select a version under the policy above.
2. Update `package.json` and the changelog. Update the service-worker cache version if runtime files changed. For a milestone, prepare `docs/releases/X.Y.Z.md` for the GitHub Release body.
3. Run relevant checks (`npm run check`, `npm test`, and browser checks for runtime changes). For research-only changes, verify sources, data consistency, and Markdown links.
4. Commit the release preparation on `dev`, push it, and promote it to `main`.
5. Tag the released `main` commit as `vX.Y.Z` and push that tag. Never move a published release tag.
6. Confirm the Check, GitHub Pages deployment, and Container workflows succeed for the release. Verify the public page serves the new version and the container runs publish `latest` from `main` and the semantic version tags from the release tag. The tag's Container workflow publishes the GitHub Release after successful image publication, using the milestone notes when present or generated notes otherwise. Prerelease tags are marked as prereleases. A push triggering a workflow is not evidence that its deployment finished successfully.

The [container workflow](../.github/workflows/container.yml) publishes tested images for pushes to `dev`, `main`, and version tags. `main` updates `latest`; version tags add versioned images. See [container deployment](docker.md). This document does not configure branch protection.
