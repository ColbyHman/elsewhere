export type Area =
  | "home"
  | "work"
  | "personal"
  | "finance"
  | "health"
  | "ideas"
  | "other";

export type Attention = "now" | "soon" | "later" | "whenever";

export type ItemStatus = "open" | "done" | "archived";

export type ItemKind = "note" | "todo" | "idea";

export type Scale = 1 | 2 | 3;

export type Desire = "need" | "like";

export type Mood = "anything" | "productive" | "easy" | "fun" | "creative" | "errands";

export interface Item {
  id: string;
  name: string;
  description: string | null;
  kind: ItemKind;
  area: Area | null;
  attention: Attention | null;
  desire: Desire | null;
  importance: Scale | null;
  energy: Scale | null;
  duration: number | null;
  fun: boolean;
  availableAt: string | null;
  status: ItemStatus;
  tags: string[];
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewItem = Partial<
  Pick<
    Item,
    | "description"
    | "kind"
    | "area"
    | "attention"
    | "desire"
    | "importance"
    | "energy"
    | "duration"
    | "fun"
    | "availableAt"
    | "tags"
    | "dueAt"
    | "status"
  >
> & {
  name: string;
};

export type ItemPatch = Partial<
  Pick<
    Item,
    | "name"
    | "description"
    | "kind"
    | "area"
    | "attention"
    | "desire"
    | "importance"
    | "energy"
    | "duration"
    | "fun"
    | "availableAt"
    | "status"
    | "tags"
    | "dueAt"
  >
>;

export interface Counts {
  attentions: Record<Attention, number>;
  inbox: number;
  open: number;
  done: number;
  kinds: Record<ItemKind, number>;
  areas: Record<Area, number>;
  fun: number;
  desire: Record<Desire, number>;
}

export interface Filter {
  status: ItemStatus | "all";
  kind: ItemKind | null;
  attention: Attention | "inbox" | null;
  area: Area | null;
  desire: Desire | null;
  important: boolean;
  easy: boolean;
  fun: boolean;
  recent: boolean;
}

export interface ListParams {
  view?: "today" | "inbox" | "soon" | "later" | "important" | "easy" | "fun" | "recent";
  attention?: Attention | "inbox";
  area?: Area;
  desire?: Desire;
  status?: ItemStatus | "all";
  kind?: ItemKind;
  importance?: Scale;
  energy?: Scale;
  fun?: boolean;
  q?: string;
  tag?: string;
  sort?: "recent" | "due" | "updated";
  limit?: number;
  offset?: number;
}

export interface ChooseParams {
  time?: number;
  desire?: Desire;
  mood?: Mood;
  energy?: Scale;
}
