type ShareViewEmailParams = {
  to: string;
  resourceName: string;
  resourceType: "file" | "folder";
};

export async function sendShareViewEmail(params: ShareViewEmailParams): Promise<boolean> {
  const { to, resourceName, resourceType } = params;
  const from = process.env.EMAIL_FROM ?? "notifications@tenku.xyz";
  const subject = `Someone viewed your shared ${resourceType}`;
  const body = `Your shared ${resourceType} "${resourceName}" was just viewed.`;

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text: body,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[notify] ${subject} → ${to}`);
    return true;
  }

  return false;
}
