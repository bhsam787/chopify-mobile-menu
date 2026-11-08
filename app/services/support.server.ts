import nodemailer from "nodemailer";
import prisma from "../db.server";
import { SUPPORT_TOPICS } from "../support/topics";

/**
 * Messages merchants send from the Help page: stored on the shop (so none is
 * lost), then emailed to the developer, through your own mail server (SMTP)
 * when it's set up, else through Resend's HTTP API.
 *
 * Env: SUPPORT_EMAIL (where messages go) and SUPPORT_FROM_EMAIL (the sender,
 * e.g. "Chopi - Menu <support@yourdomain.com>"), plus either
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (a mailbox on your mail server)
 * or RESEND_API_KEY.
 */

const MESSAGE_MAX = 5000;
/** A merchant can't send more than this many messages an hour (spam guard). */
const PER_HOUR = 5;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const smtpConfigured = () =>
  Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );

/** Whether messages can be emailed (else the Help page hides the form). */
export function supportConfigured(): boolean {
  return Boolean(
    process.env.SUPPORT_EMAIL &&
    process.env.SUPPORT_FROM_EMAIL &&
    (smtpConfigured() || process.env.RESEND_API_KEY),
  );
}

interface Email {
  subject: string;
  text: string;
  replyTo: string;
}

/** Sends one email to the developer; throws when it couldn't be sent. */
async function sendEmail({ subject, text, replyTo }: Email) {
  const from = process.env.SUPPORT_FROM_EMAIL!;
  const to = process.env.SUPPORT_EMAIL!;
  if (smtpConfigured()) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 is TLS from the start; 587 upgrades with STARTTLS (required).
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({ from, to, replyTo, subject, text });
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, text }),
  });
  if (!response.ok) throw new Error(`Resend responded ${response.status}`);
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
    await sendEmail({
      subject: `[Chopi - Menu] ${topic} (${shopDomain})`,
      text: [
        `Store: ${shopDomain}`,
        `Topic: ${topic}`,
        `Reply to: ${replyTo}`,
        "",
        message,
      ].join("\n"),
      replyTo,
    });
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
