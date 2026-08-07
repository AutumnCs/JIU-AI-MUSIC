import { createHash, createHmac } from 'node:crypto';

const ALGORITHM = 'HMAC-SHA256';
const UNSIGNABLE_HEADERS = new Set(['authorization', 'content-type', 'content-length', 'user-agent', 'presigned-expires', 'expect']);

export type LoadedCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

export type SignRequestParams = {
  method?: string;
  uri?: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string | number | boolean | undefined>;
  body?: string | Buffer;
  region: string;
  serviceName: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  host: string;
  timestamp?: string;
};

export function signRequest(params: SignRequestParams) {
  const timestamp = params.timestamp ?? new Date().toISOString().replace(/[-:.]/g, '').replace(/\d{3}Z$/, 'Z');
  const date = timestamp.slice(0, 8);
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(params.headers ?? {})) {
    if (value !== undefined) headers[key.toLowerCase()] = String(value);
  }
  headers.host ??= params.host;
  headers['x-date'] = timestamp;
  if (params.sessionToken) headers['x-security-token'] = params.sessionToken;
  headers['x-content-sha256'] = sha256(params.body ?? '');

  const signedHeaders = Object.keys(headers).filter((key) => !UNSIGNABLE_HEADERS.has(key)).sort();
  const canonicalHeaders = signedHeaders.map((key) => `${key}:${headers[key].replace(/\s+/g, ' ').trim()}`).join('\n');
  const query = Object.entries(params.query ?? {})
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${escapeValue(key)}=${escapeValue(String(value))}`)
    .join('&');
  const canonicalRequest = [
    (params.method ?? 'GET').toUpperCase(),
    canonicalUri(params.uri ?? '/'),
    query,
    `${canonicalHeaders}\n`,
    signedHeaders.join(';'),
    headers['x-content-sha256'],
  ].join('\n');
  const scope = `${date}/${params.region}/${params.serviceName}/request`;
  const stringToSign = [ALGORITHM, timestamp, scope, sha256(canonicalRequest)].join('\n');
  const key = hmac(hmac(hmac(hmac(params.secretAccessKey, date), params.region), params.serviceName), 'request');
  const signature = hmac(key, stringToSign, true);
  const authorization = `${ALGORITHM} Credential=${params.accessKeyId}/${scope}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`;
  return { headers: { ...headers, authorization }, authorization, signature };
}

export function loadCredentials(env: Record<string, string | undefined> = process.env): LoadedCredentials {
  const accessKeyId = env.VOLC_ACCESS_KEY;
  const secretAccessKey = env.VOLC_SECRET_KEY;
  if (!accessKeyId || !secretAccessKey) throw new Error('VOLC_ACCESS_KEY / VOLC_SECRET_KEY are required');
  return { accessKeyId, secretAccessKey, sessionToken: env.VOLC_SESSION_TOKEN };
}

function sha256(value: string | Buffer) { return createHash('sha256').update(value).digest('hex'); }
function hmac(key: string | Buffer, value: string, hex = false) {
  const digest = createHmac('sha256', key).update(value).digest();
  return hex ? digest.toString('hex') : digest;
}
function escapeValue(value: string) { return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`); }
function canonicalUri(uri: string) { return uri.split('/').map(escapeValue).join('/'); }
