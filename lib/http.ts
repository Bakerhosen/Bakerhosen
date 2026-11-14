import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function sameOrigin(r: Request) {
  if (r.headers.get("origin") !== new URL(r.url).origin)
    throw new HttpError(403, "Request origin is not allowed.");
}
export function failure(e: unknown) {
  return NextResponse.json(
    {
      error:
        e instanceof ZodError
          ? e.issues[0].message
          : e instanceof HttpError
            ? e.message
            : process.env.DATABASE_URL
              ? "Unable to load or save. Please try again."
              : "Connect Supabase first. See README.md.",
    },
    {
      status:
        e instanceof ZodError || e instanceof SyntaxError
          ? 400
          : e instanceof HttpError
            ? e.status
            : 503,
    },
  );
}
