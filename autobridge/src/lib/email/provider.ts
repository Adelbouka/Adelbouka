import "server-only";

export type EmailMessage = { to: string; subject: string; text: string };
export type SendResult = "sent" | "skipped";

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<SendResult>;
}

function redact(address: string) {
  const [user, domain] = address.split("@");
  return `${user?.slice(0, 2) ?? ""}***@${domain ?? ""}`;
}

/** Development only: logs a redacted summary, never the message body. */
class ConsoleProvider implements EmailProvider {
  readonly name = "console";
  async send(message: EmailMessage): Promise<SendResult> {
    console.info(`[email:console] to=${redact(message.to)} subject="${message.subject}"`);
    return "sent";
  }
}

class DisabledProvider implements EmailProvider {
  readonly name = "disabled";
  async send(): Promise<SendResult> {
    return "skipped";
  }
}

/** Resend HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
class ResendProvider implements EmailProvider {
  readonly name = "resend";
  constructor(private readonly apiKey: string, private readonly from: string) {}
  async send(message: EmailMessage): Promise<SendResult> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, text: message.text }),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
    return "sent";
  }
}

export function getEmailProvider(): EmailProvider {
  const kind = process.env.EMAIL_PROVIDER ?? "disabled";
  const from = process.env.EMAIL_FROM ?? "";
  if (kind === "resend") {
    const key = process.env.RESEND_API_KEY;
    if (!key || !from) throw new Error("EMAIL_PROVIDER=resend requires RESEND_API_KEY and EMAIL_FROM");
    return new ResendProvider(key, from);
  }
  if (kind === "console") {
    if (process.env.NODE_ENV === "production") return new DisabledProvider();
    return new ConsoleProvider();
  }
  return new DisabledProvider();
}
