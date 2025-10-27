# NestCraftX CLI - Guide d'utilisation

## Installation

```bash
npm install -g nestcraftx
```

## Commandes disponibles

### Creer un nouveau projet

```bash
nestcraftx new <project-name> [options]
```

## Modes de generation

### Mode FULL (Architecture Complete - Clean Architecture + DDD)

Structure complete avec use-cases, mappers, adapters et separation stricte des couches.
Ideal pour les projets complexes et scalables.

```bash
nestcraftx new mon-projet --full
nestcraftx new mon-projet --mode=full
nestcraftx new mon-projet
```

**Structure generee :**
```
src/
├── [entity]/
│   ├── application/
│   │   ├── use-cases/
│   │   ├── dtos/
│   │   └── interfaces/
│   ├── domain/
│   │   ├── entities/
│   │   ├── enums/
│   │   └── mappers/
│   ├── infrastructure/
│   │   ├── repositories/
│   │   ├── services/
│   │   └── adapters/
│   └── presentation/
│       └── controllers/
```

### Mode LIGHT (MVP Simplifie)

Structure plate avec moins de couches d'abstraction.
Parfait pour prototypes et petits projets.

```bash
nestcraftx new mon-projet --light
nestcraftx new mon-projet --mode=light
```

**Structure generee :**
```
src/
├── [entity]/
│   ├── entities/
│   ├── dto/
│   ├── services/
│   ├── repositories/
│   └── controllers/
```

## Options disponibles

### ORM
Choisir l'ORM a utiliser :

```bash
--orm=prisma     # Prisma (par defaut)
--orm=typeorm    # TypeORM
--orm=mongoose   # Mongoose (MongoDB)
```

**Exemples :**
```bash
nestcraftx new mon-api --light --orm=prisma
nestcraftx new mon-api --full --orm=typeorm
nestcraftx new mon-api --orm=mongoose
```

### Authentification
Activer l'authentification JWT :

```bash
--auth           # Active l'auth avec JWT
```

**Exemple :**
```bash
nestcraftx new mon-api --light --auth --orm=prisma
```

Avec `--auth`, une entite User est automatiquement generee avec :
- email (string)
- password (string)
- isActive (boolean)

### Swagger
Activer la documentation Swagger/OpenAPI :

```bash
--swagger        # Active Swagger UI
```

**Exemple :**
```bash
nestcraftx new mon-api --light --swagger
```

Swagger sera accessible a : `http://localhost:3000/api/docs`

### Docker
Desactiver Docker (active par defaut) :

```bash
--docker=false   # Desactive Docker
```

**Exemple :**
```bash
nestcraftx new mon-api --light --docker=false
```

## Exemples de commandes completes

### Projet LIGHT avec toutes les options
```bash
nestcraftx new mon-api --light --orm=prisma --auth --swagger
```

### Projet FULL avec TypeORM et Auth
```bash
nestcraftx new mon-api --full --orm=typeorm --auth
```

### Projet minimal LIGHT
```bash
nestcraftx new mon-api --light
```

### Projet MongoDB avec Mongoose
```bash
nestcraftx new mon-api --light --orm=mongoose --auth --swagger
```

## Configuration automatique

### Fichier .env genere

Le CLI genere automatiquement un fichier `.env` avec :

**Pour PostgreSQL (Prisma/TypeORM) :**
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=<secret-auto-genere-64-chars>
JWT_REFRESH_SECRET=<secret-auto-genere-64-chars>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mon-api
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mon-api?schema=public
```

**Pour MongoDB (Mongoose) :**
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=<secret-auto-genere-64-chars>
JWT_REFRESH_SECRET=<secret-auto-genere-64-chars>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MONGO_URI=mongodb://localhost:27017
MONGO_DB=mon-api
```

Les secrets JWT sont generes automatiquement de maniere securisee.

## Apres la creation

```bash
cd mon-projet
npm run start:dev
```

Si Swagger est active :
```
http://localhost:3000/api/docs
```

## Autres commandes

### Verifier l'environnement
```bash
nestcraftx test
```

### Informations CLI
```bash
nestcraftx info
```

### Aide
```bash
nestcraftx --help
```

## Notes importantes

- Les secrets JWT sont auto-generes de maniere securisee (64 caracteres)
- DATABASE_URL est automatiquement construit selon l'ORM choisi
- Docker est active par defaut en mode LIGHT
- Le mode FULL necessite une configuration interactive si aucune option n'est fournie
