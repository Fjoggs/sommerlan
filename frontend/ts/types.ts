type Event = "pre" | "main" | "side";

export type LAN = {
  awards?: Award[];
  description: string;
  endDate: string;
  event: Event;
  fromDisplay?: string;
  games?: Game[];
  imageCount?: number;
  invitation?: string;
  isRomjulsLAN?: boolean;
  quoteCount?: number;
  guestCount?: number;
  lanId: number;
  participants?: User[];
  startDate: string;
  toDisplay?: string;
};

export type User = {
  id: number;
  name: string;
  nickname?: string;
  eventNickname?: string;
  color: string;
  color2?: string;
};

export type Game = {
  id: number;
  name: string;
};

export type Award = {
  id: number;
  name: string;
};

export type LanGuest = {
  id: number;
  lanId: number;
  name: string;
  createdAt: string;
};

export type LanQuote = {
  id: number;
  lanId: number;
  quote: string;
  attributedTo?: string;
  createdAt: string;
};

export type RsvpEntry = {
  userId: number;
  name: string;
  nickname?: string;
  color: string;
  color2?: string;
  dates: string[];
  dinnerDates?: string[];
};

export type UserLanEntry = {
  lanId: number;
  startDate: string;
  endDate: string;
  event: string;
  description: string;
  fromDisplay?: string;
  toDisplay?: string;
};

export type UserProfile = {
  id: number;
  name: string;
  nickname?: string;
  color: string;
  color2?: string;
  lans: UserLanEntry[];
};
