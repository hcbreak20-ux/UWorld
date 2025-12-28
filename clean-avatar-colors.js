const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanInvalidColors() {
  console.log('🧹 Nettoyage des couleurs d\'avatar invalides...');

  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

  const defaultColors = {
    avatarSkinColor: '#FFDCB1',
    avatarHairColor: '#654321',
    avatarShirtColor: '#4287F5',
    avatarPantsColor: '#323250',
  };

  // Récupérer tous les utilisateurs
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      avatarSkinColor: true,
      avatarHairColor: true,
      avatarShirtColor: true,
      avatarPantsColor: true,
    },
  });

  console.log(`📊 ${users.length} utilisateurs trouvés`);

  let fixed = 0;

  for (const user of users) {
    const updates: any = {};

    // Vérifier chaque couleur
    if (!hexColorRegex.test(user.avatarSkinColor)) {
      updates.avatarSkinColor = defaultColors.avatarSkinColor;
      console.log(`❌ ${user.username}: Skin invalide (${user.avatarSkinColor})`);
    }

    if (!hexColorRegex.test(user.avatarHairColor)) {
      updates.avatarHairColor = defaultColors.avatarHairColor;
      console.log(`❌ ${user.username}: Hair invalide (${user.avatarHairColor})`);
    }

    if (!hexColorRegex.test(user.avatarShirtColor)) {
      updates.avatarShirtColor = defaultColors.avatarShirtColor;
      console.log(`❌ ${user.username}: Shirt invalide (${user.avatarShirtColor})`);
    }

    if (!hexColorRegex.test(user.avatarPantsColor)) {
      updates.avatarPantsColor = defaultColors.avatarPantsColor;
      console.log(`❌ ${user.username}: Pants invalide (${user.avatarPantsColor})`);
    }

    // Mettre à jour si nécessaire
    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updates,
      });
      fixed++;
      console.log(`✅ ${user.username}: Couleurs corrigées`);
    }
  }

  console.log(`\n✅ Nettoyage terminé!`);
  console.log(`📊 ${fixed} utilisateurs corrigés sur ${users.length}`);

  await prisma.$disconnect();
}

cleanInvalidColors().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
