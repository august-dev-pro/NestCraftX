# NestCraftX Migration Guide: v0.1.x → v0.2.5

## Overview

Version **0.2.5** marks a major milestone in NestCraftX's maturity. We are moving from a simple generation script to a truly professional CLI tool with a completely redesigned User Experience (UX).

**Update Key Points:**

- **New Interface:** Arrow-key navigation using `Inquirer.js` (no more manual typing).
- **Package Manager:** Native support for `npm`, `yarn`, and `pnpm`.
- **Hybrid Architecture:** Choice between **LIGHT** mode (MVP) and **FULL** mode (Clean Architecture).
- **Enhanced Security:** 64-character JWT secrets auto-generated via `crypto.randomBytes`.

---

## 1. Syntax Changes

### The `start` command is deprecated

While interactive mode remains accessible for compatibility, the recommended semantic command is now `new`.

- **Old (v0.1.x):** `nestcraftx start`
- **New (v0.2.5):** `nestcraftx new my-project`

### New Professional Flags

You can now configure everything in a single line without answering a single question:

```bash
# Example: An ultra-fast project with pnpm and Prisma
nestcraftx new my-api --light --orm=prisma --pm=pnpm --auth --swagger

```

---

## 2. Architecture Comparison

The choice of mode directly impacts your folder structure under `src/`.

### LIGHT Mode (New in v0.2.0+)

Ideal for speed and prototyping. We eliminate mappers and use-cases for direct communication.

- **Structure:** `src/[entity]/[controllers|services|repositories|entities|dtos]`
- **Flow:** `Controller` ➔ `Service` ➔ `Repository` ➔ `DB`

### FULL Mode (Clean Code Standard)

This is the robust architecture from v0.1.x, but refined. Services are now isolated in the `application` layer to strictly follow DDD principles.

- **Structure:** Separated into `domain`, `application`, `infrastructure`, and `presentation`.
- **Flow:** `Controller` ➔ `Use-Case` ➔ `Service` ➔ `Repository/Adapter` ➔ `DB`

---

## 3. Package Manager (New in v0.2.5)

The `--pm` (or `--packageManager`) flag allows you to define your favorite tool. If you don't specify it, the CLI will provide an interactive list of choices.

| Tool     | Flag        | Installation command executed |
| -------- | ----------- | ----------------------------- |
| **npm**  | `--pm=npm`  | `npm install`                 |
| **Yarn** | `--pm=yarn` | `yarn install`                |
| **pnpm** | `--pm=pnpm` | `pnpm install`                |

---

## 4. Automatic .env Generation

The secret generation system has been strengthened to use more secure cryptographic algorithms.

**Old behavior:** Manual input or short secrets.
**New behavior (v0.2.5):** - `JWT_SECRET`: 64 unique hexadecimal characters.

- `DATABASE_URL`: Auto-built based on the chosen ORM (Prisma/TypeORM/Mongoose).

---

## Quick Migration Checklist

- [ ] **Global Update:** `npm install -g nestcraftx@latest`
- [ ] **Environment Check:** Run `nestcraftx test` to verify the presence of `pnpm` or `yarn`.
- [ ] **Demo Test:** Try the new `nestcraftx demo --light` command to see the new simplified structure.
- [ ] **JWT Secrets:** If you are manually migrating an old project, generate a professional secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

```

## Migration FAQ

**Q: Will my old projects break?** A: No. NestCraftX is a code generator. Once the code is generated, it is independent. Updating the CLI only impacts the _next_ projects you create.

**Q: Why switch to Inquirer.js?** A: To avoid typos (e.g., typing "prismm" instead of "prisma"). List selection with arrow keys is faster and more reliable.

**Q: How to choose between LIGHT and FULL?** A:

- Use **LIGHT** for MVPs, simple microservices, or if you are a beginner.
- Use **FULL** for enterprise applications, long-lived projects, or complex architectures.

## Support

If you encounter issues during migration:

1. Check the documentation: `CLI_USAGE.md`
2. Consult the changelog: `CHANGELOG.md`
3. Open an issue on GitHub: [https://github.com/august-dev-pro/NestCraftX/issues](https://github.com/august-dev-pro/NestCraftX/issues)

## Resources

- [CLI Usage Guide](https://www.google.com/search?q=./CLI_USAGE.md)
- [Changelog](https://www.google.com/search?q=./CHANGELOG.md)
- [GitHub Repository](https://github.com/august-dev-pro/NestCraftX)

```
Would you be interested in an automation script to update your environment variables across multiple servers?

```

---

**NestCraftX v0.2.5** — _Clean Architecture Made Simple._ [Access the GitHub Repository](https://github.com/august-dev-pro/NestCraftX)
