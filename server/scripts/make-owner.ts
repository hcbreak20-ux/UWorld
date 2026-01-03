import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('👑 Script de promotion au rôle OWNER\n');

  // Demander le username
  const username = await question('Entrez le nom d\'utilisateur à promouvoir: ');

  if (!username || username.trim() === '') {
    console.log('❌ Nom d\'utilisateur vide');
    process.exit(1);
  }

  // Trouver l'utilisateur
  const user = await prisma.user.findUnique({
    where: { username: username.trim() }
  });

  if (!user) {
    console.log(`❌ Utilisateur "${username}" non trouvé`);
    process.exit(1);
  }

  console.log(`\n✅ Utilisateur trouvé: ${user.username}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Rôle actuel: ${user.role}`);
  console.log(`   Level: ${user.level}`);

  // Confirmation
  const confirm = await question('\nÊtes-vous sûr de vouloir promouvoir cet utilisateur en OWNER? (oui/non): ');

  if (confirm.toLowerCase() !== 'oui') {
    console.log('❌ Opération annulée');
    process.exit(0);
  }

  // Promouvoir l'utilisateur
  await prisma.user.update({
    where: { id: user.id },
    data: {
      role: 'owner',
      isAdmin: true
    }
  });

  console.log('\n✅ Utilisateur promu au rôle OWNER!');

  // Donner le badge Founder
  const founderBadge = await prisma.badge.findUnique({
    where: { key: 'founder' }
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
          givenBy: user.id // Auto-donné
        }
      });
      console.log('✅ Badge "Fondateur" attribué!');
    } else {
      console.log('ℹ️  Badge "Fondateur" déjà possédé');
    }
  } else {
    console.log('⚠️  Badge "Founder" non trouvé (exécutez seed-badges.ts d\'abord)');
  }

  console.log('\n🎉 Terminé!');
  console.log(`👑 ${user.username} est maintenant OWNER d'UWorld!`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
