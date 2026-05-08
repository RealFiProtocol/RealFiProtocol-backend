# Tax Strategy Suggestions

Tax strategy suggestions in RealFiProtocol are **informational only** and do not constitute legal or tax advice.

## Usage

Suggestions are stored per transaction and can be created/updated by ADMIN or AGENT roles.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transactions/:transactionId/tax-strategies` | List suggestions for a transaction |
| POST | `/api/transactions/:transactionId/tax-strategies` | Create a suggestion (ADMIN/AGENT) |
| PATCH | `/api/transactions/:transactionId/tax-strategies/:strategyId` | Update a suggestion (ADMIN/AGENT) |

## Disclaimer

All suggestions carry the disclaimer: *"This is informational only and not legal or tax advice."*
Users should consult a qualified tax professional before making any decisions.
