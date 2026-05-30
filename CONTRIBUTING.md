# Contributing to altro

Thanks for your interest in contributing! `altro` is an open-source project and
contributions of all kinds — bug reports, fixes, docs, and features — are
welcome.

## Ground rules

By participating you agree to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).
All contributions are accepted under the project's [MIT License](./LICENSE).

## Filing an issue

Before opening a new issue, search [existing issues][issues] to avoid
duplicates. A good bug report includes:

- What you did (steps to reproduce)
- What you expected to happen
- What actually happened (errors, logs, screenshots)
- Your environment (OS, Node version, browser, GPU host if relevant)

For feature ideas, describe the problem you're trying to solve, not just the
solution you have in mind.

## Submitting a pull request

1. **Fork** the repo and create a branch from `main`:
   `git checkout -b my-fix`
2. **Make your change.** Keep it focused — one logical change per PR.
3. **Match the surrounding code.** This is a TypeScript project; follow the
   existing style, naming, and structure.
4. **Test it.** For `speak`, that means at minimum:
   ```bash
   cd speak
   npm install
   npm --workspace apps/server run build   # typechecks + builds the web app
   ```
   Run the app locally and confirm your change works (see
   [speak/DEPLOY.md](./speak/DEPLOY.md)).
5. **Write a clear commit message** describing what changed and why.
6. **Open the PR** against `main` with a description of the change and how you
   tested it. Link any related issue.

## Project layout

`altro` hosts multiple projects. Today that's [`speak/`](./speak), a Node
workspace (`apps/*` + `packages/*`). See its
[README](./speak/README.md) for architecture.

## Questions

Not sure about something? Open an issue with the `question` label and ask — it's
better to discuss a larger change before writing the code.

[issues]: https://github.com/aurelius-meshugaim/altro/issues
