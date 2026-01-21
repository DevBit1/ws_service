import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../utils/db";
import { APIGatewayEvent } from "aws-lambda";
import { getEnvValue, ResponseObj } from "../utils/lambda";

export const handler = async function (event: APIGatewayEvent) {
  try {
    console.log("Received Event Connect :", JSON.stringify(event, null, 2));

    const routeKey = event?.requestContext?.routeKey || "";

    if (!routeKey) {
      return new ResponseObj(400);
    }

    let command;

    switch (routeKey) {
      case "$connect": {
        command = new PutCommand({
          TableName: getEnvValue("CONNECTION_TABLE_NAME"),
          Item: {
            connectionId: event.requestContext.connectionId,
          },
        });

        break;
      }
      case "connectGroup": {
        const payload = JSON.parse(event?.body || "{}");

        if (!payload?.groupId) {
          return new ResponseObj(400);
        }

        command = new PutCommand({
          TableName: getEnvValue("GROUP_TABLE_NAME"),
          Item: {
            groupId: payload.groupId,
            connectionId: event.requestContext.connectionId,
          },
        });

        break;
      }
      default:
        return new ResponseObj(400);
    }

    await docClient.send(command);
    return new ResponseObj(200);
  } catch (err) {
    console.log(err);
    return new ResponseObj(500);
  }
};
