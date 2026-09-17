# GitHub Action — `dpdp-cookie-scan`

Thin wrapper around the CLI. It runs `dpdp-cookie-scan --ci`, uploads
`findings.json` / `findings.md` as the `dpdp-scan` artifact, and on a
`pull_request` event posts (or updates) `findings.md` as a PR comment.

All interpretation stays in the CLI. This Action does not decide certainty
and does not say a site is or is not compliant. It does not fail the job
because findings exist unless you set `fail-on: settled` (opt-in; never
trips on arguable or open findings).

The Action downloads the `dpdp-cookie-scanner` package and runs the
`dpdp-cookie-scan` command. Locally that is:

```bash
npx --package=dpdp-cookie-scanner dpdp-cookie-scan <url> --ci
```

## Usage

```yaml
name: DPDP scan
on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: Vettam/dpdp-cookie-scanner/action@v0.3.0
        with:
          url: https://staging.example.com
          version: "0.3.0"   # pin the npm package; omit for latest
```

Pin both the Action ref (`@v0.3.0`) and `version` to the same release so the
wrapper and the CLI cannot drift.

## Inputs

| Input | Default | Meaning |
|---|---|---|
| `url` | *required* | Page to scan |
| `version` | latest | npm package version of `dpdp-cookie-scanner` |
| `gpc` | `false` | Send `Sec-GPC: 1` |
| `include-query` | `false` | Keep query strings in evidence |
| `timeout` | `15000` | Navigation timeout (ms) |
| `settle` | `3000` | Post-load wait (ms) |
| `interact` | `false` | Three-pass banner interaction |
| `fail-on` | empty | Opt-in gate; only `settled` is accepted |
| `out` | `dpdp-scan` | Output directory |
| `comment` | `true` | Post/update the PR comment |
| `github-token` | `${{ github.token }}` | Token for the comment |

## Outputs

- `json-path` — path to `findings.json`
- `md-path` — path to `findings.md`

The job exit code follows the CLI: `0` on a completed scan regardless of
findings, `1` only when `fail-on: settled` and settled findings exist,
non-zero on usage or navigation failure.
