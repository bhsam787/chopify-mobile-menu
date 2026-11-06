/**
 * Menu design model. One `Design` describes a complete mobile drawer: a
 * pinned header, pinned footer and one or more screens, each a tree of nodes
 * (Figma-like auto-layout containers with widgets inside).
 *
 * The same document is the editor state (stored in Postgres) and, after
 * `compile()`, the storefront payload (stored in an app-data metafield).
 */

export const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** CSS color string (hex, rgb[a]) or "" for "inherit / none". */
export type Color = string;

export interface ImageRef {
  url: string;
  alt?: string;
  /** Shopify file GID when picked from Files. */
  fileId?: string;
}

export const RESOURCE_TYPES = [
  "collection",
  "product",
  "page",
  "blog",
  "article",
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const ROUTE_KEYS = [
  "root",
  "search",
  "collections",
  "all_products",
  "account",
  "account_login",
  "cart",
] as const;
export type RouteKey = (typeof ROUTE_KEYS)[number];

/**
 * Where a node goes when tapped. Resource links keep the GID; the storefront
 * gets the current, localized URL from Shopify (see the hidden links menu),
 * so handle changes don't break links. `handle`/`title`/`url` are a snapshot
 * for the editor and as fallback.
 */
export interface ResourceLink<T extends ResourceType = ResourceType> {
  type: T;
  /** Resource GID. */
  id: string;
  handle: string;
  title: string;
  url: string;
}

export type LinkRef =
  | { type: "none" }
  | { type: "url"; url: string }
  /** `sample`: a placeholder link from a template, for the merchant to replace. */
  | { type: "route"; route: RouteKey; sample?: boolean }
  | ResourceLink
  | { type: "screen"; screenId: string };

export interface TextStyle {
  size?: number;
  weight?: 400 | 500 | 600 | 700 | 800;
  color?: Color;
  transform?: "none" | "uppercase";
  letterSpacing?: number;
  italic?: boolean;
  underline?: boolean;
  /** Font family; unset uses the menu's font (usually the theme's). */
  font?: "sans" | "serif" | "mono" | "rounded";
  align?: "left" | "center" | "right";
  /** Line height as a multiple of the font size. */
  lineHeight?: number;
}

/** Spacing in px: one value, or [top, right, bottom, left]. */
export type Spacing = number | [number, number, number, number];

export interface BoxStyle {
  background?: Color;
  /** Optional gradient overlay/background, e.g. "linear-gradient(...)". */
  gradient?: string;
  padding?: Spacing;
  radius?: number;
  borderWidth?: number;
  borderColor?: Color;
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

/**
 * The box around a layer on a free canvas, whatever its type: fill, corner
 * radius, border and padding, and where the content sits inside it.
 */
export interface LayerBox extends BoxStyle {
  alignX?: "start" | "center" | "end";
  alignY?: "start" | "center" | "end";
}

/** How a smart list places its items: under each other, side by side, or in a grid. */
export interface ListLayout {
  direction: "column" | "row" | "grid";
  /** Space between items in canvas units. */
  gap: number;
  /** Grid only. */
  columns?: number;
  /** A thin line between items (in the middle of the gap), e.g. for menus. */
  divider?: Color;
}

/** Look of a layer on a free canvas, whatever its type. */
export interface LayerEffects {
  /** 0–1. */
  opacity?: number;
  /** Degrees, clockwise. */
  rotate?: number;
  shadow?: "soft" | "medium" | "strong" | "custom";
  /** Custom shadow (`shadow: "custom"`): offset, blur in px and color. */
  shadowX?: number;
  shadowY?: number;
  shadowBlur?: number;
  shadowColor?: Color;
  /** Blur in px. */
  blur?: number;
  /** Frosted glass: blurs what is behind the layer, in px. */
  backdropBlur?: number;
  blend?: "multiply" | "screen" | "overlay" | "darken" | "lighten";
  flipX?: boolean;
}

/** Position and size inside a free canvas, in canvas units (the canvas is CANVAS_WIDTH units wide). */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface NodeBase {
  id: string;
  /** Hidden in the storefront and preview, kept in the editor. */
  hidden?: boolean;
  /** Merchant-facing layer name in the editor. */
  name?: string;
  /** Only for children of a free canvas. */
  frame?: Frame;
  /** Only for children of a free canvas. */
  effects?: LayerEffects;
  /** Only for children of a free canvas. */
  layer?: LayerBox;
  /** Editor only: can't be selected or moved on the canvas. */
  locked?: boolean;
}

/** Design width of a free canvas. It scales proportionally to the phone's width. */
export const CANVAS_WIDTH = 390;

/**
 * Figma-like free layout: children are placed with `frame` (absolute x/y/w/h
 * in canvas units, later children on top). The whole canvas scales with the
 * phone's width, so the design looks the same on every screen size.
 */
export interface CanvasNode extends NodeBase {
  type: "canvas";
  /** Id of the built-in template the canvas was made from, so it can be reverted to it. */
  template?: string;
  /** Height in canvas units. */
  height: number;
  background?: Color;
  children: Node[];
}

/**
 * A box for free designs: fill, border, optional icon and link. Like a Figma
 * frame it can hold layers (`children`, placed with `frame` relative to the
 * shape), e.g. a banner made of an image, texts and a button.
 */
export interface ShapeNode extends NodeBase {
  type: "shape";
  /**
   * A smart list (like Figma's auto layout): the editor places the layers
   * one after another and keeps them alike; merchants add, reorder and
   * nest items (sub-menus) without positioning anything.
   */
  list?: ListLayout;
  /** Layers that stick out: hidden (`clip`), or scrolled sideways (`scroll: "x"`). */
  scroll?: "x";
  /**
   * Accordion behaviour on a canvas: closed, only the top `height` units show;
   * tapping that part opens the whole frame and pushes the layers below down.
   */
  collapsible?: { height: number; open?: boolean };
  /** Two-color gradient fill (drawn over `fill`). */
  fillGradient?: { from: Color; to: Color; angle: number };
  borderStyle?: "solid" | "dashed" | "dotted";
  children?: Node[];
  /** Cuts off the parts of inner layers that stick out. */
  clip?: boolean;
  /** An icon filling the shape, e.g. the arrow of a card. */
  icon?: ShapeIcon;
  iconColor?: Color;
  fill?: Color;
  gradient?: string;
  radius?: number;
  borderWidth?: number;
  borderColor?: Color;
  opacity?: number;
  link: LinkRef;
}

export interface ContainerNode extends NodeBase {
  type: "container";
  layout: "stack" | "grid" | "scroll";
  /** Grid columns (grid only). */
  columns?: 1 | 2 | 3 | 4;
  gap?: number;
  /** Item width in px for horizontal scroll rows. Auto when unset. */
  itemWidth?: number;
  box?: BoxStyle;
  children: Node[];
}

export interface TabsNode extends NodeBase {
  type: "tabs";
  /**
   * Each tab's panel: a container of sections, or (on a free canvas) a shape
   * whose layers are placed freely below the tab bar.
   */
  tabs: { id: string; label: string; child: ContainerNode | ShapeNode }[];
  /** Free (canvas) tabs: height of the tab bar in canvas units. */
  barHeight?: number;
  style?: {
    activeBackground?: Color;
    activeColor?: Color;
    inactiveBackground?: Color;
    inactiveColor?: Color;
    text?: TextStyle;
    /** A pill-shaped track behind the tabs (the active tab slides on it). */
    track?: Color;
    /** Space left and right of the tab bar, so panels can run edge to edge. */
    inset?: number;
  };
}

export interface HeaderNode extends NodeBase {
  type: "header";
  logo?: ImageRef;
  logoWidth?: number;
  logoAlign?: "start" | "center";
  showLanguage?: boolean;
  close?: "plain" | "circle";
  box?: BoxStyle;
  iconColor?: Color;
}

export interface HeadingNode extends NodeBase {
  type: "heading";
  text: string;
  style?: TextStyle;
}

export interface TextNode extends NodeBase {
  type: "text";
  /** Supports **bold**. */
  text: string;
  style?: TextStyle;
}

export interface Badge {
  text: string;
  background?: Color;
  color?: Color;
}

export interface CardNode extends NodeBase {
  type: "card";
  /**
   * studio:  title top-left, image right, arrow chip bottom-left
   * product: title (+ badge) on top, photo filling the bottom with a soft fade, arrow bottom-right
   * overlay: full-bleed image, gradient, title + subtitle + arrow
   * label:   bordered tile with a photo tile, title + arrow underneath
   * circle:  title on top, round photo below
   * tile:    photo on top fading into the card color, title + arrow underneath
   */
  variant: "studio" | "product" | "overlay" | "label" | "circle" | "tile";
  title: string;
  subtitle?: string;
  badge?: Badge;
  image?: ImageRef;
  /** Use the linked collection/product image when no image is set. */
  useResourceImage?: boolean;
  link: LinkRef;
  arrow?: "none" | "light" | "filled" | "plain";
  /** Overrides the arrow chip's colors. */
  arrowBackground?: Color;
  arrowColor?: Color;
  /** Background behind the photo (label/circle tiles). */
  imageBackground?: Color;
  ratio?: number;
  box?: BoxStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  accent?: Color;
}

export interface RowNode extends NodeBase {
  type: "row";
  /** thumb: image + texts · icon: icon + texts · plain: texts only */
  variant: "thumb" | "icon" | "plain";
  title: string;
  subtitle?: string;
  image?: ImageRef;
  useResourceImage?: boolean;
  icon?: IconName;
  badge?: Badge;
  chevron?: boolean;
  link: LinkRef;
  box?: BoxStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  thumbSize?: number;
  thumbRadius?: number;
  /** Behind the thumbnail; "transparent" for icons drawn as images. */
  thumbBackground?: Color;
}

export interface AccordionNode extends NodeBase {
  type: "accordion";
  title: string;
  subtitle?: string;
  image?: ImageRef;
  open?: boolean;
  box?: BoxStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  child: ContainerNode;
}

export interface BannerNode extends NodeBase {
  type: "banner";
  /**
   * promo:     image left, title + text, arrow chip right
   * highlight: eyebrow, badge, title, text, CTA button, image right
   * split:     solid color left with title, photo fading in on the right
   * feature:   image left, eyebrow, title, text, outline button
   */
  variant: "promo" | "highlight" | "split" | "feature";
  eyebrow?: string;
  badge?: Badge;
  title: string;
  text?: string;
  cta?: string;
  image?: ImageRef;
  link: LinkRef;
  box?: BoxStyle;
  titleStyle?: TextStyle;
  textStyle?: TextStyle;
  accent?: Color;
  accentText?: Color;
}

export interface CountdownNode extends NodeBase {
  type: "countdown";
  title: string;
  text?: string;
  /** ISO date-time the timer counts down to; "" = rolling daily (midnight). */
  endsAt: string;
  link: LinkRef;
  box?: BoxStyle;
  titleStyle?: TextStyle;
  textStyle?: TextStyle;
  timerBackground?: Color;
  timerColor?: Color;
  /** Hide the banner once the timer reaches zero. */
  hideWhenEnded?: boolean;
}

export interface PillNode extends NodeBase {
  type: "pill";
  icon?: IconName;
  text: string;
  link: LinkRef;
  box?: BoxStyle;
  style?: TextStyle;
}

export interface ChipNode extends NodeBase {
  type: "chip";
  label: string;
  image?: ImageRef;
  link: LinkRef;
  box?: BoxStyle;
  style?: TextStyle;
}

export interface ButtonNode extends NodeBase {
  type: "button";
  label: string;
  variant: "filled" | "outline";
  link: LinkRef;
  background?: Color;
  color?: Color;
  radius?: number;
  height?: number;
  style?: TextStyle;
}

export interface StoriesNode extends NodeBase {
  type: "stories";
  /** manual: `items` · collection: products of the linked collection */
  source: "manual" | "collection";
  collection?: ResourceLink<"collection">;
  limit?: number;
  items: { id: string; title: string; image?: ImageRef; link: LinkRef }[];
  size?: number;
  ringColor?: Color;
  /** Ring thickness in px (default 3). */
  ringWidth?: number;
  imageBackground?: Color;
  labelStyle?: TextStyle;
}

export interface ReviewNode extends NodeBase {
  type: "review";
  quote: string;
  author: string;
  avatar?: ImageRef;
  stars?: 0 | 1 | 2 | 3 | 4 | 5;
  box?: BoxStyle;
  quoteStyle?: TextStyle;
  starColor?: Color;
  markColor?: Color;
}

export interface SocialProofNode extends NodeBase {
  type: "social-proof";
  /** Supports **bold**. */
  text: string;
  avatars: ImageRef[];
  verified?: boolean;
  box?: BoxStyle;
  style?: TextStyle;
}

export interface AccountBarNode extends NodeBase {
  type: "account-bar";
  showAccount?: boolean;
  loginLabel: string;
  accountLabel: string;
  socials: { network: SocialNetwork; url: string }[];
  box?: BoxStyle;
  style?: TextStyle;
  iconColor?: Color;
}

export interface LocalizationNode extends NodeBase {
  type: "localization";
  showCountry?: boolean;
  showLanguage?: boolean;
  box?: BoxStyle;
  style?: TextStyle;
}

export interface ImageNode extends NodeBase {
  type: "image";
  image?: ImageRef;
  ratio?: number;
  /** cover (default) fills and crops; contain shows the whole image. */
  fit?: "cover" | "contain";
  /** Which part stays visible when cropped. */
  focus?: "center" | "top" | "bottom" | "left" | "right";
  link: LinkRef;
  radius?: number;
}

export interface DividerNode extends NodeBase {
  type: "divider";
  color?: Color;
  thickness?: number;
}

export interface SpacerNode extends NodeBase {
  type: "spacer";
  height: number;
}

export type WidgetNode =
  | HeadingNode
  | TextNode
  | CardNode
  | RowNode
  | AccordionNode
  | BannerNode
  | CountdownNode
  | PillNode
  | ChipNode
  | ButtonNode
  | StoriesNode
  | ReviewNode
  | SocialProofNode
  | AccountBarNode
  | LocalizationNode
  | ImageNode
  | DividerNode
  | SpacerNode
  | ShapeNode;

export type Node =
  ContainerNode | TabsNode | HeaderNode | CanvasNode | WidgetNode;
export type NodeType = Node["type"];

export const ICON_NAMES = [
  "percent",
  "certificate",
  "people",
  "help",
  "user",
  "gift",
  "star",
  "heart",
  "truck",
  "tag",
  "sparkle",
  "phone",
  "mail",
  "search",
  "bag",
  "home",
  "check",
] as const;
export type IconName = (typeof ICON_NAMES)[number];

export type ShapeIcon = (typeof SHAPE_ICONS)[number];

export const SOCIAL_NETWORKS = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "pinterest",
  "x",
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

/** Icons a shape can show: the named icons, social networks and the renderer's UI icons. */
export const SHAPE_ICONS = [
  ...ICON_NAMES,
  ...SOCIAL_NETWORKS,
  "arrow",
  "chevron",
  "back",
  "close",
  "clock",
  "quote",
  "verified",
  "star-filled",
] as const;

// ---------------------------------------------------------------------------
// Design
// ---------------------------------------------------------------------------

/** How shoppers get back from a sub-menu to the level above. */
export interface BackBar {
  /**
   * title: ‹ SUB-MENU TITLE · link: ← Back · pill: a filled ‹ Back button ·
   * centered: ‹ with the title centered, like an app bar · parent: ‹ name of
   * the level above · large: small ‹ Back above a big title · hidden: none
   */
  style: "title" | "link" | "pill" | "centered" | "parent" | "large" | "hidden";
  /** Text of the "Back" styles (link, pill, large). */
  label?: string;
  color?: Color;
  background?: Color;
}

export const BACK_STYLES: BackBar["style"][] = [
  "title",
  "link",
  "pill",
  "centered",
  "parent",
  "large",
  "hidden",
];

export interface Screen {
  id: string;
  /** Shown in the back bar of sub-menu screens. */
  title: string;
  root: ContainerNode;
  /** This sub-menu's own back bar (otherwise the menu's). */
  back?: BackBar;
}

export interface Tokens {
  /** "theme" inherits the storefront font. */
  fontFamily: "theme" | string;
  text: Color;
  mutedText: Color;
  background: Color;
  /** Page background behind panels (e.g. light grey around white panels). */
  canvas: Color;
  accent: Color;
  accentText: Color;
  radius: number;
}

export interface Behavior {
  /** The app menu replaces the theme menu below this viewport width (px). */
  breakpoint: number;
  side: "left" | "right";
  /** Drawer width: "full" or px. */
  width: "full" | number;
  overlayColor: Color;
}

export interface Design {
  schemaVersion: number;
  /** Back bar of every sub-menu (a screen can have its own). */
  back?: BackBar;
  /** Id of the built-in template the menu was created from. */
  template?: string;
  tokens: Tokens;
  behavior: Behavior;
  header: HeaderNode;
  footer?: ContainerNode;
  screens: Screen[];
  /** locale → text id ("<nodeId>.<field>") → translated text. */
  translations: Record<string, Record<string, string>>;
  /**
   * Set when compiling; tells the theme what to print: the country/language
   * lists (`localization`) and how many products story circles show at most
   * (`productLimit`). Linked resources come from reference metafields.
   */
  meta?: {
    localization: boolean;
    productLimit?: number;
  };
}
