## 🛠️ NestCraftX — Générateur de projet backend NestJS

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E=16.0.0-green.svg)

Bienvenue dans **NestCraftX**, un CLI Node.js puissant pour générer automatiquement une structure de projet backend modulaire, professionnelle et maintenable. Il s’appuie sur les meilleures pratiques modernes : **Clean Architecture**, **Domain-Driven Design (DDD)**, **Prisma**, **TypeORM**, **JWT Auth**, **Swagger**, **Docker**, etc.

> 🧠 L’objectif ? Ne plus jamais repartir de zéro pour créer une base de projet solide, évolutive et prête pour la production.

---

## 📑 Sommaire

- [✨ Objectif du projet](#objectif-du-projet)
- [📦 Prérequis](#prérequis)
- [🚀 Installation et utilisation](#installation-et-utilisation)
- [🧰 Ce que la commande configure automatiquement](#ce-que-la-commande-configure-automatiquement)
- [📁 Exemple d’architecture générée](#exemple-darchitecture-générée)
- [📌 À venir](#à-venir)
- [❤️ Contribuer](#️contribuer)
- [📜 Licence](#licence)

---

## ✨ Objectif du projet

    L’idée est simple : au lieu de réinventer la roue à chaque projet, ce CLI vous génère une base de code solide, bien organisée et évolutive en quelques minutes. Cela vous permet de :

    - Démarrer un nouveau projet rapidement
    - Avoir une structure claire dès le départ
    - Uniformiser vos projets
    - Se concentrer sur la logique métier sans perdre de temps sur la configuration

---

## 📦 Prérequis

    Assurez-vous d’avoir :

    - **Node.js** v16 ou supérieur
    - **npm** ou **yarn**
    - **Docker** (pour l intégration avec la base de données)
    - **Git** (optionnel pour init un repo)

---

## 🚀 Installation et utilisation

    📦 Installation via npx (recommandé)

        ```bash

        npx nestcraftx start

        ```

        Utilise la puissance de NestCraftX sans rien installer globalement. Simple, rapide et efficace.

    🌍 Installation globale (optionnel)

        Tu peux aussi l’installer une fois pour toutes, si tu comptes l’utiliser souvent :

            ```bash

            npm install -g nestcraftx

            ```

        Et ensuite, lance la commande où tu veux :

            ```bash

            nestcraftx start

            ```

    🧪 Installation locale pour développement

        Clone le projet puis utilise npm link :

            ```bash

            git clone https://github.com/august-dev-pro/NestCraftX.git
            cd NestCraftX
            npm install
            npm link

            ```

        Cela te permet d’utiliser nestcraftx en CLI localement pendant que tu développes.

---

## 🧰 Ce que la commande configure automatiquement :

    ✅ Structure Clean Architecture (domain/usecases/infra)

    ✅ Swagger (documentation automatique)

    ✅ Authentification JWT (optionnelle)

    ✅ Prisma ou TypeORM

    ✅ Docker + docker-compose

    ✅ Logger personnalisés (logSuccess, logError, etc.)

    ✅ Setup .env, Prisma schema, et plus encore...

---

## 📁 Exemple d’architecture générée

```bash
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

## 📌 À venir

    npx nestcraft generate [nom de l'entité] → Génère un module complet automatiquement

    npx nestcraft add:auth → Intègre le système d'auth JWT

    Menu CLI interactif intelligent (choix d'ORM, base de données : MySQL, MongoDB, Firebase, etc.)

    Génération de tests unitaires

    Déploiement Docker simplifié

    🧪 Intégration CI/CD de base

    🌐 Site de documentation officiel

---

##❤️ Contribuer

    Tu veux améliorer NestCraft ?
    Fork le repo, ajoute tes idées, propose une Pull Request ou ouvre une issue pour en discuter !

---

## 📜 Licence

    MIT © [Augustin_Selete] — libre d’usage, mais le mérite te revient 😉

---
