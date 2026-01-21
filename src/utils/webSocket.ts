import {
  ApiGatewayManagementApiClient,
  GetConnectionCommand,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { getEnvValue } from "./lambda";

export const getApiClient = (domainName: string, stage: string) => {
  return new ApiGatewayManagementApiClient({
    region: getEnvValue("AWS_REGION_OP"),
    endpoint: `https://${domainName}/${stage}`,
  });
};

export const postMessage = async (
  apiClient: ApiGatewayManagementApiClient,
  connectionId: string,
  message: string,
) => {
  try {
    await apiClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: message,
      }),
    );
  } catch (error) {
    console.error(`Error while sending message to - ${connectionId}`);
  }
};

export const getConnectionInfo = async (
  apiClient: ApiGatewayManagementApiClient,
  connectionId: string,
) => {
  try {
    return await apiClient.send(
      new GetConnectionCommand({
        ConnectionId: connectionId,
      }),
    );
  } catch (error) {
    console.error(`Error while sending message to - ${connectionId}`);
  }
};
