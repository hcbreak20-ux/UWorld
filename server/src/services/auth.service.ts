import bcrypt from 'bcrypt';
// ✅ NOUVEAU
import { prisma } from '../lib/prisma';
import { generateToken } from '../utils/jwt';
import { questService } from './quest.service'; // ← TEMPORAIREMENT DÉSACTIVÉ


export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export class AuthService {
  static async register(data: RegisterData) {
    const { username, email, password } = data;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      throw new Error(
        existingUser.username === username
          ? 'Ce nom d\'utilisateur est déjà pris'
          : 'Cet email est déjà utilisé'
      );
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        coins: true,
        gems: true,
        level: true,
        motto: true,
        avatar: true,
        createdAt: true,
        role: true,  // ← AJOUTER: Récupérer le rôle
      },
    });

// ✅ NOUVEAU: Assigner les quêtes tutorial au nouveau joueur
try {
  await questService.assignTutorialQuests(user.id);
  await questService.assignDailyWeeklyQuests(user.id);
  // ✅ NOUVEAU (ajoute la parenthèse ouvrante)
console.log(`✅ Quêtes assignées au nouveau joueur: ${user.username}`);
} catch (error) {
  console.error('Erreur lors de l\'assignation des quêtes:', error);
  // Ne pas bloquer l'inscription si l'assignation échoue
}

    // ✅ CORRIGÉ: Générer le token JWT avec le rôle
    const token = generateToken({ 
      userId: user.id, 
      username: user.username,
      role: user.role  // ← AJOUTER: Inclure le rôle dans le token
    });

    return { user, token };
  }

  static async login(data: LoginData) {
    const { username, password } = data;

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new Error('Nom d\'utilisateur ou mot de passe incorrect');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Nom d\'utilisateur ou mot de passe incorrect');
    }

    // Mettre à jour la dernière connexion
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // ✅ CORRIGÉ: Générer le token JWT avec le rôle
    const token = generateToken({ 
      userId: user.id, 
      username: user.username,
      role: user.role  // ← AJOUTER: Inclure le rôle dans le token
    });

    // Retourner les données (sans le mot de passe)
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        coins: true,
        gems: true,
        level: true,
        experience: true,
        motto: true,
        avatar: true,
        createdAt: true,
        lastLogin: true,
        role: true,  // ← AJOUTER: Récupérer le rôle
      },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    return user;
  }
}
