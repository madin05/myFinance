---
trigger: always_on
---

# AGENT CORE RULES & STANDARDS

## 1. CODE QUALITY & CLEAN ARCHITECTURAL
- SOLID & DRY: Always apply SOLID principles, DRY (Don't Repeat Yourself), and Clean Architecture.
- Strict Type Safety: Use explicit type hints/definitions (PHP 8+ strictly typed, TypeScript, C++, Python type hints). Avoid `any` or untyped parameters.
- Modular & Functional: Write small, pure, single-responsibility functions. Break monolithic files into clear domain layers (Controllers, Services, Repositories/Models).
- Self-Documenting Code: Variable and function names must explicitly describe intent (e.g., `calculateMonthlyRevenue()` over `calc()`).
- Robust Error Handling: Never silence errors (`catch (e) {}` is strictly forbidden). Always log errors securely and handle exceptions gracefully.

## 2. DESIGN SYSTEM & UI STANDARDS
- Token-Based Styling: NEVER hardcode raw hex colors, pixel margins, or inline style overrides. Always use Design System tokens (e.g., Tailwind CSS classes, CSS variables, or Theme constants).
- Component Atomic Structure: Maintain UI modularity (Atoms -> Molecules -> Organisms). Reuse existing components before creating new ones.
- Accessibility (a11y) First: Use proper semantic HTML elements (`<button>`, `<header>`, `<article>`), implement proper `aria-*` attributes, and ensure full keyboard navigation support.
- Responsive & Fluid: Always write mobile-first, responsive layouts that scale gracefully across device viewports.

## 3. SECURITY & DEFENSIVE PROGRAMMING
- Zero Hardcoded Secrets: NEVER embed API keys, secrets, DB passwords, or credentials in source code. Retrieve them exclusively from environment variables (`.env`).
- Injection Prevention: Always use parameterized queries / ORM for DB access (Strictly NO raw string concatenation in SQL). Sanitize and validate all user inputs to prevent XSS, CSRF, and Command Injection.
- Least Privilege & Auth: Always check authorization/permission roles before executing mutations, database operations, or serving sensitive resources.
- Data Privacy & Sanitization: Never expose raw stack traces, database schema details, or PII (Personally Identifiable Information) in client-facing error responses or public logs.

## 4. AGENT EXECUTION & BEHAVIOR
- Respect Context: Follow the existing framework, directory conventions, and coding style already established in the workspace.
- Complete Implementations: DO NOT leave placeholders like `// TODO: implement logic here` inside critical code paths. Always write functional, complete logic.
- Non-Destructive Edits: Preserve surrounding code integrity and backward compatibility unless explicit refactoring is requested.