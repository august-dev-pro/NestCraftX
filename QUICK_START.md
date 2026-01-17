# Quick Start - NestCraftX v0.2.5

## Installation

```bash
npm install -g nestcraftx

```

## Quick Start

### Option 1: LIGHT Mode with flags (Fastest)

```bash
nestcraftx new my-api --light --orm=prisma --auth --swagger
cd my-api
npm run start:dev

```

Result: Project generated in seconds with:

- Simplified MVP Architecture
- Prisma ORM
- JWT Authentication
- Swagger Documentation
- `.env` file with auto-generated secrets

### Option 2: Interactive LIGHT Mode

```bash
nestcraftx new my-api --light

```

The CLI will ask you questions to:

- Choose the ORM
- Enable Auth/Swagger/Docker
- Configure the database
- Add entities (optional)

### Option 3: Interactive FULL Mode

```bash
nestcraftx new my-project

```

Complete configuration with:

- Clean Architecture + DDD
- Use-cases, mappers, adapters
- Detailed interactive setup
- Entities and relationships

---

## Essential Commands

```bash
# Create a project
nestcraftx new <name> [options]

# LIGHT Mode
nestcraftx new api --light --orm=prisma

# FULL Mode
nestcraftx new app --full

# Check environment
nestcraftx test

# CLI Info
nestcraftx info

```

## Main Options

| Option          | Description                                             | Values                                        |
| --------------- | ------------------------------------------------------- | --------------------------------------------- |
| `--light`       | Simplified MVP architecture                             | -                                             |
| `--full`        | Complete architecture (default)                         | -                                             |
| `--orm`         | Choice of ORM                                           | `prisma`, `typeorm`, `mongoose (coming soon)` |
| `--auth`        | Enables JWT auth                                        | -                                             |
| `--swagger`     | Enables Swagger docs                                    | -                                             |
| `--docker`      | Generates Docker files                                  | `true` (default), `false`                     |
| `--interactive` | Force interactive mode for entities/relationships input | -                                             |

---

## Practical Examples

### Blog API (LIGHT + Prisma)

```bash
nestcraftx new blog-api --light --orm=prisma --auth --swagger

```

### E-commerce API (FULL + TypeORM)

```bash
nestcraftx new shop-api --full --orm=typeorm --auth --swagger

```

### MongoDB API (LIGHT + Mongoose)

```bash
nestcraftx new mongo-api --light --orm=mongoose --auth

```

---

## After Generation

```bash
cd <project-name>
npm run start:dev

```

**Swagger available at:** `http://localhost:3000/api/docs`

## Mode Differences

### LIGHT Mode

- Flat structure
- Controllers → Services → Repositories
- Fast startup
- Perfect for MVPs

### FULL Mode

- Complete Clean Architecture
- Domain/Application/Infrastructure/Presentation layers
- Use-cases and mappers
- Ideal for complex projects

---

## Auto-generated .env File

The CLI automatically generates:

- `JWT_SECRET` (64 secure chars)
- `JWT_REFRESH_SECRET` (64 secure chars)
- `DATABASE_URL` (pre-configured)
- All necessary environment variables

## Complete Documentation

- [Full User Guide](https://www.google.com/search?q=./CLI_USAGE.md)
- [Migration Guide](https://www.google.com/search?q=./MIGRATION_GUIDE.md)
- [Changelog](https://www.google.com/search?q=./CHANGELOG.md)
- [README](https://www.google.com/search?q=./readme.md)

## Support

- GitHub: [NestCraftX](https://github.com/august-dev-pro/NestCraftX)
- Issues: [Open an issue](https://github.com/august-dev-pro/NestCraftX/issues)

---

**NestCraftX v0.2.5** - Clean Architecture Made Simple
