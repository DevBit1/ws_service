export function getEnvValue(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
}

export interface Response {
  statusCode: number;
}

export class ResponseObj implements Response {
  statusCode: number;

  constructor(statusCode: number) {
    this.statusCode = statusCode;
  }
}
