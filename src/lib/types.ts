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
  image_urls?: string[];
  seller_id: string;
  seller_name: string;
  can_deliver?: boolean;
  created_at: string;
  status?: "available" | "reserved" | "given" | "sold";
  reserved_by?: string | null;
  reserved_at?: string | null;
  language?: string;
};
export type BookRequest = {
  id: string;
  book_id: string;
  requester_id: string;
  requester_name: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export type Review = {
  id: string;
  seller_id: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  chat_id: string | null;
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
  deleted_for?: string[];
  archived_for?: string[];
  muted_for?: string[];
  created_at: string;
};

export type MessageKind = "text" | "image" | "system" | "offer";

export type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  kind?: MessageKind;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  read_at?: string | null;
  deleted_for_everyone?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  hidden_for?: string[];
};

export type PriceOfferStatus =
  | "pending"
  | "countered"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired"
  | "shipped"
  | "received";

export type PriceOffer = {
  id: string;
  book_id: string;
  chat_id: string | null;
  buyer_id: string;
  seller_id: string;
  original_price: number;
  proposed_price: number;
  message: string | null;
  counter_price: number | null;
  counter_message: string | null;
  status: PriceOfferStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
  shipped_at?: string | null;
  received_at?: string | null;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  review_id?: string | null;
};

export type DigitalBook = {
  id: string;
  title: string;
  author: string;
  language: string;
  category: string | null;
  description: string | null;
  file_url: string;
  cover_url: string | null;
  external_url: string | null;
  file_size_bytes: number | null;
  page_count: number | null;
  download_count: number;
  is_published: boolean;
  added_by: string | null;
  created_at: string;
  updated_at: string;
};
