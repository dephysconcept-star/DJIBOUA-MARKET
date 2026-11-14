import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  isDecodedAdmin,
  optionalAuth,
  requireAdmin,
  requireAuth,
  type AuthRequest,
} from './src/middleware/auth.ts';
import {
  addNeighborhoodRecord,
  clearNotificationsRecord,
  createAdminLogRecord,
  createListingRecord,
  createNotificationRecord,
  createReportRecord,
  createTransactionRecord,
  deleteListingRecord,
  ensureUserRecord,
  getBootstrapData,
  getListingById,
  getUserByUid,
  incrementListingMetric,
  markNotificationReadRecord,
  seedInitialDatabase,
  toggleFavoriteRecord,
  updateListingRecord,
  updateReportStatusRecord,
  updateSettingsRecord,
  updateTransactionStatusRecord,
  updateUserProfileRecord,
  updateUserStatusRecord,
  upsertCityRecord,
  upsertRegisteredUser,
} from './src/db/repository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clampStr = (val: unknown, max: number): string => {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, max);
};

const safeId = (raw: string): string => {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_');
  return cleaned.slice(0, 128) || `id_${Date.now()}`;
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // =========================================================================
  // Bootstrap (Public catalog + Authenticated user/admin hydration)
  // =========================================================================
  app.get('/api/bootstrap', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const isAdmin = isDecodedAdmin(req.user);
      const data = await getBootstrapData(uid, isAdmin);
      res.json(data);
    } catch (error) {
      const err = error as Error;
      console.error('Failed to load bootstrap data:', err);
      res.status(500).json({ error: err.message || 'Database query failed' });
    }
  });

  // =========================================================================
  // Users & Auth Profile
  // =========================================================================
  app.get('/api/users/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const profile = await getUserByUid(uid);
      res.json({ profile });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to fetch profile' });
    }
  });

  app.post('/api/users/register', requireAuth, async (req: AuthRequest, res) => {
    try {
      const fbUser = req.user!;
      const body = req.body || {};
      const role = body.role === 'buyer' ? 'buyer' : 'seller';
      const cleanName = clampStr(body.name || fbUser.name || 'Membre DJIBOUA MARKET', 120);
      const cleanBusiness = clampStr(body.businessName, 140);
      const cleanCity = clampStr(body.city || 'Divo', 80);
      const cleanNeighborhood = clampStr(body.neighborhood || 'Plateau', 120);
      const cleanPhone = clampStr(body.phone, 40);
      const cleanWhatsapp = clampStr(body.whatsapp || body.phone, 40);
      const avatarUrl = clampStr(
        body.avatarUrl ||
          fbUser.picture ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        60000
      );

      const user = await upsertRegisteredUser({
        uid: fbUser.uid,
        name: cleanName,
        businessName: cleanBusiness || undefined,
        email: clampStr(fbUser.email || `${fbUser.uid}@djibouamarket.ci`, 160),
        phone: cleanPhone,
        whatsapp: cleanWhatsapp,
        role,
        city: cleanCity,
        neighborhood: cleanNeighborhood,
        avatarUrl,
      });

      await createNotificationRecord({
        id: safeId(`notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`),
        userId: fbUser.uid,
        title: 'Compte activé sur DJIBOUA MARKET',
        message: `Bienvenue ${cleanName} ! Votre espace personnel est prêt.`,
        type: 'system',
        read: false,
      });

      res.json({ user });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to register user' });
    }
  });

  app.patch('/api/users/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const targetId = req.params.id;
      const requester = req.user!;
      if (requester.uid !== targetId && !isDecodedAdmin(requester)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const body = req.body || {};
      const updated = await updateUserProfileRecord(targetId, {
        name: body.name !== undefined ? clampStr(body.name, 120) : undefined,
        businessName:
          body.businessName !== undefined ? clampStr(body.businessName, 140) : undefined,
        city: body.city !== undefined ? clampStr(body.city, 80) : undefined,
        neighborhood:
          body.neighborhood !== undefined ? clampStr(body.neighborhood, 120) : undefined,
        avatarUrl: body.avatarUrl !== undefined ? clampStr(body.avatarUrl, 60000) : undefined,
        bio: body.bio !== undefined ? clampStr(body.bio, 500) : undefined,
        phone: body.phone !== undefined ? clampStr(body.phone, 40) : undefined,
        whatsapp: body.whatsapp !== undefined ? clampStr(body.whatsapp, 40) : undefined,
        email: body.email !== undefined ? clampStr(body.email, 160) : undefined,
      });
      res.json({ user: updated });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to update profile' });
    }
  });

  app.patch('/api/admin/users/:id/status', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const targetId = req.params.id;
      const status = req.body?.status;
      if (!['active', 'suspended', 'blocked'].includes(status)) {
        return res.status(400).json({ error: 'Statut utilisateur invalide' });
      }
      await updateUserStatusRecord(targetId, status);
      await createAdminLogRecord({
        action: 'Statut utilisateur modifié',
        targetType: 'user',
        targetId,
        adminId: req.user?.uid,
        details: `Nouveau statut: ${status}`,
      });
      res.json({ ok: true });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to update user status' });
    }
  });

  // =========================================================================
  // Listings CRUD & Moderation
  // =========================================================================
  app.post('/api/listings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const fbUser = req.user!;
      const body = req.body || {};
      await ensureUserRecord(
        fbUser.uid,
        fbUser.email || `${fbUser.uid}@djibouamarket.ci`,
        clampStr(body.sellerName || fbUser.name || 'Vendeur', 120)
      );

      const bootstrap = await getBootstrapData(undefined, false);
      const autoApprove = bootstrap.settings.autoApproveListings;
      const initialStatus = autoApprove ? 'approved' : 'pending';
      const listingId = safeId(`lst_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
      const photos = Array.isArray(body.photos)
        ? body.photos.slice(0, 5).map((p: unknown) => String(p).slice(0, 150000))
        : [];

      const created = await createListingRecord({
        id: listingId,
        title: clampStr(body.title, 180),
        price: Math.max(0, Number(body.price || 0)),
        description: clampStr(body.description, 4000),
        categoryId: safeId(String(body.categoryId || '1')),
        condition: body.condition === 'occasion' ? 'occasion' : 'neuf',
        status: initialStatus,
        photos,
        sellerId: fbUser.uid,
        sellerName: clampStr(body.sellerName || fbUser.name || 'Vendeur', 120),
        sellerBusinessName: body.sellerBusinessName
          ? clampStr(body.sellerBusinessName, 140)
          : null,
        sellerPhone: clampStr(body.sellerPhone, 40),
        sellerWhatsApp: clampStr(body.sellerWhatsApp || body.sellerPhone, 40),
        sellerAvatar: body.sellerAvatar ? clampStr(body.sellerAvatar, 60000) : null,
        sellerRating: typeof body.sellerRating === 'number' ? body.sellerRating : 5.0,
        sellerVerified: typeof body.sellerVerified === 'boolean' ? body.sellerVerified : true,
        city: clampStr(body.city, 80),
        neighborhood: clampStr(body.neighborhood, 120),
        addressDetails: body.addressDetails ? clampStr(body.addressDetails, 300) : null,
        viewsCount: 0,
        callClicksCount: 0,
        whatsappClicksCount: 0,
      });

      await createNotificationRecord({
        id: safeId(`notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`),
        userId: fbUser.uid,
        title: autoApprove ? 'Annonce publiée avec succès !' : 'Annonce soumise pour vérification',
        message: autoApprove
          ? `Votre annonce "${created.title}" est maintenant en ligne.`
          : `Votre annonce "${created.title}" est en cours d'examen par l'administrateur.`,
        type: autoApprove ? 'approval' : 'system',
        read: false,
      });

      res.status(201).json({ listing: created });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to create listing' });
    }
  });

  app.patch('/api/listings/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = req.params.id;
      const existing = await getListingById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Annonce introuvable' });
      }
      const isAdmin = isDecodedAdmin(req.user);
      if (existing.sellerId !== req.user!.uid && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const body = req.body || {};
      const updates: Record<string, unknown> = {};
      if (body.title !== undefined) updates.title = clampStr(body.title, 180);
      if (body.price !== undefined) updates.price = Math.max(0, Number(body.price));
      if (body.description !== undefined) updates.description = clampStr(body.description, 4000);
      if (body.categoryId !== undefined) updates.categoryId = safeId(String(body.categoryId));
      if (body.condition !== undefined) updates.condition = body.condition;
      if (Array.isArray(body.photos)) {
        updates.photos = body.photos.slice(0, 5).map((p: unknown) => String(p).slice(0, 150000));
      }
      if (body.city !== undefined) updates.city = clampStr(body.city, 80);
      if (body.neighborhood !== undefined) updates.neighborhood = clampStr(body.neighborhood, 120);
      if (body.addressDetails !== undefined)
        updates.addressDetails = clampStr(body.addressDetails, 300);
      if (body.sellerName !== undefined) updates.sellerName = clampStr(body.sellerName, 120);
      if (body.sellerBusinessName !== undefined)
        updates.sellerBusinessName = clampStr(body.sellerBusinessName, 140);
      if (body.sellerPhone !== undefined) updates.sellerPhone = clampStr(body.sellerPhone, 40);
      if (body.sellerWhatsApp !== undefined)
        updates.sellerWhatsApp = clampStr(body.sellerWhatsApp, 40);

      const updated = await updateListingRecord(id, updates);
      if (isAdmin) {
        await createAdminLogRecord({
          action: "Mise à jour d'annonce",
          targetType: 'listing',
          targetId: id,
          adminId: req.user?.uid,
          details: `Champs: ${Object.keys(updates).join(', ')}`,
        });
      }
      res.json({ listing: updated });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to update listing' });
    }
  });

  app.delete('/api/listings/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = req.params.id;
      const existing = await getListingById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Annonce introuvable' });
      }
      const isAdmin = isDecodedAdmin(req.user);
      if (existing.sellerId !== req.user!.uid && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await deleteListingRecord(id);
      if (isAdmin) {
        await createAdminLogRecord({
          action: "Suppression d'annonce",
          targetType: 'listing',
          targetId: id,
          adminId: req.user?.uid,
          details: `Titre supprimé: ${existing.title}`,
        });
      }
      res.json({ ok: true });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to delete listing' });
    }
  });

  app.post('/api/listings/:id/approve', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = req.params.id;
      const updated = await updateListingRecord(id, {
        status: 'approved',
        rejectionReason: null,
      });
      if (!updated) {
        return res.status(404).json({ error: 'Annonce introuvable' });
      }
      await createNotificationRecord({
        id: safeId(`notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`),
        userId: updated.sellerId,
        title: 'Annonce Approuvée !',
        message: `Félicitations, votre annonce "${updated.title}" a été validée et est visible à ${updated.city}.`,
        type: 'approval',
        read: false,
      });
      await createAdminLogRecord({
        action: "Approbation d'annonce",
        targetType: 'listing',
        targetId: id,
        adminId: req.user?.uid,
        details: `Annonce approuvée: ${updated.title}`,
      });
      res.json({ listing: updated });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to approve listing' });
    }
  });

  app.post('/api/listings/:id/reject', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = req.params.id;
      const reason = clampStr(req.body?.reason || 'Non conforme', 500);
      const updated = await updateListingRecord(id, {
        status: 'rejected',
        rejectionReason: reason,
      });
      if (!updated) {
        return res.status(404).json({ error: 'Annonce introuvable' });
      }
      await createNotificationRecord({
        id: safeId(`notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`),
        userId: updated.sellerId,
        title: 'Annonce Non Approuvée',
        message: `Votre annonce "${updated.title}" n'a pas été validée. Motif : ${reason}`,
        type: 'rejection',
        read: false,
      });
      await createAdminLogRecord({
        action: "Refus d'annonce",
        targetType: 'listing',
        targetId: id,
        adminId: req.user?.uid,
        details: `Motif: ${reason}`,
      });
      res.json({ listing: updated });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to reject listing' });
    }
  });

  app.post('/api/listings/:id/suspend', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = req.params.id;
      const reason = clampStr(req.body?.reason || 'Suspendue par administration', 500);
      const updated = await updateListingRecord(id, {
        status: 'suspended',
        rejectionReason: reason,
      });
      await createAdminLogRecord({
        action: "Suspension d'annonce",
        targetType: 'listing',
        targetId: id,
        adminId: req.user?.uid,
        details: `Motif: ${reason}`,
      });
      res.json({ listing: updated });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to suspend listing' });
    }
  });

  app.post('/api/listings/:id/metrics', async (req, res) => {
    try {
      const metric = req.body?.metric;
      if (!['view', 'call', 'whatsapp'].includes(metric)) {
        return res.status(400).json({ error: 'Métrique invalide' });
      }
      await incrementListingMetric(req.params.id, metric);
      res.json({ ok: true });
    } catch {
      res.status(200).json({ ok: false });
    }
  });

  // =========================================================================
  // Favorites
  // =========================================================================
  app.post('/api/favorites/toggle', requireAuth, async (req: AuthRequest, res) => {
    try {
      const fbUser = req.user!;
      const listingId = safeId(String(req.body?.listingId || ''));
      await ensureUserRecord(
        fbUser.uid,
        fbUser.email || `${fbUser.uid}@djibouamarket.ci`,
        clampStr(fbUser.name || 'Client', 120)
      );
      const added = await toggleFavoriteRecord(fbUser.uid, listingId);
      res.json({ added });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to toggle favorite' });
    }
  });

  // =========================================================================
  // Transactions & Reports
  // =========================================================================
  app.post('/api/transactions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const fbUser = req.user!;
      const body = req.body || {};
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const ref = `LOK-${new Date().getFullYear()}-${randomNum}`;
      const trxId = safeId(`trx_${Date.now()}_${randomNum}`);

      await ensureUserRecord(
        fbUser.uid,
        fbUser.email || `${fbUser.uid}@djibouamarket.ci`,
        clampStr(body.buyerName || fbUser.name || 'Client', 120)
      );

      const created = await createTransactionRecord({
        id: trxId,
        reference: ref,
        listingId: safeId(String(body.listingId || '')),
        listingTitle: clampStr(body.listingTitle, 180),
        listingPhoto: clampStr(body.listingPhoto, 150000),
        amount: Math.max(0, Number(body.amount || 0)),
        deliveryFee: Math.max(0, Number(body.deliveryFee || 0)),
        totalAmount: Math.max(0, Number(body.totalAmount || 0)),
        buyerId: fbUser.uid,
        buyerName: clampStr(body.buyerName, 120),
        buyerPhone: clampStr(body.buyerPhone, 40),
        buyerWhatsApp: clampStr(body.buyerWhatsApp || body.buyerPhone, 40) || null,
        buyerEmail: clampStr(body.buyerEmail || fbUser.email || '', 160) || null,
        buyerCity: clampStr(body.buyerCity, 80),
        buyerNeighborhood: clampStr(body.buyerNeighborhood, 120),
        sellerId: safeId(String(body.sellerId || '')),
        sellerName: clampStr(body.sellerName, 120),
        sellerPhone: clampStr(body.sellerPhone, 40),
        sellerCity: clampStr(body.sellerCity, 80),
        method: clampStr(body.method || 'wave', 40),
        status: 'paid',
        deliveryOption: body.deliveryOption === 'lokoda_express' ? 'lokoda_express' : 'direct',
        paidAt: new Date(),
      });

      await createNotificationRecord({
        id: safeId(`notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`),
        userId: fbUser.uid,
        title: 'Paiement Confirmé !',
        message: `Votre commande #${ref} pour "${created.listingTitle}" a été enregistrée avec succès.`,
        type: 'transaction',
        read: false,
      });

      res.status(201).json({ transaction: created });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to create transaction' });
    }
  });

  app.patch('/api/admin/transactions/:id/status', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = req.params.id;
      const status = req.body?.status;
      if (!['initiated', 'pending', 'paid', 'failed', 'refunded'].includes(status)) {
        return res.status(400).json({ error: 'Statut de transaction invalide' });
      }
      await updateTransactionStatusRecord(id, status);
      await createAdminLogRecord({
        action: 'Statut de transaction modifié',
        targetType: 'payment',
        targetId: id,
        adminId: req.user?.uid,
        details: `Nouveau statut: ${status}`,
      });
      res.json({ ok: true });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to update transaction status' });
    }
  });

  app.post('/api/reports', requireAuth, async (req: AuthRequest, res) => {
    try {
      const fbUser = req.user!;
      const body = req.body || {};
      const reportId = safeId(`rep_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
      const created = await createReportRecord({
        id: reportId,
        listingId: safeId(String(body.listingId || '')),
        listingTitle: clampStr(body.listingTitle, 180),
        sellerName: clampStr(body.sellerName, 120),
        reporterId: fbUser.uid,
        reason: clampStr(body.reason || 'arnaque', 60),
        comment: clampStr(body.comment, 1500),
        reporterContact: body.reporterContact ? clampStr(body.reporterContact, 120) : null,
        status: 'pending',
      });
      res.status(201).json({ report: created });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to create report' });
    }
  });

  app.patch('/api/admin/reports/:id/status', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = req.params.id;
      const status = req.body?.status;
      if (!['pending', 'reviewed', 'action_taken', 'dismissed'].includes(status)) {
        return res.status(400).json({ error: 'Statut de signalement invalide' });
      }
      await updateReportStatusRecord(id, status);
      await createAdminLogRecord({
        action: 'Signalement traité',
        targetType: 'listing',
        targetId: id,
        adminId: req.user?.uid,
        details: `Statut: ${status}`,
      });
      res.json({ ok: true });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to update report status' });
    }
  });

  // =========================================================================
  // Notifications
  // =========================================================================
  app.post('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
    try {
      const fbUser = req.user!;
      const body = req.body || {};
      const targetUserId = body.userId || fbUser.uid;
      if (targetUserId !== fbUser.uid && !isDecodedAdmin(fbUser)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const created = await createNotificationRecord({
        id: safeId(`notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`),
        userId: safeId(String(targetUserId)),
        title: clampStr(body.title, 150),
        message: clampStr(body.message, 600),
        type: clampStr(body.type || 'system', 40),
        read: false,
      });
      res.status(201).json({ notification: created });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to create notification' });
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
    try {
      await markNotificationReadRecord(
        req.params.id,
        req.user!.uid,
        isDecodedAdmin(req.user)
      );
      res.json({ ok: true });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to mark notification read' });
    }
  });

  app.delete('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
    try {
      await clearNotificationsRecord(req.user!.uid);
      res.json({ ok: true });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to clear notifications' });
    }
  });

  // =========================================================================
  // Settings, Cities & Seed (Admin)
  // =========================================================================
  app.put('/api/admin/settings', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const body = req.body || {};
      const updated = await updateSettingsRecord({
        siteName: body.siteName !== undefined ? clampStr(body.siteName, 100) : undefined,
        tagline: body.tagline !== undefined ? clampStr(body.tagline, 250) : undefined,
        symbol: body.symbol !== undefined ? clampStr(body.symbol, 50) : undefined,
        contactPhone:
          body.contactPhone !== undefined ? clampStr(body.contactPhone, 40) : undefined,
        contactWhatsApp:
          body.contactWhatsApp !== undefined ? clampStr(body.contactWhatsApp, 40) : undefined,
        contactEmail:
          body.contactEmail !== undefined ? clampStr(body.contactEmail, 120) : undefined,
        autoApproveListings:
          body.autoApproveListings !== undefined ? Boolean(body.autoApproveListings) : undefined,
        deliveryMode: body.deliveryMode,
        commissionRate:
          body.commissionRate !== undefined ? Number(body.commissionRate) : undefined,
        minListingPrice:
          body.minListingPrice !== undefined ? Number(body.minListingPrice) : undefined,
        maxPhotosPerListing:
          body.maxPhotosPerListing !== undefined ? Number(body.maxPhotosPerListing) : undefined,
      });
      await createAdminLogRecord({
        action: 'Paramètres modifiés',
        targetType: 'setting',
        targetId: 'general',
        adminId: req.user?.uid,
        details: `Mise à jour: ${Object.keys(body).join(', ')}`,
      });
      res.json({ settings: updated });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to update settings' });
    }
  });

  app.post('/api/admin/cities', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const body = req.body || {};
      const cid = safeId(String(body.id || ''));
      const saved = await upsertCityRecord({
        id: cid,
        name: clampStr(body.name, 80),
        region: clampStr(body.region, 100),
        neighborhoods: Array.isArray(body.neighborhoods)
          ? body.neighborhoods.slice(0, 100).map((n: unknown) => clampStr(n, 120))
          : [],
        active: Boolean(body.active ?? true),
      });
      await createAdminLogRecord({
        action: 'Nouvelle ville ajoutée',
        targetType: 'city',
        targetId: cid,
        adminId: req.user?.uid,
        details: `Nom: ${saved.name} (${saved.region})`,
      });
      res.status(201).json({ city: saved });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to add city' });
    }
  });

  app.post(
    '/api/admin/cities/:cityId/neighborhoods',
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const cleanNeighborhood = clampStr(req.body?.neighborhood, 120);
        if (!cleanNeighborhood) {
          return res.status(400).json({ error: 'Quartier requis' });
        }
        const updated = await addNeighborhoodRecord(req.params.cityId, cleanNeighborhood);
        if (!updated) {
          return res.status(404).json({ error: 'Ville introuvable' });
        }
        await createAdminLogRecord({
          action: 'Quartier/Village ajouté',
          targetType: 'city',
          targetId: updated.id,
          adminId: req.user?.uid,
          details: `Quartier: ${cleanNeighborhood}`,
        });
        res.json({ city: updated });
      } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message || 'Failed to add neighborhood' });
      }
    }
  );

  app.post('/api/admin/seed', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const force = Boolean(req.body?.force);
      await seedInitialDatabase(force, req.user?.uid);
      res.json({ ok: true });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: err.message || 'Failed to seed database' });
    }
  });

  const httpServer = http.createServer(app);

  // =========================================================================
  // Vite Dev Middleware or Static Production Build
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
