import type { IconName, ShapeIcon, SocialNetwork } from "@chopi/menu-core";

const svg = (body: string, size = 20) =>
  `<svg class="chm-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  close: svg('<path d="M5 5l14 14M19 5L5 19"/>', 22),
  back: svg('<path d="M15 5l-7 7 7 7"/>', 18),
  arrowBack: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>', 16),
  chevron: svg('<path d="M9 5l7 7-7 7"/>', 18),
  chevronDown: svg('<path d="M5 9l7 7 7-7"/>', 16),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 16),
  clock: svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', 14),
  quote:
    '<svg class="chm-icon" width="28" height="22" viewBox="0 0 28 22" aria-hidden="true"><path fill="currentColor" d="M0 22V12C0 5 4 1 11 0l1 3C8 4 6 7 6 11h5v11H0zm16 0V12c0-7 4-11 11-12l1 3c-4 1-6 4-6 8h5v11H16z"/></svg>',
  star: '<svg class="chm-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2l3 7h7l-5.5 4.5 2 7.5L12 16.8 5.5 21l2-7.5L2 9h7z"/></svg>',
  verified:
    '<svg class="chm-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#3897F0" d="M12 1l3 2.5 3.8-.3.9 3.7 3.3 2-1.6 3.5 1.6 3.5-3.3 2-.9 3.7-3.8-.3L12 23l-3-2.5-3.8.3-.9-3.7-3.3-2L2.6 12 1 8.5l3.3-2 .9-3.7 3.8.3z"/><path d="M7.5 12.5l3 3 6-6.5" stroke="#fff" stroke-width="2" fill="none"/></svg>',
} as const;

const NAMED: Record<IconName, string> = {
  percent:
    '<circle cx="12" cy="12" r="9"/><path d="M9 15l6-6"/><circle cx="9.5" cy="9.5" r=".8"/><circle cx="14.5" cy="14.5" r=".8"/>',
  certificate:
    '<circle cx="12" cy="9" r="5"/><path d="M9 13.5L8 21l4-2 4 2-1-7.5"/>',
  people:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.8c2 .7 3.3 2.5 3.5 5.2"/>',
  help: '<path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
  gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8c-2-4-6-4-6-1.5S10 8 12 8zm0 0c2-4 6-4 6-1.5S14 8 12 8z"/>',
  star: '<path d="M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3 1.3-6.2L3 9.5l6.3-.7z"/>',
  heart:
    '<path d="M12 20s-7.5-4.6-9-9.3C2 7 4.5 4 7.8 4c1.9 0 3.3 1 4.2 2.4C12.9 5 14.3 4 16.2 4 19.5 4 22 7 21 10.7 19.5 15.4 12 20 12 20z"/>',
  truck:
    '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  sparkle:
    '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  phone:
    '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 006 6L16 13l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  bag: '<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 016 0v2"/>',
  home: '<path d="M4 11l8-7 8 7M6 9.5V20h12V9.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  whatsapp:
    '<path d="M4 20l1.2-4A8 8 0 1 1 8.4 19z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9c-1-.4-2.3-1.6-2.8-2.8l.9-1-1-2z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  return: '<path d="M9 7L5 11l4 4"/><path d="M5 11h9a5 5 0 0 1 0 10h-3"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  shield:
    '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
};

export function icon(name: IconName): string {
  return svg(NAMED[name] ?? NAMED.star);
}

const UI_ICONS: Partial<Record<ShapeIcon, string>> = {
  arrow: ICONS.arrow,
  chevron: ICONS.chevron,
  back: ICONS.back,
  close: ICONS.close,
  quote: ICONS.quote,
  verified: ICONS.verified,
  "star-filled": ICONS.star,
};

/** SVG for a shape's icon; unknown names render nothing. */
export function shapeIcon(name: ShapeIcon): string {
  if (UI_ICONS[name]) return UI_ICONS[name]!;
  if (name in SOCIAL) return socialIcon(name as SocialNetwork);
  return name in NAMED ? icon(name as IconName) : "";
}

const SOCIAL: Record<SocialNetwork, string> = {
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".9" fill="currentColor"/>',
  facebook: '<path d="M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
  tiktok: '<path d="M14 3v11.5a3.5 3.5 0 11-3.5-3.5M14 3c.5 3 2.5 5 5.5 5"/>',
  youtube:
    '<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9v6l5-3z" fill="currentColor"/>',
  pinterest:
    '<circle cx="12" cy="12" r="9"/><path d="M10.5 20l2-8M10 13.5c.5 1 1.5 1.5 2.5 1.5 2.5 0 4-2 4-4.5S14.5 6 12 6 7.5 8 7.5 10.5c0 1 .3 2 1 2.5"/>',
  x: '<path d="M4 4l16 16M20 4L4 20"/>',
};

export function socialIcon(network: SocialNetwork): string {
  return svg(SOCIAL[network], 22);
}

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  pinterest: "Pinterest",
  x: "X",
};
