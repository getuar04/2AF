import { NextFunction, Request, Response } from "express";
import { AppError } from "../../../app/errors/appError";

type FieldRule = {
  type?: "string" | "email";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
};

type Schema = Record<string, FieldRule>;

export function validateBody(schema: Schema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const body = req.body as Record<string, unknown>;

    if (!body || typeof body !== "object") {
      next(new AppError("Request body is required", 400, "INVALID_BODY"));
      return;
    }

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];

      if (
        rules.required &&
        (value === undefined || value === null || value === "")
      ) {
        next(new AppError(`${field} is required`, 400, "MISSING_FIELD"));
        return;
      }

      if (value === undefined || value === null || value === "") continue;

      if (rules.type === "string" && typeof value !== "string") {
        next(
          new AppError(`${field} must be a string`, 400, "INVALID_FIELD_TYPE"),
        );
        return;
      }

      if (rules.type === "email") {
        if (
          typeof value !== "string" ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
        ) {
          next(
            new AppError(
              `${field} must be a valid email`,
              400,
              "INVALID_EMAIL",
            ),
          );
          return;
        }
      }

      if (
        rules.minLength &&
        typeof value === "string" &&
        value.trim().length < rules.minLength
      ) {
        next(
          new AppError(
            `${field} must be at least ${rules.minLength} characters`,
            400,
            "FIELD_TOO_SHORT",
          ),
        );
        return;
      }

      if (
        rules.maxLength &&
        typeof value === "string" &&
        value.length > rules.maxLength
      ) {
        next(
          new AppError(
            `${field} must be at most ${rules.maxLength} characters`,
            400,
            "FIELD_TOO_LONG",
          ),
        );
        return;
      }
    }

    next();
  };
}
