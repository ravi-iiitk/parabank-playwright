<<<<<<< HEAD
# parabank-playwright
parabank-playwright
=======
# ParaBank – Playwright + TypeScript

## Prereqs
- Node 18+

## Setup
```bash
npm i
npx playwright install --with-deps
cp .env.example .env
```

## Run
```bash
npm run test       # all
npm run test:e2e   # main scenario only
npm run report     # open report UI
```

## Notes
- Base URL defaults to `https://parabank.parasoft.com` but can be changed via `.env`.
- Provide `FALLBACK_TO_ACCOUNT` in `.env` if bill-pay/transfer needs a known destination.
- API test uses ParaBank REST endpoint `/parabank/services/bank`.
>>>>>>> 88a0068 (feat: Playwright + TS framework for ParaBank (E2E + API))
