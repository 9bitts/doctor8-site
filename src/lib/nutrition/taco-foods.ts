/** Subset of TACO (Tabela Brasileira de Composição de Alimentos) — values per 100g. */
export type TacoFood = {
  id: string;
  name: string;
  group: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
};

export const TACO_FOODS: TacoFood[] = [
  { id: "arroz-branco-cozido", name: "Arroz, branco, cozido", group: "Cereais", kcal: 128, proteinG: 2.5, carbsG: 28.1, fatG: 0.2, fiberG: 1.6 },
  { id: "feijao-carioca-cozido", name: "Feijão, carioca, cozido", group: "Leguminosas", kcal: 76, proteinG: 4.8, carbsG: 13.6, fatG: 0.5, fiberG: 8.5 },
  { id: "frango-peito-grelhado", name: "Frango, peito, sem pele, grelhado", group: "Carnes", kcal: 159, proteinG: 32, carbsG: 0, fatG: 2.5, fiberG: 0 },
  { id: "ovo-cozido", name: "Ovo, de galinha, cozido", group: "Ovos", kcal: 146, proteinG: 13.3, carbsG: 0.6, fatG: 9.5, fiberG: 0 },
  { id: "leite-desnatado", name: "Leite, longa vida, desnatado", group: "Leite", kcal: 42, proteinG: 3.4, carbsG: 5.3, fatG: 0.2, fiberG: 0 },
  { id: "pao-frances", name: "Pão, trigo, francês", group: "Cereais", kcal: 300, proteinG: 8, carbsG: 58.6, fatG: 3.1, fiberG: 2.3 },
  { id: "banana-prata", name: "Banana, prata", group: "Frutas", kcal: 98, proteinG: 1.3, carbsG: 26, fatG: 0.1, fiberG: 2.6 },
  { id: "maca-fuji", name: "Maçã, Fuji, com casca", group: "Frutas", kcal: 56, proteinG: 0.3, carbsG: 15.2, fatG: 0.1, fiberG: 1.3 },
  { id: "batata-doce-cozida", name: "Batata, doce, cozida", group: "Tubérculos", kcal: 77, proteinG: 0.6, carbsG: 18.4, fatG: 0.1, fiberG: 2.2 },
  { id: "aveia-flocos", name: "Aveia, flocos, crua", group: "Cereais", kcal: 394, proteinG: 13.9, carbsG: 66.6, fatG: 8.5, fiberG: 9.1 },
  { id: "iogurte-natural-desnatado", name: "Iogurte, natural, desnatado", group: "Laticínios", kcal: 41, proteinG: 4.1, carbsG: 5.8, fatG: 0.3, fiberG: 0 },
  { id: "queijo-minas-frescal", name: "Queijo, minas, frescal", group: "Laticínios", kcal: 264, proteinG: 17.4, carbsG: 3.2, fatG: 20.2, fiberG: 0 },
  { id: "salmao-grelhado", name: "Salmão, sem pele, fresco, grelhado", group: "Pescados", kcal: 243, proteinG: 26.1, carbsG: 0, fatG: 14.9, fiberG: 0 },
  { id: "atum-lata-agua", name: "Atum, conserva em água", group: "Pescados", kcal: 103, proteinG: 23.6, carbsG: 0, fatG: 0.8, fiberG: 0 },
  { id: "brocolis-cozido", name: "Brócolis, cozido", group: "Verduras", kcal: 25, proteinG: 2.1, carbsG: 4.4, fatG: 0.5, fiberG: 3.4 },
  { id: "alface-crua", name: "Alface, crespa, crua", group: "Verduras", kcal: 11, proteinG: 1.3, carbsG: 1.7, fatG: 0.2, fiberG: 1.8 },
  { id: "tomate-cru", name: "Tomate, cru", group: "Verduras", kcal: 15, proteinG: 1.1, carbsG: 3.1, fatG: 0.2, fiberG: 1.2 },
  { id: "azeite-extra-virgem", name: "Azeite, de oliva, extra virgem", group: "Gorduras", kcal: 884, proteinG: 0, carbsG: 0, fatG: 100, fiberG: 0 },
  { id: "castanha-do-para", name: "Castanha-do-pará", group: "Oleaginosas", kcal: 656, proteinG: 14.5, carbsG: 12.3, fatG: 63.5, fiberG: 7.9 },
  { id: "amendoim-torrado", name: "Amendoim, torrado, salgado", group: "Oleaginosas", kcal: 606, proteinG: 22.5, carbsG: 18.7, fatG: 49.6, fiberG: 8.2 },
  { id: "whey-protein", name: "Suplemento, proteína do soro do leite", group: "Suplementos", kcal: 408, proteinG: 76.9, carbsG: 6.3, fatG: 5.7, fiberG: 0 },
  { id: "pasta-parafuso-cozida", name: "Macarrão, trigo, parafuso, cozido", group: "Cereais", kcal: 102, proteinG: 3.5, carbsG: 20.2, fatG: 0.5, fiberG: 1.1 },
  { id: "carne-patinho-grelhada", name: "Carne, bovina, patinho, grelhada", group: "Carnes", kcal: 219, proteinG: 35.9, carbsG: 0, fatG: 7.3, fiberG: 0 },
  { id: "mandioca-cozida", name: "Mandioca, cozida", group: "Tubérculos", kcal: 125, proteinG: 0.6, carbsG: 30.1, fatG: 0.3, fiberG: 1.9 },
  { id: "laranja-pera", name: "Laranja, pera", group: "Frutas", kcal: 37, proteinG: 1, carbsG: 8.9, fatG: 0.1, fiberG: 0.8 },
  { id: "mamao-formosa", name: "Mamão, formosa", group: "Frutas", kcal: 45, proteinG: 0.5, carbsG: 11.6, fatG: 0.1, fiberG: 1.8 },
  { id: "abacate", name: "Abacate, cru", group: "Frutas", kcal: 96, proteinG: 1.2, carbsG: 6, fatG: 8.4, fiberG: 6.3 },
  { id: "granola", name: "Granola", group: "Cereais", kcal: 487, proteinG: 12.3, carbsG: 55.8, fatG: 27.2, fiberG: 7 },
  { id: "melancia", name: "Melancia, crua", group: "Frutas", kcal: 33, proteinG: 0.9, carbsG: 8.1, fatG: 0, fiberG: 0.3 },
  { id: "cafe-infusao", name: "Café, infusão", group: "Bebidas", kcal: 9, proteinG: 0.7, carbsG: 1.5, fatG: 0.1, fiberG: 0 },
];

export function searchTacoFoods(query: string, limit = 25): TacoFood[] {
  const q = query.trim().toLowerCase();
  if (!q) return TACO_FOODS.slice(0, limit);
  return TACO_FOODS.filter(
    (f) => f.name.toLowerCase().includes(q) || f.group.toLowerCase().includes(q),
  ).slice(0, limit);
}

export function getTacoFoodById(id: string): TacoFood | undefined {
  return TACO_FOODS.find((f) => f.id === id);
}

export function macrosForPortion(food: TacoFood, portionG: number) {
  const factor = portionG / 100;
  return {
    kcal: Math.round(food.kcal * factor),
    proteinG: Math.round(food.proteinG * factor * 10) / 10,
    carbsG: Math.round(food.carbsG * factor * 10) / 10,
    fatG: Math.round(food.fatG * factor * 10) / 10,
    fiberG: Math.round(food.fiberG * factor * 10) / 10,
  };
}
