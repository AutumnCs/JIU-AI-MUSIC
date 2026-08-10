const ITERATIONS = 120_000;
const KEY_LENGTH = 32;

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const hashBytes = await derive(password, saltBytes);
  return { hash: encodeBase64Url(hashBytes), salt: encodeBase64Url(saltBytes) };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  try {
    const expected = decodeBase64Url(hash);
    const actual = await derive(password, decodeBase64Url(salt));
    if (expected.length !== actual.length) return false;
    let difference = 0;
    for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ actual[index];
    return difference === 0;
  } catch {
    return false;
  }
}

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    KEY_LENGTH * 8,
  );
  return new Uint8Array(bits);
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
