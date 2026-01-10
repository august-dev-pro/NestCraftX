## NestCraftX — Clean Architecture Generator for NestJS

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E=14.0.0-green.svg)
![Version](https://img.shields.io/badge/version-0.2.3-brightgreen.svg)
![Prisma](https://img.shields.io/badge/ORM-Prisma-lightblue)
![TypeORM](https://img.shields.io/badge/ORM-TypeORM-red)
![Mongoose](https://img.shields.io/badge/ORM-Mongoose-pink)

**NestCraftX** is a modern and powerful Node.js CLI for automatically generating NestJS projects with clean and maintainable architecture. It implements modern best practices: **Clean Architecture**, **Domain-Driven Design (DDD)**, **Prisma/TypeORM/Mongoose**, **JWT Auth with auto-generated secrets**, **Swagger**, **Docker**, and much more.

> Version 0.2.3: Major improvement - Interactive demo with flags, Auth refactored via UserService, professional templates (gitignore, README), clean code maintained by the community!

---

## Table of Contents

- [What's New in v0.2.3](#whats-new-in-v023)
- [Project Objective](#project-objective)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Available Commands](#available-commands)
- [Features](#features)
- [Generated Architecture](#generated-architecture)
- [Complete Demo](#complete-demo)
- [Usage Guide](#usage-guide)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## What's New in v0.2.3

### Two Architecture Modes

**FULL Mode - Complete Architecture**

- Clean Architecture with use-cases, mappers, adapters
- Strict separation: domain/application/infrastructure/presentation
- Ideal for complex and scalable projects

**LIGHT Mode - MVP Architecture**

- Simplified structure: controllers → services → repositories
- Quick start for prototypes
- Perfect for small projects and MVPs

### Improved Demo Command

- ✅ Flag options: `--light`, `--orm`, `--auth`, `--swagger`, `--docker`
- ✅ Interactive mode: only asks questions for missing flags
- ✅ Intelligent merging of flags and interactive responses
- ✅ 3 pre-configured entities with relationships
- ✅ Support for all ORMs (Prisma, TypeORM, Mongoose)
- ✅ Separate instructions in [Demo Documentation](./DEMO.md)

### Modern CLI with Flags

```bash
nestcraftx new <project-name> [options]

Options:
  --light              Simplified architecture mode
  --full               Complete architecture mode (default)
  --db=<db>            Database choice: postgresql|mongodb
  --orm=<orm>          ORM choice: prisma|typeorm|mongoose
  --auth               Enable JWT authentication
  --swagger            Enable Swagger documentation
  --docker             Enable Docker (default: true)
```

### Automatic Secret Generation

- Auto-generated JWT secrets (64 secure characters)
- Ready-to-use .env file
- DATABASE_URL automatically configured
- Sanitized .env.example file

### Improved UX

- Colored messages (info, success, error)
- Animated spinners for long operations
- Detailed post-generation summary
- Real-time validation of options

### Quick Examples

```bash
# LIGHT project with Prisma and Auth
nestcraftx new my-api --light --orm=prisma --auth

# FULL project with TypeORM and Swagger
nestcraftx new my-project --full --orm=typeorm --swagger

# Minimal MongoDB project
nestcraftx new my-api --light --orm=mongoose
```

---

## Project Objective

Stop wasting time configuring your backend architecture. NestCraftX allows you to:

- ✅ Start a project in minutes instead of days
- ✅ Have a Clean Architecture from the start
- ✅ Standardize your projects with the same best practices
- ✅ Automatically configure DB-ORM and other modules (decorators, authentication, dockerization)
- ✅ Focus on business logic
- ✅ Choose between quick configuration (Light) or complete (Full)

## Prerequisites

Make sure you have:

- **Node.js** v14 or higher
- **npm** or **yarn**
- **Nest CLI** (optional, will be used via npx)
- **Docker** (optional, for containerization)
- **Git** (optional, for version control)

Verify your environment with:

```bash
nestcraftx test
```

---

## Installation

### Via npx (recommended)

Use NestCraftX without global installation:

```bash
npx nestcraftx new my-app
```

### Global Installation

For frequent use:

```bash
npm install -g nestcraftx
nestcraftx new my-app
```

### Installation for Development

```bash
git clone https://github.com/august-dev-pro/NestCraftX.git
cd NestCraftX
npm install
npm link
```

---

## Available Commands

### `nestcraftx new <project-name> [options]`

Creates a new NestJS project with Clean Architecture.

**Options:**

- `--light` : Quick configuration mode
- `--orm <prisma|typeorm|mongoose>` : ORM choice
- `--auth` : Add JWT authentication
- `--swagger` : Add Swagger UI
- `--docker` : Generate Docker files

**Examples:**

```bash
# Full interactive mode
nestcraftx new my-app

# Quick mode with options
nestcraftx new blog-api --light --orm=prisma --auth --swagger

# Custom configuration
nestcraftx new shop --orm=typeorm --auth
```

### `nestcraftx demo [options]`

Generates a complete demonstration project (blog-demo) with:

- 3 entities (User, Post, Comment) with 1-n relationships
- Integrated JWT Auth
- Swagger enabled
- Docker configured

**Options:**

- `--light` : Simplified architecture mode
- `--docker` : Enable Docker (default: true)
- `--auth` : Enable JWT Auth (default: true)
- `--swagger` : Enable Swagger (default: true)
- `--orm <prisma|typeorm|mongoose>` : ORM choice (default: prisma)

**Examples:**

```bash
# Interactive mode (will ask questions)
nestcraftx demo

# LIGHT mode with Mongoose
nestcraftx demo --light --orm=mongoose

# FULL mode with TypeORM
nestcraftx demo --orm=typeorm --auth --swagger

# Quick start
nestcraftx demo --light --orm=prisma
```

**Result:**

A functional blog project with:

- Blog-demo created
- 3 complete entities
- Relationships between User → Post → Comment
- Auth endpoints (register, login) ready
- Business endpoints: /users, /posts, /comments ready
- Automatic Swagger documentation
- Docker & Docker Compose configured
- ORM configuration of your choice (Prisma, TypeORM, Mongoose)

### `nestcraftx test`

Checks if your environment is ready:

```bash
nestcraftx test
```

Displays the status of Node, npm, Nest CLI, Docker, Git, etc.

### `nestcraftx info`

Displays CLI information:

```bash
nestcraftx info
```

---

## Features

### Architecture

✅ **Clean Architecture** with domain/application/infrastructure/presentation separation
✅ **Domain-Driven Design** with entities, use cases and repositories
✅ **Repository Pattern** for persistence abstraction
✅ **Use Cases Pattern** for isolated business logic
✅ **Mapper Pattern** for data transformation

### Database

✅ **Prisma ➡️ (PostgreSQL)** - Modern and type-safe ORM (recommended)

✅ **TypeORM ➡️ (PostgreSQL)** - Complete ORM with decorators

✅ **Mongoose ➡️ (MongoDB)** - ODM for MongoDB (Coming soon)

✅ Automatic schema configuration

✅ PostgreSQL and MongoDB support

### Security

✅ **JWT Authentication** with guards and strategies

✅ **Role-based Access Control** (RBAC)

✅ **Password hashing** with bcrypt

✅ **Public routes** with decorators

### Documentation

✅ **Swagger UI** automatic

✅ ApiProperty decorators on DTOs

✅ Endpoint documentation

✅ Interactive API interface

### DevOps

✅ **Docker** and **Docker Compose**

✅ Environment variables configuration

✅ Structured logging

✅ Centralized error handling

### Code Quality

✅ DTO validation with class-validator

✅ Data transformation with class-transformer

✅ Standardized response interceptors

✅ Global exception filters

---

## Generated Architecture

### Light Mode (MVP)

```
src
├── auth
│   ├── controllers
│   │   └── auth.controller.ts
│   ├── dtos
│   │   ├── create-session.dto.ts
│   │   ├── forgotPassword.dto.ts
│   │   ├── loginCredential.dto.ts
│   │   ├── refreshToken.dto.ts
│   │   ├── resetPassword.dto.ts
│   │   ├── sendOtp.dto.ts
│   │   └── verifyOtp.dto.ts
│   ├── entities
│   │   └── session.entity.ts
│   ├── guards
│   │   ├── jwt-auth.guard.ts
│   │   └── role.guard.ts
│   ├── mappers
│   │   └── session.mapper.ts
│   ├── persistence
│   │   └── session.repository.ts
│   ├── services
│   │   ├── auth.service.ts
│   │   └── session.service.ts
│   ├── strategies
│   │   └── jwt.strategy.ts
│   └── auth.module.ts
│
├── common
│   ├── decorators
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── role.decorator.ts
│   ├── enums
│   │   └── role.enum.ts
│   ├── filters
│   │   └── all-exceptions.filter.ts
│   ├── interceptors
│   │   └── response.interceptor.ts
│   └── middlewares
│       └── logger.middleware.ts
│
├── prisma
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── user
│   ├── controllers
│   │   └── user.controller.ts
│   ├── dtos
│   │   └── user.dto.ts
│   ├── entities
│   │   └── user.entity.ts
│   ├── repositories
│   │   └── user.repository.ts
│   ├── services
│   │   └── user.service.ts
│   └── user.module.ts
│
├── app.controller.spec.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts
```

### Full Mode (Clean Architecture)

```
src
├── auth
│   ├── controllers
│   │   └── auth.controller.ts
│   ├── dtos
│   │   ├── create-session.dto.ts
│   │   ├── forgotPassword.dto.ts
│   │   ├── loginCredential.dto.ts
│   │   ├── refreshToken.dto.ts
│   │   ├── resetPassword.dto.ts
│   │   ├── sendOtp.dto.ts
│   │   └── verifyOtp.dto.ts
│   ├── entities
│   │   └── session.entity.ts
│   ├── guards
│   │   ├── jwt-auth.guard.ts
│   │   └── role.guard.ts
│   ├── mappers
│   │   └── session.mapper.ts
│   ├── persistence
│   │   └── session.repository.ts
│   ├── services
│   │   ├── auth.service.ts
│   │   └── session.service.ts
│   ├── strategies
│   │   └── jwt.strategy.ts
│   └── auth.module.ts
│
├── common
│   ├── decorators
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── role.decorator.ts
│   ├── enums
│   │   └── role.enum.ts
│   ├── filters
│   │   └── all-exceptions.filter.ts
│   ├── interceptors
│   │   └── response.interceptor.ts
│   └── middlewares
│       └── logger.middleware.ts
│
├── prisma
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── user
│   ├── controllers
│   │   └── user.controller.ts
│   ├── dtos
│   │   └── user.dto.ts
│   ├── entities
│   │   └── user.entity.ts
│   ├── repositories
│   │   └── user.repository.ts
│   ├── services
│   │   └── user.service.ts
│   └── user.module.ts
│
├── app.controller.spec.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts
```

## Complete Demo

🔥 A ready-to-run demo, including 3 linked entities, JWT Auth, Swagger, Docker and configurable ORM.

👉 See full documentation: [Demo Documentation](./DEMO.md)

## Usage Guide

### Quick Start (Light Mode)

```bash
# 1. Create a simple project
npx nestcraftx new my-api --light --orm prisma

# 2. Navigate to the project
cd my-api

# 3. Start the application
npm run start:dev
```

### Complete Configuration (Full Mode)

```bash
# 1. Launch with interactive interface
npx nestcraftx new my-project

# 2. Answer the questions:
#    - Project name
#    - Database choice
#    - ORM configuration
#    - Entities and relationships
#    - Auth and Swagger

# 3. Start
cd my-project
npm run start:dev
```

### Demonstration Project

```bash
# Generate a complete blog project (interactive mode)
nestcraftx demo

# Or with direct options
nestcraftx demo --light --orm prisma --auth --swagger

# Navigate and start
cd blog-demo
npm run start:dev

# Access Swagger UI
open http://localhost:3000/api/docs
```

**What the demo project includes:**

- Complete Clean Architecture (or LIGHT depending on option)
- 3 pre-configured entities: User, Post, Comment
- Relationships between entities (User → Post, Post ↔ Comment)
- JWT Auth with /auth/register and /auth/login endpoints
- Business endpoints: /users, /posts, /comments
- Automatic Swagger documentation
- Docker & Docker Compose configured
- ORM configuration of your choice (Prisma, TypeORM, Mongoose)

---

## Roadmap

### Version 0.3.0

- [ ] `generate` command to add entities to an existing project
- [ ] MySQL and SQLite support
- [ ] Automatic unit test generation
- [ ] CI/CD templates (GitHub Actions, GitLab CI)
- [ ] GraphQL support

### Version 0.4.0

- [ ] Web interface for project configuration
- [ ] Database seeding generation
- [ ] Microservices support
- [ ] Redis integration
- [ ] WebSocket support

### Version 1.0.0

- [ ] Complete online documentation
- [ ] Support for other frameworks (Express, Fastify)
- [ ] Community templates marketplace
- [ ] CLI plugins system

---

## Contributing

Want to improve NestCraftX? Contributions are welcome!

### How to Contribute

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Open an Issue

Found bugs? Have ideas? Open an issue on GitHub!

### Developers

To develop locally:

```bash
git clone https://github.com/august-dev-pro/NestCraftX.git
cd NestCraftX
npm install
npm link
```

---

## License

MIT © [Ablanhou Augustin Selete](https://github.com/august-dev-pro)

Free for personal and commercial use.

---

## Thanks

Thanks to all contributors and the NestJS community!

**Made with ❤️ for the backend developer community**

---

## Contact & Support

- 📧 GitHub Issues: [Open an issue](https://github.com/august-dev-pro/NestCraftX/issues)
- 🌐 Repository: [NestCraftX on GitHub](https://github.com/august-dev-pro/NestCraftX)
- ⭐ If this project helps you, please consider giving it a star!

---

**NestCraftX v0.2.3** - Clean Architecture Made Simple

For more information:

- [Complete Usage Guide](./CLI_USAGE.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Detailed Changelog](./CHANGELOG.md)
