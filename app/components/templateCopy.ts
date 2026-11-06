import type { TemplateFeature } from "@chopi/menu-core";

/**
 * Sales copy for each template in the gallery: what it's for, what shoppers
 * get and why it helps them buy. Honest claims only (no made-up numbers).
 */

/** Short names of what a template has (gallery filters, home tiles). */
export const FEATURE_LABELS: Record<TemplateFeature, string> = {
  tabs: "Tabs",
  "image-cards": "Image cards",
  "fold-outs": "Fold-out links",
  "story-circles": "Story circles",
  banners: "Promo banners",
  sliding: "Sliding sub-menus",
};

export interface TemplateHighlight {
  icon:
    | "collection"
    | "image"
    | "discount"
    | "star"
    | "product"
    | "gift-card"
    | "list-bulleted"
    | "menu-horizontal"
    | "person"
    | "heart"
    | "target"
    | "layout-columns-2"
    | "chevron-down-circle"
    | "arrow-right"
    | "chat"
    | "link"
    | "profile";
  title: string;
  text: string;
}

export interface TemplateCopy {
  /** One line that sells the template. */
  tagline: string;
  /** A short, friendly paragraph under the tagline in the preview. */
  pitch: string;
  bestFor: string[];
  highlights: TemplateHighlight[];
  /** Why it helps shoppers buy (conversion reasons). */
  whyItSells: string[];
}

export const TEMPLATE_COPY: Record<string, TemplateCopy> = {
  studio: {
    tagline: "Sell the piece, then sell the whole look",
    pitch:
      "Big product photos for every category, plus a Looks tab with outfits you've put together. Shoppers come for one item and discover everything that goes with it.",
    bestFor: ["Fashion", "Apparel", "Footwear"],
    highlights: [
      {
        icon: "collection",
        title: "Categories they recognize instantly",
        text: "Every category shows a real product photo, so shoppers tap what they see instead of reading a list.",
      },
      {
        icon: "menu-horizontal",
        title: "A Looks tab for styled outfits",
        text: "One swipe from your categories, shoppers browse complete outfits you've styled.",
      },
      {
        icon: "image",
        title: "A campaign banner inside the menu",
        text: "Spotlight a new collection or seasonal look right where shoppers start browsing.",
      },
    ],
    whyItSells: [
      "Pictures are quicker to recognize than names, so shoppers reach the right category faster.",
      "Complete looks give shoppers ideas for pieces that go together.",
      "Two tabs keep even a big catalog on one short, tidy screen.",
    ],
  },
  "studio-simple": {
    tagline: "A clean photo grid that lets your products speak",
    pitch:
      "One calm grid of big product photos, with nothing else competing for attention. Each card opens its own list, so shoppers always know where they are.",
    bestFor: ["Small catalogs", "Fashion", "Lifestyle"],
    highlights: [
      {
        icon: "layout-columns-2",
        title: "Big, tappable photos",
        text: "Two photos per row, each one a category shoppers can open with a thumb.",
      },
      {
        icon: "arrow-right",
        title: "A sub-menu behind every card",
        text: "Each category opens its own list with a clear way back, so nobody gets lost.",
      },
    ],
    whyItSells: [
      "One clear choice per tap: no clutter, no hesitation.",
      "A great fit for stores with about 4 to 10 main categories.",
      "Quick to set up today, easy to keep fresh tomorrow.",
    ],
  },
  botanical: {
    tagline: "Let shoppers browse by product, or by what they need",
    pitch:
      "Some shoppers know exactly what they want, others know how they want to feel. Two tabs welcome both, and NEW and SAVE tags point out what's fresh and what's on offer.",
    bestFor: ["Health & wellness", "Beauty", "Natural products"],
    highlights: [
      {
        icon: "menu-horizontal",
        title: "Browse by product or by goal",
        text: "One tab lists your product types, the other goals like “Sleep & calm” or “Energy”.",
      },
      {
        icon: "gift-card",
        title: "A build-your-own-set banner",
        text: "Invite shoppers to put together a bundle while they're still deciding.",
      },
      {
        icon: "discount",
        title: "NEW and SAVE tags",
        text: "New arrivals and deals stand out before a product page is even opened.",
      },
    ],
    whyItSells: [
      "Goal-based browsing helps new shoppers who don't know your product names yet.",
      "Tags draw the eye to what's new and what's discounted.",
      "The bundle banner suggests a bigger basket at just the right moment.",
    ],
  },
  "image-tiles": {
    tagline: "Rich, colorful photo tiles that set the mood",
    pitch:
      "Full-bleed photos that melt into color make your menu feel like a magazine. Every tile is named after what shoppers are hoping for, so browsing feels personal.",
    bestFor: ["Supplements", "Skincare", "Wellness"],
    highlights: [
      {
        icon: "image",
        title: "Photos that fade into color",
        text: "Mood-setting imagery with clear, readable labels on top.",
      },
      {
        icon: "target",
        title: "Organized the way shoppers think",
        text: "“Skin & hair”, “Sleep & calm”: tiles named after needs, not product codes.",
      },
      {
        icon: "gift-card",
        title: "A bundle banner up top",
        text: "Your build-your-own-set offer greets shoppers before the tiles.",
      },
    ],
    whyItSells: [
      "Beautiful imagery builds desire before shoppers see a price.",
      "Goal tiles match what shoppers came for, so the first tap is the right one.",
      "A polished, visual menu makes your brand feel premium.",
    ],
  },
  "circle-tiles": {
    tagline: "Friendly round photos for an easy first tap",
    pitch:
      "Soft cards with circular product photos feel warm and welcoming. It's the kind of menu shoppers enjoy scrolling, with two tabs to keep everything tidy.",
    bestFor: ["Beauty", "Food & drink", "Gifts"],
    highlights: [
      {
        icon: "collection",
        title: "Round photos on soft cards",
        text: "A gentle, inviting look that's easy to scan at a glance.",
      },
      {
        icon: "menu-horizontal",
        title: "Two ways to browse",
        text: "Categories and goals sit side by side in tabs, without making the menu longer.",
      },
      {
        icon: "gift-card",
        title: "A bundle banner at the top",
        text: "Feature a gift set or bundle the moment the menu opens.",
      },
    ],
    whyItSells: [
      "A warm, friendly look invites shoppers to explore.",
      "Products are visible right away, not hidden behind text links.",
      "Tabs keep the menu short, even with many categories.",
    ],
  },
  mono: {
    tagline: "Bold, minimal and unmistakably on brand",
    pitch:
      "Black, white and confident. Product photos sit on clean tiles with nothing to distract, so your brand does the talking and your products take center stage.",
    bestFor: ["Streetwear", "Sports nutrition", "Modern brands"],
    highlights: [
      {
        icon: "layout-columns-2",
        title: "A high-contrast product grid",
        text: "Clean black-and-white tiles that put every product photo front and center.",
      },
      {
        icon: "person",
        title: "A refer-a-friend banner",
        text: "Remind shoppers to share your store, right where they browse.",
      },
      {
        icon: "list-bulleted",
        title: "Essentials one tap away",
        text: "Account, help and about pages wait in a tidy list at the bottom.",
      },
    ],
    whyItSells: [
      "A strong, consistent look makes your brand recognizable and trustworthy.",
      "Your referral offer is seen by every shopper who opens the menu.",
      "With fewer distractions, shoppers make up their minds faster.",
    ],
  },
  spotlight: {
    tagline: "Built to convert: proof, deals and best-sellers first",
    pitch:
      "Lead with what convinces: happy customers, today's best offer and the products everyone loves. Made for the days you run a promotion and want every menu open to count.",
    bestFor: ["Promotions", "Fashion", "Gifts"],
    highlights: [
      {
        icon: "star",
        title: "Social proof at the top",
        text: "Show how many customers love you before shoppers even start browsing.",
      },
      {
        icon: "discount",
        title: "Your best deal, front and center",
        text: "A bold card for today's offer, one tap from the product.",
      },
      {
        icon: "heart",
        title: "Best-seller circles",
        text: "Point undecided shoppers to the products that already sell.",
      },
      {
        icon: "chat",
        title: "A real customer review",
        text: "A short, honest quote that reassures first-time visitors.",
      },
    ],
    whyItSells: [
      "Proof and reviews ease doubts before shoppers even browse.",
      "A highlighted deal gives shoppers a reason to buy today.",
      "Best-sellers shorten the path from menu to product.",
    ],
  },
  accordion: {
    tagline: "Everything in reach, nothing in the way",
    pitch:
      "Quick-link chips for your most important pages, and rows that unfold right in place to reveal every product. Your whole range fits on one tidy screen.",
    bestFor: ["Large catalogs", "Wellness", "Beauty"],
    highlights: [
      {
        icon: "link",
        title: "Quick-link chips",
        text: "Deals, sets and new arrivals as one-tap chips at the very top.",
      },
      {
        icon: "chevron-down-circle",
        title: "Rows that unfold in place",
        text: "Shoppers open a category and see its products without leaving the menu.",
      },
      {
        icon: "image",
        title: "Photo banners for your story",
        text: "About and Help get their own banners, right where questions come up.",
      },
    ],
    whyItSells: [
      "Unfolding rows show your whole range while keeping the menu short.",
      "Chips put your most important pages first.",
      "Your story and help pages build trust with new visitors.",
    ],
  },
  sliding: {
    tagline: "Feels like a native shopping app",
    pitch:
      "Tap an arrow and the next level glides in, just like the shopping apps your customers already love. A second tab helps gift buyers shop by occasion.",
    bestFor: ["Kids & baby", "Gift shops", "Deep catalogs"],
    highlights: [
      {
        icon: "arrow-right",
        title: "Smooth sliding sub-menus",
        text: "Each level slides in with a clear way back, so even deep catalogs feel simple.",
      },
      {
        icon: "gift-card",
        title: "Shop by occasion",
        text: "Birthdays, holidays and new arrivals get their own tab for gift buyers.",
      },
      {
        icon: "collection",
        title: "Story circles and icons",
        text: "Round photos for highlights and a friendly icon on every category.",
      },
      {
        icon: "profile",
        title: "Account always in reach",
        text: "Sign-in sits at the bottom: there when needed, out of the way otherwise.",
      },
    ],
    whyItSells: [
      "Each screen stays short and focused, even with hundreds of categories.",
      "Shopping by occasion helps gift buyers who don't know what they want yet.",
      "App-like navigation feels familiar, so shoppers feel at home right away.",
    ],
  },
};

/** What every template includes, shown under each preview. */
export const INCLUDED_EVERYWHERE = [
  "Your own collections, products and pages, linked in a few clicks",
  "Every word, photo, color and font is yours to change",
  "Works with any theme: no code, nothing to break",
  "Speaks every language your store sells in",
];
