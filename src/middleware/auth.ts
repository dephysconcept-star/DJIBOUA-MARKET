import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { verifySessionToken } from '../lib/session-token.ts';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'federationopareko@gmail.com';

export interface VerifiedAuthUser {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  isAdmin?: boolean;
}

export interface AuthRequest extends Request {
  user?: VerifiedAuthUser;
  adminAuthorized?: boolean;
}

export const isDecodedAdmin = (decoded?: VerifiedAuthUser, adminFlag?: boolean): boolean => {
  if (adminFlag) return true;
  return Boolean(
    decoded &&
      (decoded.isAdmin === true ||
        (decoded.email_verified &&
          decoded.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()))
  );
};

async function verifyBearerToken(token: string): Promise<VerifiedAuthUser> {
  if (token.startsWith('dm1.')) {
    const session = verifySessionToken(token);
    if (!session) {
      throw new Error('Session token invalid or expired');
    }
    return {
      uid: session.uid,
      email: session.email,
      email_verified: true,
      name: session.name,
      isAdmin: Boolean(session.isAdmin),
    };
  }

  const decoded = await adminAuth.verifyIdToken(token);
  return {
    uid: decoded.uid,
    email: decoded.email,
    email_verified: decoded.email_verified,
    name: decoded.name,
    picture: decoded.picture,
    isAdmin:
      Boolean(decoded.email_verified) &&
      decoded.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase(),
  };
}

function extractAdminToken(req: Request): string | null {
  const headerVal = req.headers['x-admin-token'];
  if (typeof headerVal === 'string' && headerVal.startsWith('dm1.')) {
    return headerVal;
  }
  return null;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise : veuillez vous connecter.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    req.user = await verifyBearerToken(token);
    const adminToken = extractAdminToken(req);
    if (adminToken) {
      const adminPayload = verifySessionToken(adminToken);
      if (adminPayload?.isAdmin) {
        req.adminAuthorized = true;
      }
    }
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(401).json({ error: 'Session expirée ou invalide. Veuillez vous reconnecter.' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      req.user = await verifyBearerToken(token);
    } catch {
      // Treat invalid optional token as unauthenticated
    }
  }

  const adminToken = extractAdminToken(req);
  if (adminToken) {
    const adminPayload = verifySessionToken(adminToken);
    if (adminPayload?.isAdmin) {
      req.adminAuthorized = true;
    }
  }
  next();
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const adminToken = extractAdminToken(req);
  if (adminToken) {
    const adminPayload = verifySessionToken(adminToken);
    if (adminPayload?.isAdmin) {
      req.adminAuthorized = true;
      req.user = {
        uid: adminPayload.uid,
        email: adminPayload.email || BOOTSTRAPPED_ADMIN_EMAIL,
        email_verified: true,
        name: adminPayload.name || 'Administrateur DJIBOUA',
        isAdmin: true,
      };
      return next();
    }
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification administrateur requise.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await verifyBearerToken(token);
    if (!isDecodedAdmin(decoded)) {
      return res.status(403).json({ error: 'Accès réservé à l’administrateur.' });
    }
    req.user = decoded;
    req.adminAuthorized = true;
    next();
  } catch (error) {
    console.error('Error verifying Admin token:', error);
    return res.status(401).json({ error: 'Session administrateur invalide ou expirée.' });
  }
};
