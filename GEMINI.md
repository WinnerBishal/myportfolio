# Project Instructions: Portfolio & Research Ledger (Modern Experiment)

**CRITICAL SCOPE RULE:** All active development, research, and modifications must be restricted to the `/modern` directory. The root-level Jekyll files are legacy and should be treated as archive-only unless explicitly instructed otherwise.

## Tech Stack & Architecture (Active)

- **Primary Site:** Built with **Astro** (located in `/modern`).
  - Content managed via Astro Content Collections in `modern/src/content/`.
  - Deployment-ready for modern web standards.
- **Languages & Tools:** 
  - **Web:** TypeScript, Astro, CSS (Vanilla).
  - **Research/Robotics:** Python (Simulations), YOLO, ONNX.

## Project Conventions

### Content Management
- **Posts:** New research articles and blog posts must be added to `modern/src/content/posts/`. Filenames follow the `YYYY-MM-DD-title.md` convention.
- **Projects:** Project details must be added to `modern/src/content/projects/`.
- **Assets:** Media for the modern site should be handled via Astro's asset pipeline or stored in `modern/public/assets/`.

### Development Workflow
- **Verification:** Always validate Astro builds (`npm run build`) in the `/modern` directory.
- **Scope:** Do NOT modify files in the root directory (e.g., `_posts/`, `_projects/`, `_data/`) as they belong to the legacy Jekyll architecture.
