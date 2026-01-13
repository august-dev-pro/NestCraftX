# NestCraftX CLI - Demo Project `blog-demo` (v0.2.4)

## Objective

This demo shows how to generate a complete NestJS project with **Clean Architecture**, ready to run, including:

- JWT Auth
- Swagger UI
- Docker (optional)
- ORM (Prisma, TypeORM or Mongoose)
- Seeds to populate the database with sample data

---

## 1️⃣ Launch the Demo

You have two ways to generate the blog-demo demo project:

### Mode 1: Interactive (Recommended for first tries)

The CLI will ask you questions for each missing option (ORM, Docker, etc.).

```bash
npx nestcraftx demo
```

### Mode 2: Silent (Configuration via flags)

You can define everything from the command line. The CLI will ask no questions. (Complete example)

```bash
npx nestcraftx demo --light --auth --swagger --docker --orm prisma --packageManager npm
```

Option Details:

- --light → Simplified MVP mode (--full by default if omitted).

- --auth → Integrated JWT Auth (true by default if omitted).

- --swagger → Swagger UI enabled (true by default if omitted).

- --docker → Generate Docker files (true by default if omitted).

- --orm → Choose the ORM and database (`prisma`, `typeorm`, or `mongoose`).

---

## 2️⃣ Project Structure

After generation, your project will have:

```
src
├── auth
│   ├── application
│   │   ├── dtos
│   │   │   ├── create-session.dto.ts
│   │   │   ├── forgotPassword.dto.ts
│   │   │   ├── loginCredential.dto.ts
│   │   │   ├── refreshToken.dto.ts
│   │   │   ├── resetPassword.dto.ts
│   │   │   ├── sendOtp.dto.ts
│   │   │   └── verifyOtp.dto.ts
│   │   └── services
│   │       ├── auth.service.ts
│   │       └── session.service.ts
│   ├── domain
│   │   ├── entities
│   │   │   └── session.entity.ts
│   │   └── interfaces
│   │       └── session.repository.interface.ts
│   ├── infrastructure
│   │   ├── guards
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── role.guard.ts
│   │   ├── mappers
│   │   │   └── session.mapper.ts
│   │   ├── persistence
│   │   │   └── session.repository.ts
│   │   └── strategies
│   │       └── jwt.strategy.ts
│   ├── presentation
│   │   └── controllers
│   │       └── auth.controller.ts
│   └── auth.module.ts
│
├── comment
│   ├── application
│   │   ├── dtos
│   │   │   └── comment.dto.ts
│   │   ├── services
│   │   │   └── comment.service.ts
│   │   └── use-cases
│   │       ├── create-comment.use-case.ts
│   │       ├── delete-comment.use-case.ts
│   │       ├── getAll-comment.use-case.ts
│   │       ├── getById-comment.use-case.ts
│   │       └── update-comment.use-case.ts
│   ├── domain
│   │   ├── entities
│   │   │   └── comment.entity.ts
│   │   ├── enums
│   │   └── interfaces
│   │       └── comment.repository.interface.ts
│   ├── infrastructure
│   │   ├── adapters
│   │   │   └── comment.adapter.ts
│   │   ├── mappers
│   │   │   └── comment.mapper.ts
│   │   └── repositories
│   │       └── comment.repository.ts
│   ├── presentation
│   │   └── controllers
│   │       └── comment.controller.ts
│   └── comment.module.ts
│
├── common
│   ├── decorators
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── role.decorator.ts
│   ├── filters
│   │   └── all-exceptions.filter.ts
│   ├── interceptors
│   │   └── response.interceptor.ts
│   └── middlewares
│       └── logger.middleware.ts
│
├── post
│   ├── application
│   │   ├── dtos
│   │   │   └── post.dto.ts
│   │   ├── services
│   │   │   └── post.service.ts
│   │   └── use-cases
│   │       ├── create-post.use-case.ts
│   │       ├── delete-post.use-case.ts
│   │       ├── getAll-post.use-case.ts
│   │       ├── getById-post.use-case.ts
│   │       └── update-post.use-case.ts
│   ├── domain
│   │   ├── entities
│   │   │   └── post.entity.ts
│   │   ├── enums
│   │   └── interfaces
│   │       └── post.repository.interface.ts
│   ├── infrastructure
│   │   ├── adapters
│   │   │   └── post.adapter.ts
│   │   ├── mappers
│   │   │   └── post.mapper.ts
│   │   └── repositories
│   │       └── post.repository.ts
│   ├── presentation
│   │   └── controllers
│   │       └── post.controller.ts
│   └── post.module.ts
│
├── user
│   ├── application
│   │   ├── dtos
│   │   │   └── user.dto.ts
│   │   ├── services
│   │   │   └── user.service.ts
│   │   └── use-cases
│   │       ├── create-user.use-case.ts
│   │       ├── delete-user.use-case.ts
│   │       ├── getAll-user.use-case.ts
│   │       ├── getById-user.use-case.ts
│   │       └── update-user.use-case.ts
│   ├── domain
│   │   ├── entities
│   │   │   └── user.entity.ts
│   │   ├── enums
│   │   │   └── role.enum.ts
│   │   └── interfaces
│   │       └── user.repository.interface.ts
│   ├── infrastructure
│   │   ├── adapters
│   │   │   └── user.adapter.ts
│   │   ├── mappers
│   │   │   └── user.mapper.ts
│   │   └── repositories
│   │       └── user.repository.ts
│   ├── presentation
│   │   └── controllers
│   │       └── user.controller.ts
│   └── user.module.ts
│
├── app.controller.spec.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts

```

- Three main entities: `User`, `Post`, `Comment`
- Relationships:
  - User → Post (1:N )
  - Post → Comment (1:N )
  - User → Comment (1:N )

---

## 3️⃣ Database Configuration

### PostgreSQL (Prisma or TypeORM)

1. Create an empty database `blog_demo`:

```bash
createdb blog_demo
```

2. Update the `.env` file:

```env
POSTGRES_USER=<your_user>
POSTGRES_PASSWORD=<your_password>
POSTGRES_DB=blog_demo
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

3. Run migrations and seeds:

- Prisma:

```bash
npx prisma migrate reset
npx prisma migrate dev --name init
npx prisma db seed | npm run seed
```

- TypeORM:

```bash
npm run typeorm:migration:run

npm run typeorm:seed | npm run seed
```

### MongoDB (Mongoose)

1. Make sure MongoDB is running (local or Docker).
2. Update `.env` if necessary:

```env
MONGO_URI=mongodb://<user>:<password>@localhost:27017/blog_demo
```

3. Run the seed script (if present):

```bash
npm run seed
```

---

## 4️⃣ Run the Project

```bash
cd blog-demo
npm install
npm run start:dev
```

- Swagger UI available (if enabled): [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## 5️⃣ Main Endpoints

- **Auth** (if enabled):
  - POST `/auth/register` → Create an account
  - POST `/auth/login` → Log in
- **Users**: `/users`
- **Posts**: `/posts`
- **Comments**: `/comments`

---

## 6️⃣ Tips

- Edit the `.env` file to connect to your own database.
- Run the seed to populate the database with sample data.
- The project is ready to launch immediately after configuration.

---

**NestCraftX v0.2.4** – Clean Architecture Generator for NestJS
[Complete Documentation](https://github.com/august-dev-pro/NestCraftX)
