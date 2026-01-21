import { handler } from "../src/functions/connectHandler";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbMock = mockClient(DynamoDBDocumentClient);

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

describe("connectHandler", () => {
    
  beforeAll(() => {
    process.env = {

    }
  });

  beforeEach(() => {
    ddbMock.reset();
  });

  describe("$connect route", () => {
    it("should save connection to ConnectionTable on $connect", async () => {
      const event = {
        requestContext: {
          routeKey: "$connect",
          connectionId: "test-connection-123",
        },
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await handler(event as any);

      expect(result.statusCode).toBe(200);
      expect(ddbMock.calls()).toHaveLength(1);

      const putCall = ddbMock.call(0).args[0].input as any;
      expect(putCall.TableName).toBe("test-connection-table");
      expect(putCall.Item).toEqual({
        connectionId: "test-connection-123",
      });
    });

    it("should return 500 when DynamoDB fails on $connect", async () => {
      const event = {
        requestContext: {
          routeKey: "$connect",
          connectionId: "test-connection-123",
        },
      };

      ddbMock.on(PutCommand).rejects(new Error("DynamoDB error"));

      const result = await handler(event as any);

      expect(result.statusCode).toBe(500);
    });
  });

  describe("connectGroup route", () => {
    it("should save connection to GroupTable when groupId is provided", async () => {
      const event = {
        requestContext: {
          routeKey: "connectGroup",
          connectionId: "test-connection-456",
        },
        body: JSON.stringify({ groupId: "group-123" }),
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await handler(event as any);

      expect(result.statusCode).toBe(200);
      expect(ddbMock.calls()).toHaveLength(1);

      const putCall = ddbMock.call(0).args[0].input as any;
      expect(putCall.TableName).toBe("test-group-table");
      expect(putCall.Item).toEqual({
        groupId: "group-123",
        connectionId: "test-connection-456",
      });
    });

    it("should return 400 when groupId is missing", async () => {
      const event = {
        requestContext: {
          routeKey: "connectGroup",
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
          routeKey: "connectGroup",
          connectionId: "test-connection-456",
        },
        body: "",
      };

      const result = await handler(event as any);

      expect(result.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    it("should return 500 when DynamoDB fails on connectGroup", async () => {
      const event = {
        requestContext: {
          routeKey: "connectGroup",
          connectionId: "test-connection-456",
        },
        body: JSON.stringify({ groupId: "group-123" }),
      };

      ddbMock.on(PutCommand).rejects(new Error("DynamoDB error"));

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
