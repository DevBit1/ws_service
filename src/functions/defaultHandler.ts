import { APIGatewayEvent } from "aws-lambda";
import {
  getApiClient,
  getConnectionInfo,
  postMessage,
} from "../utils/webSocket";
import { ResponseObj } from "../utils/lambda";

export const handler = async (event: APIGatewayEvent) => {
  try {
    console.log(JSON.stringify(event, null, 2));
    const connectionId = event.requestContext.connectionId!;

    const apiClient = getApiClient(
      event.requestContext.domainName!,
      event.requestContext.stage,
    );

    const info = await getConnectionInfo(apiClient, connectionId);

    await postMessage(apiClient, connectionId, JSON.stringify(info));

    return new ResponseObj(200);
  } catch (err) {
    console.log(err);
    return new ResponseObj(500);
  }
};
