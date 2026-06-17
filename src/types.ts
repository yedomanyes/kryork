export interface Category {
  id: string;
  name: string;
  detail: string;
  tone: string;
}

export const defaultCategories: Category[] = [
  { id: 'c1', name: 'Ketten', detail: 'Cuban, Rope & Tennis', tone: 'chain' },
  { id: 'c2', name: 'Armbänder', detail: 'Gold, Silber & Iced', tone: 'bracelet' },
  { id: 'c3', name: 'Ringe', detail: 'Signet & Custom Cast', tone: 'ring' },
];

export interface Product {
  id: string;
  name: string;
  material: string;
  oldPrice: string;
  price: string;
  off: string;
  tone: string;
  description?: string;
  images?: string[];
}

export const defaultProducts: Product[] = [
  { id: 'p1', name: 'Cuban Link Kette 8mm', material: '14k Gold', oldPrice: '€249', price: '€189', off: '€60 SPAREN', tone: 'gold', description: 'Massive 14k Gold Cuban Link Kette mit 8mm Breite.' },
  { id: 'p2', name: 'Cuban Set 8mm', material: '14k Gold', oldPrice: '€398', price: '€248', off: '€150 SPAREN', tone: 'gold-set', description: 'Das perfekte Cuban Link Set: Kette und Armband in 8mm Breite.' },
  { id: 'p3', name: 'Cuban Link Kette 10mm', material: 'Silber', oldPrice: '€279', price: '€229', off: '€50 SPAREN', tone: 'silver', description: 'Extrem dicke 10mm Cuban Link Kette aus 925 Sterling Silber.' },
  { id: 'p4', name: 'KRYORK Signet Ring', material: 'Mirror Silber', oldPrice: '€169', price: '€129', off: '€40 SPAREN', tone: 'ring', description: 'Klassischer KRYORK Siegelring, hochglanzpoliertes Mirror Silber.' },
  { id: 'p5', name: 'Tennis Kette 5mm', material: 'Silber Iced Out', oldPrice: '€349', price: '€289', off: '€60 SPAREN', tone: 'silver', description: 'Rundum besetzt mit strahlenden VVS Simulant-Steinen.' },
  { id: 'p6', name: 'Iced Out Ring', material: '14k Gold', oldPrice: '€299', price: '€219', off: '€80 SPAREN', tone: 'ring', description: 'Massiver Statement Ring, iced out mit feinsten Steinen.' },
  { id: 'p7', name: 'Rope Chain 4mm', material: '14k Gold', oldPrice: '€199', price: '€149', off: '€50 SPAREN', tone: 'gold', description: 'Die klassische Kordelkette in 14k Gold, extrem stabil.' },
  { id: 'p8', name: 'Custom Pendant', material: 'Silber', oldPrice: '€499', price: '€399', off: '€100 SPAREN', tone: 'gold-set', description: 'Dein Custom-Design als massiver Anhänger.' },
];

export interface InboxMessage {
  id: string;
  subject: string;
  text: string;
  createdAt: number;
  read: boolean;
}
