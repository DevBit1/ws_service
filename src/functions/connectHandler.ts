import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../utils/db";
import { APIGatewayEvent } from "aws-lambda";
import { getEnvValue, ResponseObj } from "../utils/lambda";
import { logger } from "../utils/logger";
import { validate } from "../utils/validation";
import { connectGroupSchema } from "../utils/schemas";

export const handler = async function (event: APIGatewayEvent) {
  try {
    logger.info("Event received : ", {
      eventData: event,
    });

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
        const payload = validate(
          connectGroupSchema,
          JSON.parse(event?.body || "{}"),
        );

        if (!payload) {
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
    logger.error("Error while connecting with connect handler", err as Error);
    return new ResponseObj(500);
  }
};
