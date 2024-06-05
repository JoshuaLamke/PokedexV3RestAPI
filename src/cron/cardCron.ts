import type {
  Handler,
} from "aws-lambda";
import DynamoDBConnector from "../connectors/DynamoDB";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Card, DBCard, NameUrl, PokemonInfo } from "../types";
import axios from "axios";
import { PokemonInfoToDBCard, MAPPER as CardMapper } from "../models/card";

const DynamoDB = new DynamoDBConnector({
  isOffline: process.env.IS_OFFLINE
});

// Cron to fetch current data from pokeApi and place it in db
export const handler: Handler = async () => {
  try {
    // Fetch list of pokemon from pokeApi
    const pokemonListURL = "https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0";
    const { data } = await axios.get<{count: number; results: NameUrl[];}>(pokemonListURL);
    
    // Fetch existing pokemon cards
    const result = await DynamoDB.query("card");
    const cards = result.map((dbCard) => CardMapper(unmarshall(dbCard) as DBCard)) as Card[];

    if(cards.length === data.count) {
      return;
    }

    // Overwrite cards if new cards were added
    do {
      const responses = await Promise.all(data.results.splice(0, 100).map(async (nameUrl) => await axios.get<PokemonInfo>(nameUrl.url)));
      const dbCards = responses.map(res => marshall(PokemonInfoToDBCard(res.data), {removeUndefinedValues: true}));
      await DynamoDB.batchWrite(dbCards);
    } while(data.results.length);
  } catch(e) {
    console.log("Error: ", e)
  }
}