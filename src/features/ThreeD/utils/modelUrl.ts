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
