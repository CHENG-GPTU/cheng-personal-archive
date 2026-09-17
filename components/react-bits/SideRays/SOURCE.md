# SideRays provenance and integration notes

## Official upstream

- Demo: https://reactbits.dev/backgrounds/side-rays
- Repository: https://github.com/DavidHDev/react-bits
- Variant: **TypeScript + CSS**, matching this Next.js App Router project.
- Registry: https://raw.githubusercontent.com/DavidHDev/react-bits/main/public/r/SideRays-TS-CSS.json
- Canonical component: `src/ts-default/Backgrounds/SideRays/SideRays.tsx`
- Component history commit recorded at retrieval: `418db81fac8f3f20c1d7b4a14f474917aa769c27`
- Retrieved: 2026-09-08. Integration verified: 2026-09-09.
- Runtime dependency: `ogl@1.0.11` (official registry requires `^1.0.11`).

The component and its CSS were extracted from the official registry. This is not
an iframe, embedded React Bits website, or a separately recreated ray effect.

## License

The upstream MIT license with Commons Clause is retained verbatim in `LICENSE.md`.
Keep that notice with the vendored source. The additional Commons Clause matters;
do not describe this as unrestricted MIT or sell the component as a standalone
component product. Refer to the license text for the exact conditions.

## Local adaptations (not shader changes)

- Added the Next.js client-component directive and this provenance pointer.
- Wrapped delayed initialization in a cancellable timer with an unmount guard.
- Added container ResizeObserver and zero-size checks; retained the DPR cap of 2.
- Added explicit geometry/program disposal and WebGL context-loss cleanup.
- Added a graceful fallback to the original page background if WebGL is unavailable.
- Added `data-webgl` status for inspection (`ready`, `released`, `unavailable`).
- The separate application wrapper handles hidden tabs and reduced-motion settings
  by unmounting the effect. Existing IntersectionObserver visibility behavior is retained.

Both official shader strings are unchanged. SHA-256 of the template literal content:

```text
vert 0808b927f21bbcf4224b279e39c8d9bfb39af7850f97b80c910d5466cc1b5b70
frag 3723fa091ece288e8f9c51d6330008fd5e1758c7c7db0a93f986ed7f7e8db153
```

`tests/side-rays.test.mjs` guards these fingerprints and the requested parameters.

## Application configuration

`app/side-rays-background.tsx` is the only configuration point:

```tsx
<SideRays origin="top-left" intensity={1.9} speed={2.9} opacity={0.75} blend={0.8} />
```

Other component properties retain their official defaults. The separate wrapper
CSS uses opacity `0.7`, screen blending and a diagonal mask to keep the effect
ambient; this does not change the component's requested `opacity={0.75}` uniform.
The original page backgrounds and foreground styles remain in place.

Entry and home are mutually exclusive states. Each mounts one background wrapper,
which dynamically loads this component with `ssr: false`. No effect is added to
the separate resume, learning, project or health routes.
