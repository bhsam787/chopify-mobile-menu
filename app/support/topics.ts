/** What a message to the developer is about (Help page form and server check). */
export const SUPPORT_TOPICS = [
  "A question",
  "Something isn't working",
  "An idea or feature request",
  "Plans and billing",
] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];
