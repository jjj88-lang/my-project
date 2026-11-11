/** Weekday keys used in site.json. Kept free of other imports so client components can use it cheaply. */
export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];
