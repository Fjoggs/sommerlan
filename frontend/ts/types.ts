type Event = "pre" | "main" | "side";

export type LAN = {
  awards?: Award[];
  description: string;
  endDate: string;
  event: Event;
  fromDisplay?: string;
  games?: Game[];
  lanId: number;
  participants?: User[];
  startDate: string;
  toDisplay?: string;
};

export type User = {
  id: number;
  name: string;
  nickname?: string;
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

export type RsvpEntry = {
  userId: number;
  name: string;
  nickname?: string;
  color: string;
  color2?: string;
  dates: string[];
};
