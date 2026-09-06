const DISCORD_TOKEN  = process.env.DISCORD_BOT_TOKEN;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SLACK_TOKEN    = process.env.SLACK_BOT_TOKEN;
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN;

let started = 0;

if (DISCORD_TOKEN) {
  const { startDiscord } = await import("./discord-bot.js");
  startDiscord(DISCORD_TOKEN);
  started++;
} else {
  console.log("[Discord] Skipped — DISCORD_BOT_TOKEN not set");
}

if (TELEGRAM_TOKEN) {
  const { startTelegram } = await import("./telegram-bot.js");
  startTelegram(TELEGRAM_TOKEN);
  started++;
} else {
  console.log("[Telegram] Skipped — TELEGRAM_BOT_TOKEN not set");
}

if (SLACK_TOKEN && SLACK_APP_TOKEN) {
  const { startSlack } = await import("./slack-bot.js");
  startSlack(SLACK_TOKEN, SLACK_APP_TOKEN);
  started++;
} else {
  console.log("[Slack] Skipped — SLACK_BOT_TOKEN or SLACK_APP_TOKEN not set");
}

if (started === 0) {
  console.log("");
  console.log("══════════════════════════════════════════════");
  console.log("  THERYN Bot — No tokens configured");
  console.log("══════════════════════════════════════════════");
  console.log("  Set one or more environment secrets:");
  console.log("  • DISCORD_BOT_TOKEN  — Discord bot token");
  console.log("  • TELEGRAM_BOT_TOKEN — Telegram bot token");
  console.log("  • SLACK_BOT_TOKEN    — Slack bot token");
  console.log("  • SLACK_APP_TOKEN    — Slack app-level token");
  console.log("══════════════════════════════════════════════");
  console.log("");
  console.log("  See the Bot Hub page in THERYN for setup guides.");
  console.log("");
  setInterval(() => {}, 30_000);
} else {
  console.log(`\n⚡ THERYN Bot running on ${started} platform(s)\n`);
}
