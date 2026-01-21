import { GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../utils/db";
import { APIGatewayEvent } from "aws-lambda";
import { getEnvValue, ResponseObj } from "../utils/lambda";
import { getApiClient, postMessage } from "../utils/webSocket";

export const handler = async function (event: APIGatewayEvent) {
  try {
    console.log(
      "Received Event Send message :",
      JSON.stringify(event, null, 2),
    );

    const routeKey = event?.requestContext?.routeKey || "";

    if (!routeKey) {
      return new ResponseObj(400);
    }

    const payload = JSON.parse(event?.body || "{}");

    if (!payload?.message) {
      return new ResponseObj(400);
    }

    const apiClient = getApiClient(
      event.requestContext.domainName!,
      event.requestContext.stage,
    );

    let command;

    switch (routeKey) {
      case "sendMessage": {
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
        if (!payload?.groupId) {
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

        const allPromises = usersInGroup.Items?.map(
          async ({ connectionId }) => {
            if (connectionId === event.requestContext.connectionId) {
              return {};
            }

            await postMessage(apiClient, connectionId, payload.message);
          },
        );

        await Promise.all(allPromises!);

        break;
      }
      default:
        return new ResponseObj(400);
    }
    return new ResponseObj(200);
  } catch (err) {
    console.log(err);
    return new ResponseObj(500);
  }
};
