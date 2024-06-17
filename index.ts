import type {
  Context,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyEventV2,
  Handler,
} from "aws-lambda";
import lambdaAPI from "lambda-api";
import type {
  Request,
  Response
} from "lambda-api";
import DynamoDBConnector from "./src/connectors/DynamoDB";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Card, DBCard } from "./src/types";
import { MAPPER as CardMapper } from "./src/models/card";
import omit from "lodash/omit";

const DynamoDB = new DynamoDBConnector({
  isOffline: process.env.IS_OFFLINE
});

const api = lambdaAPI();
api.options("/*", (_req: Request, res: Response) => {
  // Add CORS headers
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173/');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Content-Length, X-Requested-With'
  );
  res.status(200).send({});
});

// Get all summary pokemon cards
api.get("/cards", async (_req: Request, res: Response) => {
  try {
    const result = await DynamoDB.query("card");
  
    const cards = result.map((dbCard) => CardMapper(unmarshall(dbCard) as DBCard)) as Card[];
  
    return res.status(200).json({"data": cards});
  } catch(e) {
    return res.status(500).json({"Error": e});
  }
});

api.post("/cards/:name", async (req: Request, res: Response) => {
  const { name } = req.params;
  const pokemon: DBCard = req.body;

  try {
    await DynamoDB.update({
      pk: "card",
      sk: name!,
    }, {
      ...omit(pokemon, "pk", "sk"),
    });

    return res.status(200).json({});
  } catch(e) {
    return res.status(500).json({"Error": e});
  }
});

export const handler: Handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  return await api.run(event, context); 
}