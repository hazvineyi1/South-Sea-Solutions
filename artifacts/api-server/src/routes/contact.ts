import { Router, type IRouter } from "express";
import { db, contactMessagesTable } from "@workspace/db";
import {
  SubmitContactMessageBody,
  SubmitContactMessageResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * Where an inquiry from the website actually ends up.
 *
 * It used to be written to contact_messages and read, if anyone remembered, in
 * the Aftrak superadmin console. That console has been removed with the rest of
 * Aftrak, which would have left this endpoint quietly filing every prospective
 * customer into a table nobody opens. A contact form that accepts a message and
 * shows nobody is worse than no contact form at all: it looks like a channel and
 * behaves like a bin.
 *
 * So the message is now emailed. It is ALSO still written to the database, on
 * purpose: email delivery fails, keys expire, providers rate-limit, and the one
 * thing that must not happen is that a real inquiry evaporates because a third
 * party had a bad afternoon. The database row is the record; the email is the
 * notification.
 */

const NOTIFY_TO = process.env["CONTACT_NOTIFY_TO"] ?? "strategy@southseasolutions.com";
const RESEND_KEY = process.env["RESEND_API_KEY"];
// Must be a domain verified with the email provider. Until southseasolutions.com
// is verified, Resend's shared sender works for testing.
const NOTIFY_FROM = process.env["CONTACT_NOTIFY_FROM"] ?? "Beltari <onboarding@resend.dev>";

interface Inquiry {
  name: string;
  organization: string | null;
  email: string;
  message: string;
}

/**
 * Fire the notification. Never throws: a failure to notify must not turn a
 * successfully captured inquiry into a 500 for the person who sent it.
 */
async function notify(inquiry: Inquiry): Promise<void> {
  if (!RESEND_KEY) {
    logger.warn(
      { to: NOTIFY_TO },
      "RESEND_API_KEY is not set: inquiry stored but NOT emailed. Set it to receive notifications.",
    );
    return;
  }

  const lines = [
    `From:         ${inquiry.name} <${inquiry.email}>`,
    inquiry.organization ? `Organisation: ${inquiry.organization}` : null,
    "",
    inquiry.message,
  ].filter((l) => l != null);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [NOTIFY_TO],
        // So a reply goes to the person who wrote in, not into the void.
        reply_to: inquiry.email,
        subject: `Website inquiry: ${inquiry.name}${inquiry.organization ? ` (${inquiry.organization})` : ""}`,
        text: lines.join("\n"),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error({ status: res.status, body: body.slice(0, 300) }, "Inquiry email failed to send");
      return;
    }
    logger.info({ to: NOTIFY_TO }, "Inquiry emailed");
  } catch (err) {
    logger.error({ err }, "Inquiry email threw");
  }
}

// Public endpoint: the marketing site contact form posts here. No auth.
router.post("/contact", async (req, res): Promise<void> => {
  const parsed = SubmitContactMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, organization, email, message } = parsed.data;
  const trimmedOrg = organization?.trim();
  const inquiry: Inquiry = {
    name: name.trim(),
    organization: trimmedOrg ? trimmedOrg : null,
    email: email.trim().toLowerCase(),
    message: message.trim(),
  };

  // Store first. The row is the record of truth, and it is written before we
  // depend on anything outside this process.
  await db.insert(contactMessagesTable).values(inquiry);

  // Then notify. Awaited so a serverless-style host cannot kill the process
  // mid-flight, but its failure never fails the request.
  await notify(inquiry);

  req.log.info({ email: inquiry.email }, "Contact inquiry received");
  res.json(SubmitContactMessageResponse.parse({ ok: true }));
});

export default router;
