type Event = "pre" | "main" | "side";

export type LAN = {
  description: string;
  endDate: string;
  event: Event;
  games: Game[];
  lanId: number;
  participants: User[];
  startDate: string;
};

export type User = {
  id: number;
  name: string;
};

export type Game = {
  id: number;
  name: string;
};
