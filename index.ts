interface LAN {
  year: number;
  description: string;
  event: Era;
  participants: Particpant[];
  games: Game[];
}

type Era = "pre" | "main" | "side";

type Particpant =
  | "ulfos"
  | "PekkyD"
  | "Torp"
  | "Sid"
  | "Nabi"
  | "Jubb"
  | "Taxi"
  | "FN"
  | "gody"
  | "dun"
  | "biten";

type Game = {
  name: string;
};

const LAN_2011: LAN = {
  year: 2011,
  description: "Laptop-LAN som rippa pcen til PekkyD",
  participants: ["ulfos", "PekkyD", "Torp"],
};

const timeline: LAN[] = [LAN_2011];
