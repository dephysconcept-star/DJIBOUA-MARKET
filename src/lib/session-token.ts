import crypto from 'node:crypto';

export interface SessionTokenPayload {
  uid: string;
  email?: string;
  name?: string;
  isAdmin?: boolean;
  exp: number;
}

const TOKEN_PREFIX = 'dm1';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error('AUTH_SECRET must be configured to sign session tokens.');
  }
  return crypto.createHash('sha256').update(`djiboua_session:${secret}`).digest('hex');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derivedBuf = crypto.scryptSync(password, salt, 64);
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (derivedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(derivedBuf, expectedBuf);
  } catch {
    return false;
  }
}

export function createSessionToken(input: {
  uid: string;
  email?: string;
  name?: string;
  isAdmin?: boolean;
}): string {
  const payload: SessionTokenPayload = {
    uid: input.uid,
    email: input.email,
    name: input.name,
    isAdmin: Boolean(input.isAdmin),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(`${TOKEN_PREFIX}.${encodedPayload}`)
    .digest('base64url');
  return `${TOKEN_PREFIX}.${encodedPayload}.${sig}`;
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null;
  const [, encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  try {
    const expectedSig = crypto
      .createHmac('sha256', getSigningSecret())
      .update(`${TOKEN_PREFIX}.${encodedPayload}`)
      .digest('base64url');
    const providedBuf = Buffer.from(providedSig, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as SessionTokenPayload;
    if (!decoded || !decoded.uid || typeof decoded.exp !== 'number') {
      return null;
    }
    if (decoded.exp <= Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
