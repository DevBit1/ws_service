export function getEnvValue(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required`);

  return value;
}

export interface Response {
  statusCode: number;
  body: string;
}

export class ResponseObj implements Response {
  statusCode: number;
  body: string;

  constructor(statusCode: number, body: Record<string, any>) {
    this.statusCode = statusCode;
    this.body = JSON.stringify(body);
  }
}