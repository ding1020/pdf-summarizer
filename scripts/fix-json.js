const fs = require("fs");
const path = require("path");

const msgDir = path.join(__dirname, "..", "messages");
const files = ["de", "es", "fr", "ja", "ko", "en", "zh"];

for (const name of files) {
  const filePath = path.join(msgDir, name + ".json");
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  // Find onboarding start
  let onboardStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('"onboarding":')) {
      onboardStart = i;
      break;
    }
  }
  if (onboardStart < 0) { console.log(`⚠️ ${name}: no onboarding`); continue; }

  const onboardIndent = lines[onboardStart].match(/^(\s*)/)[1];

  // Extract all values we need from the current (possibly broken) state
  function extractValue(key) {
    for (let i = onboardStart; i < Math.min(lines.length, onboardStart + 30); i++) {
      const m = lines[i].match(new RegExp(`"${key}":\\s*"(.*?)"?,?\\s*$`));
      if (m) return m[1];
    }
    return "";
  }

  const step1Title = extractValue("step1Title");
  const step1Desc = extractValue("step1Desc");
  const step2Title = extractValue("step2Title");
  const step2Desc = extractValue("step2Desc");
  const step3Title = extractValue("step3Title");
  const step3Desc = extractValue("step3Desc");
  const skip = extractValue("skip");
  const next = extractValue("next");
  const getStarted = extractValue("getStarted");

  // Find documents line
  let documentsLine = -1;
  for (let i = onboardStart; i < lines.length; i++) {
    if (lines[i].trim() === '"documents":') { documentsLine = i; break; }
  }

  // Build corrected section
  const corrected = [
    `${onboardIndent}"onboarding": {`,
    `${onboardIndent}  "step1Title": "${step1Title}",`,
    `${onboardIndent}  "step1Desc": "${step1Desc}",`,
    `${onboardIndent}  "step2Title": "${step2Title}",`,
    `${onboardIndent}  "step2Desc": "${step2Desc}",`,
    `${onboardIndent}  "step3Title": "${step3Title}",`,
    `${onboardIndent}  "step3Desc": "${step3Desc}"`,
    `${onboardIndent}},`,
    `${onboardIndent}"skip": "${skip}",`,
    `${onboardIndent}"next": "${next}",`,
    `${onboardIndent}"getStarted": "${getStarted}"`,
    `${onboardIndent.slice(2)}},`,
  ];

  const result = [
    ...lines.slice(0, onboardStart),
    ...corrected,
    ...lines.slice(documentsLine),
  ];

  const newContent = result.join("\n");

  try {
    JSON.parse(newContent);
    fs.writeFileSync(filePath, newContent, "utf8");
    console.log(`✅ ${name}.json`);
  } catch (e) {
    console.log(`❌ ${name}: ${e.message.substring(0, 80)}`);
  }
}
