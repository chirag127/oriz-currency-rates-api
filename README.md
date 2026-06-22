# oriz-currency-rates-api

Daily USD-base currency rate snapshots, aggregated as the **median** across 3 free upstream FX sources. Static JSON, no auth, MIT-licensed. PWA-installable docs.

## Upstreams (full credit)

This API would not exist without:

- **[frankfurter.app](https://www.frankfurter.app/)** — ECB-sourced FX rates, free, no key.
- **[exchangerate.host](https://exchangerate.host/)** — free FX rates API.
- **[open.er-api.com](https://open.er-api.com/)** — openexchangerates' free alternate endpoint (the proper [openexchangerates.org](https://openexchangerates.org/) free tier requires an `app_id`; this one does not).

The Oriz layer just polls all three daily, takes the per-currency median, and publishes one JSON file. If you only need one source, please hit them directly — they do the real work.

## Endpoints

Once deployed to `https://currency.api.oriz.in`:

```
GET /data/latest.json
GET /data/rates-YYYY-MM-DD.json
```

Response shape:

```json
{
  "source": "aggregate",
  "date": "2026-06-22",
  "fetchedAt": "2026-06-22T10:00:00.000Z",
  "base": "USD",
  "count": 32,
  "sources": [
    { "name": "frankfurter.app", "ok": true },
    { "name": "exchangerate.host", "ok": true },
    { "name": "open.er-api.com", "ok": true }
  ],
  "rates": { "INR": 83.5, "EUR": 0.92, "GBP": 0.79, "...": "..." }
}
```

If all three upstreams fail, a small built-in fallback set is returned so consumers never get a 404.

## Schedule

`scrape.yml` runs daily at **06:30 IST (01:00 UTC)** via GitHub Actions and commits the snapshot back to `data/`.

## Local

```bash
npm run scrape
```

Writes `data/rates-YYYY-MM-DD.json` and `data/latest.json`.

## License

MIT — see [LICENSE](./LICENSE). Upstream data is republished under their respective terms; please credit them in any downstream use.
