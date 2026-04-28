# Agent instructions — design system

This project follows the design system extracted from https://preply.com.
Any coding agent working here must use the tokens below and avoid inventing new ones.
Source: https://preply.com
Extracted by designlang v7.0.0 on 2026-04-21T18:34:16.403Z

## Semantic tokens (use these)
- color.action.primary: #ff7aac
- color.surface.default: #141414
- color.text.body: #384047
- radius.control: 2px
- typography.body.fontFamily: Figtree

## Regions
- nav
- footer
- testimonials
- pricing
- content
- content
- content
- content
- content
- content
- content
- content
- content
- content
- content
- sidebar

## How to use
- Prefer `semantic.*` tokens over `primitive.*`.
- Never invent new tokens or hex values; reuse the ones above.
- When a value is missing, pick the closest existing semantic token and flag the gap.
- Reference tokens by their dotted path (e.g. `semantic.color.action.primary`).
