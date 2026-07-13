import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const modelRoot = path.join(repoRoot, 'public', 'models', '3d-test');
const manifestPath = path.join(modelRoot, 'models.json');
const heroModelRoot = path.join(repoRoot, 'public', 'assets', 'models', 'hero');
const heroManifestPath = path.join(heroModelRoot, 'models.json');
const heroMetadataPath = path.join(heroModelRoot, 'metadata.json');
const fallbackThumbnailUrl = '/models/3d-test/thumbnails/placeholder-product.svg';
const thumbnailNames = [
  'thumbnail',
  'thumb',
  'preview',
  'cover',
  'product',
];

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function toTitleCase(value) {
  return value
    .replace(/\.(glb|gltf)$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectModelFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const modelFiles = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      modelFiles.push(...await collectModelFiles(entryPath));
      continue;
    }

    if (/\.(glb|gltf)$/i.test(entry.name)) {
      modelFiles.push(entryPath);
    }
  }

  return modelFiles;
}

async function getGltfReferences(modelFilePath) {
  if (!/\.gltf$/i.test(modelFilePath)) {
    return [];
  }

  const gltf = JSON.parse(await readFile(modelFilePath, 'utf8'));
  const references = [
    ...(gltf.images ?? []).map((image) => image.uri).filter(Boolean),
    ...(gltf.buffers ?? []).map((buffer) => buffer.uri).filter(Boolean),
  ];

  return references.filter((uri) => !uri.startsWith('data:') && !/^https?:\/\//i.test(uri));
}

async function findThumbnail(modelFilePath) {
  const folder = path.dirname(modelFilePath);
  const entries = await readdir(folder, { withFileTypes: true });
  const imageEntry = entries.find((entry) => {
    if (!entry.isFile() || !/\.(png|jpe?g|webp|svg)$/i.test(entry.name)) {
      return false;
    }

    return thumbnailNames.some((name) => entry.name.toLowerCase().includes(name));
  });

  if (!imageEntry) {
    return fallbackThumbnailUrl;
  }

  return `/models/3d-test/${toPosixPath(path.relative(modelRoot, path.join(folder, imageEntry.name)))}`;
}

async function createManifest() {
  const modelFiles = await collectModelFiles(modelRoot);
  const models = [];

  for (const modelFilePath of modelFiles.sort()) {
    const relativePath = toPosixPath(path.relative(modelRoot, modelFilePath));
    const pathParts = relativePath.split('/');
    const folderName = pathParts.length > 1 ? pathParts[0] : 'root';
    const references = await getGltfReferences(modelFilePath);
    const missingReferences = [];

    for (const reference of references) {
      const referencePath = path.resolve(path.dirname(modelFilePath), reference);

      if (!await fileExists(referencePath)) {
        missingReferences.push(reference);
      }
    }

    models.push({
      id: relativePath.replace(/\W+/g, '-').replace(/^-|-$/g, ''),
      category: toTitleCase(folderName),
      name: toTitleCase(path.basename(modelFilePath)),
      modelUrl: `/models/3d-test/${relativePath}`,
      sourceFolder: `/models/3d-test/${toPosixPath(path.dirname(relativePath))}`,
      thumbnailUrl: await findThumbnail(modelFilePath),
      missingReferences,
    });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    root: '/models/3d-test',
    models,
  };

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Generated ${toPosixPath(path.relative(repoRoot, manifestPath))} with ${models.length} model(s).`);
}

function inferHeroCategory(modelName) {
  const normalized = modelName.replace(/\s+/g, '').toLowerCase();

  if (normalized.includes('sofa')) return 'Sofa';
  if (normalized.includes('accentchair') || normalized.includes('chair')) return 'Chair';
  if (normalized.includes('coffeetable')) return 'CoffeeTable';
  if (normalized.includes('diningtable')) return 'DiningTable';
  if (normalized.includes('sidetable') || normalized.includes('marble')) return 'Decoration';
  if (normalized.includes('floorlamp') || normalized.includes('lamp')) return 'Lamp';
  if (normalized.includes('plant')) return 'Plant';
  if (normalized.includes('pouf') || normalized.includes('stool')) return 'Pouf';
  if (normalized.includes('cabinet')) return 'Cabinet';
  return undefined;
}

async function createHeroManifest() {
  const modelFiles = await collectModelFiles(heroModelRoot);
  const metadata = await readHeroMetadata();
  const models = modelFiles.sort().map((modelFilePath) => {
    const relativePath = toPosixPath(path.relative(heroModelRoot, modelFilePath));
    const modelName = toTitleCase(path.basename(modelFilePath));
    const semanticMetadata = findHeroMetadata(metadata, relativePath, modelName);

    return {
      category: inferHeroCategory(modelName),
      ...semanticMetadata,
      name: modelName,
      path: `/assets/models/hero/${relativePath}`,
    };
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    root: '/assets/models/hero',
    models,
  };

  await writeFile(heroManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Generated ${toPosixPath(path.relative(repoRoot, heroManifestPath))} with ${models.length} model(s).`);
}

async function readHeroMetadata() {
  if (!await fileExists(heroMetadataPath)) {
    return {};
  }

  return JSON.parse(await readFile(heroMetadataPath, 'utf8'));
}

function findHeroMetadata(metadata, relativePath, modelName) {
  const extensionlessPath = relativePath.replace(/\.(glb|gltf)$/i, '');
  const extensionlessName = path.basename(extensionlessPath);
  return metadata[relativePath] ?? metadata[extensionlessPath] ?? metadata[extensionlessName] ?? metadata[modelName] ?? {};
}

Promise.all([createManifest(), createHeroManifest()]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
