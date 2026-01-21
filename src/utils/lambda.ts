export function getEnvValue(key: string): string {
  console.log("Env values: ", process.env);
  const value = process.env[key];
  if (!value)
    throw new Error(`${key} is required - ${process.env[key]}, ${process.env.CONNECTION_TABLE_NAME}`);

  return value;
}

export interface Response {
  statusCode: number;
  // body: string;
}

export class ResponseObj implements Response {
  statusCode: number;

  constructor(statusCode: number) {
    this.statusCode = statusCode;
  }
}
