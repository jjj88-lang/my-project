/**
 * The agency that builds and maintains these sites. One place to change when the
 * agency's name or address changes. NEXT_PUBLIC_* values can be set per deployment.
 */
export const studio = {
  name: process.env.NEXT_PUBLIC_STUDIO_NAME ?? "Sidework Studio",
  url: process.env.NEXT_PUBLIC_STUDIO_URL ?? "",
};
