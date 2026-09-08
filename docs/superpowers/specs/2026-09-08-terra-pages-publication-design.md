# Terra GitHub Pages Publication

## Goal

Publish the completed GPT-5.6 Terra Three.js interpretation alongside Luna, Sol, and Astra in the existing `sendhil/shared` GitHub Pages showcase, with transparent cost estimates based on the tracked run usage.

## Existing publishing model

`sendhil/shared` is the authoritative public repository. Its GitHub Actions workflow installs, tests, and builds each experiment, then `scripts/assemble-pages.mjs` copies the resulting Vite builds into `_site/hobbit-threejs/<model>/` before GitHub Pages deploys the artifact from `master`.

Terra will use the same model-specific nested path:

```text
https://sendhil.github.io/shared/hobbit-threejs/terra/
```

## Scope

1. Add the current Terra project under `hobbit-threejs/terra/`, excluding generated development directories such as `node_modules`, `dist`, and refinement scratch evidence.
2. Ensure its production Vite base and narration asset resolve relative to the nested Pages URL rather than the domain root.
3. Add `run-metadata.json` recording model identity, 84,924 tracked tokens, the one-million-token goal budget, 640 seconds elapsed, exact shared prompt relationship, pricing source, and known estimate limitations.
4. Update the showcase catalog, shared README, Hobbit comparison README, Pages assembler, assembler tests, and deployment workflow.
5. Add the official Terra current-price scenarios: $0.34 (80/20 input/output), $0.59 (50/50), and $1.02 (all output), calculated from $2/M input and $12/M output. The catalog must state that cache use and tool charges are unavailable.
6. Test the nested build locally, assemble the Pages artifact, inspect its relative asset references, then commit and push the change to `master` to trigger the existing Pages workflow.

## Non-goals

- Change Luna, Sol, or Astra source behavior or retroactively revise their displayed estimates.
- Invent cache, reasoning, or tool-charge usage that the tracked aggregate does not provide.
- Change the existing Pages hosting provider or URL structure.

## Validation

- A test must fail first for Terra’s assembled output, catalog identity, and cost scenarios.
- Terra tests and production build must pass with a relative Vite base.
- The Pages assembler must include Terra’s `index.html` and `audio/narration.m4a`.
- The assembled Terra output must not contain domain-root asset references for the built script, stylesheet, or narration.
- `git status` must show only the intended publication files before commit; deployment will be confirmed from the existing workflow after push.

## Error handling

The existing app preserves its local narration failure fallback. GitHub Pages build failures block deployment via the existing workflow; no separate publication mechanism is introduced.
