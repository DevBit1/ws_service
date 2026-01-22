process.env.CONNECTION_TABLE_NAME = "test-connection-table";
process.env.GROUP_TABLE_NAME = "test-group-table";
process.env.AWS_REGION_OP = "us-east-1";
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});