import { prisma } from '../lib/prisma';

export class LevelService {
 /**
 * Calculer l'XP nécessaire pour un niveau donné
 */
 getXpForLevel(level: number): number {
 return Math.floor(level * level * 50);
 }

 /**
 * Calculer le niveau basé sur l'XP total
 */
 getLevelFromXp(totalXp: number): number {
 let level = 1;
 let xpRequired = this.getXpForLevel(level);
 
 while (totalXp >= xpRequired) {
 totalXp -= xpRequired;
 level++;
 xpRequired = this.getXpForLevel(level);
 }
 
 return level - 1;
 }

 /**
 * Calculer l'XP actuel vers le prochain niveau
 */
 getCurrentLevelProgress(totalXp: number): {
 currentLevel: number;
 currentXp: number;
 xpForNextLevel: number;
 progressPercentage: number;
 } {
 let level = 1;
 let remainingXp = totalXp;
 let xpRequired = this.getXpForLevel(level);
 
 while (remainingXp >= xpRequired) {
 remainingXp -= xpRequired;
 level++;
 xpRequired = this.getXpForLevel(level);
 }
 
 const currentLevel = level;
 const currentXp = remainingXp;
 const xpForNextLevel = xpRequired;
 const progressPercentage = Math.floor((currentXp / xpForNextLevel) * 100);
 
 return {
 currentLevel,
 currentXp,
 xpForNextLevel,
 progressPercentage,
 };
 }

 /**
 * Ajouter de l'XP à un utilisateur et gérer les level ups
 */
 async addXp(userId: string, xpToAdd: number): Promise<{
 leveledUp: boolean;
 oldLevel: number;
 newLevel: number;
 totalXp: number;
 currentXp: number;
 xpForNextLevel: number;
 }> {
 const user = await prisma.user.findUnique({
 where: { id: userId },
 select: { experience: true, level: true },
 });

 if (!user) {
 throw new Error('Utilisateur non trouvé');
 }

 const oldLevel = user.level;
 const newTotalXp = user.experience + xpToAdd;
 const newLevel = this.getLevelFromXp(newTotalXp);
 const leveledUp = newLevel > oldLevel;

 // Mettre à jour l'utilisateur
 await prisma.user.update({
 where: { id: userId },
 data: {
 experience: newTotalXp,
 level: newLevel,
 },
 });

 const progress = this.getCurrentLevelProgress(newTotalXp);

 console.log(
 `🎯 ${userId}: +${xpToAdd} XP | Niveau ${newLevel} | ${progress.currentXp}/${progress.xpForNextLevel} XP`
 );

 if (leveledUp) {
 console.log(`🎉 LEVEL UP! ${oldLevel} → ${newLevel}`);
 }

 return {
 leveledUp,
 oldLevel,
 newLevel,
 totalXp: newTotalXp,
 currentXp: progress.currentXp,
 xpForNextLevel: progress.xpForNextLevel,
 };
 }
}

export const levelService = new LevelService();