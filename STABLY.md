# STABLY.md — Project Rules for Stably Agent

## Project Context

Angular app using Angular Material CDK. The SPA loads slowly — use element-based waits, not URL-based waits or `networkidle`.

## Angular CDK Overlays

CDK overlay backdrops block Playwright clicks after dropdown/dialog interactions. Use `{ force: true }` on clicks that follow dropdown selections, or press Escape to dismiss overlays first.
