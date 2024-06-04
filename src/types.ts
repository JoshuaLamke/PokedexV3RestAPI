export type DBCard = {
  pk: "card";
  sk: string;
  types: string[];
  image?: string;
  number: number;
  order: number;
}

export type Card = {
  number: number;
  order: number;
  name: string;
  types: string[];
  image?: string;
}

export type NameUrl = {
  name: string;
  url: string;
};


export type OtherSprites = {
  dream_world: {
    front_default: string | null;
    front_female: string | null;
  },
  home: {
    front_default: string | null;
    front_female: string | null;
    front_shiny: string | null;
    front_shiny_female: string | null;
  },
  "official-artwork": {
    front_default: string | null;
  }
};

export type AbilityObj = {
  ability: NameUrl;
  is_hidden: boolean;
  slot: number;
};

export type GameIndex = {
  game_index: number;
  version: NameUrl;
};

export type HeldItem = {
  item: NameUrl[];
  version_details: {
    rarity: number;
    version: NameUrl;
  }[];
};

export type Move = {
  move: NameUrl;
  version_group_details: {
    level_learned_at: number;
    move_learn_method: NameUrl;
    version_group: NameUrl;
  }[];
};

export type Stat = {
  base_stat: number;
  effort: number;
  stat: NameUrl;
};

export type Type = {
  slot: number;
  type: NameUrl;
};

export type PokemonInfo = {
  abilities: AbilityObj[];
  base_experience: number;
  forms: NameUrl[];
  game_indicies: GameIndex[];
  height: number;
  held_items: HeldItem[];
  id: number;
  is_default: boolean;
  location_area_encounters: string;
  moves: Move[];
  name: string;
  order: number;
  past_types: unknown[];
  species: NameUrl;
  sprites: {
    back_default: string | null;
    back_female: string | null;
    back_shiny: string | null;
    back_shiny_female: string | null;
    front_default: string | null;
    front_female: string | null;
    front_shiny: string | null;
    front_shiny_female: string | null;
    other: OtherSprites;
    versions: Record<string, unknown>;
  },
  stats: Stat[];
  types: Type[];
  weight: number;
};