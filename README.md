# Dustpan

Dustpan is a tool for Wikidata contributors to uncover WikiProjects that can be improved.

- Tool: https://dustpan.toolforge.org
- Wikidata: https://www.wikidata.org/wiki/Wikidata:Dustpan

Choose a WikiProject and a query type, optionally narrow the results by scope, and Dustpan runs the corresponding SPARQL query against Wikidata. The results are shown in a table with guidance on what to improve.

Built as a companion to [Broomstick](https://github.com/wikicollabs/broomstick), which serves the same purpose for Lexemes.


## How it works

- **WikiProjects** are the top level grouping (WikiProject Music, WikiProject Sum of All Paintings, and so on). Each one links back to its WikiProject page on Wikidata.
- **Query types** live under a WikiProject. Each one is a SPARQL query targeting a specific missing property, plus contribution guidance explaining what to do with the results.
- **Scope** narrows a query type's results further, where the query type supports it. Not every query type has a scope.

WikiProjects and query types are defined in JSON under `src/catalog/`.

Keeping the catalog in the repository means new WikiProjects and queries can be proposed and reviewed through normal GitHub contributions.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.


## Tech stack

- Vue 3, Vite, Pinia for the frontend
- [Codex](https://doc.wikimedia.org/codex/latest/), Wikimedia's design system, for UI components
- vue-banana-i18n for internationalization, with translations managed through [translatewiki.net](https://translatewiki.net/wiki/Translating:Dustpan)
- Express + MySQL service (`server/`) for logging the selection


## Development

Requirements:

- Node.js 26.12.1 or newer within the 26.x release line
- pnpm 12.15.0 (check the root `packageManager` field for the pinned version)

Install dependencies and start the frontend:

```bash
pnpm install
pnpm dev
```

Create a production build:

```bash
pnpm build
```

Preview the production build locally:

```bash
pnpm preview
```

## Project structure

```text
src/
├── catalog/      WikiProject and query type definitions
├── i18n/         Translations files and language handling
├── query/        SPARQL query building
├── state/        Pinia stores, URL state, scope persistence
├── types/        Shared TypeScript types
├── components/   Vue components
├── views/        Application views (Landing and Search)
└── scripts/      Maintenance scripts

server/           Logs for selection
```

## Maintenance scripts

### Updating properties

`src/scripts/updateProperties.ts` regenerates `src/catalog/properties.json`, which contains Wikidata property labels used by the catalog.

Run it after adding a new property or language:

```bash
pnpm exec tsx src/scripts/updateProperties.ts
```
### Updating scopes

`src/scripts/updateScopes.ts` regenerates `src/catalog/scopeOptions.json`, which contains label of the scope options in the display language.

Run it after adding new display language:

```bash
pnpm exec tsx src/scripts/updateScopes.ts
```

## Deployment

Dustpan runs on Wikimedia Toolforge using **Toolforge Build Service** with Node.js 26. Its staging and production environments are deployed separately through manually triggered GitHub Actions workflows.

A merged pull request does not itself authorize a deployment. Deployment credentials, passphrases, and Toolforge configuration are maintained outside the source code. Maintainers should test changes on staging before production.

The build service installs the pnpm workspace and builds the application from Git. Do not reintroduce the old SCP/tar deployment or the `node20` webservice commands. A successful image build should be followed by runtime and application checks.


## Contributing

Bug reports, new WikiProjects, new query types, translations, and other improvements are welcome.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development and contribution guidelines. Translations are managed through [translatewiki.net](https://translatewiki.net/wiki/Translating:Dustpan).


## License

GPL-2.0-or-later. See [LICENSE](./LICENSE).