# AvaliaRH Development Guide

## Build & Run Commands
- `npm run dev` - Run development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm test` - Run all tests
- `npm test -- -t "test name"` - Run specific test
- `npm run test:watch` - Run tests in watch mode
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma database UI

## Code Style Guidelines
- **TypeScript**: Use type interfaces/types for props and state. File structure follows Next.js conventions.
- **Naming**: Use PascalCase for components/interfaces, camelCase for variables/functions, snake_case for database fields.
- **React Components**: Function components with named exports. Extract reusable UI to components/ui/.
- **Imports**: Group imports: React/Next, external libraries, internal components/utils.
- **Error Handling**: Use try/catch blocks with descriptive error messages. Return error objects with `success: false`.
- **Testing**: Write tests in `__tests__` directory matching component structure. Mock external dependencies.
- **Formatting**: Use template literals for complex string concatenation. Tailwind classes in template strings.
- **API Routes**: Follow RESTful patterns with proper status codes and structured response objects.