# Changesets

This folder is managed by [@changesets/cli](https://github.com/changesets/changesets).

To record a change, run:

```sh
npm run changeset
```

and follow the prompts. A new file describing the change will be added here. The
`version` and `publish` scripts consume these files to bump `package.json` and
publish to npm.

The rule catalogue (`rules/VERSION`), tracker dataset (`trackers/VERSION`), and
engine version are versioned **independently** of the npm package version. Use a
changeset to bump the npm package; bump the catalogue/dataset/engine versions in
their own `VERSION` files when their contents change.
