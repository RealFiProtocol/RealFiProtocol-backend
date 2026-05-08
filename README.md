# RealFiProtocol-backend

**Blockchain-Powered Real Estate Platform**

RealFiProtocol is a modern, scalable backend API that powers a real estate transaction platform. It handles everything from user registration and property listings to transaction tracking, document management, and informational tax strategy suggestions — all secured with JWT-based authentication and role-based access control.

Built with **NestJS**, **PostgreSQL**, and **Prisma ORM**, the architecture is modular and designed for production: clean separation of concerns, input validation on every endpoint, rate limiting, and a CI/CD pipeline ready to deploy.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Features](#features)
- [Architecture](#architecture)
- [Role-Based Access Control](#role-based-access-control)
- [Authentication & Security](#authentication--security)
- [Password Reset Flow](#password-reset-flow)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## How It Works

RealFiProtocol connects **buyers**, **agents**, and **admins** on a single platform to manage the full lifecycle of a real estate transaction:

1. **A user registers** and receives a JWT access token. Their role defaults to `USER`.
2. **An agent or user lists a property** with full details — address, price, bedrooms, status, etc.
3. **A buyer initiates a transaction** against a listed property. The transaction records the amount, status, and optionally a blockchain transaction hash for on-chain settlement.
4. **Agents or admins attach tax strategy suggestions** to a transaction — informational notes about structuring options like 1031 exchanges or opportunity zone investments.
5. **Documents** (deeds, inspection reports, contracts) are uploaded and linked to either a property or a transaction.
6. **Admins** manage users, block accounts, and have full read/write access across the platform.

Every request is authenticated via a Bearer JWT token. Role guards enforce what each role can do. All inputs are validated and sanitized before hitting the database.

---

## Features

- **User Management** — Registration, login, profile updates, role assignment, and account blocking
- **Property Listings** — Full CRUD with status tracking (AVAILABLE, PENDING, SOLD)
- **Transaction Tracking** — Record transactions with amount, status, closing date, and optional blockchain tx hash
- **Tax Strategy Suggestions** — Informational, non-binding tax structuring notes scoped to a transaction
- **Document Management** — Upload and retrieve documents linked to properties or transactions
- **Role-Based Access Control** — Three-tier RBAC (USER, AGENT, ADMIN) enforced at the route level
- **Secure Password Reset** — Token-based reset with expiry, single-use enforcement, and password history
- **Rate Limiting** — Throttler guard prevents abuse (100 requests per 60 seconds by default)
- **Input Validation** — All DTOs validated with `class-validator`; unknown fields stripped automatically
- **Clean Architecture** — Each domain is a self-contained NestJS module with its own controller, service, and DTOs
- **CI/CD Ready** — GitHub Actions pipeline runs lint, tests, build, and deploys on push

---

## Architecture

The application follows NestJS's modular architecture. Each feature domain lives in its own module and communicates only through injected services. The `DatabaseModule` is global, making `PrismaService` available everywhere without re-importing.

```
Request → Controller → Service → PrismaService → PostgreSQL
                ↑
         Guards (JWT, Roles)
         Pipes (ValidationPipe)
```

- **Controllers** handle HTTP routing and delegate to services
- **Services** contain all business logic and database access
- **Guards** run before controllers — `JwtAuthGuard` verifies the token, `RolesGuard` checks the user's role
- **DTOs** define and validate the shape of incoming request bodies
- **PrismaService** wraps the Prisma Client and manages the database connection lifecycle

---

## Role-Based Access Control

Three roles are supported, assigned at registration (default: `USER`) or updated by an admin.

| Role | What they can do |
|------|-----------------|
| `USER` | Register, login, create/manage own properties, initiate transactions, upload documents, view tax strategies |
| `AGENT` | Everything USER can do, plus create/update tax strategy suggestions and manage any property |
| `ADMIN` | Full access — list/delete any user, block accounts, manage all resources, assign roles |

Routes are protected with NestJS guards:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get()
findAllUsers() { ... }
```

If no `@Roles()` decorator is present, any authenticated user can access the route.

---

## Authentication & Security

Authentication uses **JWT (JSON Web Tokens)** via `passport-jwt`.

**Login flow:**
1. `POST /api/auth/login` with email and password
2. Server validates credentials and checks the account is not blocked
3. Returns a signed JWT access token (default expiry: 15 minutes)
4. Client sends the token as `Authorization: Bearer <token>` on subsequent requests

**Token validation:**
- The `JwtStrategy` extracts the token from the Authorization header
- Verifies the signature against `JWT_SECRET`
- Attaches `{ id, email, role }` to `req.user` for use in controllers and guards

**Additional security measures:**
- Passwords hashed with bcrypt (configurable rounds, default 12)
- Rate limiting via `@nestjs/throttler`
- Input whitelist — unknown fields in request bodies are stripped by `ValidationPipe`
- Blocked users cannot log in or receive password reset emails

---

## Password Reset Flow

```
POST /api/auth/password-reset/request   { "email": "user@example.com" }
POST /api/auth/password-reset/reset     { "token": "...", "newPassword": "..." }
```

1. User submits their email to the request endpoint
2. If the account exists and is not blocked, a cryptographically random 32-byte token is generated and stored with a 1-hour expiry
3. The token is sent to the user's email (email delivery is a stub in development — the token is returned in the response for testing)
4. User submits the token and their new password to the reset endpoint
5. Server validates the token is not expired and not already used
6. New password is checked against the last N passwords in history (configurable via `PASSWORD_HISTORY_LIMIT`, default 5) to prevent reuse
7. Password is hashed and saved; the token is cleared

**Security properties:**
- Tokens expire after 1 hour
- Tokens are single-use — cleared immediately after a successful reset
- A new reset request invalidates any previous token
- Blocked accounts silently receive no email (response is identical to a valid request to prevent enumeration)

---

## Database Schema

Five core models, managed by Prisma Migrate:

### User
Stores platform users. Passwords are bcrypt-hashed. `passwordHistory` is an array of previous hashes used to enforce password reuse policy.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| email | String | Unique |
| password | String | Bcrypt hash |
| firstName / lastName | String | |
| role | Enum | USER, AGENT, ADMIN |
| isBlocked | Boolean | Default false |
| passwordResetToken | String? | Null after use |
| passwordResetExpiry | DateTime? | 1-hour window |
| passwordHistory | String[] | Last N hashes |

### Property
Real estate listings owned by a user.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| title, description | String | |
| address, city, state, zipCode | String | |
| price | Decimal(15,2) | |
| bedrooms, bathrooms, sqft | Int? | |
| status | Enum | AVAILABLE, PENDING, SOLD |
| ownerId | UUID | FK → User |

### Transaction
Records a purchase event between a buyer and a property.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| propertyId | UUID | FK → Property |
| buyerId | UUID | FK → User |
| amount | Decimal(15,2) | |
| status | Enum | PENDING, IN_PROGRESS, COMPLETED, CANCELLED |
| blockchainTxHash | String? | On-chain reference |
| closingDate | DateTime? | |

### Document
Files linked to a property or transaction.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name, url, mimeType | String | |
| propertyId | UUID? | Optional FK |
| transactionId | UUID? | Optional FK |
| uploadedById | UUID | FK → User |

### TaxStrategy
Informational tax structuring suggestions scoped to a transaction.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| transactionId | UUID | FK → Transaction |
| title, description | String | |
| disclaimer | String | Default legal disclaimer |

---

## API Endpoints

All routes are prefixed with `/api`.

### Health
```
GET  /api/health
```
Returns `{ status: "ok", timestamp: "..." }`. No authentication required.

---

### Auth
```
POST /api/auth/register          Register a new user (role defaults to USER)
POST /api/auth/login             Login and receive a JWT access token
POST /api/auth/password-reset/request   Request a password reset email
POST /api/auth/password-reset/reset     Reset password using a valid token
```

---

### Users
All routes require authentication. `GET /` and `DELETE /:id` require ADMIN role.

```
GET    /api/users          List all users (ADMIN only)
GET    /api/users/:id      Get a user by ID
PUT    /api/users/:id      Update a user (own profile, or any user if ADMIN)
DELETE /api/users/:id      Delete a user (ADMIN only)
```

---

### Properties
All routes require authentication.

```
POST   /api/properties          Create a property listing
GET    /api/properties          List all properties
GET    /api/properties/:id      Get a property by ID
PUT    /api/properties/:id      Update a property (owner, AGENT, or ADMIN)
DELETE /api/properties/:id      Delete a property (owner or ADMIN)
```

---

### Transactions
All routes require authentication.

```
POST   /api/transactions          Create a transaction
GET    /api/transactions          List all transactions
GET    /api/transactions/:id      Get a transaction by ID
PUT    /api/transactions/:id      Update a transaction (buyer, AGENT, or ADMIN)
DELETE /api/transactions/:id      Delete a transaction (buyer or ADMIN)
```

---

### Tax Strategy Suggestions
All routes require authentication. POST and PATCH require ADMIN or AGENT role.

```
GET   /api/transactions/:transactionId/tax-strategies
POST  /api/transactions/:transactionId/tax-strategies         (ADMIN/AGENT)
PATCH /api/transactions/:transactionId/tax-strategies/:id     (ADMIN/AGENT)
```

> Tax strategy suggestions are informational only and are not legal or tax advice.
> See [docs/Tax_Strategy_Suggestions.md](docs/Tax_Strategy_Suggestions.md).

---

### Documents
All routes require authentication.

```
POST   /api/documents          Upload a document record
GET    /api/documents          List all documents
GET    /api/documents/:id      Get a document by ID
DELETE /api/documents/:id      Delete a document (uploader or ADMIN)
```

---

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- npm >= 8.0.0

---

## Installation

```bash
# Clone the repository
git clone https://github.com/RealFiProtocol/RealFiProtocol-backend.git
cd RealFiProtocol-backend

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
```

---

## Database Setup

```bash
# Generate the Prisma Client from schema.prisma
npm run db:generate

# Run all migrations to set up the database schema
npm run migrate

# (Optional) Seed the database with sample users, a property, transaction, and tax strategy
npm run db:seed
```

Seed credentials (development only):

| Email | Password | Role |
|-------|----------|------|
| admin@realfiprotocol.com | Admin1234! | ADMIN |
| agent@realfiprotocol.com | Agent1234! | AGENT |
| buyer@realfiprotocol.com | Buyer1234! | USER |

---

## Running the App

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000/api`.

---

## Testing

```bash
npm test               # Run all unit tests
npm run test:cov       # Run tests with coverage report
npm run test:watch     # Watch mode for development
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (`development` / `production`) | `development` |
| `JWT_SECRET` | Secret for signing access tokens | Required |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | Required |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `BCRYPT_ROUNDS` | bcrypt hashing cost factor | `12` |
| `PASSWORD_HISTORY_LIMIT` | Number of previous passwords to block reuse | `5` |

---

## Project Structure

```
RealFiProtocol-backend/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD pipeline
├── docs/
│   └── Tax_Strategy_Suggestions.md
├── prisma/
│   ├── schema.prisma           # Database schema and models
│   └── seed.ts                 # Development seed data
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts  # Register, login, password reset routes
│   │   ├── auth.service.ts     # Auth business logic
│   │   ├── auth.dto.ts         # Login, register, reset DTOs
│   │   ├── auth.module.ts
│   │   ├── jwt.strategy.ts     # Passport JWT strategy
│   │   ├── jwt-auth.guard.ts   # Route authentication guard
│   │   ├── roles.guard.ts      # Role enforcement guard
│   │   └── roles.decorator.ts  # @Roles() decorator
│   ├── database/
│   │   ├── prisma.service.ts   # PrismaClient wrapper
│   │   └── database.module.ts  # Global database module
│   ├── users/
│   ├── properties/
│   ├── transactions/
│   ├── documents/
│   ├── tax-strategies/
│   ├── app.module.ts           # Root module
│   ├── app.controller.ts       # Health check
│   └── main.ts                 # Bootstrap, global prefix, validation pipe
├── .env.example
├── nest-cli.json
├── package.json
└── tsconfig.json
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:dev` | Start with hot reload |
| `npm run start:prod` | Start compiled production build |
| `npm run lint` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm test` | Run unit tests |
| `npm run test:cov` | Tests with coverage report |
| `npm run migrate` | Run Prisma migrations (dev) |
| `npm run migrate:deploy` | Deploy migrations (production) |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Seed the database |

---

## Deployment

The CI/CD pipeline in `.github/workflows/ci.yml` runs on every push:

1. Spins up a PostgreSQL service container
2. Installs dependencies and generates the Prisma Client
3. Runs migrations against the test database
4. Runs ESLint
5. Runs the full test suite with coverage
6. Builds the application

Branch strategy:
- `develop` → deploys to **staging**
- `main` → deploys to **production**

For manual production deployment:

```bash
npm run build
npm run migrate:deploy
npm run start:prod
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push the branch: `git push -u origin feature/your-feature`
5. Open a Pull Request against `develop`

---

## License

MIT
