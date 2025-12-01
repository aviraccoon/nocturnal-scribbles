# AI Agent Guidelines

## Key References

- @CONTRIBUTING.md for development workflow
- @README.md for project philosophy and purpose

## Communication Style

- No emoji in responses or generated content (exception: CLI output is fine)
- No marketing language (avoid: "comprehensive", "robust", "cutting-edge", "streamlined", etc.)
- Be concise - this applies to responses AND generated documents
- Direct, technical communication without fluff

## Working on this Codebase

- Always read files before modifying them
- Run `bun run check` before proposing changes
- Use todo lists for multi-step tasks
- Tests are required for new features

## Project Context

- Personal blog, not a product
- Owner is sole user (optimize for that)
- Simplicity over features

## Decision-Making

- When in doubt, ask for clarification
- Don't add frameworks or dependencies without explicit request
- Fix ALL warnings, not just errors

## Common Pitfalls to Avoid

- Don't over-engineer
- Don't add features "for the future"
- Don't skip type checking
- Don't ignore lint warnings
- Don't create unnecessary abstractions