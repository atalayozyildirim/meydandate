import type { City, Tab } from "../data";

export type { Tab };

export type Route =
  | { type: "tab"; tab: Tab }
  | { type: "event"; id: string }
  | { type: "community"; id: string }
  | { type: "article"; id: string }
  | { type: "discussion" }
  | { type: "space" }
  | { type: "connections" }
  | { type: "connection-chat"; id: string }
  | { type: "collection"; collection: "articles" | "communities" | "events" };

export type Navigate = (target: Route) => void;

export type SheetType = "city" | "messages" | "report" | "privacy" | null;
