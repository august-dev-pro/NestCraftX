# NestCraftX CLI - Demo Project `blog-demo` (v0.2.2)

## 🎯 Objective

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
blog-demo/
├─ src/
│  ├─ modules/
│  │  ├─ users/
│  │  ├─ posts/
│  │  └─ comments/
│  ├─ seeds/
│  │  └─ main.seed.ts
│  └─ main.ts
├─ .env
├─ package.json
├─ Dockerfile (if Docker enabled)
├─ docker-compose.yml (if Docker enabled)
└─ README.md
```

- Three main entities: `User`, `Post`, `Comment`
- Relationships:
  - Post → User (1-n)
  - Comment → Post (1-n)
  - Comment → User (1-n)

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
npx prisma db seed
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
- The project is ready to launch immediately after configuration. 🚀

---

**NestCraftX v0.2.2** – Clean Architecture Generator for NestJS
[Complete Documentation](https://github.com/august-dev-pro/NestCraftX)
