# Data sources

All endpoints below were verified with live requests on 2026-10-11 unless marked otherwise. Machine-readable summary
(free tier, limits, credentials, fallbacks): [`config/integrations.json`](../config/integrations.json). The source
registry in the database (`sources` table, page "المصادر والبيانات") stores, per source: name, domain, endpoint, type,
auth requirement, terms, topics, schedule, last success, last error, coverage limits, and provenance
(official / third-party / inferred / user).

## Implemented connectors

### World Bank — World Development Indicators (`worldbank-indicators`, official)
- Endpoint: `https://api.worldbank.org/v2/country/{LBN;JOR;EGY;CYP}/indicator/{CODE}?format=json&per_page=2000`
- Auth: none. Terms: CC BY 4.0, attribute The World Bank. Rate limit: none documented. One request was slow (60 s+) in testing; the client uses a 90 s timeout and retries.
- Response: `[ {page,pages,per_page,total,sourceid,lastupdated}, [ {indicator{id,value}, country{id,value}, countryiso3code, date, value|null, unit, obs_status, decimal} ] ]`. Errors come back as `[{"message":[…]}]`.
- 19 indicators (see `src/lib/catalog/indicators.ts`). Lebanon latest values: CPI inflation 2025, official FX 2025, GDP 2024, unemployment 2023, tourism arrivals **2019**, central-government debt **1999** (stale series are flagged in the UI).
- Schedule: weekly.

### IMF DataMapper / WEO (`imf-datamapper`, official)
- Endpoint: `https://www.imf.org/external/datamapper/api/v1/{INDICATOR}/{COUNTRY}`. **The API returns all countries regardless of the path**, so filtering is client-side. Payloads can include an empty-string indicator key with `null`, which validation tolerates.
- Response: `{"values": {IND: {ISO3: {"YYYY": number}}}, "api": {...}}`.
- Indicators: NGDP_RPCH, PCPIPCH, LUR, BCA_NGDPD, GGXWDG_NGDP, NGDPD. Lebanon has data to 2025 and **no projections**; peers run to 2031. Years ≥ the current year are flagged as projections.
- Rate limit: HTTP 429 observed after ~7 rapid calls; the client spaces calls ≥ 2 s. Schedule: weekly.

### Central Administration of Statistics — CPI (`cas`, official)
- Page: `https://www.cas.gov.lb/economic-statistics/cpi/`. robots.txt allows it (only `/wp-admin/` is disallowed).
- The page links only the latest workbook, e.g. `…/wp-content/uploads/cpi/latest/8-CPI_AUGUST2026.xlsx`, so the link is discovered on each run.
- Sheets `CPI_monthly` and `CPI_yearly`: Lebanon plus 6 regions × 12 expenditure divisions, index (Dec 2013 = 100), month-on-month and year-on-year change. Merged cells repeat values in exceljs, which the parser handles. Nabatieh indexes marked `*` are based on imputed prices and are stored as `provisional`.
- History accumulates from the first run (each file holds the current and previous month). Schedule: daily check.

### BDL official USD/LBP (`bdl-official-rate`, official, via aggregator)
- BDL's own site returns a Cloudflare challenge (HTTP 403) and is not scraped.
- Endpoint: `https://api.frankfurter.dev/v2/rates?base=USD&quotes=LBP&providers=BDL&from=…&to=…` returns `[{date, base, quote, rate}]`. BDL provider data starts 2024-01-02. Value on 2026-10-08: 89,500.
- Frankfurter: free including commercial use, no quotas (abuse limiting only). Rates fall under BDL's terms.

### ECB reference rates (`ecb-frankfurter`, official)
- `https://api.frankfurter.dev/v1/{start}..?from=USD&to=EUR,GBP,JPY,CHF,CNY,TRY` returns `{amount, base, start_date, end_date, rates:{date:{CCY:rate}}}`. The set has no LBP.

### Gold/silver spot (`gold-api`, third party)
- `https://api.gold-api.com/price/XAU` returns `{currency, currencySymbol, exchangeRate, name, price, symbol, updatedAt, updatedAtReadable}`. Free, no key, no rate limit for live prices; commercial use permitted per its terms. History endpoints need a paid key and are not used, so history accumulates per run.
- Stored as `third_party_quote`, not an official fixing.

### WFP food prices — Lebanon (`wfp-food-prices`, third party)
- CSV (HDX, CC BY-IGO): `https://data.humdata.org/dataset/db0b4fb1-…/resource/772bc34e-…/download/wfp_food_prices_lbn.csv`, about 5 MB.
- Columns: `date,admin1,admin2,market,market_id,latitude,longitude,category,commodity,commodity_id,unit,priceflag,pricetype,currency,price,usdprice`; the second row holds HXL tags and is skipped.
- 27 markets in 8 governorates with **source-provided coordinates** (used for map markers), 2012 onward.
- The commodity "Exchange rate (unofficial)" becomes a monthly `parallel` USD/LBP series (median across markets).

### GDELT DOC 2.0 (`gdelt-doc`, third party)
- `https://api.gdeltproject.org/api/v2/doc/doc?query=…&mode=artlist&format=json&sort=DateDesc&maxrecords=250&timespan=7d` (or `startdatetime`/`enddatetime` when incremental).
- Fields: `url, url_mobile, title, seendate (YYYYMMDDTHHMMSSZ, UTC), socialimage, domain, language, sourcecountry`. `seendate` is when GDELT first saw the article; the UI labels it "أول رصد".
- **Arabic-script keywords return nothing** (search runs on English translations), so Arabic and French coverage uses `sourcelang:` and `sourcecountry:LE`.
- Limit: 1 request per 5 s. Frequent 429/503 responses were observed, and the 2026-10-11 run failed with HTTP 503 on every query. That is recorded as a source error.

### RSS/Atom feeds (third party)
Enabled: Annahar `annahar.com/rss` (ar), LBCI Lebanon and Economy (ar) and Latest (en), Al Jadeed Economy (ar), Naharnet Lebanon and Business (Atom, en), The961, Executive Magazine, BlomInvest research blog (leading whitespace before `<?xml` handled), Beirut Today, Libnanews Économie (fr).
Available but disabled (regional or high volume): Al Jadeed latest, Asharq Al-Awsat, Arab News. Only titles, links, dates and short excerpts are stored. Users can add feeds from the UI, and each URL is verified as a real feed first.

### Optional, need keys
- **Twelve Data**: `GET https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=1day&apikey=…`. Free Basic plan: 8 credits/min, 800/day, personal/non-commercial. Errors come as `{code, message, status:"error"}`; the demo key returns 401.
- **Alpha Vantage**: `FX_DAILY`, `BRENT`/`WTI`. Free tier: 25 requests/day. Errors come as HTTP 200 with `Information`/`Error Message`/`Note` keys, and the connector checks the body.

### Manual entry and CSV import (`manual-entry`, user)
For official figures that can't be fetched automatically (BDL bulletins, Ministry of Finance tables), use a form or
CSV. A source name and URL are mandatory. Market values are stored as `user_entered`, with the publisher's claimed
rate type kept in provenance.

## Investigated, not implemented

| Source | Finding |
|---|---|
| bdl.gov.lb, economy.gov.lb | Cloudflare "Just a moment…" challenge (HTTP 403); not bypassed |
| finance.gov.lb | Reachable; scattered xlsx/PDF links, no stable dataset endpoint; Public Debt page returned 503 |
| L'Orient Today / L'Orient-Le Jour, NNA, Al-Akhbar, Al Mayadeen RSS | Cloudflare challenge (HTTP 403) |
| businessnews.com.lb RSS | Connection reset |
| ReliefWeb API | v1 returns 410; v2 requires a pre-approved `appname` |
| Google Trends | Official API is an application-only alpha; no scraping |
| Property, jobs and tender listings | No source verified as lawful to collect; the `listings` module is ready for a vetted adapter |

## Geography
- Governorate boundaries: geoBoundaries gbOpen LBN ADM1 (simplified, **public domain**, 9 governorates, French names), shipped as `public/geo/lebanon-adm1.geojson` with an added `area_key`. Centroids are computed from the polygons.
- Tiles: `tile.openstreetmap.org` with "© OpenStreetMap contributors" attribution. Follow the OSMF tile usage policy (valid User-Agent and Referer, caching, no bulk downloads, no SLA). Use a commercial tile provider for heavier traffic.
- CAS publishes CPI for 6 historical regions. Governorates created later (Akkar, Baalbek-Hermel, Keserwan-Jbeil) are shaded with their parent CAS region, and the tooltip says so.
