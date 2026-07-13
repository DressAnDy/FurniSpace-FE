# Home Hero 3D Models

Copy every furniture `.glb` file directly into this folder, then restart `npm run dev`
(or run `npm run models:manifest`). The generated `models.json` is read by the Home hero.

```text
public/assets/models/hero/
  Chair.glb
  Lamp.glb
  Sofa.glb
```

Do not edit application code or use model-specific mesh names. The hero measures each
loaded model, positions it automatically, and applies only a subtle idle float in Phase 1.

`models.json` is generated and should not be edited manually.

Optional semantic metadata can be added in `metadata.json`. The hero uses this
to build a believable showroom composition instead of guessing by size only.

```json
{
  "Sofa": {
    "category": "Sofa",
    "layout": {
      "rotationY": 3.14,
      "targetRadius": 3.2,
      "x": 0,
      "z": 0
    },
    "priority": 100,
    "preferredScale": 1.15,
    "sceneGroup": "LivingRoom"
  }
}
```

Supported categories:

```text
Sofa, Chair, CoffeeTable, DiningTable, Plant, Lamp, Pouf, Cabinet, Decoration
```

Manual layout fields:

```text
x: left/right position. Negative moves left, positive moves right.
z: depth. Negative moves closer to the camera, positive moves behind.
y: optional absolute vertical position. Usually omit it.
rotationY: yaw rotation in radians. Around 3.14 faces the camera.
targetRadius: visual size after normalization.
enabled: false hides this model from the hero composition.
```
