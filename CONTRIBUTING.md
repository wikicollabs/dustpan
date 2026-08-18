# Contributing to Dustpan

Thank you for contributing to Dustpan.

This document covers how to set up a local development environment, propose changes, suggest new WikiProjects or query types, help with translations, and report bugs.

## Local setup

### Requirements

- Node.js 16 or later
- pnpm 10.22.0 for the frontend

Install the dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

## Proposing a WikiProject or Query Type

WikiProjects and query types are defined as JSON under `src/catalog/`, rather than stored in a database. This allows them to be reviewed and changed like any other part of the codebase.

To propose a new WikiProject or query type, open an issue or pull request and include:

- The WikiProject name and a link to its Wikidata WikiProject page
- The query type name. This is translatable, so keep it short and descriptive
- The SPARQL query the query type should run
- Contribution guidance explaining what an editor should do after finding a result
- Any table columns needed beyond the default item and label columns
- A scope, if the results can usefully be narrowed. For example, by geographic scope

A WikiProject currently supports at most one scope.

If you are not comfortable writing the SPARQL query yourself, describe what the query type should find. We can help turn that description into a query.

## Code changes

- Open pull requests against `staging`.
- Keep each pull request focused on one type of change where possible.
- Follow the existing code style in the file you are editing rather than introducing a new convention.
- Use comments to explain why something is implemented in a particular way when that reason is not obvious. Avoid comments that merely narrate what the code is doing.

## Translations

Display strings live under `src/i18n/`.

Dustpan is in the process of being added to [translatewiki.net](https://translatewiki.net/wiki/Translating:Dustpan). Once that is complete, translations will be handled there rather than through direct pull requests.

If you would like to help translate Dustpan, check back once the project is available on translatewiki.net.

## Reporting Bugs

Open a [GitHub issue](https://github.com/wikicollabs/dustpan/issues) and include:

- Steps to reproduce the problem
- What you expected to happen
- What happened instead
- Screenshots, when they are useful for demonstrating a visual problem

If you would rather not use GitHub, you can email `support@wikicollabs.org` or leave a note on [Dustpan's talk page on Wikidata](https://www.wikidata.org/wiki/Wikidata_talk:Dustpan).