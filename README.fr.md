# NestCraftX — Générateur de Clean Architecture pour NestJS

[![Version NPM](https://img.shields.io/npm/v/nestcraftx?style=flat-square&color=CB3837)](https://www.npmjs.com/package/nestcraftx)
[![Téléchargements](https://img.shields.io/npm/dm/nestcraftx?style=flat-square&color=51a2da)](https://www.npmjs.com/package/nestcraftx)
[![Licence: MIT](https://img.shields.io/badge/Licence-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Version Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-4dc71f?style=flat-square)](https://nodejs.org)

**ORMs:**
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![TypeORM](https://img.shields.io/badge/TypeORM-FE0803?style=flat-square&logo=typeorm&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat-square&logo=mongodb&logoColor=green)

**NestCraftX** est un CLI Node.js moderne et puissant pour générer automatiquement des projets NestJS avec une architecture propre, maintenable et prête pour la production.

Il échafaude tout ce dont vous avez besoin pour démarrer :

- **Modules, Controllers & Services** (Entièrement typés)
- **Repositories & Mappers** (Pour un flux de données propre et une séparation des responsabilités)
- **DTOs** (Avec validation intégrée via class-validator)
- **Entités / Schémas** (Prisma, TypeORM, ou Mongoose)
- **Authentification** (JWT avec Refresh Tokens & génération automatique des secrets)
- **Prêt pour le DevOps** (Docker, Docker-Compose & Swagger UI)

NestCraftX implémente les meilleures pratiques modernes : **Clean Architecture**, **Domain-Driven Design (DDD)**, **Validation stricte**, **Sécurité pré-configurée** et bien plus encore.

### Fonctionnalités Clés :

- **Architecture Double :** Choisissez entre le mode _Light_ (idéal pour les MVPs) ou _Full_ (Clean Architecture / DDD).
- **Relations Interactives :** Définissez vos relations 1-N ou N-N directement depuis votre terminal.
- **Configuration Intelligente :** Décorateurs Swagger automatiques, fichiers .env auto-documentés et connexions aux bases de données pré-configurées.

> **Version 0.2.5 :** Mise à jour majeure — Génération interactive par flags, refonte de l'authentification avec gestionnaire de session, templates professionnels (.gitignore, README) et standards de code maintenus par la communauté !

---

## Sommaire

- [Nouveautes v0.2.5](#nouveautes-v025)
- [Objectif du projet](#objectif-du-projet)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Commandes disponibles](#commandes-disponibles)
- [Fonctionnalités](#fonctionnalités)
- [Architecture générée](#architecture-générée)
- [Démo complète](#démo-complète)
- [Guide d'utilisation](#guide-dutilisation)
- [Roadmap](#roadmap)
- [Contribuer](#contribuer)
- [Licence](#licence)

---

## Nouveautes v0.2.5

### Deux Modes d'Architecture

**Mode FULL - Architecture Complete**

- Clean Architecture avec use-cases, mappers, adapters
- Separation stricte domain/application/infrastructure/presentation
- Ideal pour projets complexes et scalables

**Mode LIGHT - Architecture MVP**

- Structure simplifiee : controllers → services → repositories
- Demarrage rapide pour prototypes
- Parfait pour petits projets et MVPs

### Demo Command Amélioré

- ✅ Options par flags : `--light`, `--orm`, `--auth`, `--swagger`, `--docker`
- ✅ Mode interactif : pose les questions uniquement si flags manquants
- ✅ Fusion intelligente flags + réponses interactives
- ✅ 3 entités pré-configurées avec relations
- ✅ Support de tous les ORMs (Prisma, TypeORM, Mongoose)
- ✅ Instructions séparées dans [Documentation Demo](./DEMO.md)

### CLI Moderne avec Flags

```bash
nestcraftx new <project-name> [options]

Options:
  --light              Mode architecture simplifiee
  --full               Mode architecture complete (defaut)
  --dn=<db>            Choix db: postgresql|mongodb
  --orm=<orm>          Choix ORM: prisma|typeorm|mongoose
  --auth               Active authentification JWT
  --swagger            Active documentation Swagger
  --docker             Active Docker (defaut: true)
```

### Generation Automatique de Secrets

- Secrets JWT auto-generes (64 caracteres securises)
- Fichier .env pret a l'emploi
- DATABASE_URL configure automatiquement
- Fichier .env.example sanitise

### UX Amelioree

- Messages avec couleurs (info, success, error)
- Spinners animes pour operations longues
- Resume detaille post-generation
- Validation des options en temps reel

### Exemples Rapides

```bash
# Projet LIGHT avec Prisma et Auth
nestcraftx new mon-api --light --orm=prisma --auth

# Projet FULL avec TypeORM et Swagger
nestcraftx new mon-projet --full --orm=typeorm --swagger

# Projet MongoDB minimal
nestcraftx new mon-api --light --orm=mongoose
```

---

## Objectif du projet

Ne perdez plus de temps à configurer votre architecture backend. NestCraftX vous permet de :

- ✅ Démarrer un projet en quelques minutes au lieu de quelques jours
- ✅ Avoir une architecture Clean dès le départ
- ✅ Uniformiser vos projets avec les mêmes bonnes pratiques
- ✅ Configuration automatiser de BD-ORM et autres modules (decorateur, authentification, dockerisation)
- ✅ Vous concentrer sur la logique métier
- ✅ Choisir entre configuration rapide (Light) ou complète (Full)

## Prérequis

Assurez-vous d'avoir :

- **Node.js** v14 ou supérieur
- **npm** ou **yarn**
- **Nest CLI** (optionnel, sera utilisé via npx)
- **Docker** (optionnel, pour la containerisation)
- **Git** (optionnel, pour la gestion de version)

Vérifiez votre environnement avec :

```bash
nestcraftx test
```

---

## Installation

### Via npx (recommandé)

Utilisez NestCraftX sans installation globale :

```bash
npx nestcraftx new my-app
```

### Installation globale

Pour une utilisation fréquente :

```bash
npm install -g nestcraftx
nestcraftx new my-app
```

### Installation pour développement

```bash
git clone https://github.com/august-dev-pro/NestCraftX.git
cd NestCraftX
npm install
npm link
```

---

## Commandes disponibles

### `nestcraftx new <project-name> [options]`

Crée un nouveau projet NestJS avec Clean Architecture.

**Options :**

- `--light` : Mode configuration rapide
- `--orm <prisma|typeorm|mongoose>` : Choix de l'ORM
- `--auth` : Ajouter l'authentification JWT
- `--swagger` : Ajouter Swagger UI
- `--docker` : Générer les fichiers Docker

**Exemples :**

```bash
# Mode interactif complet
nestcraftx new my-app

# Mode rapide avec options
nestcraftx new blog-api --light --orm=prisma --auth --swagger

# Configuration personnalisée
nestcraftx new shop --orm=typeorm --auth
```

### `nestcraftx demo [options]`

Génère un projet de démonstration complet (blog-demo) avec :

- 3 entités (User, Post, Comment) avec relations 1-n
- Auth JWT intégrée
- Swagger activé
- Docker configuré

**Options :**

- `--light` : Mode architecture simplifiée
- `--docker` : Activer Docker (défaut: true)
- `--auth` : Activer Auth JWT (défaut: true)
- `--swagger` : Activer Swagger (défaut: true)
- `--orm <prisma|typeorm|mongoose>` : Choix de l'ORM (défaut: prisma)

**Exemples :**

```bash
# Mode interactif (posera les questions)
nestcraftx demo

# Mode LIGHT avec Mongoose
nestcraftx demo --light --orm=mongoose

# Mode FULL avec TypeORM
nestcraftx demo --orm=typeorm --auth --swagger

# Démarrer rapidement
nestcraftx demo --light --orm=prisma
```

**Résultat :**

Un projet blog fonctionnel avec :

- Blog-demo créé
- 3 entités complètes
- Relations entre User → Post → Comment
- Endpoints auth, users, posts, comments prêts
- Documentation Swagger interactive

### `nestcraftx test`

Vérifie que votre environnement est prêt :

```bash
nestcraftx test
```

Affiche le statut de Node, npm, Nest CLI, Docker, Git, etc.

### `nestcraftx info`

Affiche les informations sur le CLI :

```bash
nestcraftx info
```

---

## Fonctionnalités

### Architecture

✅ **Clean Architecture** avec séparation domain/application/infrastructure/presentation
✅ **Domain-Driven Design** avec entités, use cases et repositories
✅ **Repository Pattern** pour l'abstraction de la persistance
✅ **Use Cases Pattern** pour la logique métier isolée
✅ **Mapper Pattern** pour la transformation des données

### Base de données

✅ **Prisma ➡️ (PostgreSQL)** - ORM moderne et type-safe (recommandé)

✅ **TypeORM ➡️ (PostgreSQL)** - ORM complet avec decorateurs

✅ **Mongoose ➡️ (MongoDB)** - ODM pour MongoDB

✅ Configuration automatique du schéma

✅ Support PostgreSQL et MongoDB

### Sécurité

✅ **JWT Authentication** avec guards et strategies

✅ **Role-based Access Control** (RBAC)

✅ **Password hashing** avec bcrypt

✅ **Public routes** avec decorators

### Documentation

✅ **Swagger UI** automatique

✅ Décorateurs ApiProperty sur les DTOs

✅ Documentation des endpoints

✅ Interface interactive d'API

### DevOps

✅ **Docker** et **Docker Compose**

✅ Configuration des variables d'environnement

✅ Logging structuré

✅ Error handling centralisé

### Qualité du code

✅ Validation des DTOs avec class-validator

✅ Transformation des données avec class-transformer

✅ Intercepteurs de réponse standardisés

✅ Filtres d'exceptions globaux

---

## Generated Architecture

### Mode Light (MVP)

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

### Mode Full (Clean Architecture)

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
├── prisma
│   ├── prisma.module.ts
│   └── prisma.service.ts
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

## Démo complète

🔥 Une démo prête à exécuter, incluant 3 entités liées, Auth JWT, Swagger, Docker et ORM configurable.

👉 Voir la documentation complète : [Documentation Demo](./DEMO.md)

## Guide d'utilisation

### Démarrage rapide (Mode Light)

```bash
# 1. Créer un projet simple
npx nestcraftx new my-api --light --orm prisma

# 2. Naviguer dans le projet
cd my-api

# 3. Démarrer l'application
npm run start:dev
```

### Configuration complète (Mode Full)

```bash
# 1. Lancer la création avec interface interactive
npx nestcraftx new my-project

# 2. Répondre aux questions :
#    - Nom du projet
#    - Choix de la base de données
#    - Configuration ORM
#    - Entités et relations
#    - Auth et Swagger

# 3. Démarrer
cd my-project
npm run start:dev
```

### Projet de démonstration

```bash
# Générer un projet blog complet (mode interactif)
nestcraftx demo

# Ou avec options directes
nestcraftx demo --light --orm prisma --auth --swagger

# Naviguer et démarrer
cd blog-demo
npm run start:dev

# Accéder à Swagger UI
open http://localhost:3000/api/docs
```

**Qu'inclut le projet demo :**

- Architecture Clean complète (ou LIGHT selon l'option)
- 3 entités pré-configurées : User, Post, Comment
- Relations entre entités (User → Post, Post ↔ Comment)
- Auth JWT avec endpoints /auth/register et /auth/login
- Endpoints métier : /users, /posts, /comments
- Documentation Swagger automatique
- Docker & Docker Compose configurés
- Configuration ORM de votre choix (Prisma, TypeORM, Mongoose)

---

## Feuille de Route (Roadmap)

### Version 0.2.x — Stabilisation

- [x] Architectures Light & Full
- [x] CLI Interactif
- [x] Support Multi-ORM (Prisma / TypeORM / Mongoose)
- [ ] Amélioration de la documentation et des exemples

### Version 0.3.0 — Expérience Développeur (DX)

- [ ] Commande `generate` (ajouter des modules/entités à un projet existant)
- [ ] Support SQLite pour des démos et tests rapides sans config
- [ ] Meilleure gestion des erreurs et logs terminaux colorés

### Version 0.4.0 — Prêt pour la Production

- [ ] Stratégies de session optionnelles (Map / Base de données / Redis)
- [ ] Templates de seeding (peuplement de données) avancés
- [ ] Presets de projet (API seule / Auth / CRUD complet)

### Version 1.0.0 — Version Stable

- [ ] CLI nativement en TypeScript
- [ ] Conventions strictes et contrats d'API stables
- [ ] Site officiel de documentation
- [ ] Garanties de support à long terme (LTS)

## Contribuer

Vous voulez améliorer NestCraftX ? Les contributions sont les bienvenues !

### Comment contribuer

1. Fork le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

### Ouvrir une issue

Des bugs ? Des idées ? Ouvrez une issue sur GitHub !

### Développeurs

Pour développer localement :

```bash
git clone https://github.com/august-dev-pro/NestCraftX.git
cd NestCraftX
npm install
npm link
```

---

## Licence

MIT © [Ablanhou Augustin Selete](https://github.com/august-dev-pro)

Libre d'usage pour projets personnels et commerciaux.

---

## Remerciements

Merci à tous les contributeurs et à la communauté NestJS !

**Fait avec ❤️ pour la communauté des développeurs backend**

---

## Contact & Support

- 📧 GitHub Issues : [Ouvrir une issue](https://github.com/august-dev-pro/NestCraftX/issues)
- 🌐 Repository : [NestCraftX sur GitHub](https://github.com/august-dev-pro/NestCraftX)
- ⭐ Si ce projet vous aide, pensez à lui donner une étoile !

---

**NestCraftX v0.2.5** - Clean Architecture Made Simple

Pour plus d'informations:

- [Guide d'utilisation complet](./CLI_USAGE.md)
- [Guide de migration](./MIGRATION_GUIDE.md)
- [Changelog detaille](./CHANGELOG.md)
