# Quick Start - NestCraftX v0.2.0

## Installation

```bash
npm install -g nestcraftx
```

## Utilisation Rapide

### Option 1 : Mode LIGHT avec flags (Le plus rapide)

```bash
nestcraftx new mon-api --light --orm=prisma --auth --swagger
cd mon-api
npm run start:dev
```

Resultat : Projet genere en quelques secondes avec :

- Architecture MVP simplifiee
- Prisma ORM
- Authentification JWT
- Documentation Swagger
- Fichier .env avec secrets auto-generes

### Option 2 : Mode LIGHT interactif

```bash
nestcraftx new mon-api --light
```

Le CLI vous posera des questions pour :

- Choisir l'ORM
- Activer Auth/Swagger/Docker
- Configurer la base de donnees
- Ajouter des entites (optionnel)

### Option 3 : Mode FULL interactif

```bash
nestcraftx new mon-projet
```

Configuration complete avec :

- Clean Architecture + DDD
- Use-cases, mappers, adapters
- Configuration interactive detaillee
- Entites et relations

## Commandes Essentielles

```bash
# Creer un projet
nestcraftx new <nom> [options]

# Mode LIGHT
nestcraftx new api --light --orm=prisma

# Mode FULL
nestcraftx new app --full

# Verifier environnement
nestcraftx test

# Infos CLI
nestcraftx info
```

## Options Principales

| Option          | Description                                                   | Valeurs                         |
| --------------- | ------------------------------------------------------------- | ------------------------------- |
| `--light`       | Architecture MVP simplifiee                                   | -                               |
| `--full`        | Architecture complete (defaut)                                | -                               |
| `--orm`         | Choix de l'ORM                                                | `prisma`, `typeorm`, `mongoose` |
| `--auth`        | Active JWT auth                                               | -                               |
| `--swagger`     | Active Swagger docs                                           | -                               |
| `--docker`      | Genere Docker files                                           | `true` (defaut), `false`        |
| `--interactive` | Force le mode interactif pour la saisie des entités/relations |

## Exemples Pratiques

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

## Apres Generation

```bash
cd <nom-projet>
npm run start:dev
```

**Swagger disponible :** `http://localhost:3000/api/docs`

## Differences Modes

### Mode LIGHT

- Structure plate
- Controllers → Services → Repositories
- Demarrage rapide
- Parfait pour MVPs

### Mode FULL

- Clean Architecture complete
- Domain/Application/Infrastructure/Presentation
- Use-cases et mappers
- Ideal pour projets complexes

## Fichier .env Auto-genere

Le CLI genere automatiquement :

- `JWT_SECRET` (64 chars securises)
- `JWT_REFRESH_SECRET` (64 chars securises)
- `DATABASE_URL` (pre-configure)
- Toutes les variables necessaires

## Documentation Complete

- [Guide d'utilisation complet](./CLI_USAGE.md)
- [Guide de migration](./MIGRATION_GUIDE.md)
- [Changelog](./CHANGELOG.md)
- [README](./readme.md)

## Support

- GitHub : [NestCraftX](https://github.com/august-dev-pro/NestCraftX)
- Issues : [Ouvrir une issue](https://github.com/august-dev-pro/NestCraftX/issues)

---

**NestCraftX v0.2.2** - Clean Architecture Made Simple
