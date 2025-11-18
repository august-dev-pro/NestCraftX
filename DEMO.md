# NestCraftX CLI - Démo du projet `blog-demo` (v0.2.1)

## 🎯 Objectif

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

- --orm → Choisir l'ORM et la base de données (`prisma

## 2️⃣ Structure du projet

Après génération, ton projet aura :

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
├─ Dockerfile (si Docker activé)
├─ docker-compose.yml (si Docker activé)
└─ README.md
```

- Trois entités principales : `User`, `Post`, `Comment`
- Relations :
  - Post → User (1-n)
  - Comment → Post (1-n)
  - Comment → User (1-n)

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
npx prisma db seed
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
- Le projet est prêt à être lancé immédiatement après configuration. 🚀

---

**NestCraftX v0.2.1** – Clean Architecture Generator for NestJS
[Documentation complète](https://github.com/august-dev-pro/NestCraftX)
