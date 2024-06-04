import { DBCard, PokemonInfo } from "../types";
import { mapper } from "../utils";

export const MAPPER = mapper<DBCard>({sk: "name"}, ["pk"]);

export const PokemonInfoToDBCard = (pokemonInfo: PokemonInfo): DBCard => {
  return {
    pk: "card",
    sk: pokemonInfo.name,
    types: pokemonInfo.types.map(typeObj => typeObj.type.name),
    number: pokemonInfo.id,
    order: pokemonInfo.order,
    image: (
      pokemonInfo.sprites.other["official-artwork"].front_default ?? 
      pokemonInfo.sprites.other.dream_world.front_default ?? 
      pokemonInfo.sprites.other.home.front_default ?? 
      pokemonInfo.sprites.front_default ?? 
      undefined
    ) 
  }
}