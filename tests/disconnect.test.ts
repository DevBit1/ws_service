import { handler } from "../src/functions/disconnectHandler";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

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

describe("disconnectHandler", () => {
  beforeEach(() => {
    // Reset mocks before each test
    ddbMock.reset();
  });

  describe("$disconnect route", () => {
    it("should delete connection from ConnectionTable on $disconnect", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "$disconnect",
          connectionId: "test-connection-123",
        },
      };

      ddbMock.on(DeleteCommand).resolves({});

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    it("should return 500 when DynamoDB fails on $disconnect", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "$disconnect",
          connectionId: "test-connection-123",
        },
      };

      ddbMock.on(DeleteCommand).rejects(new Error("DynamoDB error"));

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(500);
    });
  });

  describe("disconnectGroup route", () => {
    it("should delete connection from GroupTable when groupId is provided", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "disconnectGroup",
          connectionId: "test-connection-456",
        },
        body: JSON.stringify({ groupId: "group-123" }),
      };

      ddbMock.on(DeleteCommand).resolves({});

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    it("should return 400 when groupId is missing", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "disconnectGroup",
          connectionId: "test-connection-456",
        },
        body: JSON.stringify({}),
      };

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    it("should handle empty body gracefully", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "disconnectGroup",
          connectionId: "test-connection-456",
        },
        body: "",
      };

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    it("should return 500 when DynamoDB fails on disconnectGroup", async () => {
      // Arrange
      const event = {
        requestContext: {
          routeKey: "disconnectGroup",
          connectionId: "test-connection-456",
        },
        body: JSON.stringify({ groupId: "group-123" }),
      };

      ddbMock.on(DeleteCommand).rejects(new Error("DynamoDB error"));

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(500);
    });
  });

  describe("Invalid cases", () => {
    it("should return 400 when routeKey is missing", async () => {
      // Arrange
      const event = {
        requestContext: {},
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
          connectionId: "test-connection-789",
        },
      };

      // Act
      const result = await handler(event as any);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
    });
  });
});
