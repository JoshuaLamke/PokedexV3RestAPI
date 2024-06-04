import { 
  AttributeValue,
  BatchWriteItemCommand,
  BatchWriteItemCommandInput,
  DeleteItemCommand,
  DeleteItemCommandInput,
  DynamoDBClient, 
  GetItemCommand, 
  GetItemCommandInput, 
  QueryCommand, 
  QueryCommandInput, 
  ReturnValue, 
  ScanCommand, 
  UpdateItemCommand,
  UpdateItemCommandInput
} from "@aws-sdk/client-dynamodb";
import {
  convertToAttr,
  marshall,
} from "@aws-sdk/util-dynamodb";
import isNil from "lodash/isNil";

export type DynamoDBConnectorOptions = {
  isOffline?: string;
}

class DynamoDBConnector {
  private tableName: string;
  private DynamoDBClient: DynamoDBClient;
  constructor({
    isOffline,
  }: DynamoDBConnectorOptions) {
    this.tableName = process.env.TABLE_NAME!;
    const options = isOffline ? {
      endpoint: 'http://localhost:8000',
      region: 'localhost'
    } : {};
    this.DynamoDBClient = new DynamoDBClient(options);
  }

  async scan() {
    let lastEvaluatedKey: Record<string, AttributeValue> | undefined = undefined;
    let allItems: Record<string, AttributeValue>[] = [];

    do {
      const command: ScanCommand = new ScanCommand({
        TableName: this.tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const { LastEvaluatedKey, Items } = await this.DynamoDBClient.send(command);
      
      if (Items) {
        allItems = allItems.concat(Items);
      }

      lastEvaluatedKey = LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allItems;
  }
  
  async get(key: {pk: string; sk: string}) {
    const params = this.generateGetParams(key);
    const command = new GetItemCommand(params);
    return this.DynamoDBClient.send(command);
  }

  async query(pk: string, sk?: string) {
    const params = this.generateQueryParams(pk, sk);
    let lastEvaluatedKey: Record<string, AttributeValue> | undefined = undefined;
    let allItems: Record<string, AttributeValue>[] = [];

    do {
      const command: QueryCommand = new QueryCommand({...params, ExclusiveStartKey: lastEvaluatedKey});

      const { LastEvaluatedKey, Items } = await this.DynamoDBClient.send(command);
      
      if (Items) {
        allItems = allItems.concat(Items);
      }

      lastEvaluatedKey = LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allItems;
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async batchWrite(items: Record<string, AttributeValue>[]) {
    const batches = [];
    while (items.length) {
      batches.push(items.splice(0, 25)); // DynamoDB BatchWriteItem has a limit of 25 items per batch
    }

    for (const batch of batches) {
      const params: BatchWriteItemCommandInput = {
        RequestItems: {
          [this.tableName]: batch.map(item => ({
            PutRequest: {
              Item: item
            }
          }))
        }
      };

      try {
        const command = new BatchWriteItemCommand(params)
        const result = await this.DynamoDBClient.send(command);
        // Retry unprocessed items
        if (result.UnprocessedItems?.[this.tableName]?.length) {
          items.push(...result.UnprocessedItems[this.tableName].map(request => request.PutRequest!.Item!));
        }
      } catch (error) {
        throw Error(`Error in batchWrite: ${error}`);
      }

      // Apply delay to adhere to provisioned throughput
      await this.delay(400); 
    }
  }

  async update(key: Record<string, string>, updateData: Record<string, unknown>, ReturnValues: ReturnValue = "NONE") {
    const params = this.generateUpdateParams(key, updateData, ReturnValues);
    const command = new UpdateItemCommand(params);
    return this.DynamoDBClient.send(command);
  }

  async delete(key: Record<string, string>) {
    const params = this.generateDeleteParams(key);
    const command = new DeleteItemCommand(params);
    return this.DynamoDBClient.send(command);
  }

  private generateGetParams(keyObject: {pk: string; sk: string}): GetItemCommandInput {
    const Key = marshall(keyObject);
    return {
      TableName: this.tableName,
      Key
    };
  }

  private generateQueryParams(pk: string, sk?: string): QueryCommandInput {
    return {
      TableName: this.tableName,
      ConsistentRead: false,
      ExpressionAttributeNames: {
        '#pk': 'pk',
        ...(sk ? {'#sk': 'sk',} : null),
      },
      ExpressionAttributeValues: {
        ':pk': convertToAttr(pk),
        ...(sk ? {':sk': convertToAttr(sk)} : null), 
      },
      KeyConditionExpression: sk ? '#pk = :pk and begins_with(#sk, :sk)' : "#pk = :pk"
    };
  }

  private generateUpdateParams(keyObject: Record<string, string>, updateData: Record<string, unknown>, ReturnValues: ReturnValue): UpdateItemCommandInput {
    const Key = marshall(keyObject);
    return {
      TableName: this.tableName,
      Key,
      ...this.generateUpdateExpression(updateData, ReturnValues)
    };
  }

  private generateDeleteParams(keyObject: Record<string, string>): DeleteItemCommandInput {
    const Key = marshall(keyObject);
    return {
      TableName: this.tableName,
      Key,
    };
  }

  private generateUpdateExpression(updateData: Record<string, unknown>, ReturnValues: ReturnValue): Omit<UpdateItemCommandInput, "Key" | "TableName"> {
    const updateParams: Omit<UpdateItemCommandInput, "Key" | "TableName"> = {
      UpdateExpression: "",
      ExpressionAttributeValues: {},
      ReturnValues: ReturnValues
    };
    const removeItems: string[] = [];
    Object.keys(updateData).forEach((key) => {
      const value = updateData[key];
      if(!isNil(value)) {
        updateParams.ExpressionAttributeValues![`:${key}`] = convertToAttr(value);
        updateParams.UpdateExpression += ` #${key} = :${key},`;
      } else {
        removeItems.push(key);
      }
      updateParams.ExpressionAttributeNames = { ...updateParams.ExpressionAttributeNames, [`#${key}`]: key };
    });

    // Format SET portion of UpdateExpression if something is being updated
    if(updateParams.UpdateExpression) {
      updateParams.UpdateExpression = "SET" + updateParams.UpdateExpression!.slice(0, -1);
    }
    
    // Add REMOVE string to UpdateExpression if something is being removed
    if(removeItems.length) {
      updateParams.UpdateExpression = removeItems.reduce((prev, removeKey, idx) => {
        if(idx + 1 === removeItems.length) {
          return prev + ` #${removeKey}`;
        }
        return prev + ` #${removeKey},`;
      }, updateParams.UpdateExpression ? updateParams.UpdateExpression + " REMOVE" : "REMOVE");
    }
    
    return updateParams;
  }
}

export default DynamoDBConnector;