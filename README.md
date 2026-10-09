# MakeMyTrip Bus Automation

An Edge-only Playwright Test project for the MakeMyTrip Bus Search flow. It contains four independent, requirement-tagged tests, typed fixtures and page objects, fixed JSON data, concise logging, and a standalone HTML/JSON reporter.

## Live UI inspection

The bus form and city suggestions were inspected in Microsoft Edge. The visible From/To values are read-only; opening them exposes accessible search textboxes and city options. The travel-date calendar exposes accessible grid cells. The site sometimes presents an optional sign-in prompt, which the page object closes using the visible close control; these search tests do not sign in. Network errors, CAPTCHA, and access restrictions are not bypassed and known browser/network errors are reported as **blocked**.

## Structure

```text
tests/bus-search.spec.ts
pages/BasePage.ts
pages/BusSearchPage.ts
fixtures/test-fixtures.ts
test-data/bus-search-data.json
utils/logger.ts
utils/test-data-reader.ts
reporter/CustomReporter.ts
reports/custom-report.html
reports/execution-results.json
reports/artifacts/
playwright.config.ts
package.json
tsconfig.json
```

## Prerequisites and installation

- Node.js 20 or newer and npm.
- Microsoft Edge installed. No other browser is configured or used.
- Network access to MakeMyTrip. CAPTCHA and access restrictions are not bypassed.

Install dependencies in this project directory:

```powershell
npm install
npx playwright --version
```

## Run tests

Headed Edge is the default for initial debugging. Set `HEADLESS=true` for headless mode; set `PW_RETRIES=0` to disable the default single retry.

```powershell
npm test
npm run test:tc001
npm run test:tc002
npm run test:tc003
npm run test:debug
npm run typecheck
```

Each test uses the Playwright-provided page through the typed fixture. The test data uses Bangalore and Chennai; the travel date is calculated as 30 days after the current local date at run time, so it remains future-dated without editing the JSON file.

## Reports

The custom reporter writes `reports/custom-report.html` and `reports/execution-results.json` after each test run, including failed or blocked executions. Screenshots, traces, and videos are stored beneath `reports/artifacts/`; report links are included only for artifact files that exist.

```powershell
npm run report:open
```

The report includes actual per-test attempts and final statuses, retries, duration, failure detail, requirement mapping for `REQ_BUS_01`, searchable results, and status filters. Pass percentage counts stable passes over stable passes plus failed and flaky tests; skipped and blocked cases are excluded.

## Known limitations

MakeMyTrip may change its UI, show an optional sign-in prompt, or restrict requests. The same-city test accepts visible validation or a search that remains on the unchanged form; current behavior should be rechecked if the site's business rules change. No credentials, CAPTCHA, or human verification are automated. If a later run encounters a restriction, inspect the recorded error and artifacts; do not substitute another browser or weaken assertions.
