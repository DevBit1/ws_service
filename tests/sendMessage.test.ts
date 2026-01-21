import { handler } from "../src/functions/sendMessage";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

// Mock the DynamoDB client
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the lambda utility module
jest.mock("../src/utils/lambda", () => ({
  getEnvValue: jest.fn((key: string) => {
    const envMap: Record<string, string> = {
      CONNECTION_TABLE_NAME: "test-connection-table",
      GROUP_TABLE_NAME: "test-group-table",
      AWS_REGION_OP: "us-east-1",
    };
    return envMap[key] || "";
  }),
  ResponseObj: jest.requireActual("../src/utils/lambda").ResponseObj,
}));

// Mock the webSocket utility module
const mockPostMessage = jest.fn();
const mockGetApiClient = jest.fn().mockImplementation(() => "random-api-client");

jest.mock("../src/utils/webSocket", () => ({
  getApiClient: () => mockGetApiClient(),
  postMessage: (client: any, connectionId: string, message: string) =>
    mockPostMessage(client, connectionId, message),
}));

describe("sendMessage handler", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    ddbMock.reset();
    mockPostMessage.mockClear();
    mockGetApiClient.mockClear();
  });

  describe("sendMessage route", () => {
    it("should send message to all connections except sender", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "sendMessage",
          connectionId: "sender-connection-123",
          domainName: "test.execute-api.us-east-1.amazonaws.com",
          stage: "v1",
        },
        body: JSON.stringify({ message: "Hello everyone!" }),
      };

      ddbMock.on(ScanCommand).resolves({
        Items: [
          { connectionId: "sender-connection-123" },
          { connectionId: "receiver-connection-456" },
          { connectionId: "receiver-connection-789" },
        ],
      });

      mockPostMessage.mockResolvedValue({});

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(ddbMock.calls()).toHaveLength(1);
      expect(mockPostMessage).toHaveBeenCalledTimes(2); // Not called for sender
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.anything(),
        "receiver-connection-456",
        "Hello everyone!",
      );
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.anything(),
        "receiver-connection-789",
        "Hello everyone!",
      );
    });

    it("should handle empty connections list", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "sendMessage",
          connectionId: "sender-connection-123",
          domainName: "test.execute-api.us-east-1.amazonaws.com",
          stage: "v1",
        },
        body: JSON.stringify({ message: "Hello!" }),
      };

      ddbMock.on(ScanCommand).resolves({ Items: [] });

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it("should return 400 when message is missing", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "sendMessage",
          connectionId: "sender-connection-123",
          domainName: "test.execute-api.us-east-1.amazonaws.com",
          stage: "v1",
        },
        body: JSON.stringify({}),
      };

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });

  describe("sendMessageGroup route", () => {
    it("should send message to all group members except sender", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "sendMessageGroup",
          connectionId: "sender-connection-123",
          domainName: "test.execute-api.us-east-1.amazonaws.com",
          stage: "v1",
        },
        body: JSON.stringify({
          groupId: "group-456",
          message: "Hello group!",
        }),
      };

      // Mock GetCommand to verify sender is in group
      ddbMock.on(GetCommand).resolves({
        Item: {
          groupId: "group-456",
          connectionId: "sender-connection-123",
        },
      });

      // Mock QueryCommand to get all group members
      ddbMock.on(QueryCommand).resolves({
        Items: [
          { groupId: "group-456", connectionId: "sender-connection-123" },
          { groupId: "group-456", connectionId: "member-connection-456" },
          { groupId: "group-456", connectionId: "member-connection-789" },
        ],
      });

      mockPostMessage.mockResolvedValue({});

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(ddbMock.calls()).toHaveLength(2); // GetCommand + QueryCommand
      expect(mockPostMessage).toHaveBeenCalledTimes(2); // Not called for sender
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.anything(),
        "member-connection-456",
        "Hello group!",
      );
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.anything(),
        "member-connection-789",
        "Hello group!",
      );
    });

    it("should return 400 when groupId is missing", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "sendMessageGroup",
          connectionId: "sender-connection-123",
          domainName: "test.execute-api.us-east-1.amazonaws.com",
          stage: "v1",
        },
        body: JSON.stringify({ message: "Hello!" }),
      };

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it("should return 404 when sender is not in the group", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "sendMessageGroup",
          connectionId: "sender-connection-123",
          domainName: "test.execute-api.us-east-1.amazonaws.com",
          stage: "v1",
        },
        body: JSON.stringify({
          groupId: "group-456",
          message: "Hello!",
        }),
      };

      // Mock GetCommand to return no item (sender not in group)
      ddbMock.on(GetCommand).resolves({});

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(ddbMock.calls()).toHaveLength(1); // Only GetCommand
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it("should handle empty group members list", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "sendMessageGroup",
          connectionId: "sender-connection-123",
          domainName: "test.execute-api.us-east-1.amazonaws.com",
          stage: "v1",
        },
        body: JSON.stringify({
          groupId: "group-456",
          message: "Hello!",
        }),
      };

      ddbMock.on(GetCommand).resolves({
        Item: { groupId: "group-456", connectionId: "sender-connection-123" },
      });

      ddbMock.on(QueryCommand).resolves({ Items: [] });

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it("should return 400 when message is missing", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "sendMessageGroup",
          connectionId: "sender-connection-123",
          domainName: "test.execute-api.us-east-1.amazonaws.com",
          stage: "v1",
        },
        body: JSON.stringify({ groupId: "group-456" }),
      };

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });

  describe("Invalid cases", () => {
    it("should return 400 when routeKey is missing", async () => {
      // Arrange
      const event = {
        requestContext: {
          domainName: "test.execute-api.us-east-1.amazonaws.com",
          stage: "v1",
        },
        body: JSON.stringify({ message: "Hello!" }),
      };

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    it("should return 400 for unknown route", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "unknownRoute",
          connectionId: "test-connection-123",
          domainName: "test.execute-api.us-east-1.amazonaws.com",
          stage: "v1",
        },
        body: JSON.stringify({ message: "Hello!" }),
      };

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    it("should return 400 when body is empty", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "sendMessage",
          connectionId: "test-connection-123",
          domainName: "test.execute-api.us-east-1.amazonaws.com",
          stage: "v1",
        },
        body: "",
      };

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    it("should return 500 when DynamoDB scan fails", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "sendMessage",
          connectionId: "sender-connection-123",
          domainName: "test.execute-api.us-east-1.amazonaws.com",
          stage: "v1",
        },
        body: JSON.stringify({ message: "Hello!" }),
      };

      ddbMock.on(ScanCommand).rejects(new Error("DynamoDB error"));

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(500);
    });

    it("should return 500 when DynamoDB query fails", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "sendMessageGroup",
          connectionId: "sender-connection-123",
          domainName: "test.execute-api.us-east-1.amazonaws.com",
          stage: "v1",
        },
        body: JSON.stringify({
          groupId: "group-456",
          message: "Hello!",
        }),
      };

      ddbMock.on(GetCommand).resolves({
        Item: { groupId: "group-456", connectionId: "sender-connection-123" },
      });

      ddbMock.on(QueryCommand).rejects(new Error("DynamoDB error"));

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(500);
    });
  });
});
