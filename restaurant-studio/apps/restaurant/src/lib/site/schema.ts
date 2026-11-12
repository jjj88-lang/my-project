/**
 * The shape of a client's site.json and menu.json.
 *
 * This file is the single source of truth for what a client site can contain.
 * - `npm run validate` checks a client's files against it and prints readable errors.
 * - `schema/*.schema.json` is generated from it so editors autocomplete the JSON files.
 *
 * Keep it dependency-free (zod only) so scripts, tests and the app can all import it.
 */
import { z } from "zod";

import { DAYS } from "./days";

export { DAYS, type Day } from "./days";

/** Line-art motifs used when a slot has no photo yet. */
export const ART_MOTIFS = [
  "flame",
  "nigiri",
  "maki",
  "sake",
  "bowl",
  "grill",
  "rings",
  "leaf",
  "chopsticks",
  "fish",
  "tongs",
  "cup",
] as const;
export type ArtMotif = (typeof ART_MOTIFS)[number];

export const FONT_PRESETS = ["editorial", "modern", "classic"] as const;
export type FontPreset = (typeof FONT_PRESETS)[number];

const hex = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{6})$/, 'Use a 6-digit hex color, for example "#1a1a1a"');

const time = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour "HH:MM", for example "16:30"');

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use "YYYY-MM-DD", for example "2026-12-24"');

const httpUrl = z
  .string()
  .regex(/^https?:\/\/[^\s]+$/, 'Use a full web address starting with "https://"');

/** A photo slot. If there is no photo yet, the site draws the `art` motif instead. */
export const mediaSchema = z
  .object({
    image: z
      .string()
      .min(1)
      .optional()
      .describe("File name inside the client's images/ folder, e.g. \"hero.jpg\""),
    alt: z
      .string()
      .optional()
      .describe("What the photo shows, for screen readers and search engines. Required with an image."),
    art: z.enum(ART_MOTIFS).optional().describe("Line-art motif drawn when there is no photo"),
    focus: z
      .enum(["center", "top", "bottom", "left", "right"])
      .default("center")
      .describe("Which part of the photo to keep when it is cropped"),
  })
  .refine((m) => !m.image || (m.alt !== undefined && m.alt.trim().length >= 4), {
    message: "Add alt text describing the photo (required whenever an image is set)",
    path: ["alt"],
  });
export type Media = z.infer<typeof mediaSchema>;

const linkSchema = z.object({
  url: httpUrl.optional().describe("Leave out until the client's real link is known"),
  label: z.string().min(1).optional(),
  provider: z.string().optional().describe('e.g. "Toast", "Square", "OpenTable"'),
});

const hoursIntervalSchema = z.object({
  days: z.array(z.enum(DAYS)).min(1),
  open: time,
  close: time.describe("May be after midnight, e.g. open 17:00, close 01:00"),
});

const hoursExceptionSchema = z
  .object({
    date: isoDate,
    label: z.string().optional().describe('e.g. "Thanksgiving"'),
    closed: z.boolean().default(false),
    open: time.optional(),
    close: time.optional(),
  })
  .refine((e) => e.closed || (e.open && e.close), {
    message: 'Give "open" and "close" times, or set "closed": true',
    path: ["open"],
  });

const titledText = z.object({ title: z.string().min(1), text: z.string().min(1) });

export const siteSchema = z.object({
  $schema: z.string().optional(),

  plan: z
    .enum(["starter", "premium"])
    .describe("starter = one-page site. premium = multi-page site with gallery, contact form and more."),
  sample: z
    .boolean()
    .default(false)
    .describe("true only for fictional demo sites: shows a 'Sample concept' label and blocks search engines."),

  name: z.string().min(1).describe('Restaurant name as guests know it, e.g. "Hibana"'),
  descriptor: z.string().optional().describe('Short descriptor shown with the name, e.g. "Hibachi & Sushi"'),
  tagline: z.string().min(1),
  description: z
    .string()
    .min(50, "Write at least a sentence or two (50+ characters)")
    .max(200, "Keep it under 200 characters so search engines show all of it")
    .describe("One or two sentences for search results and link previews."),
  cuisines: z.array(z.string().min(1)).min(1),
  priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
  url: httpUrl.describe("The site's public address. Used for search engines and link previews."),
  timezone: z
    .string()
    .min(1)
    .describe('IANA time zone, e.g. "America/Chicago" or "America/New_York". Drives the "Open now" badge.'),

  logo: z
    .object({
      image: z.string().optional().describe("Logo file in images/ (SVG or PNG with transparent background)"),
      imageAlt: z.string().optional(),
      text: z.string().optional().describe("Wordmark text if there is no logo image. Defaults to the name."),
      mark: z.enum(ART_MOTIFS).optional().describe("Small line-art mark shown next to the wordmark"),
    })
    .default({}),

  theme: z.object({
    colors: z.object({
      background: hex,
      text: hex,
      accent: hex.describe("Brand color for buttons and highlights"),
      accentText: hex.optional().describe("Text color on top of the accent color. Picked automatically if omitted."),
      surface: hex.optional().describe("Card background. Derived from background if omitted."),
    }),
    fonts: z.enum(FONT_PRESETS).default("editorial"),
    corners: z.enum(["sharp", "soft", "round"]).default("soft"),
    hero: z
      .enum(["cinematic", "split"])
      .default("cinematic")
      .describe("cinematic = full-width photo behind the headline. split = headline beside the photo."),
  }),

  contact: z.object({
    phone: z.string().min(7).describe('As displayed, e.g. "(785) 555-0142"'),
    email: z.email().optional().describe("Public business email shown on the site (optional)"),
    address: z.object({
      street: z.string().min(1),
      street2: z.string().optional(),
      city: z.string().min(1),
      region: z.string().min(2).describe('State abbreviation, e.g. "KS"'),
      postalCode: z.string().min(3),
      country: z.string().default("US"),
    }),
    geo: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
    mapsUrl: httpUrl
      .optional()
      .describe("Link to the restaurant's Google Maps listing. If omitted, a directions link is built from the address."),
    neighborhood: z.string().optional().describe('e.g. "Downtown" or "next to the Westridge Mall"'),
    parking: z.string().optional(),
  }),

  hours: z.object({
    regular: z.array(hoursIntervalSchema).min(1),
    notes: z.array(z.string()).default([]),
    exceptions: z.array(hoursExceptionSchema).default([]),
  }),

  links: z
    .object({
      order: linkSchema.optional(),
      reserve: linkSchema.optional(),
      giftCards: linkSchema.optional(),
      social: z
        .object({
          instagram: httpUrl.optional(),
          facebook: httpUrl.optional(),
          tiktok: httpUrl.optional(),
          yelp: httpUrl.optional(),
          google: httpUrl.optional(),
        })
        .default({}),
    })
    .default({ social: {} }),

  announcement: z
    .object({
      text: z.string().min(1).max(140),
      href: z.string().optional(),
      until: isoDate.optional().describe("Stop showing the announcement after this date"),
    })
    .optional(),

  hero: z.object({
    eyebrow: z.string().optional(),
    headline: z.string().min(1),
    subhead: z.string().optional(),
    media: mediaSchema.default({ focus: "center" }),
    embers: z.boolean().default(false).describe("Slow rising sparks over the hero (suits grill and fire concepts)"),
  }),

  intro: z.object({
    eyebrow: z.string().optional(),
    heading: z.string().min(1),
    body: z.array(z.string().min(1)).min(1),
    media: mediaSchema.optional(),
    highlights: z.array(titledText).max(4).default([]),
  }),

  featured: z
    .object({
      eyebrow: z.string().optional(),
      heading: z.string().default("From the menu"),
      intro: z.string().optional(),
    })
    .default({ heading: "From the menu" }),

  experiences: z
    .array(
      z.object({
        eyebrow: z.string().optional(),
        title: z.string().min(1),
        body: z.string().min(1),
        media: mediaSchema.default({ focus: "center" }),
        cta: z.object({ label: z.string().min(1), href: z.string().min(1) }).optional(),
      }),
    )
    .max(4)
    .default([]),

  gallery: z
    .object({
      heading: z.string().default("Gallery"),
      intro: z.string().optional(),
      images: z
        .array(
          z.object({
            image: z.string().min(1),
            alt: z.string().min(4, "Describe the photo in a few words"),
            caption: z.string().optional(),
          }),
        )
        .default([]),
    })
    .default({ heading: "Gallery", images: [] }),

  catering: z
    .object({
      enabled: z.boolean().default(false),
      form: z
        .boolean()
        .default(false)
        .describe("true when the client bought the Catering Inquiry Automation add-on"),
      heading: z.string().default("Catering & private events"),
      intro: z.string().default(""),
      points: z.array(z.string().min(1)).max(6).default([]),
      serviceTypes: z.array(z.string().min(1)).min(1).default(["Pickup", "Delivery"]),
      minGuests: z.number().int().min(1).default(10),
      maxGuests: z.number().int().min(1).default(500),
      leadTimeDays: z
        .number()
        .int()
        .min(0)
        .default(3)
        .describe("Minimum days of notice. Earlier dates are asked to call instead."),
      media: mediaSchema.optional(),
    })
    .default({
      enabled: false,
      form: false,
      heading: "Catering & private events",
      intro: "",
      points: [],
      serviceTypes: ["Pickup", "Delivery"],
      minGuests: 10,
      maxGuests: 500,
      leadTimeDays: 3,
    }),

  about: z
    .object({
      heading: z.string().min(1),
      body: z.array(z.string().min(1)).min(1),
      media: mediaSchema.optional(),
      values: z.array(titledText).max(4).default([]),
    })
    .optional(),

  faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).default([]),

  footer: z
    .object({
      note: z.string().optional(),
      studioCredit: z.boolean().default(true).describe('Shows a small "Site by ..." credit'),
    })
    .default({ studioCredit: true }),
});

export type SiteConfig = z.infer<typeof siteSchema>;
export type SiteConfigInput = z.input<typeof siteSchema>;

/* -------------------------------------------------------------------------- */
/* Menu                                                                       */
/* -------------------------------------------------------------------------- */

/** Built-in dietary and style tags. A menu can add its own under "tags". */
export const DEFAULT_TAGS: Record<string, { label: string; short: string }> = {
  v: { label: "Vegetarian", short: "V" },
  vg: { label: "Vegan", short: "VG" },
  gf: { label: "Gluten-free", short: "GF" },
  gfo: { label: "Gluten-free option", short: "GF option" },
  spicy: { label: "Spicy", short: "Spicy" },
  raw: { label: "Raw or undercooked", short: "Raw" },
  shellfish: { label: "Contains shellfish", short: "Shellfish" },
  nuts: { label: "Contains nuts", short: "Nuts" },
  new: { label: "New", short: "New" },
  house: { label: "House favorite", short: "House favorite" },
};

const price = z.number().min(0).max(100000);

export const menuItemSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: price.optional().describe("Single price in dollars, e.g. 12.5"),
    variants: z
      .array(z.object({ label: z.string().min(1), price }))
      .min(1)
      .optional()
      .describe('Use instead of "price" for sizes, e.g. Nigiri (2 pc) / Sashimi (3 pc)'),
    priceText: z.string().optional().describe('Use instead of a number, e.g. "Market price"'),
    tags: z.array(z.string().min(1)).default([]),
    featured: z.boolean().default(false).describe("Show on the home page"),
    media: mediaSchema.optional(),
    soldOut: z.boolean().default(false),
  })
  .refine((i) => !(i.price !== undefined && i.variants !== undefined), {
    message: 'Use either "price" or "variants", not both',
    path: ["variants"],
  });
export type MenuItem = z.infer<typeof menuItemSchema>;

export const menuSectionSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes, e.g. "signature-rolls"'),
  name: z.string().min(1),
  description: z.string().optional(),
  note: z.string().optional().describe('Small print for the section, e.g. "Served with soup and salad"'),
  availability: z.string().optional().describe('e.g. "Monday to Friday, 11 am to 2:30 pm"'),
  items: z.array(menuItemSchema).min(1),
});
export type MenuSection = z.infer<typeof menuSectionSchema>;

export const menuSchema = z
  .object({
    $schema: z.string().optional(),
    currency: z.string().length(3).default("USD"),
    updated: isoDate.optional().describe("When prices were last confirmed with the owner"),
    intro: z.string().optional(),
    notes: z.array(z.string().min(1)).default([]).describe("Small print shown under the menu"),
    tags: z
      .record(z.string(), z.object({ label: z.string().min(1), short: z.string().min(1) }))
      .default({})
      .describe("Extra tags for this menu, added to the built-in ones"),
    sections: z.array(menuSectionSchema).min(1),
  })
  .superRefine((menu, ctx) => {
    const seen = new Set<string>();
    menu.sections.forEach((section, si) => {
      if (seen.has(section.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Section id "${section.id}" is used more than once`,
          path: ["sections", si, "id"],
        });
      }
      seen.add(section.id);
      section.items.forEach((item, ii) => {
        item.tags.forEach((tag, ti) => {
          if (!(tag in DEFAULT_TAGS) && !(tag in menu.tags)) {
            ctx.addIssue({
              code: "custom",
              message: `Unknown tag "${tag}". Built-in tags: ${Object.keys(DEFAULT_TAGS).join(", ")}. Add custom ones under "tags".`,
              path: ["sections", si, "items", ii, "tags", ti],
            });
          }
        });
      });
    });
  });

export type Menu = z.infer<typeof menuSchema>;
export type MenuInput = z.input<typeof menuSchema>;

/** Photo credits (optional file: clients/<slug>/images/credits.json). */
export const creditsSchema = z.array(
  z.object({
    file: z.string().min(1),
    title: z.string().optional(),
    author: z.string().min(1),
    license: z.string().min(1),
    licenseUrl: z.string().optional(),
    source: z.string().optional(),
    changes: z.string().optional(),
  }),
);
export type Credits = z.infer<typeof creditsSchema>;
