import { Router, type IRouter } from "express";
import { db, contactMessagesTable } from "@workspace/db";
import {
  SubmitContactMessageBody,
  SubmitContactMessageResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Public endpoint: the marketing site contact form posts here. No auth.
router.post("/contact", async (req, res): Promise<void> => {
  const parsed = SubmitContactMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, organization, email, message } = parsed.data;
  const trimmedOrg = organization?.trim();
  await db.insert(contactMessagesTable).values({
    name: name.trim(),
    organization: trimmedOrg ? trimmedOrg : null,
    email: email.trim().toLowerCase(),
    message: message.trim(),
  });

  req.log.info({ email: email.trim().toLowerCase() }, "Contact inquiry received");
  res.json(SubmitContactMessageResponse.parse({ ok: true }));
});

export default router;
