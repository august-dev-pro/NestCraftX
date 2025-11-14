## 🛠️ NestCraftX — Clean Architecture Generator for NestJS

demo
![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E=14.0.0-green.svg)
![Version](https://img.shields.io/badge/version-0.2.1-brightgreen.svg)

**NestCraftX** est un CLI Node.js moderne et puissant pour generer automatiquement des projets NestJS avec une architecture propre et maintenable. Il implemente les meilleures pratiques modernes : **Clean Architecture**, **Domain-Driven Design (DDD)**, **Prisma/TypeORM/Mongoose**, **JWT Auth avec secrets auto-generes**, **Swagger**, **Docker**, et plus encore.

> Version 0.2.1 : Amélioration majeure - Démo interactif avec flags, Auth refactorisée via UserService, templates professionnels (gitignore, README), code propre et maintenir par la communauté !

---

## 📑 Sommaire

- [Nouveautes v0.2.0](#nouveautes-v020)
- [Objectif du projet](#objectif-du-projet)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Commandes disponibles](#commandes-disponibles)
- [Fonctionnalités](#fonctionnalités)
- [Architecture générée](#architecture-générée)
- [Démo complète](#démo-complète)
- [Guide d'utilisation](#guide-dutilisation)
- [📌 Roadmap](#roadmap)
- [❤️ Contribuer](#contribuer)
- [📜 Licence](#licence)

---

## Nouveautes v0.2.1

### Demo Command Amélioré

- ✅ Options par flags : `--light`, `--orm`, `--auth`, `--swagger`, `--docker`
- ✅ Mode interactif : pose les questions uniquement si flags manquants
- ✅ Fusion intelligente flags + réponses interactives
- ✅ 3 entités pré-configurées avec relations
- ✅ Support de tous les ORMs (Prisma, TypeORM, Mongoose)
- ✅ Instructions séparées dans [Documentation Demo](./DEMO.md)

### Auth Refactorisée

- ✅ AuthService passe via UserService (pas d'accès direct au repository)
- ✅ JWT avec ConfigService pour les secrets
- ✅ Refresh tokens implémentés
- ✅ OTP et password reset ready
- ✅ Guards et strategies Passport configurés

### Templates Professionnels

- ✅ `.gitignore` complet pour NestJS
- ✅ `README.md` auto-généré pour chaque projet
- ✅ Git auto-initialized avec premier commit
- ✅ Structure propre et documentée

### Code Cleaning

- ✅ Suppression des fichiers obsolètes
- ✅ Normalisation CommonJS vs ES6
- ✅ Code mort nettoyé
- ✅ Imports et exports cohérents

---

## Nouveautes v0.2.0

### Deux Modes d'Architecture

**Mode FULL - Architecture Complete**

- Clean Architecture avec use-cases, mappers, adapters
- Separation stricte domain/application/infrastructure/presentation
- Ideal pour projets complexes et scalables

**Mode LIGHT - Architecture MVP**

- Structure simplifiee : controllers → services → repositories
- Demarrage rapide pour prototypes
- Parfait pour petits projets et MVPs

### CLI Moderne avec Flags

```bash
nestcraftx new <project-name> [options]

Options:
  --light              Mode architecture simplifiee
  --full               Mode architecture complete (defaut)
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

### 📦 Via npx (recommandé)

Utilisez NestCraftX sans installation globale :

```bash
npx nestcraftx new my-app
```

### 🌍 Installation globale

Pour une utilisation fréquente :

```bash
npm install -g nestcraftx
nestcraftx new my-app
```

### 🧪 Installation pour développement

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
nestcraftx new blog-api --light --orm prisma --auth --swagger

# Configuration personnalisée
nestcraftx new shop --orm typeorm --auth
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
nestcraftx demo --light --orm mongoose

# Mode FULL avec TypeORM
nestcraftx demo --orm typeorm --auth --swagger

# Démarrer rapidement
nestcraftx demo --light --orm prisma
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

✅ **Prisma** - ORM moderne et type-safe (recommandé)
✅ **TypeORM** - ORM complet avec decorateurs
✅ **Mongoose** - ODM pour MongoDB
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

## Architecture générée

```
my-app/
    ├── src/
    │   ├── auth/
    │   │   ├── auth.module.ts
    │   │   ├── controllers/
    │   │   │   └── auth.controller.ts
    │   │   ├── guards/
    │   │   │   ├── auth.guard.ts
    │   │   │   ├── jwt-auth.guard.ts
    │   │   │   └── role.guard.ts
    │   │   ├── services/
    │   │   │   └── auth.service.ts
    │   │   └── strategy/
    │   │       └── jwt.strategy.ts
    │   │
    │   ├── common/
    │   │   ├── decorators/
    │   │   │   ├── public.decorator.ts
    │   │   │   └── role.decorator.ts
    │   │   ├── filters/
    │   │   │   └── all-exceptions.filter.ts
    │   │   ├── interceptors/
    │   │   │   └── response.interceptor.ts
    │   │   └── middlewares/
    │   │       └── logger.middleware.ts
    │   │
    │   ├── user/
    │   │   ├── user.module.ts
    │   │   ├── application/
    │   │   │   ├── dtos/
    │   │   │   │   └── user.dto.ts
    │   │   │   ├── interfaces/
    │   │   │   │   └── user.repository.interface.ts
    │   │   │   └── use-cases/
    │   │   │       ├── create-user.use-case.ts
    │   │   │       ├── delete-user.use-case.ts
    │   │   │       ├── getAll-user.use-case.ts
    │   │   │       ├── getById-user.use-case.ts
    │   │   │       └── update-user.use-case.ts
    │   │   │
    │   │   ├── domain/
    │   │   │   ├── entities/
    │   │   │   │   └── user.entity.ts
    │   │   │   ├── enums/
    │   │   │   │   ├── role.enum.ts
    │   │   │   │   └── user.enum.ts
    │   │   │   └── mappers/
    │   │   │       └── user.mapper.ts
    │   │   │
    │   │   ├── infrastructure/
    │   │   │   ├── adapters/
    │   │   │   │   └── user.adapter.ts
    │   │   │   ├── repositories/
    │   │   │   │   └── user.repository.ts
    │   │   │   └── services/
    │   │   │       └── user.service.ts
    │   │   │
    │   │   └── presentation/
    │   │       └── controllers/
    │   │           └── user.controller.ts
    │   │
    │   ├── entities/
    │   │   └── User.entity.ts
    │   │
    │   ├── app.module.ts
    │   └── main.ts
    │
    ├── .env
    ├── .gitignore
    ├── Dockerfile
    ├── docker-compose.yml
    ├── package.json
    └── README.md

```

---

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

## Roadmap

### Version 0.3.0

- [ ] Commande `generate` pour ajouter des entités à un projet existant
- [ ] Support MySQL et SQLite
- [ ] Génération de tests unitaires automatiques
- [ ] Templates de CI/CD (GitHub Actions, GitLab CI)
- [ ] Support GraphQL

### Version 0.4.0

- [ ] Interface web pour configurer les projets
- [ ] Génération de seeds pour les bases de données
- [ ] Support des microservices
- [ ] Intégration Redis
- [ ] WebSocket support

### Version 1.0.0

- [ ] Documentation complète en ligne
- [ ] Support d'autres frameworks (Express, Fastify)
- [ ] Marketplace de templates communautaires
- [ ] CLI plugins system

---

## ❤️ Contribuer

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

## 📜 Licence

MIT © [Ablanhou Augustin Selete](https://github.com/august-dev-pro)

Libre d'usage pour projets personnels et commerciaux.

---

## 🙏 Remerciements

Merci à tous les contributeurs et à la communauté NestJS !

**Fait avec ❤️ pour la communauté des développeurs backend**

---

## 📞 Contact & Support

- 📧 GitHub Issues : [Ouvrir une issue](https://github.com/august-dev-pro/NestCraftX/issues)
- 🌐 Repository : [NestCraftX sur GitHub](https://github.com/august-dev-pro/NestCraftX)
- ⭐ Si ce projet vous aide, pensez à lui donner une étoile !

---

**NestCraftX v0.2.1** - Clean Architecture Made Simple

Pour plus d'informations:

- [Guide d'utilisation complet](./CLI_USAGE.md)
- [Guide de migration](./MIGRATION_GUIDE.md)
- [Changelog detaille](./CHANGELOG.md)
