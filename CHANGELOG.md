# Changelog

All notable changes to NestCraftX will be documented in this file.

## [0.2.0] - 2025-10-27

### Added

#### Architecture Modes
- **Mode FULL** : Architecture complete avec Clean Architecture + DDD
  - Structure complete avec use-cases, mappers, adapters
  - Separation stricte domain/application/infrastructure/presentation
  - Ideal pour projets complexes et scalables

- **Mode LIGHT** : Architecture MVP simplifiee
  - Structure plate : controllers → services → repositories
  - Moins de couches d'abstraction
  - Parfait pour prototypes et petits projets

#### CLI Moderne
- Parser de flags ameliore avec validation
  - Support de `--flag=value` et `--flag value`
  - Validation des noms de projets
  - Validation des valeurs d'options
  - Messages d'erreur clairs

- Nouvelles options en ligne de commande :
  - `--full` ou `--mode=full` : Mode architecture complete
  - `--light` ou `--mode=light` : Mode architecture simplifiee
  - `--orm=<prisma|typeorm|mongoose>` : Choix de l'ORM
  - `--auth` : Activation de l'authentification JWT
  - `--swagger` : Activation de la documentation Swagger
  - `--docker` : Gestion Docker (actif par defaut)

#### Generation .env Securisee
- Generation automatique de secrets JWT securises (64 caracteres)
- Configuration automatique selon l'ORM :
  - PostgreSQL pour Prisma et TypeORM
  - MongoDB pour Mongoose
- Variables pre-configurees :
  - `JWT_SECRET` : Secret auto-genere
  - `JWT_REFRESH_SECRET` : Secret refresh auto-genere
  - `JWT_EXPIRES_IN` : 15 minutes par defaut
  - `JWT_REFRESH_EXPIRES_IN` : 7 jours par defaut
  - `DATABASE_URL` : URL construite automatiquement
- Creation d'un fichier `.env.example` sanitise

#### UX Amelioree
- Systeme de couleurs pour les logs :
  - Info en cyan
  - Success en vert
  - Error en rouge
  - Warning en jaune
- Spinners animes pour les operations longues
- Messages de progression clairs
- Resume detaille post-generation avec toutes les configurations
- Affichage du mode utilise (FULL/LIGHT)

#### Nouveaux Fichiers Utilitaires
- `utils/cliParser.js` : Parser CLI moderne avec validation
- `utils/envGenerator.js` : Generateur de fichiers .env securises
- `utils/colors.js` : Systeme de couleurs pour la console
- `utils/spinner.js` : Spinners animes pour les operations longues
- `utils/configs/setupLightArchitecture.js` : Setup architecture LIGHT

### Changed

#### Structure du Code
- Refactoring complet de `commands/new.js` :
  - Separation en fonctions modulaires
  - `determineMode()` : Detection du mode
  - `buildLightModeInputs()` : Construction config LIGHT
  - `buildFullModeInputs()` : Construction config FULL
  - `executeProjectSetup()` : Execution du setup
  - `printSuccessSummary()` : Affichage resume

- Amelioration de `utils/shell.js` :
  - Support des spinners
  - Mode silencieux pour certaines operations
  - Meilleure gestion des erreurs

- Modernisation des loggers :
  - Utilisation du systeme de couleurs
  - Format unifie
  - Messages plus clairs

#### Parser CLI
- Validation des inputs en temps reel
- Detection des flags mutuellement exclusifs
- Support de la syntaxe moderne (--key=value)
- Messages d'erreur descriptifs

### Improved

#### Generation de Projet
- Detection automatique du mode selon les flags
- Configuration interactive seulement si necessaire
- Validation des noms de projets
- Meilleure gestion des erreurs

#### Configuration Database
- URL de database construite automatiquement
- Support ameliore pour les 3 ORMs
- Configuration adaptee au type de database

#### Documentation
- Ajout de `CLI_USAGE.md` : Guide complet d'utilisation
- Ajout de `CHANGELOG.md` : Historique des versions
- Exemples de commandes detailles
- Documentation des deux modes d'architecture

### Fixed
- Gestion des erreurs amelioree dans tout le CLI
- Validation des options avant execution
- Messages d'erreur plus explicites
- Nettoyage du code (suppression des commentaires obsoletes)

### Security
- Generation de secrets JWT securises avec crypto
- Secrets de 64 caracteres en base64url
- Fichier .env.example sans secrets sensibles
- Bonnes pratiques de securite appliquees

## [0.1.0] - Previous Version

### Features Initiales
- Generation de projets NestJS
- Support Prisma, TypeORM, Mongoose
- Architecture Clean Code de base
- Configuration Docker
- Support Swagger
- Authentification JWT basique

---

## Notes de Migration

### De 0.1.x vers 0.2.0

**Changements non-breaking** : La version 0.2.0 est retrocompatible.

**Nouvelles commandes recommandees :**

Avant (0.1.x) :
```bash
nestcraftx start
# Configuration interactive
```

Maintenant (0.2.0) :
```bash
# Mode LIGHT (nouveau - recommande pour MVP)
nestcraftx new mon-projet --light --orm=prisma --auth

# Mode FULL (equivalent a l'ancien comportement)
nestcraftx new mon-projet --full --orm=prisma --auth
```

**Avantages de la mise a jour :**
- Generation de secrets JWT automatique et securisee
- Fichier .env pret a l'emploi
- Mode LIGHT pour demarrer plus rapidement
- Meilleure experience utilisateur (couleurs, spinners)
- CLI plus moderne et flexible
