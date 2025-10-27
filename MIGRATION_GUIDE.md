# Guide de Migration v0.1.x → v0.2.0

## Vue d'ensemble

La version 0.2.0 apporte des ameliorations majeures au CLI NestCraftX :
- 2 modes d'architecture (FULL et LIGHT)
- Generation automatique de secrets securises
- CLI moderne avec flags inline
- Meilleure UX (couleurs, spinners)

## Changements Importants

### 1. Nouvelle Syntaxe de Commande

#### Avant (v0.1.x)
```bash
nestcraftx start
# Puis configuration interactive complete
```

#### Maintenant (v0.2.0)
```bash
# Mode LIGHT (nouveau - recommande pour prototypes/MVP)
nestcraftx new mon-projet --light --orm=prisma --auth --swagger

# Mode FULL (architecture complete comme avant)
nestcraftx new mon-projet --full --orm=prisma --auth --swagger

# Mode interactif (toujours disponible)
nestcraftx new mon-projet
```

### 2. Nouveaux Flags Disponibles

| Flag | Description | Valeurs | Defaut |
|------|-------------|---------|--------|
| `--mode` | Mode d'architecture | `full`, `light` | `full` |
| `--light` | Raccourci pour mode light | - | - |
| `--full` | Raccourci pour mode full | - | - |
| `--orm` | Choix de l'ORM | `prisma`, `typeorm`, `mongoose` | `prisma` |
| `--auth` | Active l'authentification | - | `false` |
| `--swagger` | Active Swagger UI | - | `false` |
| `--docker` | Active Docker | `true`, `false` | `true` |

### 3. Generation Automatique du .env

#### Avant (v0.1.x)
Vous deviez creer et configurer manuellement le fichier `.env`.

#### Maintenant (v0.2.0)
Le fichier `.env` est genere automatiquement avec :
- Secrets JWT auto-generes (64 caracteres securises)
- DATABASE_URL pre-configure selon votre ORM
- Toutes les variables necessaires
- Un fichier `.env.example` sanitise pour votre repo

**Exemple de .env genere :**
```env
JWT_SECRET=auto_generated_64_char_secret_here
JWT_REFRESH_SECRET=another_auto_generated_secret
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mon-projet?schema=public
```

### 4. Deux Modes d'Architecture

#### Mode FULL (Equivalent a v0.1.x)
Architecture complete avec Clean Architecture + DDD

**Structure :**
```
src/entity/
├── application/
│   ├── use-cases/
│   ├── dtos/
│   └── interfaces/
├── domain/
│   ├── entities/
│   ├── enums/
│   └── mappers/
├── infrastructure/
│   ├── repositories/
│   ├── services/
│   └── adapters/
└── presentation/
    └── controllers/
```

**Quand l'utiliser :**
- Projets complexes
- Architecture scalable
- Equipe experimentee
- Besoin de separation stricte des responsabilites

#### Mode LIGHT (Nouveau dans v0.2.0)
Architecture MVP simplifiee

**Structure :**
```
src/entity/
├── entities/
├── dto/
├── services/
├── repositories/
└── controllers/
```

**Quand l'utiliser :**
- Prototypes rapides
- Petits projets
- MVPs
- Decouverte de NestJS

## Exemples de Migration

### Scenario 1 : Projet Simple API REST

**Avant (v0.1.x) :**
```bash
nestcraftx start
# Puis repondre aux prompts interactifs
```

**Maintenant (v0.2.0) - Recommande :**
```bash
nestcraftx new mon-api --light --orm=prisma --swagger
```

### Scenario 2 : Projet avec Authentification

**Avant (v0.1.x) :**
```bash
nestcraftx start
# Choisir auth dans les prompts
# Configurer JWT_SECRET manuellement dans .env
```

**Maintenant (v0.2.0) :**
```bash
nestcraftx new mon-api --light --auth --orm=prisma
# JWT_SECRET auto-genere dans .env
```

### Scenario 3 : Projet Enterprise Complexe

**Avant (v0.1.x) :**
```bash
nestcraftx start
# Configuration interactive complete
```

**Maintenant (v0.2.0) :**
```bash
nestcraftx new mon-projet --full --orm=typeorm --auth --swagger
# Ou mode interactif pour plus de controle :
nestcraftx new mon-projet
```

### Scenario 4 : Projet MongoDB

**Avant (v0.1.x) :**
```bash
nestcraftx start
# Choisir mongoose
```

**Maintenant (v0.2.0) :**
```bash
nestcraftx new mon-api --light --orm=mongoose --auth
```

## Checklist de Migration

### Pour les Nouveaux Projets

- [ ] Utiliser la nouvelle syntaxe `nestcraftx new <nom>`
- [ ] Choisir le mode approprie (`--light` ou `--full`)
- [ ] Specifier l'ORM via `--orm=<prisma|typeorm|mongoose>`
- [ ] Ajouter `--auth` si besoin d'authentification
- [ ] Ajouter `--swagger` pour la documentation API
- [ ] Verifier le fichier `.env` genere
- [ ] Ne pas committer `.env`, utiliser `.env.example`

### Pour les Projets Existants

**Aucune migration necessaire !** La version 0.2.0 est pour la generation de nouveaux projets.

Si vous voulez adopter les nouvelles pratiques :
1. Regenerer les secrets JWT avec `crypto.randomBytes(64).toString('base64url')`
2. Mettre a jour votre `.env` avec les nouvelles variables
3. Creer un `.env.example` sanitise

## FAQ

### Q : L'ancienne syntaxe fonctionne-t-elle encore ?

**R :** Oui ! Le mode interactif est toujours disponible :
```bash
nestcraftx new mon-projet
# Puis suivre les prompts
```

### Q : Dois-je migrer mes projets existants ?

**R :** Non, vos projets existants continuent de fonctionner. La v0.2.0 concerne uniquement la creation de nouveaux projets.

### Q : Comment generer des secrets JWT manuellement ?

**R :** Si vous voulez generer des secrets manuellement :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
```

### Q : Quel mode choisir pour mon projet ?

**R :**
- **LIGHT** : Prototypes, MVPs, petits projets, apprentissage
- **FULL** : Projets complexes, architecture scalable, equipes experimentees

### Q : Puis-je passer de LIGHT a FULL plus tard ?

**R :** Oui, mais cela necessite une refactorisation manuelle. Il est recommande de choisir le bon mode des le debut.

### Q : Le fichier .env est-il commitable ?

**R :** **NON !** Ne committez jamais `.env`. Utilisez `.env.example` qui est genere automatiquement.

## Support

Si vous rencontrez des problemes lors de la migration :

1. Verifiez la documentation : `CLI_USAGE.md`
2. Consultez le changelog : `CHANGELOG.md`
3. Ouvrez une issue sur GitHub : https://github.com/august-dev-pro/NestCraftX/issues

## Ressources

- [CLI Usage Guide](./CLI_USAGE.md)
- [Changelog](./CHANGELOG.md)
- [GitHub Repository](https://github.com/august-dev-pro/NestCraftX)
