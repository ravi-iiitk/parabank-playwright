
---

# 🚀 Fabric QA Code Challenge – Playwright (TypeScript)

A clean, modular **UI + API** automation framework for **ParaBank** using **Playwright + TypeScript**. It emphasizes reliability (defensive waits, resilient selectors), reusability (Page Objects + typed fixtures), and CI-ready reporting.

> **AUT**: [https://parabank.parasoft.com/](https://parabank.parasoft.com/)

---

## 🧱 Tech Stack

* **Playwright** + **@playwright/test** (TypeScript)
* **Page Object Model (POM)**
* **Zod** for API response validation (helpful error messages in CI)
* **Axios** for REST calls
* **dotenv** for env config
* **Node crypto (AES-256-GCM)** for encrypted local credential storage (test data reuse)

---

## 🗂️ Project Structure

```
parabank-playwright/
├─ package.json
├─ tsconfig.json
├─ playwright.config.ts
├─ .env                         # Non-secret runtime config
├─ .env.example                 # Template for .env
├─ README.md
├─ src/
│  ├─ fixtures/
│  │  └─ test-fixtures.ts       # Custom typed fixtures (pages, test data, api client)
│  ├─ pages/
│  │  ├─ BasePage.ts
│  │  ├─ HomePage.ts
│  │  ├─ RegisterPage.ts
│  │  ├─ LoginPage.ts
│  │  ├─ OpenAccountPage.ts
│  │  ├─ AccountsOverviewPage.ts
│  │  ├─ TransferFundsPage.ts
│  │  └─ BillPayPage.ts
│  ├─ utils/
│  │  ├─ apiClient.ts           # REST client + Zod schemas + retry helpers
│  │  ├─ data.ts                # Unique username + realistic fake data generators
│  │  ├─ secureStore.ts         # AES-256-GCM encrypted user storage (.secure/users.json)
│  │  ├─ assertions.ts          # Reusable expect helpers
│  │  └─ types.ts               # Shared TypeScript models
│  └─ config/
│     └─ routes.ts              # Centralized route paths
├─ tests/
│  ├─ e2e.parabank.spec.ts            # Full happy path UI+API
│  ├─ nav.parabank.spec.ts            # Header + left nav verification
│  ├─ login.transfer.spec.ts          # Login then transfer funds (uses saved creds)
│  ├─ login.open-account.spec.ts      # Login then open savings (uses saved creds)
│  ├─ login.billpay.spec.ts           # Login then bill pay (uses saved creds)
│  └─ api.find-transactions.spec.ts   # API contract/shape check
└─ .github/
   └─ workflows/
      └─ ci.yml                 # GitHub Actions CI + Pages publish
```

---

## ⚙️ Setup

### Prerequisites

* **Node.js 18+**
* **git**

### Install

```bash
git clone <repo-url>
cd parabank-playwright
npm ci
npx playwright install --with-deps
cp .env.example .env
```

### Environment variables

`./.env.example` documents options; copy to `.env`:

```env
BASE_URL=https://parabank.parasoft.com
FALLBACK_TO_ACCOUNT=12345     # known destination account if needed
SECRET_KEY=dev-local-secret   # any string; used to encrypt saved test creds
USER_PREFIX=qa                # username prefix for generators
DEFAULT_PASSWORD=Passw0rd!
```

> `SECRET_KEY` is **required** for encrypted credential storage used by the *login.* tests.

---

## ▶️ Running Tests

### NPM scripts (package.json)

```json
{
  "scripts": {
    "prepare": "playwright install --with-deps",

    "test": "playwright test",                                   
    "test:chromium": "playwright test --project=chromium",      

    "test:setup": "playwright test --project=setup",             
    "test:e2e": "playwright test --project=chromium-e2e",

    "test:flow": "playwright test --project=setup --project=chromium-open-account --project=chromium-transfer --project=chromium-billpay",

    "test:headed": "playwright test --headed --project=chromium",
    "report": "playwright show-report",
    "trace:open": "playwright show-trace test-results/**/trace.zip",

    "ci:e2e": "playwright test --project=chromium-e2e"
  }
}
```

### Common commands

```bash
# All tests (per config’s projects) – headless
npm test

# Create user & persist encrypted creds (.secure/users.json)
npm run test:setup

# Ordered flow AFTER setup: open-account → transfer → billpay
npm run test:flow

# Only the main happy-path
npm run test:e2e

# Chromium only (ad-hoc)
npm run test:chromium

# Headed local debug with inspector
npm run test:headed

# Open last HTML report
npm run report

# Open traces from the last run
npm run trace:open
```

### Run a single spec or test title

```bash
npx playwright test tests/login.billpay.spec.ts --project=chromium
npx playwright test -g "Open SAVINGS" --project=chromium
```

---

## 🔢 Test Ordering (Playwright “projects with dependencies”)

The config uses **projects** to enforce order without fragile filename tricks:

1. **`setup`** – registers a brand-new user and writes encrypted creds to `.secure/users.json`.
2. **Dependent projects** (run after `setup`):

   * `chromium-open-account` → `tests/login.open-account.spec.ts`
   * `chromium-transfer` → `tests/login.transfer.spec.ts`
   * `chromium-billpay` → `tests/login.billpay.spec.ts`
   * `chromium-e2e` → `tests/e2e.parabank.spec.ts` (optional big flow)

So `npm run test:flow` will:

* run the `setup` project
* then open account → transfer → billpay (in that order)

You can also run a single dependent project (Playwright will auto-run `setup` first).

---

## 🧩 Key Building Blocks

### Typed Fixtures (`src/fixtures/test-fixtures.ts`)

Provides:

* `pages` (all Page Objects),
* `user` (fresh realistic data),
* `api` (REST client).

```ts
import { test, expectEx } from '../src/fixtures/test-fixtures';
```

### Page Objects (`src/pages/*`)

* **BasePage** – helpers for reliable `fill`/`select`, title checks.
* **RegisterPage** – fills form using stable id/name selectors; success/duplicate handling.
* **LoginPage** – logs in and asserts post-login UI.
* **OpenAccountPage** – selects account type, waits for populated selects, returns `#newAccountId`.
* **AccountsOverviewPage** – parses balances; robust `assertHasAccount` and `getBalanceById`.
* **TransferFundsPage** – resilient dual-select logic + success assertions.
* **BillPayPage** – deterministic payload, asserts result and echoed account/amount.
* **HomePage** – navigation assertions for header & left “Account Services”.

### Data Generators (`src/utils/data.ts`)

* Crypto-strong randomness (Node’s `crypto.randomBytes`; browser fallback not needed in Node).
* `uniqueUsernameShort(prefix, maxLen)` defaults to 12 chars to avoid UI length issues.
* Realistic `fakeCustomer()` fields (no brittle hard-coding).

### API Client (`src/utils/apiClient.ts`)

* `axios` instance with base url from `.env`.
* Zod schemas validate payloads; helpful error messages if the AUT returns unexpected shapes.
* `date` field relaxed (string or number → normalized to string) to tolerate API variance.
* Gentle handling for `/transactions/amount/{x}` which may return `[]`, `204`, or `404`.

### Secure Store (`src/utils/secureStore.ts`)

* AES-256-GCM encrypts passwords; stores `{username, iv, ct, tag}` in `.secure/users.json`.
* Requires `SECRET_KEY` in `.env` (any string allowed; it’s hashed to 32 bytes as key material).

---

## ✅ Assertions Strategy

* **Structure first**: wait for tables/panels to render before reading content.
* **Content sanity**: numeric account ids, normalized currency parsing, exact link presence.
* **Operation checks**: verify deltas after transfers/payments (0.01 tolerance).
* **API shape checks**: Zod guards contracts; optional/variant fields (e.g., `date`) handled.

---

## 🧭 Example Scenarios

### Full happy path (UI + API)

* Register unique user → login → open SAVINGS → overview shows new id → transfer funds → bill pay → API verifies transaction by amount.

### Independent flows using saved creds

* **login.transfer.spec.ts** – login → transfer between two visible accounts (opens extra account if only one).
* **login.open-account.spec.ts** – login → open new SAVINGS → assert presence in overview.
* **login.billpay.spec.ts** – login → bill pay from first available account.

---

## 🪲 Debugging & Troubleshooting

### Traces, videos, screenshots

* Config records **traces on first retry**, **videos/screenshots on failure**.
* From CI logs, download `test-results/.../trace.zip` and run:

```bash
npx playwright show-trace path/to/trace.zip
```

### Common issues & remedies

* **Duplicate username**: generators create short unique ids; if the AUT caches form values, reload before registering.
* **`#fromAccountId` has no options** on Open Account: our page waits for populated options; the demo can be slow—re-run; CI has retries and serial workers.
* **Transfer form strict-mode violation**: we target the actual `<form id="transferForm">` and treat the result panel separately.
* **API payload mismatch (e.g., `date` number)**: schema normalizes to a string so tests remain stable.
* **`crypto is not defined`**: Node 18+ is required (CI and engines configured accordingly).

---

## 🧪 Selecting/Ordering Tests Locally

```bash
# 1) Create a user and persist creds
npx playwright test tests/e2e.parabank.spec.ts --project=chromium

# 2) Reuse saved creds in independent flows
npx playwright test tests/login.transfer.spec.ts --project=chromium
npx playwright test tests/login.open-account.spec.ts --project=chromium
npx playwright test tests/login.billpay.spec.ts --project=chromium
```

---

## 🧰 Playwright Config (snippet)

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined, // serial in CI (stable .secure reuse)
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'junit.xml' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://parabank.parasoft.com',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },

  projects: [
    // 1) SETUP registers a user and saves encrypted creds
    {
      name: 'setup',
      testMatch: /tests\/register\.only\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // 2) Ordered dependents
    {
      name: 'chromium-open-account',
      dependencies: ['setup'],
      testMatch: /tests\/login\.open-account\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-transfer',
      dependencies: ['setup'],
      testMatch: /tests\/login\.transfer\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-billpay',
      dependencies: ['setup'],
      testMatch: /tests\/login\.billpay\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // (Optional) Big happy-path – also depends on setup
    {
      name: 'chromium-e2e',
      dependencies: ['setup'],
      testMatch: /tests\/e2e\.parabank\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

---

## 🔄 GitHub Actions CI + Pages

* **Workflow**: `.github/workflows/ci.yml`

  * Caches `~/.cache/ms-playwright` and `~/.npm` for speed.
  * Installs only **Chromium** (fast).
  * Publishes HTML report as a GitHub Pages site (enable Pages: Settings → Pages → “GitHub Actions”).

**Manual Run**: Actions → *Playwright CI + Pages* → **Run workflow**.

Artifacts:

* `playwright-report/` (uploaded + published to Pages)
* `junit.xml` (for test result parsers)
* `test-results/` (videos, screenshots, traces)

---

## 🧹 Code Style & Contributing

* Keep selectors **stable** (`id`, `name`, ARIA roles, labels) over brittle CSS.
* Prefer **BasePage helpers** for fill/select/waits; avoid raw sleeps.
* Assertions should verify **both presence and correctness** (not just clicks).
* Co-locate small, spec-specific helpers with the spec.

---

## 🧭 Extending Coverage

* Add **Find Transactions**, **Update Contact Info**, **Request Loan** flows.
* Negative tests: invalid login, insufficient funds transfer (if AUT supports), form validation.
* More API contracts; seed via UI and validate via REST.

---

## 📜 License

MIT (or align with your organization’s standard)

---

If you want me to also paste an updated `.env.example` and the CI YAML inline here, say the word and I’ll include them verbatim.
