# Guide de Migration NestCraftX : v0.1.x → v0.2.3

## Vue d'ensemble

La version **0.2.3** marque une étape majeure dans la maturité de NestCraftX. Nous passons d'un simple script de génération à un véritable outil CLI professionnel avec une expérience utilisateur (UX) totalement repensée.

**Points clés de la mise à jour :**

- **Nouvelle Interface :** Navigation par flèches avec `Inquirer.js` (plus de saisie manuelle).
- **Gestionnaire de Paquets :** Support natif de `npm`, `yarn` et `pnpm`.
- **Architecture Hybrid :** Choix entre le mode **LIGHT** (MVP) et **FULL** (Clean Architecture).
- **Sécurité Renforcée :** Secrets JWT de 64 caractères auto-générés via `crypto.randomBytes`.

---

## 1. Changements de Syntaxe

### La commande `start` est dépréciée

Bien que le mode interactif reste accessible pour la compatibilité, la commande sémantique recommandée est désormais `new`.

- **Ancien (v0.1.x) :** `nestcraftx start`
- **Nouveau (v0.2.3) :** `nestcraftx new mon-projet`

### Nouveaux Flags Professionnels

Vous pouvez désormais tout configurer en une seule ligne sans répondre à une seule question :

```bash
# Exemple : Un projet ultra-rapide avec pnpm et Prisma
nestcraftx new mon-api --light --orm=prisma --pm=pnpm --auth --swagger

```

---

## 2. Comparaison des Architectures

Le choix du mode impacte directement la structure de vos dossiers sous `src/`.

### Mode LIGHT (Nouveauté v0.2.0+)

Idéal pour la rapidité et les prototypes. On élimine les mappers et les use-cases pour une communication directe.

- **Structure :** `src/[entity]/[controllers|services|repositories|entities|dtos]`
- **Flux :** `Controller` ➔ `Service` ➔ `Repository` ➔ `DB`

### Mode FULL (Standard Clean Code)

C'est l'architecture robuste de la v0.1.x, mais affinée. Les services sont maintenant isolés dans la couche `application` pour respecter strictement les principes DDD.

- **Structure :** Séparation en `domain`, `application`, `infrastructure` et `presentation`.
- **Flux :** `Controller` ➔ `Use-Case` ➔ `Service` ➔ `Repository/Adapter` ➔ `DB`

---

## 3. Gestionnaire de Paquets (Nouveauté v0.2.3)

Le flag `--pm` (ou `--packageManager`) vous permet de définir votre outil favori. Si vous ne le spécifiez pas, le CLI vous proposera une liste de choix interactive.

| Outil    | Flag        | Commande d'installation lancée |
| -------- | ----------- | ------------------------------ |
| **npm**  | `--pm=npm`  | `npm install`                  |
| **Yarn** | `--pm=yarn` | `yarn install`                 |
| **pnpm** | `--pm=pnpm` | `pnpm install`                 |

---

## 4. Génération Automatique du .env

Le système de génération de secrets a été renforcé pour utiliser des algorithmes cryptographiques plus sûrs.

**Ancien comportement :** Saisie manuelle ou secrets courts.
**Nouveau comportement (v0.2.3) :** - `JWT_SECRET` : 64 caractères hexadécimaux uniques.

- `DATABASE_URL` : Auto-construit selon l'ORM choisi (Prisma/TypeORM/Mongoose).

---

## Checklist de Migration Rapide

- [ ] **Mise à jour globale :** `npm install -g nestcraftx@latest`
- [ ] **Vérification environnement :** Lancez `nestcraftx test` pour vérifier la présence de `pnpm` ou `yarn`.
- [ ] **Test de la Démo :** Testez la nouvelle commande `nestcraftx demo --light` pour voir la nouvelle structure simplifiée.
- [ ] **Secrets JWT :** Si vous migrez manuellement un ancien projet, générez un secret pro :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

```

## FAQ de Migration

**Q : Mes anciens projets vont-ils casser ?** R : Non. NestCraftX est un générateur de code. Une fois le code généré, il est indépendant. La mise à jour du CLI n'impacte que les _prochains_ projets que vous créerez.

**Q : Pourquoi passer à Inquirer.js ?** R : Pour éviter les erreurs de frappe (ex: taper "prismm" au lieu de "prisma"). La sélection par liste avec les flèches du clavier est plus rapide et plus fiable.

**Q : Comment choisir entre LIGHT et FULL ?** R :

- Utilisez **LIGHT** pour des MVPs, des microservices simples ou si vous débutez.
- Utilisez **FULL** pour des applications d'entreprise, des projets à longue durée de vie ou des architectures complexes.

## Support

Si vous rencontrez des problemes lors de la migration :

1. Verifiez la documentation : `CLI_USAGE.md`

2. Consultez le changelog : `CHANGELOG.md`

3. Ouvrez une issue sur GitHub : https://github.com/august-dev-pro/NestCraftX/issues

## Ressources

- [CLI Usage Guide](./CLI_USAGE.md)

- [Changelog](./CHANGELOG.md)

- [GitHub Repository](https://github.com/august-dev-pro/NestCratfX)

```
Seriez-vous intéressé par un script d'automatisation pour mettre à jour vos variables d'environnement sur plusieurs serveurs ?
```

---

**NestCraftX v0.2.3** — _Clean Architecture Made Simple._ [Accéder au Dépôt GitHub](https://github.com/august-dev-pro/NestCraftX)
