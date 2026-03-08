# Mobile Design Brief

## Purpose

This document is a high-level design brief for the current mobile app. It is meant to support design exploration, concept generation, and AI-assisted ideation.

It should be treated as a product and UX guide, not as a pixel-accurate spec. The goal is to preserve the app's intent, flows, and constraints while leaving room to explore stronger layouts, better hierarchy, and more polished visual systems.

## Product Summary

Audit Tools Playspace Mobile is a field app for auditors completing playspace assessments on mobile devices.

The app is centered on a focused field workflow:

- sign in
- review assigned work
- open a place
- complete an audit
- review scoring

The product is intentionally narrow. It is not a general admin tool, not a manager dashboard, and not a public-facing app.

## Primary User

The main user is an auditor working in the field.

That means the experience should feel:

- focused rather than broad
- calm rather than noisy
- practical rather than highly decorative
- quick to scan while moving between tasks
- trustworthy enough for professional data capture

## Core Product Truths

These are important constraints that design explorations should keep intact:

- Mobile is for auditors, not managers.
- Users mainly work with places assigned to them.
- The app should communicate an offline-friendly or offline-first mindset.
- Audit completion happens on mobile.
- Some combined scoring depends on manager input that happens outside the mobile app.
- Self-signup is not a core flow for mobile users.

## App Structure

The current app has these implemented page types:

- login
- access setup guidance
- home dashboard
- assigned places list
- audit execution
- scoring and reports
- not-found fallback

## High-Level Flow

```text
Launch
  -> Auth check
  -> Login if signed out
  -> Home if signed in

Home
  -> Assigned places
  -> Execute audit
  -> Scoring

Assigned places
  -> Select a place
  -> Open audit execution

Execute audit
  -> Review progress
  -> Save draft
  -> Submit when ready

Scoring
  -> Review audit outcomes
  -> Review combined scoring when available
```

## Screen Intent

### Login

The login experience should feel simple, secure, and low-friction.

Design direction:

- minimal distractions
- strong clarity around the app's purpose
- clear form hierarchy
- confidence-building language
- obvious error handling

### Access Setup Guidance

This is not a full signup flow. It is more of an explanatory or redirect screen for users who need help getting access.

Design direction:

- informative and reassuring
- brief and easy to understand
- clearly separate from the main sign-in action

### Home Dashboard

The home screen acts as a daily starting point. It should help the auditor understand what matters now and where to go next.

Design direction:

- strong top-level summary
- quick sense of workload and readiness
- prominent next actions
- compact but readable overview of active work

This screen should feel like a field brief, not a dense analytics dashboard.

### Assigned Places

This screen is the auditor's working queue. It should help users scan assigned places, understand current status, and jump into the next task quickly.

Design direction:

- list-first or card-list hybrid layout
- strong emphasis on status and progress
- easy comparison between places
- clear action to open or continue an audit

### Audit Execution

This is the core task screen and should carry the most design attention.

It should communicate:

- where the auditor is
- how much is done
- what is required
- whether the work is safe as a draft
- whether it is ready to submit

Design direction:

- progress is always visible
- sections feel structured and manageable
- required versus optional content is clearly differentiated
- save and submit actions remain easy to reach
- the experience should feel dependable in low-connectivity situations

This screen should feel like a guided workflow, not a generic form dump.

### Scoring And Reports

This screen is a review and summary surface. It helps the auditor understand outcomes after or during field work.

Design direction:

- top-level summary first
- deeper comparisons second
- strong clarity between audit-only results and combined results
- export affordances can feel present, but should not dominate the experience

This screen should feel informative and structured, but lighter than the execution screen.

## Shared UX Patterns To Preserve

Across concepts and redesigns, these patterns are worth keeping:

- visible progress indicators
- clear status badges or chips
- place-based task context
- strong primary action hierarchy
- concise support text
- obvious distinction between informational states and action states
- mobile-friendly spacing and touch targets

## Tone And Visual Direction

A good visual direction for this product would likely sit somewhere between:

- professional field tool
- modern operations app
- calm civic or public-space assessment product

Useful characteristics:

- clean and legible typography
- strong contrast for outdoor or on-the-go use
- restrained color usage with clear semantic meaning
- emphasis on trust, progress, and clarity
- enough warmth to avoid feeling sterile

## What Design Exploration Can Change

An AI design agent can safely explore:

- stronger hierarchy on the home screen
- different list and card treatments for assigned places
- more guided execution patterns
- improved section navigation ideas
- better summary visualization for scoring
- different visual identities, as long as the app remains practical
- different ways of surfacing offline confidence and submission readiness

## What Design Exploration Should Avoid

Design concepts should avoid turning the app into:

- a manager workflow tool
- a highly dense analytics product
- a consumer-style social product
- an always-online experience
- a large multi-role admin system

## Suggested Prompt Framing For AI Design Tools

If another AI agent is generating UI ideas, a prompt should focus on:

- a mobile field-audit app for professional auditors
- offline-friendly task execution
- a simple flow from daily overview to assigned work to audit completion
- strong progress visibility
- clear status communication
- calm, modern, trustworthy visual design

It is better to ask for concept directions and layout ideas than to ask for a literal recreation of the current screens.

## Final Note

This brief intentionally stays at the product and flow level. It should help guide better designs without over-constraining the solution to the current implementation.
