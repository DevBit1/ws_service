import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getEnvValue } from "./lambda";

const client = new DynamoDBClient({
  region: getEnvValue("AWS_REGION_OP"),
});
export const docClient = DynamoDBDocumentClient.from(client);
