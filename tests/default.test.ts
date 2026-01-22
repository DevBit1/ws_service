import { handler } from "../src/functions/defaultHandler";

const mockGetApiClient = jest.fn();
const mockGetConnectionInfo = jest.fn();
const mockPostMessage = jest.fn();

jest.mock("../src/utils/webSocket", () => ({
  getApiClient: (domainName: string, stage: string) =>
    mockGetApiClient(domainName, stage),
  getConnectionInfo: (client: any, connectionId: string) =>
    mockGetConnectionInfo(client, connectionId),
  postMessage: (client: any, connectionId: string, message: string) =>
    mockPostMessage(client, connectionId, message),
}));

describe("defaultHandler", () => {
  beforeEach(() => {
    mockGetApiClient.mockClear();
    mockGetConnectionInfo.mockClear();
    mockPostMessage.mockClear();
  });

  it("should get connection info and send it back to the client", async () => {
    const event = {
      requestContext: {
        connectionId: "test-connection-123",
        domainName: "test.execute-api.us-east-1.amazonaws.com",
        stage: "v1",
      },
    };

    const mockApiClient = { endpoint: "mock-endpoint" };
    const mockConnectionInfo = {
      ConnectedAt: "2024-01-01T00:00:00Z",
      Identity: { SourceIp: "192.168.1.1" },
    };

    mockGetApiClient.mockReturnValue(mockApiClient);
    mockGetConnectionInfo.mockResolvedValue(mockConnectionInfo);
    mockPostMessage.mockResolvedValue({});

    const result = await handler(event as any);

    expect(result.statusCode).toBe(200);
    expect(mockGetApiClient).toHaveBeenCalledWith(
      "test.execute-api.us-east-1.amazonaws.com",
      "v1",
    );
    expect(mockGetConnectionInfo).toHaveBeenCalledWith(
      mockApiClient,
      "test-connection-123",
    );
    expect(mockPostMessage).toHaveBeenCalledWith(
      mockApiClient,
      "test-connection-123",
      JSON.stringify(mockConnectionInfo),
    );
  });

  it("should return 500 when getConnectionInfo fails", async () => {
    const event = {
      requestContext: {
        connectionId: "test-connection-789",
        domainName: "test.execute-api.us-east-1.amazonaws.com",
        stage: "v1",
      },
    };

    const mockApiClient = { endpoint: "mock-endpoint" };

    mockGetApiClient.mockReturnValue(mockApiClient);
    mockGetConnectionInfo.mockRejectedValue(new Error("Connection info error"));

    const result = await handler(event as any);

    expect(result.statusCode).toBe(500);
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it("should return 500 when postMessage fails", async () => {
    const event = {
      requestContext: {
        connectionId: "test-connection-999",
        domainName: "test.execute-api.us-east-1.amazonaws.com",
        stage: "v1",
      },
    };

    const mockApiClient = { endpoint: "mock-endpoint" };
    const mockConnectionInfo = {
      ConnectedAt: "2024-01-01T00:00:00Z",
    };

    mockGetApiClient.mockReturnValue(mockApiClient);
    mockGetConnectionInfo.mockResolvedValue(mockConnectionInfo);
    mockPostMessage.mockRejectedValue(new Error("Post message error"));

    const result = await handler(event as any);

    expect(result.statusCode).toBe(500);
    expect(mockGetConnectionInfo).toHaveBeenCalled();
  });

  it("should return 500 when getApiClient fails", async () => {
    const event = {
      requestContext: {
        connectionId: "test-connection-000",
        domainName: "test.execute-api.us-east-1.amazonaws.com",
        stage: "v1",
      },
    };

    mockGetApiClient.mockImplementation(() => {
      throw new Error("API client error");
    });

    const result = await handler(event as any);

    expect(result.statusCode).toBe(500);
    expect(mockGetConnectionInfo).not.toHaveBeenCalled();
    expect(mockPostMessage).not.toHaveBeenCalled();
  });
});
