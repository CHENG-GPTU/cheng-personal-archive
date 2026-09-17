# Official Lanyard / visual asset integration

Official page: https://reactbits.dev/components/lanyard

TypeScript + CSS source: https://github.com/DavidHDev/react-bits/blob/a9f6d6d1f057c1854b16db82a9b627f62b9462c5/src/ts-default/Components/Lanyard/Lanyard.tsx

Registry retrieved on 2026-09-09: https://raw.githubusercontent.com/DavidHDev/react-bits/main/public/r/Lanyard-TS-CSS.json

Model: https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/assets/lanyard/card.glb

The official license (MIT plus Commons Clause) is retained in LICENSE.md.
The original project had no Lanyard. This component is a new official-source
integration, not a claim that a pre-existing Lanyard was merely restyled.

## Unchanged

The original `card.glb` is byte-for-byte unchanged:
`fd540ead33cf3f86651a13c45790d0b3e9bde868cf69ac8c2307fb3dc2b3d591` (SHA-256).

Its meshes are `card`, `clip`, `clamp`. Card material is `base`; hardware uses
`metal`. The embedded atlas is 1678 × 1677. Front is in the left UV half and back
is in the right. Model width is 0.7164179 and height is 1.

Camera, FOV, DPR policy, lights, environment, rigid bodies, colliders, joints,
gravity, dragging, angular velocity and rope simulation remain official code.
Rope sample points are serialized to numeric xyz arrays before passing to Meshline;
this avoids its Vector3 instanceof check returning invalid geometry after a hot
reload or mixed module identity. Coordinates and simulation calculations are unchanged.
`tests/lanyard.test.mjs` fingerprints the original Canvas, physics, joints and
pointer-handler blocks. Camera remains `[0, 0, 30]`, FOV 20, gravity `[0, -40, 0]`.
The physics fingerprint normalizes only that coordinate serialization adapter.

## Visual-only adaptations

- Local public resource URLs replace bundler imports of `.glb` and `.png`.
- Official frontImage/backImage compositing remains the integration mechanism.
- Artwork uses contain fitting in measured physical face space; UV pixel density
  is compensated so the face and letters keep their original proportions.
- The atlas is filled with dark card stock, not original demo artwork. This
  avoids the original logos showing through contain margins.
- All four supplied files were inspected. Card faces are cropped to the printed
  panel; the mockup background, suspended strap and outer product scene are not
  printed onto the card a second time. No content is generated or redrawn.
- The user's long strip contains four logos. Repeat changes from -4 to -1; only
  the texture is horizontally flipped to compensate for negative MeshLine U.
- A small metal-surface crop from the connector reference is bound to the original
  hardware material. The official model has no separate side leather tag: it is
  not invented or added as geometry.
- Texture color space is sRGB, with mipmaps, linear filtering and anisotropy.
  Sources are opaque RGB. Their intentional dark card design is not alpha-keyed
  away, avoiding accidental holes in hair, clothing and black lettering regions.
- Dispose the locally created atlas and cloned hardware material on teardown.
- Meshline 3.3 requires numeric useMap and explicit constructor resolution:
  `useMap={1}` and `args={lineArgs}` are compatibility-only changes.

The model's embedded demo atlas remains inside the unmodified GLB but is not
drawn into the runtime custom atlas. No external demo-texture request is used.

## Resource mapping

| Supplied file | Role | Derived image |
| --- | --- | --- |
| exec-37129099-d234-4bfb-9b4f-f9c0c7cb834a.png | portrait/WELCOME front | card-front.png, 677 × 1080 |
| exec-ac5438b2-77b9-46bb-acfa-bf8ab4da5c0a.png | CHENG brand back | card-back.png, 677 × 1080 |
| exec-4d969911-912f-4eac-9a65-b9b7b831e281.png | woven strap | strap.png, 1974 × 247 |
| exec-46b1265f-c6ff-401e-a852-c053ba131974.png | connector metal surface | connector.png, 120 × 60 |

Cropping is reproducible with `scripts/prepare-lanyard-assets.mjs` after placing
the four source files in `work/lanyard/source/`. No upscaling is applied to the
saved texture files. The full mockups are not published.

## About badge revision — 2026-09-10

About now uses its own `cheng-v2/` texture set, extracted by
`scripts/prepare-cheng-badge-v2.mjs` from the four newly supplied Desktop files.
The card crops include the silver outer border. The supplied buckle contributes
both a metal texture and an upright leather/CHENG patch. A small double-sided
leather tab is attached visually to the same rigid body; the original GLB,
colliders, joints, gravity, and drag/rope solver remain unchanged.
The About camera is closer and looks at (0, -0.52, 0) to center the hanging card;
the strap is wider. This changes framing, not the joint or drag solver.
The ordinary Home badge continues to use its previous defaults and assets.
The Canvas fingerprint normalizes the visual-option prop and the About-only
camera target, while continuing to verify the original physics and pointer code.

The connector is a single centered assembly, not a side charm. Its leather loop
overlaps the rope anchor at model y≈1.178, the ring and widened metal clip join
below it, and two rivets sit on the clip. Every part uses the same card rigid body.
The About rope respects depth and does not write depth, letting the leather loop
correctly cover the end of the strap. The regular Home rope keeps its original
depth policy. Existing joint lengths and solver behavior are unchanged.
