# DB-IP Lite (IP-to-country)

This directory contains a packed extract of [DB-IP Lite](https://db-ip.com/db/lite.php)
country data, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

This product includes DB-IP Lite data created by [DB-IP](https://db-ip.com/),
licensed under CC BY 4.0. The dataset is bundled unchanged in meaning (country
code per IP range); it is stored in a compact binary form for offline lookup
and is not fetched at runtime.

- Source file: `dbip-country-lite-2026-09.csv.gz`
- Bundled as: `dbip-country.bin.gz`
- Date: see `VERSION`

Rebuild (maintainers only; requires a local copy of the CSV — do not fetch at
scan time):

```
npx tsx scripts/build-geo.ts /path/to/dbip-country-lite-YYYY-MM.csv.gz
```
