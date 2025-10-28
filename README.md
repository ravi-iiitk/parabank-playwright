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
* **Node crypto (AES‑256‑GCM)** for encrypted local credential storage (test data reuse)

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
│  ├─ e2e.parabank.spec.ts      # Full happy path UI+API
│  ├─ nav.parabank.spec.ts      # Header + left nav verification
│  ├─ login.transfer.spec.ts    # Login then transfer funds (uses saved creds)
│  ├─ login.open-account.spec.ts# Login then open savings (uses saved creds)
│  ├─ login.billpay.spec.ts     # Login then bill pay (uses saved creds)
│  └─ api.find-transactions.spec.ts # API contract/shape check
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

### All tests (headless)

```bash
npm run test
```

### Only the E2E flow

```bash
npm run test:e2e
```

### Headed / debug

```bash
PWDEBUG=1 npm run test:headed              # step-by-step inspector
npx playwright test --project=chromium --headed
```

### Run a single spec or test title

```bash
npx playwright test tests/login.billpay.spec.ts
npx playwright test -g "Open SAVINGS"
```

### Open the last HTML report

```bash
npm run report
```

### Save + reuse creds between tests

The full **E2E** test registers a brand-new user and saves creds via `secureStore.ts` to `.secure/users.json` (AES‑256‑GCM). The *login.* tests then reuse that user.

* To run sequentially: first `e2e.parabank.spec.ts`, then the `login.*` specs.
* Or run everything; fixtures and tests ensure a valid user gets created if none is stored.

---

## 🧩 Key Building Blocks

### Typed Fixtures (`src/fixtures/test-fixtures.ts`)

Provides `pages` (all Page Objects), `user` (fresh realistic data), and `api` (REST client). Import like:

```ts
import { test, expectEx } from '../src/fixtures/test-fixtures';
```

### Page Objects (`src/pages/*`)

* **BasePage** – helpers for reliable `fill`/`select`, title checks.
* **RegisterPage** – fills form using `name`/`id` selectors; waits for success/duplicate handling.
* **LoginPage** – logs in and asserts post-login UI.
* **OpenAccountPage** – selects account type, waits for populated selects, returns `#newAccountId`.
* **AccountsOverviewPage** – parses balances; robust `assertHasAccount` and `getBalanceById`.
* **TransferFundsPage** – resilient dual-select logic + success assertions.
* **BillPayPage** – deterministic payload, asserts result and echoed account/amount.

### Data Generators (`src/utils/data.ts`)

* Crypto-strong randomness (Node’s `crypto.randomBytes` first; web crypto fallback).
* `uniqueUsernameShort(prefix, maxLen)` defaults to 12 chars to avoid UI length issues.
* Realistic `fakeCustomer()` fields (no hard-coded values).

### API Client (`src/utils/apiClient.ts`)

* `axios` instance with base url from `.env`.
* Zod schemas validate payloads; helpful error messages if the AUT returns unexpected shapes.
* Gentle handling for `/transactions/amount/{x}` which may return `[]`, `204`, or `404`.

### Secure Store (`src/utils/secureStore.ts`)

* AES‑256‑GCM encrypts passwords; stores `{username, iv, ct, tag}` in `.secure/users.json`.
* Requires `SECRET_KEY` in `.env` (any string allowed; hashed to 32 bytes for key material).

---

## ✅ Assertions Strategy

* **Structure first**: wait for tables/panels to render, then assert visibility.
* **Content sanity**: numeric account ids, normalized currency parsing, exact link presence.
* **Operation checks**: verify deltas when transferring/paying (tolerant of 0.01 rounding).
* **API shape checks**: Zod enforces contracts; we relax optional fields that vary (e.g., `date`).

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

* **Duplicate username**: generators create short unique ids; if the AUT caches form values, reload the page before registering.
* **`#fromAccountId` has no options** on Open Account: we wait for populated options; if the site is slow, the helper retries until visible options exist.
* **Transfer form strict-mode violation**: we now target the actual `<form id="transferForm">` and separate result panel locators.
* **API payload mismatch (e.g., `date` number)**: Zod schema allows string/nullable and we relax to empty string when needed.
* **`crypto is not defined` in CI**: `data.ts` uses Node `crypto.randomBytes` first; no extra action needed.

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
export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'https://parabank.parasoft.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
```

---

## 🔄 GitHub Actions CI + Pages

* **Workflow**: `.github/workflows/ci.yml`

  * Caches `~/.cache/ms-playwright` and `node_modules` for speed.
  * Installs only **Chromium** to keep CI fast.
  * Publishes HTML report as a GitHub Pages site.

**Enable Pages**: Settings → Pages → Source: “GitHub Actions”.

**Manual Run**: Actions → *Playwright CI + Pages* → **Run workflow**.

Artifacts:

* `playwright-report/` (uploaded + published)
* `junit.xml` (if JUnit reporter is enabled in config)
* `test-results/` (videos, screenshots, traces)

---

## 🧹 Code Style & Contributing

* Keep selectors **stable** (`id`, `name`, aria roles, labels) over brittle CSS.
* Prefer **page methods** + **BasePage helpers** to repeatable patterns (fill+assert, select+wait).
* Add assertions that verify **both presence and correctness** (not just clicks).
* Co-locate test-specific helpers with the spec when they’re not reusable.

---

## 🧭 Extending Coverage

* Add **Find Transactions**, **Update Contact Info**, **Request Loan** flows.
* Add negative tests: invalid login, insufficient funds transfer (if AUT supports), client-side validation on registration/bill pay.
* Add contract tests for more REST endpoints; seed data by UI and validate by API.

---

## 📜 License

MIT (or align with your organization’s standard)

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
* **Node crypto (AES‑256‑GCM)** for encrypted local credential storage (test data reuse)

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
│  ├─ e2e.parabank.spec.ts      # Full happy path UI+API
│  ├─ nav.parabank.spec.ts      # Header + left nav verification
│  ├─ login.transfer.spec.ts    # Login then transfer funds (uses saved creds)
│  ├─ login.open-account.spec.ts# Login then open savings (uses saved creds)
│  ├─ login.billpay.spec.ts     # Login then bill pay (uses saved creds)
│  └─ api.find-transactions.spec.ts # API contract/shape check
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

### All tests (headless)

```bash
npm run test
```

### Only the E2E flow

```bash
npm run test:e2e
```

### Headed / debug

```bash
PWDEBUG=1 npm run test:headed              # step-by-step inspector
npx playwright test --project=chromium --headed
```

### Run a single spec or test title

```bash
npx playwright test tests/login.billpay.spec.ts
npx playwright test -g "Open SAVINGS"
```

### Open the last HTML report

```bash
npm run report
```

### Save + reuse creds between tests

The full **E2E** test registers a brand-new user and saves creds via `secureStore.ts` to `.secure/users.json` (AES‑256‑GCM). The *login.* tests then reuse that user.

* To run sequentially: first `e2e.parabank.spec.ts`, then the `login.*` specs.
* Or run everything; fixtures and tests ensure a valid user gets created if none is stored.

---

## 🧩 Key Building Blocks

### Typed Fixtures (`src/fixtures/test-fixtures.ts`)

Provides `pages` (all Page Objects), `user` (fresh realistic data), and `api` (REST client). Import like:

```ts
import { test, expectEx } from '../src/fixtures/test-fixtures';
```

### Page Objects (`src/pages/*`)

* **BasePage** – helpers for reliable `fill`/`select`, title checks.
* **RegisterPage** – fills form using `name`/`id` selectors; waits for success/duplicate handling.
* **LoginPage** – logs in and asserts post-login UI.
* **OpenAccountPage** – selects account type, waits for populated selects, returns `#newAccountId`.
* **AccountsOverviewPage** – parses balances; robust `assertHasAccount` and `getBalanceById`.
* **TransferFundsPage** – resilient dual-select logic + success assertions.
* **BillPayPage** – deterministic payload, asserts result and echoed account/amount.

### Data Generators (`src/utils/data.ts`)

* Crypto-strong randomness (Node’s `crypto.randomBytes` first; web crypto fallback).
* `uniqueUsernameShort(prefix, maxLen)` defaults to 12 chars to avoid UI length issues.
* Realistic `fakeCustomer()` fields (no hard-coded values).

### API Client (`src/utils/apiClient.ts`)

* `axios` instance with base url from `.env`.
* Zod schemas validate payloads; helpful error messages if the AUT returns unexpected shapes.
* Gentle handling for `/transactions/amount/{x}` which may return `[]`, `204`, or `404`.

### Secure Store (`src/utils/secureStore.ts`)

* AES‑256‑GCM encrypts passwords; stores `{username, iv, ct, tag}` in `.secure/users.json`.
* Requires `SECRET_KEY` in `.env` (any string allowed; hashed to 32 bytes for key material).

---

## ✅ Assertions Strategy

* **Structure first**: wait for tables/panels to render, then assert visibility.
* **Content sanity**: numeric account ids, normalized currency parsing, exact link presence.
* **Operation checks**: verify deltas when transferring/paying (tolerant of 0.01 rounding).
* **API shape checks**: Zod enforces contracts; we relax optional fields that vary (e.g., `date`).

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

* **Duplicate username**: generators create short unique ids; if the AUT caches form values, reload the page before registering.
* **`#fromAccountId` has no options** on Open Account: we wait for populated options; if the site is slow, the helper retries until visible options exist.
* **Transfer form strict-mode violation**: we now target the actual `<form id="transferForm">` and separate result panel locators.
* **API payload mismatch (e.g., `date` number)**: Zod schema allows string/nullable and we relax to empty string when needed.
* **`crypto is not defined` in CI**: `data.ts` uses Node `crypto.randomBytes` first; no extra action needed.

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
export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'https://parabank.parasoft.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
```

---

## 🔄 GitHub Actions CI + Pages

* **Workflow**: `.github/workflows/ci.yml`

  * Caches `~/.cache/ms-playwright` and `node_modules` for speed.
  * Installs only **Chromium** to keep CI fast.
  * Publishes HTML report as a GitHub Pages site.

**Enable Pages**: Settings → Pages → Source: “GitHub Actions”.

**Manual Run**: Actions → *Playwright CI + Pages* → **Run workflow**.

Artifacts:

* `playwright-report/` (uploaded + published)
* `junit.xml` (if JUnit reporter is enabled in config)
* `test-results/` (videos, screenshots, traces)

---

## 🧹 Code Style & Contributing

* Keep selectors **stable** (`id`, `name`, aria roles, labels) over brittle CSS.
* Prefer **page methods** + **BasePage helpers** to repeatable patterns (fill+assert, select+wait).
* Add assertions that verify **both presence and correctness** (not just clicks).
* Co-locate test-specific helpers with the spec when they’re not reusable.

---

## 🧭 Extending Coverage

* Add **Find Transactions**, **Update Contact Info**, **Request Loan** flows.
* Add negative tests: invalid login, insufficient funds transfer (if AUT supports), client-side validation on registration/bill pay.
* Add contract tests for more REST endpoints; seed data by UI and validate by API.

---

## 📜 License

MIT (or align with your organization’s standard)
