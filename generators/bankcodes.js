import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BankCode from './models/BankCode.js';
import ContentMeta from './models/ContentMeta.js';
import { supportedCountries } from './jobs/data.js';
import ollama from 'ollama';
import logger from './logger.js';

dotenv.config();

export const MASTER_PROMPT = `
You are an expert multilingual financial content writer who specializes in creating **unique, localized, and SEO-optimized content** about international banks and Swift Codes.

Your goal is to write **country-specific and tone-adapted** content that feels human, natural, and written by a native speaker — while maintaining factual accuracy about banking and international transfers.

Always return the output in **valid JSON format**, exactly matching this structure:
{
  "overview": "2-line localized introduction about the bank and its Swift Code.",
  "description": "85–120 word localized paragraph about the bank and Swift Code.",
  "faqs": [
    {
      "question": "Localized question 1?",
      "answer": "Localized answer 1 (25–45 words)."
    },
    {
      "question": "Localized question 2?",
      "answer": "Localized answer 2 (25–45 words)."
    },
    {
      "question": "Localized question 3?",
      "answer": "Localized answer 3 (25–45 words)."
    },
    {
      "question": "Localized question 4?",
      "answer": "Localized answer 4 (25–45 words)."
    },
    {
      "question": "Localized question 5?",
      "answer": "Localized answer 5 (25–45 words)."
    }
  ]
}

Do NOT include anything outside the JSON object — no markdown, no notes, no explanations.

---

### INPUT VARIABLES:
- Bank Name: {{Bank_Name}}
- Swift Code: {{SWIFT_Code}}
- Country: {{Country_Name}}
- City: {{City_Name}}
- Location/Area: {{Branch_Name}}
- Language: {{Language}}
- Tone: {{Tone}} (examples: formal, informative, friendly, descriptive, financial-professional)

---

### WRITING RULES:

1. **Language & Tone**
   - Write in the exact language specified by {{Language}}.
   - Adapt tone based on {{Tone}} (e.g., professional, friendly, descriptive).
   - Never mention tone or language in output.

2. **Overview**
   - 1–2 lines only.
   - Clearly mention the bank and Swift Code naturally.
   - Example:
     "The Swift Code HABBPKKA belongs to Habib Bank Limited in Karachi, helping identify the bank in international money transfers."

3. **Description**
   - Must be 85–120 words.
   - Explain how the Swift Code is used for secure international transfers, fund verification, etc.
   - Mention the bank name, city, country, and area naturally.
   - Sound like a native writer from {{Country_Name}}.
   - Avoid repetitive or robotic phrasing.
   - Keep SEO-friendly but natural.

4. **FAQs**
   - Exactly 3–5 FAQs.
   - Each question should sound human and locally relevant.
   - Each answer should be 25–45 words long.
   - Vary sentence patterns; avoid repetitive structures.
   - Use localized phrasing that fits {{Language}} and {{Country_Name}}.

5. **Formatting**
   - Output must be **pure JSON**.
   - No markdown, no extra text.
   - No variable labels or placeholders in the content.
   - Ensure valid JSON syntax — always enclosed in { }.

---

### EXAMPLE OUTPUT (format only):

{
  "overview": "The Swift Code HABBPKKA belongs to Habib Bank Limited, one of Pakistan’s leading financial institutions located on I.I. Chundrigar Road, Karachi.",
  "description": "Habib Bank Limited (HBL) in Karachi uses the Swift Code HABBPKKA for secure international money transfers and cross-border transactions. This code helps global banks identify HBL’s main branch in Pakistan for accurate fund routing. Customers and businesses worldwide rely on it for remittances, foreign payments, and currency settlements. As a trusted financial institution, HBL Karachi serves as a central hub connecting Pakistan’s economy with global banking networks.",
  "faqs": [
    {
      "question": "What is the Swift Code for Habib Bank Limited Karachi?",
      "answer": "The Swift Code for Habib Bank Limited Karachi is HABBPKKA, used for international wire transfers and secure cross-border payments."
    },
    {
      "question": "Why is a Swift Code important for banking?",
      "answer": "A Swift Code helps identify specific banks during international transactions, ensuring funds reach the correct destination quickly and securely."
    },
    {
      "question": "Can I use HABBPKKA for all HBL branches in Pakistan?",
      "answer": "This Swift Code mainly represents HBL’s Karachi head office, though some branches may share it depending on transaction type."
    }
  ]
}
`;

const MONGODB_URI = process.env.MONGO_DB_URL;

const DELAY_BETWEEN_REQUESTS = 4000; // 4s between requests
const LIMIT_PER_BATCH = 10; // process 10 at a time

await mongoose.connect(MONGODB_URI);
logger.info('✅ Connected to MongoDB');

// 💤 Helper sleep
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// 🌐 Get unique language list
const getUniqueLanguages = () => {
  return [...new Set(Object.values(supportedCountries))];
};

// 🧠 Build prompt dynamically
function buildPrompt({ country, city, bank, branch, swiftCode, language, tone = 'informative' }) {
  return MASTER_PROMPT.replace('{{Country_Name}}', country)
    .replace('{{City_Name}}', city || '')
    .replace('{{Bank_Name}}', bank)
    .replace('{{Branch_Name}}', branch || '')
    .replace('{{SWIFT_Code}}', swiftCode)
    .replace('{{Language}}', language)
    .replace('{{Tone}}', tone);
}

async function generateBankContent() {
  const totalCount = await BankCode.countDocuments({ isDeleted: false, status: true });
  logger.info(`🏦 Total bank records: ${totalCount}`);

  const languages = getUniqueLanguages();
  logger.info(`🌐 Languages: ${languages}`);

  for (const countryCode of Object.keys(supportedCountries)) {
    const countryName = countryCode.toUpperCase();
    logger.info(`\n🌍 COUNTRY START: ${countryName}`);

    for (const language of languages) {
      logger.info(`🈳 Generating for ${countryName} → Language: ${language}`);

      let skip = 0;
      while (true) {
        const bankCodes = await BankCode.find({
          isDeleted: false,
          status: true,
          contentGenerated: { $ne: true },
        })
          .skip(skip)
          .limit(LIMIT_PER_BATCH)
          .lean();

        if (bankCodes.length === 0) break;

        logger.info(`🚚 Processing batch: skip=${skip}, limit=${LIMIT_PER_BATCH}`);

        for (const bank of bankCodes) {
          const city = bank.city || '';
          const branch = bank.branch || '';
          const swiftCode = bank.swiftCode || '';
          const bankName = bank.bank;

          const prompt = buildPrompt({
            country: countryName,
            city,
            bank: bankName,
            branch,
            swiftCode,
            language,
          });

          try {
            const response = await ollama.chat({
              model: 'llama3.2',
              messages: [{ role: 'user', content: prompt }],
            });

            const data = response.message.content;
            const aiMessage = data?.trim();
            if (!aiMessage) {
              logger.warn(`❌ No content for ${countryCode}-${bankName} (${language})`);
              continue;
            }

            let parsed;
            try {
              const jsonStart = aiMessage.indexOf('{');
              const jsonEnd = aiMessage.lastIndexOf('}');
              parsed = JSON.parse(aiMessage.slice(jsonStart, jsonEnd + 1));
            } catch (err) {
              logger.error(`⚠️ Invalid JSON for ${countryCode}-${bankName}:`, err.message);
              continue;
            }

            const { description, keyFeatures, faqs } = parsed;

            await ContentMeta.findOneAndUpdate(
              {
                refModel: 'BankCode',
                refId: bank._id,
                countryCode,
                language,
              },
              {
                description,
                keyFeatures,
                faqs,
                countryName,
                source: 'ai',
              },
              { upsert: true, new: true },
            );

            await BankCode.findByIdAndUpdate(bank._id, { contentGenerated: true });

            logger.info(`✅ Saved ${countryCode}-${bankName} (${language})`);
            await sleep(DELAY_BETWEEN_REQUESTS);
          } catch (err) {
            logger.error(`🚨 Error ${countryCode}-${bankName} (${language}):`, err.message);
          }
        }

        skip += LIMIT_PER_BATCH;
      }

      logger.info(`✅ LANGUAGE DONE: ${countryName}-${language}`);
    }

    logger.info(`🏁 COUNTRY DONE: ${countryName}`);
  }

  logger.info('\n🎉 All countries + languages processed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

generateBankContent();
