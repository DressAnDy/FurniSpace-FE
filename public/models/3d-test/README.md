# FurniSpace 3D Test Models

Put sample `.glb` or `.gltf` files in this folder to test the Babylon.js sandbox.

For `.glb`, one file is usually enough:

```text
public/models/3d-test/chair.glb
```

Use this path in the 3D Lab input:

```text
/models/3d-test/chair.glb
```

For `.gltf`, keep every referenced file beside it or update the `uri` fields inside the
`.gltf` file to match your folder structure.

Example:

```text
public/models/3d-test/metal_stool_02_4k.gltf
public/models/3d-test/metal_stool_02.bin
public/models/3d-test/metal_stool_02/metal_stool_02_nor_gl_4k.jpg
public/models/3d-test/metal_stool_02/metal_stool_02_diff_4k.jpg
public/models/3d-test/metal_stool_02/metal_stool_02_arm_4k.jpg
```

The matching `.gltf` image URIs should be:

```json
"uri": "metal_stool_02/metal_stool_02_nor_gl_4k.jpg"
"uri": "metal_stool_02/metal_stool_02_diff_4k.jpg"
"uri": "metal_stool_02/metal_stool_02_arm_4k.jpg"
```

Vite serves files in `public` from the site root during local development and production builds.

## Product library manifest

The 3D Lab reads models from:

```text
public/models/3d-test/models.json
```

This file is generated automatically before `npm run dev` and `npm run build`.
You can also regenerate it manually:

```bash
npm run models:manifest
```

Recommended structure for every new test product:

```text
public/models/3d-test/chair01/
  metal_stool_02_4k.gltf
  metal_stool_02.bin
  metal_stool_02/
    metal_stool_02_nor_gl_4k.jpg
    metal_stool_02_diff_4k.jpg
    metal_stool_02_arm_4k.jpg

public/models/3d-test/table01/
  side_table_01_4k.gltf
  side_table_01.bin
  textures/
    side_table_01_nor_gl_4k.jpg
    side_table_01_diff_4k.jpg
    side_table_01_arm_4k.jpg
```

The generator scans all nested `.glb` and `.gltf` files under `3d-test`.
For `.gltf`, it also checks whether referenced `.bin` and texture files exist.

Optional thumbnails:

```text
public/models/3d-test/chair01/thumbnail.png
public/models/3d-test/table01/preview.jpg
public/models/3d-test/sofa01/cover.webp
```

The manifest generator looks for image names containing `thumbnail`, `thumb`,
`preview`, `cover`, or `product` in the same folder as the model. If no thumbnail
exists, the 3D Lab uses:

```text
/models/3d-test/thumbnails/placeholder-product.svg
```

Room material swatches live outside product models:

```text
public/materials/flooring/
public/materials/wall-paint/swatches.json
```

The current 3D Lab uses swatch colors first. Texture files such as `oak.jpg`,
`walnut.jpg`, or `gray-tile.jpg` can be added later under `public/materials/flooring`.
