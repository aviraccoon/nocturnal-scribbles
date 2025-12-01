# aviraccoon's nocturnal scribbles

Personal blog at [raccoon.land](https://raccoon.land/).

Late-night thoughts on ADHD, dev tools, self-hosting, and whatever else keeps me up.

## What it is

A custom static site generator built with Bun and TypeScript. Markdown files in git become static HTML with no framework, minimal JavaScript, and no tracking.

## Why custom-built

- Full control over content and infrastructure
- Built when the need became urgent
- Wanted something simple and maintainable
- Pain-driven development

## How it works

- Markdown files with frontmatter → static HTML
- Simple template replacement (no templating engine)
- Draft support via `draft: true` in frontmatter
- File watching dev server with auto-rebuild
- Fast builds, minimal complexity

## Features

- RSS feeds
- Tag system
- Draft posts
- No analytics
- No tracking
- No comments
- All content portable (just markdown in git)

## Philosophy

Pain-driven development. Keep it simple. Fast builds over features. Data ownership matters.

## Usage

```bash
bun install
bun run dev     # Dev server with hot reload
bun run build   # Build static site
bun run check   # Run tests, lint, typecheck
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development details.

## Tech Stack

- Bun (runtime + test runner)
- TypeScript
- Marked (markdown parsing)
- Gray-matter (frontmatter)
- date-fns (date formatting)
- Biome (linting + formatting)

## License

MIT
