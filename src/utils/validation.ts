import { z, ZodError } from "zod";
import { logger } from "./logger";

export const validate = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): T | undefined => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error("Validation error:", error);
    }
    return undefined;
  }
};
