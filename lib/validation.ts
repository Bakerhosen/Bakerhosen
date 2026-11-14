import { z } from "zod";
export const titleSchema = z.string().trim().min(1).max(100);
export const nicknameSchema = z.string().trim().min(1).max(40);
export const mapsSchema = z
  .string()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    try {
      const u = new URL(value);
      return (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        (u.hostname === "maps.app.goo.gl" ||
          (u.hostname === "goo.gl" && u.pathname.startsWith("/maps")) ||
          (/^(www\.)?google\.(com|at|de|co\.uk)$/.test(u.hostname) &&
            u.pathname.startsWith("/maps")) ||
          u.hostname === "maps.google.com")
      );
    } catch {
      return false;
    }
  }, "Use an HTTPS Google Maps link.");
export const optionSchema = z.object({
  place: z.string().trim().min(1).max(120),
  localTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  mapsUrl: mapsSchema,
});
