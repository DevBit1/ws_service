import { GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../utils/db";
import { APIGatewayEvent } from "aws-lambda";
import { getEnvValue, ResponseObj } from "../utils/lambda";
import { getApiClient, postMessage } from "../utils/webSocket";
import { logger } from "../utils/logger";
import { validate } from "../utils/validation";
import { sendMessageGroupSchema, sendMessageSchema } from "../utils/schemas";

export const handler = async function (event: APIGatewayEvent) {
  try {
    logger.info("Received event in send message handler: ", {
      eventData: event,
    });
    const routeKey = event?.requestContext?.routeKey || "";

    if (!routeKey) {
      return new ResponseObj(400);
    }

    const apiClient = getApiClient(
      event.requestContext.domainName!,
      event.requestContext.stage,
    );

    let command;

    switch (routeKey) {
      case "sendMessage": {
        const payload = validate(
          sendMessageSchema,
          JSON.parse(event?.body || "{}"),
        );
        if (!payload) {
          return new ResponseObj(400);
        }
        const getAllConnections = new ScanCommand({
          TableName: getEnvValue("CONNECTION_TABLE_NAME"),
        });

        const { Items = [] } = await docClient.send(getAllConnections);

        const allPromises = Items.map(async ({ connectionId }) => {
          if (connectionId === event.requestContext.connectionId) {
            return {};
          }

          await postMessage(apiClient, connectionId, payload.message);
        });

        await Promise.all(allPromises);

        break;
      }
      case "sendMessageGroup": {
        const payload = validate(
          sendMessageGroupSchema,
          JSON.parse(event?.body!),
        );
        if (!payload) {
          return new ResponseObj(400);
        }

        command = new GetCommand({
          TableName: getEnvValue("GROUP_TABLE_NAME"),
          Key: {
            groupId: payload.groupId,
            connectionId: event.requestContext.connectionId,
          },
        });

        const response = await docClient.send(command);

        if (!response?.Item) {
          return new ResponseObj(404);
        }

        command = new QueryCommand({
          TableName: getEnvValue("GROUP_TABLE_NAME"),
          KeyConditionExpression: "groupId = :grpId",
          ExpressionAttributeValues: {
            ":grpId": payload.groupId,
          },
        });

        const usersInGroup = await docClient.send(command);

        if (usersInGroup.Items) {
          const allPromises = usersInGroup.Items.map(
            async ({ connectionId }) => {
              if (connectionId === event.requestContext.connectionId) {
                return {};
              }

              await postMessage(apiClient, connectionId, payload.message);
            },
          );

          await Promise.all(allPromises);
        }

        break;
      }
      default:
        return new ResponseObj(400);
    }
    return new ResponseObj(200);
  } catch (err) {
    logger.error(
      "Error while connecting with send message handler",
      err as Error,
    );
    return new ResponseObj(500);
  }
};
