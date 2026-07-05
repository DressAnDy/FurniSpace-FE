export function normalizeModelUrl(url: string) {
  const withoutQuotes = url.trim().replace(/^['"]|['"]$/g, '');
  const normalizedSlashes = withoutQuotes.replace(/\\/g, '/');
  const publicIndex = normalizedSlashes.toLowerCase().lastIndexOf('/public/');

  if (publicIndex >= 0) {
    return normalizedSlashes.substring(publicIndex + '/public'.length);
  }

  if (normalizedSlashes.toLowerCase().startsWith('public/')) {
    return `/${normalizedSlashes.substring('public/'.length)}`;
  }

  return normalizedSlashes;
}

export function splitModelUrl(url: string) {
  const normalizedUrl = normalizeModelUrl(url);
  const lastSlash = normalizedUrl.lastIndexOf('/') + 1;

  if (lastSlash <= 0) {
    return {
      fileName: normalizedUrl,
      rootUrl: '',
    };
  }

  return {
    fileName: normalizedUrl.substring(lastSlash),
    rootUrl: normalizedUrl.substring(0, lastSlash),
  };
}

export function isSupportedModelUrl(url: string) {
  const pathname = normalizeModelUrl(url).split(/[?#]/)[0];

  return /\.(glb|gltf)$/i.test(pathname);
}

export function isFirebaseStorageModelUrl(url: string) {
  return /firebasestorage\.googleapis\.com|\.firebasestorage\.app/i.test(url);
}

export function getModelLoadErrorMessage(cause: unknown, modelUrl?: string) {
  const rawMessage = cause instanceof Error ? cause.message : 'Unable to load 3D model.';
  const maybeCorsBlocked = modelUrl && isFirebaseStorageModelUrl(modelUrl) &&
    /failed|network|load|cors|xmlhttprequest|fetch/i.test(rawMessage);

  if (maybeCorsBlocked) {
    return 'Cannot load this Firebase Storage MODEL_3D because the bucket CORS policy does not allow this app origin. Add http://localhost:5173 to Firebase Storage CORS, then reload and try again.';
  }

  return rawMessage;
}
