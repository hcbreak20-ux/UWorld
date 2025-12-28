import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from './utils/config';
import { initializeSocket } from './socket';
import authRoutes from './routes/auth.routes';
import roomRoutes from './routes/room.routes';
import avatarRoutes from './routes/avatar.routes';
import adminRoutes from './routes/admin.routes';
import questRoutes from './routes/quest.routes';
import levelRoutes from './routes/level.routes';
import badgeRoutes from './routes/badge.routes';
import userRoutes from './routes/user.routes';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/avatar', avatarRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/level', levelRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Start server
server.listen(config.port, () => {
  console.log(`🚀 Serveur démarré sur le port ${config.port}`);
  console.log(`📡 Socket.IO prêt pour les connexions en temps réel`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM reçu, fermeture du serveur...');
  server.close(() => {
    console.log('Serveur fermé');
    process.exit(0);
  });
});

export { app, server, io };
