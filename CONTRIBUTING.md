# Contributing to PDFSum

Thank you for your interest in contributing! This document outlines the process for contributing to the project.

## Development Setup

1. **Prerequisites**: Node.js >= 20, PostgreSQL, npm
2. **Clone & Install**: `git clone <repo-url> && cd pdf-summarizer && npm ci`
3. **Environment**: Copy `.env.local.example` to `.env.local` and fill in required values
4. **Database**: `npx prisma generate && npx prisma db push`
5. **Dev Server**: `npm run dev`

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes following the code style below
3. Run checks: `npm run lint && npx tsc --noEmit && npm run test`
4. Build: `npm run build`
5. Commit with conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
6. Push and create a Pull Request

## Code Style

- **TypeScript**: Strict mode, no `any` types without justification
- **ESLint**: Must pass with zero errors (warnings are acceptable for review)
- **Prettier**: Run `npx prettier --write .` before committing
- **Naming**: camelCase for variables/functions, PascalCase for components/types, UPPER_SNAKE for constants
- **Imports**: Use `@/` path alias for internal modules
- **React**: Function components with hooks, no class components
- **API**: Use Zod for input validation, consistent error responses

## Testing

- **Unit Tests**: `npm run test` (vitest)
- **E2E Tests**: `npm run test:e2e` (playwright)
- New features must include tests
- Aim for meaningful coverage of critical paths (auth, payments, AI summarization)

## Pull Request Guidelines

- Keep PRs focused — one feature/fix per PR
- Include a description of changes and testing instructions
- Link related issues
- Ensure CI passes before requesting review
- Update documentation if needed

## Security

- Never commit secrets, API keys, or `.env` files
- Report security vulnerabilities privately (do not open public issues)
- Follow OWASP best practices for web security
- Use parameterized queries (Prisma handles this)
- Validate all user input with Zod schemas

## Internationalization

- All user-facing strings must use `next-intl` translations
- Add keys to all 7 language files: `messages/{en,zh,ja,ko,es,fr,de}.json`
- Run the i18n check: `node scripts/check-i18n.cjs` (if available)

## Questions?

Open an issue with the `question` label.
