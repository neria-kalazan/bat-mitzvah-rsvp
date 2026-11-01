export type GuestType = 'friend' | 'family';

export interface RSVP {
  id: string;
  type: GuestType;
  name: string;
  contactName?: string;
  plusOne?: boolean;
  plusOneName?: string;
  count: number;
  phone?: string;
  attending: boolean;
  dietary?: string;
  songRequest?: string;
  wishingMessage?: string;
  createdAt: string;
  updatedAt?: string;
  isUpdated?: boolean;
}

export interface EventDetails {
  celebrantName: string;
  subTitle: string;
  date: string;
  time: string;
  receptionTime: string;
  venueName: string;
  address: string;
  wazeUrl: string;
  googleMapsUrl: string;
  welcomeMessage: string;
  welcomeVoiceText: string;
  dressCode: string;
  contactPhone: string;
  googleSheetsWebhookUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SouvenirItem {
  id: string;
  guestId?: string;
  creatorName: string;
  styleId: string;
  styleName: string;
  imageUrl: string;
  customPrompt?: string;
  createdAt: string;
}
