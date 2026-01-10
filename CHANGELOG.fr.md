# Journal des modifications (Changelog)

Toutes les modifications notables apportées à NestCraftX seront documentées dans ce fichier.

## [0.2.3] - 10-01-2026

### Ajouté

- **Nouveau système interactif (Inquirer.js)** : Remplacement de `readline-sync` par `Inquirer` pour une navigation professionnelle au clavier (touches fléchées).
- **Support des gestionnaires de paquets** : Choix entre `npm`, `yarn` et `pnpm` (via le flag `--pm` ou sélection interactive).
- **Détection intelligente de DB** : Sélection automatique du type de base de données (PostgreSQL ou MongoDB) en fonction de l'ORM choisi.
- **Fusion avancée des flags** : Intégration fluide entre les flags CLI et les invites interactives pour les options manquantes.
- **Badges de statut visuels** : Ajout de badges dans le README pour la Version, la Licence et les ORM supportés.

### Changé

- **Refonte TOTALE de l'architecture** : Déplacement des services vers `application/services` pour respecter strictement les patterns de la Clean Architecture.
- **Refactorisation de l'Auth** : `AuthService` interagit désormais exclusivement avec `UserService` (suppression de l'accès direct au repository).
- **Commande Demo améliorée** : La commande `demo` génère maintenant un projet de blog complet avec 3 entités liées (User, Post, Comment) et des relations 1-N.
- **Sécurité renforcée** : Les secrets JWT sont désormais générés via `crypto.randomBytes(32)` (chaînes hexadécimales de 64 caractères).
- **Docker par défaut** : Les fichiers Docker sont maintenant générés par défaut dans les deux modes, sauf si `--docker=false` est spécifié.

### Corrigé

- **Compatibilité des modules** : Résolution des conflits CommonJS vs ES6 dans les templates de projet générés.
- **Validation des flags** : Correction de bugs où certains flags CLI étaient ignorés durant le flux interactif.
- **Dépendances circulaires** : Nettoyage des imports dans le module Auth pour prévenir d'éventuels problèmes au runtime.

---

## [0.2.2] - 07-11-2025

### Ajouté

- **Templates professionnels** : Auto-génération d'un `.gitignore` spécifique à NestJS et d'un `README.md` personnalisé pour chaque nouveau projet.
- **Auto-init Git** : Initialisation automatique du dépôt Git et premier commit après la génération du projet.
- **Support Mongoose (Beta)** : Première implémentation de l'architecture MongoDB avec Mongoose.

### Changé

- **Nettoyage du code** : Suppression des fichiers de configuration obsolètes (`start.js`, `fullModeInput.js`, `lightModeInput.js`).
- **Standardisation des logs** : Unification des messages console via un système de codes couleurs cohérent (Info, Succès, Avertissement).

---

## [0.2.0] - 27-10-2025

### Ajouté

- **Modes d'architecture doubles** :
- **Mode FULL** : Clean Architecture complète + DDD (Use-cases, Mappers, Adapters).
- **Mode LIGHT** : Architecture MVP simplifiée (Controllers → Services → Repositories).

- **Parseur CLI moderne** : Support des syntaxes `--key=value` et `--key value` avec validation.
- **Amélioration de l'UX** : Intégration de spinners animés et d'un résumé complet de la configuration post-génération.

### Sécurité

- **Environnement sécurisé** : Génération automatique de `JWT_SECRET` et `JWT_REFRESH_SECRET` dans le fichier `.env`.
- **Exemples assainis** : Création d'un fichier `.env.example` sécurisé sans données sensibles.

---

## [0.1.0] - Version précédente

### Fonctionnalités initiales

- Génération de projet NestJS de base.
- Support de Prisma et TypeORM.
- Configuration de base Docker et Swagger.
- Authentification JWT standard.

---

## Notes de migration

### De 0.1.x à 0.2.3

**Changements non-bloquants** : La version 0.2.x est rétrocompatible.

**Nouvelles commandes recommandées :**

```bash
# Mode LIGHT (Plus rapide pour les MVP)
nestcraftx new my-api --light --orm=prisma --auth

# Mode FULL (Standard pour les applications d'entreprise)
nestcraftx new my-app --full --orm=typeorm --auth --swagger

```

Avantages de la mise à jour :

- Secrets JWT automatisés et sécurisés.
- Choix du gestionnaire de paquets (npm/yarn/pnpm).
- Meilleure séparation des responsabilités dans les modules Auth/User.
- Meilleure expérience développeur (DX) avec les menus interactifs.
