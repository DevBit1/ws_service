import { APIGatewayEvent } from "aws-lambda";
import {
  getApiClient,
  getConnectionInfo,
  postMessage,
} from "../utils/webSocket";
import { ResponseObj } from "../utils/lambda";
import { logger } from "../utils/logger";

export const handler = async (event: APIGatewayEvent) => {
  try {
    logger.info("Received event in default handler: ", {
      eventData: event,
    });
    const connectionId = event.requestContext.connectionId!;

    const apiClient = getApiClient(
      event.requestContext.domainName!,
      event.requestContext.stage,
    );

    const info = await getConnectionInfo(apiClient, connectionId);

    await postMessage(apiClient, connectionId, JSON.stringify(info));

    return new ResponseObj(200);
  } catch (err) {
    logger.error("Error while connecting with default handler", err as Error);
    return new ResponseObj(500);
  }
};
