import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Validation rules
const registerValidation = [
 body('username')
 .isLength({ min: 3, max: 20 })
 .matches(/^[a-zA-Z0-9_-]+$/)
 .withMessage('Le nom d\'utilisateur doit contenir 3-20 caractères (lettres, chiffres, _, -)'),
 body('email').isEmail().withMessage('Email invalide'),
 body('password')
 .isLength({ min: 6 })
 .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
];

const loginValidation = [
 body('username').notEmpty().withMessage('Nom d\'utilisateur requis'),
 body('password').notEmpty().withMessage('Mot de passe requis'),
];

// POST /api/auth/register
router.post('/register', registerValidation, async (req: Request, res: Response): Promise<void> => {
 try {
 const errors = validationResult(req);
 if (!errors.isEmpty()) {
 res.status(400).json({ errors: errors.array() });
 return;
 }

 const result = await AuthService.register(req.body);
 res.status(201).json(result);
 } catch (error) {
 res.status(400).json({ error: (error as Error).message });
 }
});

// POST /api/auth/login
router.post('/login', loginValidation, async (req: Request, res: Response): Promise<void> => {
 try {
 const errors = validationResult(req);
 if (!errors.isEmpty()) {
 res.status(400).json({ errors: errors.array() });
 return;
 }

 const result = await AuthService.login(req.body);
 res.status(200).json(result);
 } catch (error) {
 res.status(401).json({ error: (error as Error).message });
 }
});

// GET /api/auth/me (protected)
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
 try {
 if (!req.user) {
 res.status(401).json({ error: 'Non authentifié' });
 return;
 }

 const user = await AuthService.getUserById(req.user.userId);
 res.json(user);
 } catch (error) {
 res.status(404).json({ error: (error as Error).message });
 }
});

export default router;
