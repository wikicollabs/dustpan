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
- vue-banana-i18n for translations
- Express + MySQL service (`server/`) for logging the selection


## Development

Requirements:

- Node.js 16 or later
- pnpm 10.22.0

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

`src/scripts/updateProperties.ts` regenerates `src/catalog/properties.json`, which contains Wikidata property labels used by the catalog.

Run it after adding a new property or language:

```bash
pnpm exec tsx src/scripts/updateProperties.ts
```

There is also a scheduled GitHub Action that updates it.


## Deployment

Dustpan runs on Wikimedia Toolforge. Deployment is currently manual.


## Contributing

Bug reports, new WikiProjects, new query types, and other improvements are welcome.

See [CONTRIBUTING.md](./CONTRIBUTING.md).


## License

GPL-2.0-or-later. See [LICENSE](./LICENSE).