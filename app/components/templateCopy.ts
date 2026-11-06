/**
 * Sales copy for each template in the gallery: what it's for, what shoppers
 * get and why it helps them buy. Honest claims only (no made-up numbers).
 */
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
  bestFor: string[];
  highlights: TemplateHighlight[];
  /** Why it helps shoppers buy (conversion reasons). */
  whyItSells: string[];
}

export const TEMPLATE_COPY: Record<string, TemplateCopy> = {
  studio: {
    tagline: "Shop by category or by complete look, one swipe apart",
    bestFor: ["Fashion", "Apparel", "Footwear"],
    highlights: [
      {
        icon: "collection",
        title: "Photo category cards",
        text: "Big product photos make every category recognisable at a glance.",
      },
      {
        icon: "menu-horizontal",
        title: "Categories and Looks tabs",
        text: "A second tab sells styled outfits, not just single items.",
      },
      {
        icon: "image",
        title: "Featured look banner",
        text: "Put a styled look or campaign right inside the menu.",
      },
    ],
    whyItSells: [
      "Shoppers find products faster by picture than by name.",
      "Looks inspire shoppers to buy matching pieces together.",
      "Tabs keep a big catalog on one short, tidy screen.",
    ],
  },
  "studio-simple": {
    tagline: "A clean photo grid that lets your products speak",
    bestFor: ["Fashion", "Lifestyle", "Small catalogs"],
    highlights: [
      {
        icon: "layout-columns-2",
        title: "Two-column photo grid",
        text: "Every category gets a large, tappable product photo.",
      },
      {
        icon: "arrow-right",
        title: "A sub-menu per category",
        text: "Each card opens its own list, so shoppers drill down without losing their place.",
      },
    ],
    whyItSells: [
      "No clutter: one clear choice per tap.",
      "Ideal for stores with 4 to 10 main categories.",
      "Quick to set up and easy to keep up to date.",
    ],
  },
  botanical: {
    tagline: "Let shoppers browse by product, or by what they need",
    bestFor: ["Health & wellness", "Beauty", "Natural products"],
    highlights: [
      {
        icon: "menu-horizontal",
        title: "Products and goals tabs",
        text: "Shoppers pick a product type, or a goal like “Sleep & calm”.",
      },
      {
        icon: "gift-card",
        title: "Build-your-own-set banner",
        text: "Promote bundles at the moment shoppers are choosing.",
      },
      {
        icon: "discount",
        title: "NEW and SAVE tags",
        text: "New arrivals and savings stand out before a product page is even opened.",
      },
    ],
    whyItSells: [
      "Goal-based browsing helps shoppers who don't know your product names yet.",
      "Tags draw attention to new and discounted products.",
      "The bundle banner nudges shoppers toward bigger orders.",
    ],
  },
  "image-tiles": {
    tagline: "Shop by goal with rich, full-color photo tiles",
    bestFor: ["Supplements", "Skincare", "Wellness"],
    highlights: [
      {
        icon: "image",
        title: "Photo tiles that fade into color",
        text: "Large, mood-setting imagery with clear labels on top.",
      },
      {
        icon: "target",
        title: "Organised by goal",
        text: "“Skin & hair”, “Sleep & calm”: the way shoppers think about their needs.",
      },
      {
        icon: "gift-card",
        title: "Bundle banner",
        text: "A build-your-own-set offer sits right above the tiles.",
      },
    ],
    whyItSells: [
      "Strong imagery builds desire before shoppers see a price.",
      "Goals match shopper intent, so the first tap is the right one.",
      "A visual menu makes your brand feel premium.",
    ],
  },
  "circle-tiles": {
    tagline: "Friendly round photos for an easy first tap",
    bestFor: ["Beauty", "Food & drink", "Gifts"],
    highlights: [
      {
        icon: "collection",
        title: "Round product photos",
        text: "Soft cards with circular photos: approachable and easy to scan.",
      },
      {
        icon: "menu-horizontal",
        title: "Categories and goals tabs",
        text: "Two ways to browse, without making the menu longer.",
      },
      {
        icon: "gift-card",
        title: "Bundle banner",
        text: "Promote sets or bundles at the top of the menu.",
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
    bestFor: ["Streetwear", "Sports nutrition", "Modern brands"],
    highlights: [
      {
        icon: "layout-columns-2",
        title: "Black-and-white grid",
        text: "High-contrast tiles that keep the focus on your products.",
      },
      {
        icon: "person",
        title: "Refer-a-friend banner",
        text: "Turn menu visits into referrals and new customers.",
      },
      {
        icon: "list-bulleted",
        title: "Simple link list",
        text: "Account, help and about pages stay one tap away.",
      },
    ],
    whyItSells: [
      "A strong, consistent look builds brand trust.",
      "The referral banner promotes growth where every shopper looks.",
      "Minimal design means fast decisions.",
    ],
  },
  spotlight: {
    tagline: "Built to convert: proof, deals and best-sellers first",
    bestFor: ["Stores running promotions", "Fashion", "Gifts"],
    highlights: [
      {
        icon: "star",
        title: "Social proof bar",
        text: "Show how many customers trust you right at the top.",
      },
      {
        icon: "discount",
        title: "Deal highlight",
        text: "Your best offer in a bold card, one tap from checkout.",
      },
      {
        icon: "heart",
        title: "Best-seller circles",
        text: "Guide undecided shoppers to products that already sell.",
      },
      {
        icon: "chat",
        title: "Customer review",
        text: "A real quote reassures first-time visitors.",
      },
    ],
    whyItSells: [
      "Social proof and reviews reduce doubt before shoppers browse.",
      "The deal card gives a reason to buy today.",
      "Best-sellers shorten the path from menu to product.",
    ],
  },
  accordion: {
    tagline: "Everything in reach, nothing in the way",
    bestFor: ["Large catalogs", "Wellness", "Beauty"],
    highlights: [
      {
        icon: "link",
        title: "Quick-link chips",
        text: "Your top pages (deals, sets, new) as one-tap chips at the top.",
      },
      {
        icon: "chevron-down-circle",
        title: "Fold-out product lists",
        text: "Rows open in place to show every product, without leaving the menu.",
      },
      {
        icon: "image",
        title: "Photo banners for About and Help",
        text: "Tell your story and answer questions where shoppers look.",
      },
    ],
    whyItSells: [
      "Fold-outs show your whole range while keeping the menu short.",
      "Chips put your most important pages first.",
      "About and Help banners build trust with new visitors.",
    ],
  },
  sliding: {
    tagline: "Feels like a native shopping app",
    bestFor: ["Kids & baby", "Gift shops", "Deep catalogs"],
    highlights: [
      {
        icon: "arrow-right",
        title: "Sliding sub-menus",
        text: "Tap an arrow and the next level slides in, with a clear way back.",
      },
      {
        icon: "gift-card",
        title: "Shop by occasion",
        text: "A second tab for birthdays, holidays and other gift moments.",
      },
      {
        icon: "collection",
        title: "Story circles and icons",
        text: "Round photos for highlights and line icons on every category.",
      },
      {
        icon: "profile",
        title: "Account at the bottom",
        text: "Sign-in stays in reach without taking up menu space.",
      },
    ],
    whyItSells: [
      "Each screen stays short and focused, even with hundreds of categories.",
      "Shopping by occasion catches gift buyers who don't know what they want yet.",
      "App-like navigation feels familiar, so shoppers browse longer.",
    ],
  },
};

/** What every template includes, shown under each preview. */
export const INCLUDED_EVERYWHERE = [
  "Link your own collections, products and pages",
  "Change every text, image, color and font",
  "Works with any theme, without editing theme code",
  "Translatable for every language your store sells in",
];
