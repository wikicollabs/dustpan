# Dustpan

A tool to help identify WikiProject items on Wikidata that can be improved.

Access the tool at https://wikicollabs-staging.toolforge.org

Built as a companion to [Broomstick](https://github.com/wikicollabs/broomstick), which serves the same purpose for Lexemes.

## Disclaimer

**This is a prototype.** This tool is an early-stage prototype built for WikiProject Days, intended to gather feedback before further development. It is not a finished product, and functionality, design, and features are expected to change significantly based on feedback received.

## What it does

Select a WikiProject and a query type to find items on Wikidata that are missing specific metadata (such as inception date, creator, or genre). Optionally filter by geographic scope.

## Tech stack

- Vue 3 (Composition API)
- Vite
- Codex (Wikimedia design system)
- SPARQL queries against the Wikidata Query Service

## License

GPL-2.0-or-later
