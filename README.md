# Ravikishan

**Curated Class 11 & 12 exam prep — made with curiosity by Ravikishan.**

> **Architecture note — read this first:** Ravikishan is built on a
> **multi-section architecture**. Each study track (Class 11, Class 12 and
> future exam tracks) is an independent *section* with its own database,
> import pipeline, classifier and local AI — while accounts, progress,
> XP/streaks/badges, notifications and admin stay global. Class 11 runs
> inside the global backend; **Class 12 is a fully independent service**
> (`backend-class12-test/`) with its own Neon project and its own Render
> service, never reusing Class 11's. **Every future section gets its own
> separate Neon project and Render service too.** The full design, the
> section registry, the global-vs-section table and the canonical "how to
> add a new section" checklist live in
> **[ARCHITECTURE.md](ARCHITECTURE.md)** — read it before touching any
> DB-related code.

Full developer documentation (stack, layout, local dev, deployment, import
pipeline, security) is in **[docs/README.md](docs/README.md)**. API docs are
in **[docs/API.md](docs/API.md)**.
