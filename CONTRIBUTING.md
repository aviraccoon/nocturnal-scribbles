# Contributing

## Quick Start

```bash
bun install
bun run dev    # Start dev server with hot reload
bun test       # Run tests
```

**Runtime Management (Optional):**
This project uses [Mise](https://mise.jdx.dev/) to pin the Bun version. If you have Mise installed, it will automatically use the correct Bun version from `mise.toml`. Otherwise, just install Bun directly.

## Project Structure

- `src/` - Build scripts and core logic
- `posts/` - Blog post markdown files
- `templates/` - HTML templates for rendering
- `static/` - CSS and static assets
- `tests/` - Test fixtures
- `dist/` - Generated static site (gitignored)
- `public/` - Files copied to dist root without hashing (CNAME, favicons)

Tests live next to source files as `*.test.ts`.

**Content editing:** Posts and pages are edited in Obsidian with the [Linter plugin](https://github.com/platers/obsidian-linter) for consistent markdown formatting. Config is in `.obsidian/` (gitignored).

## Code Quality Standards

Before committing, run:

```bash
bun run check       # Run all checks (typecheck + lint + test)
```

Individual commands:
```bash
bun run typecheck   # Type checking only
bun run lint        # Linting only
bun run lint:fix    # Auto-fix linting issues (--write)
bun test            # Tests only
```

For unsafe fixes (use with caution):
```bash
biome check . --write --unsafe
```

Requirements:
- All warnings must be fixed (not just errors)
- Tests required for new features
- Formatting: tabs for code, 2 spaces for JSON

## Coding Standards

- **DRY:** Don't repeat yourself. Extract common logic into reusable functions
- **Important code first:** Put the most important logic at the top of files
- **Use `type` over `interface`:** Prefer `type` for type definitions
- **Never use `any`:** Always provide proper types. Use `unknown` if type is truly unknown
- **Use JSDoc for documentation:** Add JSDoc comments to document functions and complex logic. Omit type annotations (TypeScript handles that)

## Testing

- Tests use Bun's built-in test runner
- Tests are colocated with source files

## Architecture Decisions

**Simple template replacement:** Uses string replacement instead of a templating framework. Fast, predictable, no dependencies.

**Draft filtering:** Posts with `draft: true` in frontmatter are filtered out during build.

## Common Tasks

**Add a new post:**
```bash
# Create posts/YYYY-MM-DD-slug.md with frontmatter
# Set draft: false to publish
bun run build
```

**Modify templates:**
- Edit files in `templates/`
- Templates use `{{VARIABLE}}` placeholders
- Dev server auto-rebuilds on changes

**Add a new build step:**
- Edit `src/build.ts`
- Export functions for testability
- Add tests in `src/build.test.ts`

## What NOT to Do

- Don't over-engineer
- Don't add frameworks
- Don't skip warnings
- Don't commit without running checks

## Philosophy

Pain-driven development. Keep it simple. Fast builds over features.
