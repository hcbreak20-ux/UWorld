import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function makeOwner() {
  console.log('👑 PROMOTION AU RÔLE OWNER\n');
  
  // Demander le username
  const username = await question('Entrez votre nom d\'utilisateur: ');
  
  if (!username || username.trim() === '') {
    console.log('❌ Nom d\'utilisateur invalide');
    rl.close();
    return;
  }
  
  try {
    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { username: username.trim() }
    });
    
    if (!user) {
      console.log(`❌ Utilisateur "${username}" introuvable`);
      rl.close();
      return;
    }
    
    // Afficher les infos actuelles
    console.log('\n📋 Informations actuelles:');
    console.log(`   - Username: ${user.username}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Rôle actuel: ${user.role}`);
    console.log(`   - Niveau: ${user.level}`);
    
    // Confirmer
    const confirm = await question('\nÊtes-vous sûr de vouloir donner le rôle OWNER à cet utilisateur? (oui/non): ');
    
    if (confirm.toLowerCase() !== 'oui') {
      console.log('❌ Opération annulée');
      rl.close();
      return;
    }
    
    // Promouvoir au rôle Owner
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'owner'
      }
    });
    
    console.log('\n✅ PROMOTION RÉUSSIE!');
    console.log(`   - ${updatedUser.username} est maintenant OWNER!`);
    console.log(`   - Tous les pouvoirs sont débloqués`);
    
    // Logger l'action
    await prisma.adminLog.create({
      data: {
        adminId: user.id,
        action: 'promote_to_owner',
        reason: 'Promotion initiale via script',
        details: {
          previousRole: user.role,
          newRole: 'owner'
        }
      }
    });
    
    console.log('\n📝 Action loggée dans AdminLog');
    
    // Donner le badge Founder
    try {
      const founderBadge = await prisma.badge.findUnique({
        where: { code: 'founder' }
      });
      
      if (founderBadge) {
        // Vérifier si l'utilisateur a déjà le badge
        const existingBadge = await prisma.userBadge.findUnique({
          where: {
            userId_badgeId: {
              userId: user.id,
              badgeId: founderBadge.id
            }
          }
        });
        
        if (!existingBadge) {
          await prisma.userBadge.create({
            data: {
              userId: user.id,
              badgeId: founderBadge.id,
              givenBy: user.id
            }
          });
          console.log('🏅 Badge "Fondateur" ajouté!');
        } else {
          console.log('🏅 Badge "Fondateur" déjà possédé');
        }
      }
    } catch (error) {
      console.log('⚠️  Badge Founder non trouvé (exécutez seed-badges.ts d\'abord)');
    }
    
    console.log('\n🎉 Vous êtes maintenant le propriétaire du jeu!');
    console.log('👑 Vous avez accès à toutes les commandes admin');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

makeOwner();
