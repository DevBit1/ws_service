import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../utils/db";
import { APIGatewayEvent } from "aws-lambda";
import { getEnvValue, ResponseObj } from "../utils/lambda";

export const handler = async function (event: APIGatewayEvent) {
  try {
    console.log("Received Event Disconnect :", JSON.stringify(event, null, 2));

    const routeKey = event?.requestContext?.routeKey || "";

    if (!routeKey) {
      return new ResponseObj(400, {
        message: "Invalid route",
      });
    }

    let command;

    switch (routeKey) {
      case "$disconnect": {
        command = new DeleteCommand({
          TableName: getEnvValue("CONNECTION_TABLE_NAME"),
          Key: {
            connectionId: event.requestContext.connectionId,
          },
        });

        break;
      }
      case "disconnectGroup": {
        const payload = JSON.parse(event?.body || "{}");

        if (!payload?.groupId) {
          return new ResponseObj(400, {
            message: "Group Id is required to join a group",
          });
        }

        command = new DeleteCommand({
          TableName: getEnvValue("GROUP_TABLE_NAME"),
          Key: {
            groupId: payload.groupId,
            connectionId: event.requestContext.connectionId,
          },
        });

        break;
      }
      default:
        return new ResponseObj(400, {
          message: "Invalid route",
        });
    }

    await docClient.send(command);
  } catch (err) {
    console.log(err);
    return new ResponseObj(500, {
      message: err instanceof Error ? err.message : "Error when disconnecting",
    });
  }
};
