/** Microcopy: warm, light, tutoiement, never guilt. */

export const ENCOURAGEMENTS = [
  "Pile poil ! Tu gères comme une cheffe 🎯",
  "Bien joué, ta glycémie a fait la sieste 😴",
  "Dans le mille ! On applaudit 👏",
  "Trop forte sur ce dosage, franchement ✨",
  "Calcul validé, papilles comblées 🍽️",
  "Tu deviens experte des glucides, ça se voit 💪",
  "Courbe toute douce, comme un dimanche matin ☀️",
  "Joli travail d'équilibriste 🤸",
  "Ta glycémie te dit merci 💌",
  "Impeccable, rien que ça 🌟",
  "C'est carré, c'est beau, c'est toi 🧡",
  "Encore un repas maîtrisé, on garde le rythme 🎶",
  "Tu peux être fière de toi, vraiment 🌷",
  "Pile dans la cible, Robin des Bois peut aller se rhabiller 🏹",
  "Douceur et précision : ton combo gagnant 🍑",
  "Ça, c'est ce qu'on appelle du travail d'orfèvre 💎",
  "Victoire tranquille, sans faire de bruit 🕊️",
  "Le ratio et toi, vous faites une super équipe 🤝",
  "On note ça dans le carnet des belles réussites 📖",
  "Bravo ! Ton futur toi te remercie déjà 🌈",
  "Un repas, une réussite, un sourire 😊",
  "Tu as eu le nez fin sur ce coup-là 🌸",
];

export const KIND_AFTER_MISS = [
  "Merci de l'avoir noté, c'est comme ça qu'on affine 💪",
  "Noté ! Chaque repas t'apprend quelque chose, et c'est précieux 🌱",
  "Pas de souci, le corps a ses humeurs. On ajuste ensemble 🤍",
  "C'est enregistré. Tu fais un super travail en prenant le temps de noter 🌷",
  "Merci ! Ces retours rendent tes prochaines doses plus justes ✨",
  "Ça arrive à tout le monde, et tu viens de rendre ton carnet plus malin 📖",
];

export const WORDS_OF_THE_DAY = [
  "Tu fais de ton mieux, et ton mieux est déjà beaucoup.",
  "Un repas à la fois, une journée à la fois.",
  "Ton carnet ne juge jamais, il apprend avec toi.",
  "Prends une grande inspiration : tu gères plus de choses que tu ne crois.",
  "Les chiffres sont des indices, pas des notes.",
  "Aujourd'hui, sois aussi douce avec toi qu'avec une amie.",
  "Huit mois d'apprentissage, c'est énorme. Bravo pour le chemin.",
  "Un petit carré de chocolat ne fait de mal à personne, il suffit de le compter 🍫",
  "Tu as le droit d'avoir des jours sans. Ils comptent aussi.",
  "Ta curiosité est ta meilleure alliée.",
  "Chaque note que tu prends est un cadeau pour ton futur toi.",
  "Le soleil revient toujours, même après les journées en dents de scie ☀️",
  "Hydrate-toi, souris, et compte tes glucides (dans cet ordre si tu veux).",
  "Tu n'es pas seule : ton équipe médicale est là pour toi.",
  "La perfection n'existe pas, la progression oui.",
  "Les règles, le stress, le sport… ton corps parle, tu apprends sa langue.",
  "Un repas raté n'efface pas tous les réussis.",
  "Pense à te féliciter aujourd'hui, même pour un petit truc.",
  "Ta glycémie fluctue, ta valeur, elle, reste la même.",
  "Mange ce qui te fait plaisir, on s'occupe des maths ensemble.",
  "Petit rappel : tu es formidable 🌸",
];

/** « Coucou Léa ☀️ » + a line that changes with the hour. */
export function greeting(name: string, hour: number): { title: string; subtitle: string } {
  if (hour >= 5 && hour < 11) {
    return { title: `Coucou ${name} ☀️`, subtitle: "Bien dormi ? Un bon petit-déj t'attend." };
  }
  if (hour >= 11 && hour < 14) {
    return { title: `Coucou ${name} ☀️`, subtitle: "C'est bientôt l'heure de se régaler." };
  }
  if (hour >= 14 && hour < 18) {
    return {
      title: `Coucou ${name} 🌤️`,
      subtitle: "L'après-midi se passe bien ? Pense au goûter.",
    };
  }
  if (hour >= 18 && hour < 22) {
    return { title: `Bonsoir ${name} 🌙`, subtitle: "Qu'est-ce qui mijote ce soir ?" };
  }
  return { title: `Coucou ${name} 🌙`, subtitle: "Petite fringale nocturne ? Je suis là." };
}

/** Stable pick for a given day (same word all day long). */
export function pickForDay<T>(items: readonly T[], date: Date): T {
  const day = Math.floor(date.getTime() / 86_400_000);
  return items[day % items.length] as T;
}

export function pickRandom<T>(items: readonly T[], random = Math.random): T {
  return items[Math.floor(random() * items.length)] as T;
}
