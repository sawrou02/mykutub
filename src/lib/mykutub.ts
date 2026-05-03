export const CATEGORIES = [
  "Tout",
  "Études supérieures",
  "Livres Enfants",
  "Moutoun",
];

export const CONDITIONS = ["Neuf", "Bon", "Satisfaisant"];

export const ALL_CITIES = [
  "Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Montpellier", "Strasbourg", "Bordeaux", "Lille",
  "Rennes", "Reims", "Saint-Étienne", "Le Havre", "Toulon", "Grenoble", "Dijon", "Angers", "Nîmes", "Villeurbanne",
  "Mulhouse", "Rouen", "Caen", "Nancy", "Orléans", "Clermont-Ferrand", "Besançon", "Annecy", "Metz", "Brest",
  "Amiens", "La Rochelle", "Limoges", "Tours", "Béziers", "Perpignan", "Pau", "Roubaix", "Tourcoing", "Nanterre",
  "Avignon", "Vitry-sur-Seine", "Créteil", "Dunkerque", "Poitiers", "Aubervilliers", "Asnières-sur-Seine", "Colombes", "Aulnay-sous-Bois", "Versailles",
].sort();

export type Book = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  condition: string;
  city: string;
  price: number;
  is_donation: boolean;
  image_url: string;
  seller_id: string;
  seller_name: string;
  created_at: string;
};

export type Chat = {
  id: string;
  participants: string[];
  book_id: string | null;
  book_title: string | null;
  book_image_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_by: string[];
  created_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
};
