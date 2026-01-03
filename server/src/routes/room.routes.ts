import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { RoomService } from '../services/room.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

const createRoomValidation = [
 body('name')
 .isLength({ min: 1, max: 50 })
 .withMessage('Le nom doit contenir 1-50 caractères'),
];

// GET /api/rooms - Liste des salles publiques
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
 try {
 const limit = req.query.limit as string || 20;
 const offset = req.query.offset as string || 0;

 const rooms = await RoomService.getPublicRooms(limit, offset);
 res.json(rooms);
 } catch (error) {
 res.status(500).json({ error: (error as Error).message });
 }
});

// GET /api/rooms/my - Mes salles
router.get('/my', async (req: AuthRequest, res: Response): Promise<void> => {
 try {
 if (!req.user) {
 res.status(401).json({ error: 'Non authentifié' });
 return;
 }

 const rooms = await RoomService.getUserRooms(req.user.userId);
 res.json(rooms);
 } catch (error) {
 res.status(500).json({ error: (error as Error).message });
 }
});

// GET /api/rooms/:id - Détails d'une salle
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
 try {
 const room = await RoomService.getRoomById(req.params.id);
 res.json(room);
 } catch (error) {
 res.status(404).json({ error: (error as Error).message });
 }
});

// POST /api/rooms - Créer une salle
router.post('/', createRoomValidation, async (req: AuthRequest, res: Response): Promise<void> => {
 try {
 const errors = validationResult(req);
 if (!errors.isEmpty()) {
 res.status(400).json({ errors: errors.array() });
 return;
 }

 if (!req.user) {
 res.status(401).json({ error: 'Non authentifié' });
 return;
 }

 const room = await RoomService.createRoom(req.user.userId, req.body);
 res.status(201).json(room);
 } catch (error) {
 res.status(400).json({ error: (error as Error).message });
 }
});

// PUT /api/rooms/:id - Modifier une salle
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
 try {
 if (!req.user) {
 res.status(401).json({ error: 'Non authentifié' });
 return;
 }

 const room = await RoomService.updateRoom(req.params.id, req.user.userId, req.body);
 res.json(room);
 } catch (error) {
 res.status(400).json({ error: (error as Error).message });
 }
});

// DELETE /api/rooms/:id - Supprimer une salle
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
 try {
 if (!req.user) {
 res.status(401).json({ error: 'Non authentifié' });
 return;
 }

 const result = await RoomService.deleteRoom(req.params.id, req.user.userId);
 res.json(result);
 } catch (error) {
 res.status(400).json({ error: (error as Error).message });
 }
});

// PUT /api/rooms/:id/furniture - Sauvegarder les meubles
router.put('/:id/furniture', async (req: AuthRequest, res: Response): Promise<void> => {
 try {
 if (!req.user) {
 res.status(401).json({ error: 'Non authentifié' });
 return;
 }

 const room = await RoomService.saveFurniture(
 req.params.id,
 req.user.userId,
 req.body.furnitures
 );
 res.json(room);
 } catch (error) {
 res.status(400).json({ error: (error as Error).message });
 }
});

export default router;
