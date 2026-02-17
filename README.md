# Loanns

Loan origination and credit decision API: create applications, run credit assessment (3× income rule), and approve or reject. Built with NestJS, TypeORM (PostgreSQL), and Redis.

## Prerequisites

- Node.js 18+
- pnpm
- Docker and Docker Compose (optional, for Postgres and Redis)

## Setup

```bash
pnpm install
```

Copy environment variables and set your values:

```bash
cp .env.example .env
# Edit .env with your DB and Redis settings
```

### Run Postgres and Redis (Docker)

```bash
docker-compose up -d
```

### Database migrations

Build and run migrations:

```bash
pnpm run build
pnpm run migration:run
```

To revert the last migration:

```bash
pnpm run migration:revert
```

## Run the app

```bash
# Development (watch mode)
pnpm run start:dev

# Production
pnpm run start:prod
```

The API is available at `http://localhost:3000`. Default port can be overridden with `PORT` in `.env`.

## API

- **Base URL:** `http://localhost:3000/api/v1`
- **Loan applications:** `http://localhost:3000/api/v1/loan-applications`
- **Full reference (request/response shapes):** [docs/API.md](docs/API.md)
- **Interactive docs (Swagger):** `http://localhost:3000/swagger` (when the server is running)

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm run build` | Compile TypeScript |
| `pnpm run start:dev` | Start in watch mode |
| `pnpm run start:prod` | Start production build |
| `pnpm run migration:run` | Run pending migrations (run after build) |
| `pnpm run migration:revert` | Revert last migration |
| `pnpm run test` | Unit tests |
| `pnpm run test:e2e` | E2E tests |
| `pnpm run test:cov` | Test coverage |
| `pnpm run lint` | Lint and fix |

## License

UNLICENSED
