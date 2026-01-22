import {
  getApiClient,
  postMessage,
  getConnectionInfo,
} from "../src/utils/webSocket";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GetConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

jest.mock("@aws-sdk/client-apigatewaymanagementapi");

describe("webSocket utilities", () => {
  let mockSend: jest.Mock;
  let mockClient: any;

  beforeEach(() => {
    mockSend = jest.fn();
    mockClient = {
      send: mockSend,
    };

    (ApiGatewayManagementApiClient as jest.Mock).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getApiClient", () => {
    it("should create an API client with correct configuration", () => {
      const domainName = "test.execute-api.us-east-1.amazonaws.com";
      const stage = "v1";

      const client = getApiClient(domainName, stage);

      expect(ApiGatewayManagementApiClient).toHaveBeenCalledWith({
        region: "us-east-1",
        endpoint: `https://${domainName}/${stage}`,
      });
      expect(client).toBe(mockClient);
    });
  });

  describe("postMessage", () => {
    it("should send message to connection successfully", async () => {
      const connectionId = "test-connection-123";
      const message = "Hello, World!";

      mockSend.mockResolvedValue({});

      await postMessage(mockClient, connectionId, message);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(PostToConnectionCommand);
    });

    it("should throw error when sending message fails", async () => {
      const connectionId = "test-connection-456";
      const message = "Test message";
      const error = new Error("Connection failed");

      mockSend.mockRejectedValue(error);

      await expect(
        postMessage(mockClient, connectionId, message)
      ).rejects.toThrow("Connection failed");

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe("getConnectionInfo", () => {
    it("should get connection info successfully", async () => {
      const connectionId = "test-connection-789";
      const mockConnectionInfo = {
        ConnectedAt: "2024-01-01T00:00:00Z",
        Identity: { SourceIp: "192.168.1.1" },
      };

      mockSend.mockResolvedValue(mockConnectionInfo);

      const result = await getConnectionInfo(mockClient, connectionId);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(GetConnectionCommand);
      expect(result).toEqual(mockConnectionInfo);
    });

    it("should throw error when getting connection info fails", async () => {
      const connectionId = "test-connection-000";
      const error = new Error("Connection not found");

      mockSend.mockRejectedValue(error);

      await expect(
        getConnectionInfo(mockClient, connectionId)
      ).rejects.toThrow("Connection not found");

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });
});