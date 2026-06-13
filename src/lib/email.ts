type EmailPayload = {
  to: string;
  subject: string;
  text: string;
};

/**
 * v1: logs emails in development. Wire to Resend, SendGrid, or Supabase Edge Functions for production.
 * Set RESEND_API_KEY and NOTIFICATIONS_FROM to enable real delivery later.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (process.env.RESEND_API_KEY && process.env.NOTIFICATIONS_FROM) {
    // Integration slot for v1.5 — uncomment when API key is configured:
    // const res = await fetch("https://api.resend.com/emails", { ... });
    // return res.ok;
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[email stub]", payload);
  }

  return true;
}

export async function notifyMemberByEmail(
  memberEmail: string | null | undefined,
  title: string,
  message: string
) {
  if (!memberEmail) return;
  await sendEmail({
    to: memberEmail,
    subject: `[Waypoint] ${title}`,
    text: message,
  });
}
