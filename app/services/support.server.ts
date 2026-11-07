import prisma from "../db.server";
import { SUPPORT_TOPICS } from "../support/topics";

/**
 * Messages merchants send from the Help page: stored on the shop (so none is
 * lost), then emailed to the developer through Resend's HTTP API.
 *
 * Env: SUPPORT_EMAIL (where messages go), SUPPORT_FROM_EMAIL (a sender on a
 * domain verified in Resend, e.g. "Chopi - Menu <support@yourdomain.com>"),
 * RESEND_API_KEY.
 */

const MESSAGE_MAX = 5000;
/** A merchant can't send more than this many messages an hour (spam guard). */
const PER_HOUR = 5;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Whether messages can be emailed (else the Help page hides the form). */
export function supportConfigured(): boolean {
  return Boolean(
    process.env.SUPPORT_EMAIL &&
    process.env.SUPPORT_FROM_EMAIL &&
    process.env.RESEND_API_KEY,
  );
}

export type SupportResult =
  { ok: true; replyTo: string } | { ok: false; error: string };

/** Checks, stores and emails one message. Never throws on bad input. */
export async function sendSupportMessage(
  shopDomain: string,
  input: { topic: unknown; replyTo: unknown; message: unknown },
): Promise<SupportResult> {
  const topic = SUPPORT_TOPICS.find((candidate) => candidate === input.topic);
  const replyTo = typeof input.replyTo === "string" ? input.replyTo.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!topic) return { ok: false, error: "Choose what your message is about." };
  if (!EMAIL.test(replyTo) || replyTo.length > 254)
    return { ok: false, error: "Enter the email address we should reply to." };
  if (message.length < 10)
    return { ok: false, error: "Tell us a little more (a sentence or two)." };
  if (message.length > MESSAGE_MAX)
    return {
      ok: false,
      error: `Keep your message under ${MESSAGE_MAX.toLocaleString()} characters.`,
    };
  if (!supportConfigured())
    return {
      ok: false,
      error: "Messages can't be sent right now. Please try again later.",
    };

  const shop = await prisma.shop.findUniqueOrThrow({
    where: { shop: shopDomain },
    select: { id: true },
  });
  const recent = await prisma.supportMessage.count({
    where: {
      shopId: shop.id,
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recent >= PER_HOUR)
    return {
      ok: false,
      error:
        "You've sent several messages in the last hour. We'll get back to you; please wait a little before sending another.",
    };

  const saved = await prisma.supportMessage.create({
    data: { shopId: shop.id, topic, replyTo, message },
  });
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.SUPPORT_FROM_EMAIL,
        to: [process.env.SUPPORT_EMAIL],
        reply_to: replyTo,
        subject: `[Chopi - Menu] ${topic} (${shopDomain})`,
        text: [
          `Store: ${shopDomain}`,
          `Topic: ${topic}`,
          `Reply to: ${replyTo}`,
          "",
          message,
        ].join("\n"),
      }),
    });
    if (!response.ok) throw new Error(`Resend responded ${response.status}`);
    await prisma.supportMessage.update({
      where: { id: saved.id },
      data: { emailed: true },
    });
  } catch (error) {
    // Kept in the database; the developer can still read it there.
    console.error(`Support email failed for ${shopDomain}`, error);
  }
  return { ok: true, replyTo };
}
