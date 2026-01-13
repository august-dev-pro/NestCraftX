# NestCraftX CLI - Démo du projet `blog-demo` (v0.2.4)

## Objectif

Cette démo montre comment générer un projet NestJS complet avec **Clean Architecture**, prêt à exécuter, incluant :

- Auth JWT
- Swagger UI
- Docker (optionnel)
- ORM (Prisma, TypeORM ou Mongoose)
- Seeds pour remplir la base de données avec des données d'exemple

---

## 1️⃣ Lancer la démo

Tu as deux façons de générer le projet de démo blog-demo :

### Mode 1 : Interactif (Recommandé pour les premiers essais)

Le CLI te posera les questions pour chaque option manquante (ORM, Docker, etc.).

```bash
npx nestcraftx demo
```

### Mode 2 : Silencieux (Configuration par flags)

Tu peux tout définir en ligne de commande. Le CLI ne posera aucune question. (Exemple complet)

```bash
npx nestcraftx demo --light --auth --swagger --docker --orm prisma --packageManager npm
```

Détail des Options :

- --light → Mode MVP simplifié (--full par défaut si omis).

- --auth → Auth JWT intégrée (true par défaut si omis).

- --swagger → Swagger UI activé (true par défaut si omis).

- --docker → Génère les fichiers Docker (true par défaut si omis).

- --orm → Choisir l'ORM et la base de données (`prisma`)

## 2️⃣ Structure du projet

Après génération, ton projet aura :

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

- Trois entités principales : `User`, `Post`, `Comment`
- Relations :
  - User → Post (1:N )
  - Post → Comment (1:N )
  - User → Comment (1:N )

---

## 3️⃣ Configuration de la base de données

### PostgreSQL (Prisma ou TypeORM)

1. Crée une base vide `blog_demo` :

```bash
createdb blog_demo
```

2. Mets à jour le fichier `.env` :

```env
POSTGRES_USER=<votre_user>
POSTGRES_PASSWORD=<votre_mot_de_passe>
POSTGRES_DB=blog_demo
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

3. Exécute les migrations et seeds :

- Prisma :

```bash
npx prisma migrate reset
npx prisma migrate dev --name init
npx prisma db seed | npm run seed
```

- TypeORM :

```bash
npm run typeorm:migration:run

npm run typeorm:seed | npm run seed
```

### MongoDB (Mongoose)

1. Vérifie que MongoDB est lancé (local ou Docker).
2. Mets à jour `.env` si nécessaire :

```env
MONGO_URI=mongodb://<user>:<password>@localhost:27017/blog_demo
```

3. Lance le script seed (si présent) :

```bash
npm run seed
```

---

## 4️⃣ Lancer le projet

```bash
cd blog-demo
npm install
npm run start:dev
```

- Swagger UI disponible (si activé) : [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## 5️⃣ Endpoints principaux

- **Auth** (si activé) :
  - POST `/auth/register` → Créer un compte
  - POST `/auth/login` → Se connecter
- **Users** : `/users`
- **Posts** : `/posts`
- **Comments** : `/comments`

---

## 6️⃣ Astuces

- Modifie le fichier `.env` pour connecter ta propre base.
- Exécute le seed pour remplir la base avec des données d’exemple.
- Le projet est prêt à être lancé immédiatement après configuration.

---

**NestCraftX v0.2.4** – Clean Architecture Generator for NestJS
[Documentation complète](https://github.com/august-dev-pro/NestCraftX)
