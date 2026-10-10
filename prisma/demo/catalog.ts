import type { MealMoment } from "@/lib/moments";
import type { ArtKind } from "./art";

/** A dish Camille eats from time to time. */
export type DemoDish = {
  name: string;
  moment: MealMoment;
  /** Usual carbs range in grams. */
  carbs: readonly [number, number];
  art: ArtKind;
  /** Relative frequency among the dishes of its moment (0: only placed on purpose). */
  weight: number;
  favorite?: boolean;
  /** Fat-rich meal: the carbs arrive late. */
  slow?: boolean;
  /** Only eaten on weekends. */
  weekend?: boolean;
};

export const RACLETTE = "Raclette";
export const PIZZA = "Pizza margherita";
export const PESTO = "Pâtes au pesto";

export const DEMO_DISHES: readonly DemoDish[] = [
  // Petit-déj
  {
    name: "Tartines beurre-confiture",
    moment: "BREAKFAST",
    carbs: [45, 60],
    art: "toast",
    weight: 3,
  },
  {
    name: "Porridge aux fruits rouges",
    moment: "BREAKFAST",
    carbs: [50, 65],
    art: "strawberry",
    weight: 2.2,
    favorite: true,
  },
  {
    name: "Croissant et café au lait",
    moment: "BREAKFAST",
    carbs: [30, 38],
    art: "croissant",
    weight: 1.5,
  },
  { name: "Pain au chocolat", moment: "BREAKFAST", carbs: [32, 40], art: "croissant", weight: 1 },
  { name: "Yaourt et granola", moment: "BREAKFAST", carbs: [35, 45], art: "bowl", weight: 1.5 },
  {
    name: "Tartine avocat et œuf",
    moment: "BREAKFAST",
    carbs: [28, 38],
    art: "avocado",
    weight: 1,
  },
  {
    name: "Pancakes au sirop d'érable",
    moment: "BREAKFAST",
    carbs: [70, 85],
    art: "cupcake",
    weight: 3,
    weekend: true,
  },
  // Déjeuner
  { name: "Salade niçoise", moment: "LUNCH", carbs: [20, 30], art: "avocado", weight: 1.5 },
  { name: PESTO, moment: "LUNCH", carbs: [80, 95], art: "bowl", weight: 0, favorite: true },
  {
    name: "Poke bowl saumon avocat",
    moment: "LUNCH",
    carbs: [70, 85],
    art: "avocado",
    weight: 1.5,
  },
  {
    name: "Quiche lorraine et salade",
    moment: "LUNCH",
    carbs: [35, 45],
    art: "toast",
    weight: 1.2,
  },
  { name: "Sandwich jambon-beurre", moment: "LUNCH", carbs: [60, 70], art: "toast", weight: 1.2 },
  { name: "Taboulé maison", moment: "LUNCH", carbs: [50, 60], art: "bowl", weight: 1 },
  { name: "Croque-monsieur", moment: "LUNCH", carbs: [45, 55], art: "toast", weight: 1 },
  { name: "Wrap poulet crudités", moment: "LUNCH", carbs: [45, 55], art: "avocado", weight: 1 },
  { name: "Bento riz poulet teriyaki", moment: "LUNCH", carbs: [75, 90], art: "bowl", weight: 0.8 },
  // Goûter
  { name: "Compote de pomme", moment: "AFTERNOON_SNACK", carbs: [15, 20], art: "apple", weight: 2 },
  {
    name: "Crêpes au sucre",
    moment: "AFTERNOON_SNACK",
    carbs: [40, 50],
    art: "peach",
    weight: 1.5,
    favorite: true,
  },
  { name: "Banane", moment: "AFTERNOON_SNACK", carbs: [22, 27], art: "banana", weight: 1.5 },
  {
    name: "Pomme et carré de chocolat",
    moment: "AFTERNOON_SNACK",
    carbs: [25, 30],
    art: "apple",
    weight: 1,
  },
  {
    name: "Fraises et fromage blanc",
    moment: "AFTERNOON_SNACK",
    carbs: [15, 20],
    art: "strawberry",
    weight: 1,
  },
  { name: "Cookie maison", moment: "AFTERNOON_SNACK", carbs: [25, 30], art: "cupcake", weight: 1 },
  {
    name: "Muffin myrtille",
    moment: "AFTERNOON_SNACK",
    carbs: [38, 45],
    art: "cupcake",
    weight: 0.7,
  },
  // Dîner
  {
    name: RACLETTE,
    moment: "DINNER",
    carbs: [80, 100],
    art: "peach",
    weight: 0,
    favorite: true,
    slow: true,
  },
  { name: PIZZA, moment: "DINNER", carbs: [95, 115], art: "pizza", weight: 0, slow: true },
  { name: "Risotto aux champignons", moment: "DINNER", carbs: [65, 80], art: "bowl", weight: 1.3 },
  { name: "Soupe de légumes et pain", moment: "DINNER", carbs: [35, 45], art: "bowl", weight: 1.3 },
  { name: "Curry de poulet et riz", moment: "DINNER", carbs: [70, 85], art: "bowl", weight: 1.3 },
  {
    name: "Gratin dauphinois et salade",
    moment: "DINNER",
    carbs: [50, 60],
    art: "toast",
    weight: 1,
  },
  { name: "Lasagnes", moment: "DINNER", carbs: [60, 75], art: "pizza", weight: 1 },
  {
    name: "Saumon, riz et brocolis",
    moment: "DINNER",
    carbs: [55, 65],
    art: "avocado",
    weight: 1.2,
  },
  { name: "Hachis parmentier", moment: "DINNER", carbs: [55, 65], art: "bowl", weight: 1 },
  // Encas du soir
  { name: "Tisane et petits-beurre", moment: "SNACK", carbs: [18, 24], art: "cupcake", weight: 1 },
  {
    name: "Carré de chocolat et lait",
    moment: "SNACK",
    carbs: [15, 20],
    art: "cupcake",
    weight: 1,
  },
];

export function dishNamed(name: string): DemoDish {
  const dish = DEMO_DISHES.find((candidate) => candidate.name === name);
  if (!dish) throw new Error(`Unknown demo dish: ${name}`);
  return dish;
}
