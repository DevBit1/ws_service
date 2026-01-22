import { handler } from "../src/functions/disconnectHandler";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddbMock = mockClient(DynamoDBDocumentClient);

describe("disconnectHandler", () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe("$disconnect route", () => {
    it("should delete connection from ConnectionTable on $disconnect", async () => {
      const event = {
        requestContext: {
          routeKey: "$disconnect",
          connectionId: "test-connection-123",
        },
      };

      ddbMock.on(DeleteCommand).resolves({});

      
      const result = await handler(event as any);

      
      expect(result.statusCode).toBe(200);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    it("should return 500 when DynamoDB fails on $disconnect", async () => {
      
      const event = {
        requestContext: {
          routeKey: "$disconnect",
          connectionId: "test-connection-123",
        },
      };

      ddbMock.on(DeleteCommand).rejects(new Error("DynamoDB error"));

      
      const result = await handler(event as any);

      
      expect(result.statusCode).toBe(500);
    });
  });

  describe("disconnectGroup route", () => {
    it("should delete connection from GroupTable when groupId is provided", async () => {
      
      const event = {
        requestContext: {
          routeKey: "disconnectGroup",
          connectionId: "test-connection-456",
        },
        body: JSON.stringify({ groupId: "group-123" }),
      };

      ddbMock.on(DeleteCommand).resolves({});

      
      const result = await handler(event as any);

      
      expect(result.statusCode).toBe(200);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    it("should return 400 when groupId is missing", async () => {
      
      const event = {
        requestContext: {
          routeKey: "disconnectGroup",
          connectionId: "test-connection-456",
        },
        body: JSON.stringify({}),
      };

      
      const result = await handler(event as any);

      
      expect(result.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    it("should handle empty body gracefully", async () => {
      
      const event = {
        requestContext: {
          routeKey: "disconnectGroup",
          connectionId: "test-connection-456",
        },
        body: "",
      };

      
      const result = await handler(event as any);

      
      expect(result.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    it("should return 500 when DynamoDB fails on disconnectGroup", async () => {
      
      const event = {
        requestContext: {
          routeKey: "disconnectGroup",
          connectionId: "test-connection-456",
        },
        body: JSON.stringify({ groupId: "group-123" }),
      };

      ddbMock.on(DeleteCommand).rejects(new Error("DynamoDB error"));

      
      const result = await handler(event as any);

      
      expect(result.statusCode).toBe(500);
    });
  });

  describe("Invalid cases", () => {
    it("should return 400 when routeKey is missing", async () => {
      
      const event = {
        requestContext: {},
      };

      
      const result = await handler(event as any);

      
      expect(result.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    it("should return 400 for unknown route", async () => {
      
      const event = {
        requestContext: {
          routeKey: "unknownRoute",
          connectionId: "test-connection-789",
        },
      };

      
      const result = await handler(event as any);

      
      expect(result.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
    });
  });
});
