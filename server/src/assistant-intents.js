// Small, explicit intents. Unknown questions never masquerade as assignment queries.
export function assistantIntents(message) {
  const text = message
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[?.,!]/g, " ");
  const rules = [
    ["roll", /\broll\b|रोल/],
    [
      "enrollment",
      /\benrol(?:l)?(?:ment)?\b|\badmission\s+(?:no|number)\b|नामांकन/,
    ],
    ["name", /\b(?:name|naam|nam)\b|नाम|\bwho am i\b/],
    [
      "attendance",
      /\b(?:attendance|attend|bunk|absent|presence|present|classes?\s+(?:miss|skip))\b|उपस्थिति|हाजिरी/,
    ],
    [
      "results",
      /\b(?:cgpa|sgpa|gpa|results?|grades?|marks?|score)\b|रिजल्ट|अंक|ग्रेड/,
    ],
    [
      "fees",
      /\b(?:fees?|payment|payments|dues|balance|paid|scholarship)\b|फीस|शुल्क|भुगतान/,
    ],
    [
      "assignments",
      /\b(?:assignments?|homework|pending|kaam|kam|deadline|deadlines|submission|submissions|submitted)\b|असाइनमेंट|होमवर्क|काम|लंबित/,
    ],
  ];
  return rules
    .filter(([, pattern]) => pattern.test(text))
    .map(([intent]) => intent);
}
