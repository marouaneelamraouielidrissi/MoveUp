// === Activities Database ===
const ACTIVITIES = [
    {
        id: 1,
        emoji: '🚶‍♂️',
        name: 'Marche rapide',
        description: 'Fais une marche rapide autour du bâtiment ou dans la rue.',
        duration: 5,
        category: 'marche',
        calories: 25
    },
    {
        id: 2,
        emoji: '🧘',
        name: 'Étirements du dos',
        description: 'Étire ton dos, tes épaules et ta nuque doucement.',
        duration: 3,
        category: 'etirement',
        calories: 8
    },
    {
        id: 3,
        emoji: '🏃',
        name: 'Montée d\'escaliers',
        description: 'Monte et descends les escaliers 3 fois.',
        duration: 5,
        category: 'exercice',
        calories: 35
    },
    {
        id: 4,
        emoji: '🌬️',
        name: 'Respiration profonde',
        description: '5 cycles de respiration : inspire 4s, retiens 7s, expire 8s.',
        duration: 3,
        category: 'respiration',
        calories: 3
    },
    {
        id: 5,
        emoji: '🦵',
        name: 'Squats',
        description: 'Fais 3 séries de 10 squats avec pauses de 30s.',
        duration: 4,
        category: 'exercice',
        calories: 30
    },
    {
        id: 6,
        emoji: '🌳',
        name: 'Balade dehors',
        description: 'Sors prendre l\'air frais, regarde la nature autour de toi.',
        duration: 10,
        category: 'marche',
        calories: 40
    },
    {
        id: 7,
        emoji: '💪',
        name: 'Pompes murales',
        description: 'Fais 3 séries de 10 pompes contre le mur.',
        duration: 3,
        category: 'exercice',
        calories: 20
    },
    {
        id: 8,
        emoji: '🙆',
        name: 'Rotation des épaules',
        description: 'Fais des rotations des épaules et du cou pendant 3 minutes.',
        duration: 3,
        category: 'etirement',
        calories: 5
    },
    {
        id: 9,
        emoji: '🧎',
        name: 'Étirement des jambes',
        description: 'Étire tes mollets, quadriceps et ischio-jambiers.',
        duration: 5,
        category: 'etirement',
        calories: 10
    },
    {
        id: 10,
        emoji: '🏠',
        name: 'Tour de la maison',
        description: 'Fais le tour de chaque pièce en marchant activement.',
        duration: 5,
        category: 'marche',
        calories: 20
    },
    {
        id: 11,
        emoji: '🫁',
        name: 'Cohérence cardiaque',
        description: 'Respire en rythme 5-5 pendant 5 minutes pour te recentrer.',
        duration: 5,
        category: 'respiration',
        calories: 5
    },
    {
        id: 12,
        emoji: '🤸',
        name: 'Jumping jacks',
        description: 'Fais 3 séries de 15 jumping jacks.',
        duration: 3,
        category: 'exercice',
        calories: 25
    },
    {
        id: 13,
        emoji: '👀',
        name: 'Exercice des yeux',
        description: 'Regarde au loin 20s, puis de près 20s. Répète 5 fois. Cligne des yeux.',
        duration: 2,
        category: 'etirement',
        calories: 0
    },
    {
        id: 14,
        emoji: '☕',
        name: 'Marche + eau/thé',
        description: 'Va te chercher un verre d\'eau ou un thé en marchant.',
        duration: 3,
        category: 'marche',
        calories: 10
    },
    {
        id: 15,
        emoji: '🧘‍♀️',
        name: 'Méditation guidée',
        description: 'Ferme les yeux, concentre-toi sur ta respiration pendant 5 min.',
        duration: 5,
        category: 'respiration',
        calories: 3
    },
    {
        id: 16,
        emoji: '🦶',
        name: 'Marche sur place',
        description: 'Marche sur place en levant bien les genoux pendant 3 minutes.',
        duration: 3,
        category: 'exercice',
        calories: 15
    }
];

const MOTIVATIONAL_QUOTES = [
    "Chaque pas compte, même le plus petit !",
    "Ton corps te remerciera pour cette pause.",
    "5 minutes de mouvement = des heures de productivité.",
    "Bouger, c'est investir dans ta santé future.",
    "Un esprit vif commence par un corps actif.",
    "La sédentarité est le nouveau tabac. Lève-toi !",
    "Même une courte marche peut changer ta journée.",
    "Ton dos et tes yeux méritent cette pause.",
    "Le mouvement est un médicament gratuit.",
    "Petits gestes, grands résultats sur le long terme.",
    "Respire profondément, étire-toi, et repars plus fort(e).",
    "Une pause active maintenant = plus de concentration après.",
    "Tu ne perds pas du temps, tu gagnes en énergie.",
    "Chaque pause est un acte d'amour envers toi-même.",
    "Debout ! Ton futur toi te remercie déjà."
];

const BREAK_SUGGESTIONS = [
    { text: "Va faire une petite marche de 5 minutes dehors", emoji: "🚶‍♂️" },
    { text: "Fais quelques étirements du dos et du cou", emoji: "🧘" },
    { text: "Monte et descends les escaliers 2 fois", emoji: "🏃" },
    { text: "Fais 10 squats et 10 pompes murales", emoji: "💪" },
    { text: "Va te chercher un verre d'eau en marchant", emoji: "☕" },
    { text: "Fais 3 minutes de respiration profonde debout", emoji: "🌬️" },
    { text: "Marche sur place en levant les genoux", emoji: "🦶" },
    { text: "Étire tes jambes et tes bras pendant 5 minutes", emoji: "🙆" },
    { text: "Fais le tour de ta maison ou du bureau", emoji: "🏠" },
    { text: "Regarde par la fenêtre au loin pour reposer tes yeux", emoji: "👀" }
];

function getRandomQuote() {
    return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

function getRandomBreakSuggestion() {
    return BREAK_SUGGESTIONS[Math.floor(Math.random() * BREAK_SUGGESTIONS.length)];
}

function getActivityByCategory(category) {
    if (category === 'all') return ACTIVITIES;
    return ACTIVITIES.filter(a => a.category === category);
}

function getRandomActivity() {
    return ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
}
