/**
 * Alert Webhook Notifications
 */

export interface WebhookConfig {
  url: string;
  type: "slack" | "discord" | "generic";
  headers?: Record<string, string>;
}

function parseWebhookUrls(): WebhookConfig[] {
  const env = process.env.ALERT_WEBHOOK_URLS || "";
  if (!env) return [];
  return env.split("|").map((entry) => {
    const [type, ...urlParts] = entry.split(":");
    return { type: type.trim() as WebhookConfig["type"], url: urlParts.join(":").trim() };
  });
}

export async function sendAlertNotification(params: {
  ruleId: string; ruleName: string; severity: "warning" | "critical";
  metric: string; current: number; threshold: number; message: string;
}): Promise<void> {
  const configs = parseWebhookUrls();
  if (configs.length === 0) { console.log("[ALERT]", params.message); return; }
  await Promise.allSettled(configs.map((c) => sendToWebhook(c, params)));
}

async function sendToWebhook(config: WebhookConfig, params: {
  severity: string; ruleName: string; metric: string; current: number; threshold: number; message: string;
}): Promise<void> {
  const emoji = params.severity === "critical" ? "🚨" : "⚠️";
  const color = params.severity === "critical" ? 0xef4444 : 0xf59e0b;
  let payload: Record<string, unknown>;

  switch (config.type) {
    case "slack":
      payload = {
        text: `${emoji} *${params.ruleName}*`,
        attachments: [{ color: params.severity === "critical" ? "danger" : "warning", fields: [
          { title: "Metric", value: params.metric, short: true },
          { title: "Current", value: String(params.current), short: true },
          { title: "Threshold", value: String(params.threshold), short: true },
          { title: "Message", value: params.message, short: false },
        ], footer: "PDF Summary Alerts", ts: Math.floor(Date.now() / 1000) }]
      };
      break;
    case "discord":
      payload = { embeds: [{ title: `${emoji} ${params.ruleName}`, description: params.message, color, fields: [
        { name: "Metric", value: params.metric, inline: true },
        { name: "Current", value: String(params.current), inline: true },
        { name: "Threshold", value: String(params.threshold), inline: true },
      ], timestamp: new Date().toISOString() }] };
      break;
    default:
      payload = { ...params, timestamp: new Date().toISOString() };
  }

  try {
    const res = await fetch(config.url, { method: "POST", headers: { "Content-Type": "application/json", ...config.headers }, body: JSON.stringify(payload) });
    if (!res.ok) console.error(`[ALERT] Webhook failed: ${res.status}`);
  } catch (err) { console.error("[ALERT] Webhook error:", err); }
}
