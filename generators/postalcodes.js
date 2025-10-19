import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PostalCode from './models/PostalCode.js';
import ContentMeta from './models/ContentMeta.js';
import { supportedCountries } from './jobs/data.js';
import ollama from 'ollama';
import logger from './logger.js';

dotenv.config();

// 🧠 Master Prompt for the AI
export const MASTER_PROMPT = `
You are an expert SEO content writer specializing in localization and tone variation for international websites.
Your task is to generate **localized, SEO-optimized content** for postal codes around the world.

Always return the output in **valid JSON format** exactly matching this structure:
{
  "description": "85-120 word localized paragraph about the postal code.",
  "keyFeatures": [
    "Feature 1",
    "Feature 2",
    "Feature 3",
    "Feature 4",
    "Feature 5"
  ],
  "faqs": [
    {
      "question": "Question 1?",
      "answer": "Answer 1."
    },
    {
      "question": "Question 2?",
      "answer": "Answer 2."
    },
    {
      "question": "Question 3?",
      "answer": "Answer 3."
    },
    {
      "question": "Question 4?",
      "answer": "Answer 4."
    },
    {
      "question": "Question 5?",
      "answer": "Answer 5."
    }
  ]
}

Do NOT include any text outside this JSON structure — no explanations, no notes, no markdown.

---

### LANGUAGE RULE:
⚠️ **Important:**  
Write the entire content **in the language specified by {{Language}}**.  
For example:
- If {{Language}} = "ar" → write in Arabic.
- If {{Language}} = "ur" → write in Urdu.
- If {{Language}} = "fr" → write in French.
- If {{Language}} = "en" → write in English.
Use natural grammar, vocabulary, and sentence flow of that language.

---


---

### INPUT VARIABLES:
- Country: {{Country_Name}}
- City: {{City_Name}}
- Region/Province/State: {{Region_Name}}
- Postal Code: {{Postal_Code}}
- Language: {{Language}}
- Tone: {{Tone}} (examples: formal, informative, conversational, friendly, descriptive)

---

### DESCRIPTION RULES:
1. Write 85–120 words.
2. Use natural, localized language — sound native to the {{Language}}.
3. Briefly describe what postal code {{Postal_Code}} represents and how it's used.
4. Mention the city, region, and country naturally.
5. Avoid robotic phrasing and repetition.
6. Do not include variable labels or placeholders in the final text.
7. Focus on clarity, local context, and usefulness.

---

### KEY FEATURES RULES:
Generate **5 short key highlights** relevant to the postal code area (e.g., region, usage, nearby areas, mail system, delivery reliability).

---

### FAQ RULES:
1. Generate exactly **5 FAQs**.
2. Keep questions natural, concise, and relevant to {{Postal_Code}} in {{City_Name}}, {{Country_Name}}.
3. Use varied phrasing — mix factual and practical types.
4. Don’t repeat questions across different outputs.
5. Each answer should be 1–2 sentences.

---

### STYLE RULES:
- Do not mention “language”, “tone”, or any variable name in output.
- Use localized grammar, vocabulary, and idioms.
- Sound human, natural, and informative.
- No markdown, no asterisks, no numbering — **only valid JSON**.

---

### EXAMPLE OUTPUT (format only):
{
  "description": "Postal code 75400 covers a central area in Karachi, Sindh, Pakistan. It helps organize mail delivery and identify this part of the city, known for both residential and business activity...",
  "keyFeatures": [
    "Located in Karachi, Sindh region",
    "Supports reliable mail and courier delivery",
    "Used by Pakistan Post and major couriers",
    "Includes commercial and residential zones",
    "Easy identification for logistics and e-commerce"
  ],
  "faqs": [
    {
      "question": "What area does postal code 75400 cover?",
      "answer": "It includes central Karachi and nearby neighborhoods."
    },
    {
      "question": "How can I verify postal code 75400?",
      "answer": "You can check via Pakistan Post or official postal directories."
    },
    {
      "question": "Does 75400 support courier deliveries?",
      "answer": "Yes, major courier companies use it for mail and parcel services."
    },
    {
      "question": "Why are postal codes like 75400 important?",
      "answer": "They help identify regions for accurate mail distribution."
    },
    {
      "question": "Is 75400 used for both homes and businesses?",
      "answer": "Yes, it covers residential and commercial properties in the area."
    }
  ]
}
`;

const MONGODB_URI = process.env.MONGO_DB_URL;

const DELAY_BETWEEN_REQUESTS = 4000; // 4s between API calls
const LIMIT_PER_BATCH = 10; // how many postal codes per batch

await mongoose.connect(MONGODB_URI);
logger.info('✅ Connected to MongoDB');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// 🧩 Helper: get language from country code
const getUniqueLanguages = () => {
  return [...new Set(Object.values(supportedCountries))];
};

// 🧠 Helper: Generate prompt text dynamically
function buildPrompt({ country, city, region, postalCode, language, tone = 'informative' }) {
  return MASTER_PROMPT.replace('{{Country_Name}}', country)
    .replace('{{City_Name}}', city || '')
    .replace('{{Region_Name}}', region || '')
    .replace('{{Postal_Code}}', postalCode)
    .replace('{{Language}}', language)
    .replace('{{Tone}}', tone);
}

async function generatePostalContent() {
  const totalCount = await PostalCode.countDocuments({ isDeleted: false, status: true });
  logger.info(`📦 Total postal codes: ${totalCount}`);
  const languages = getUniqueLanguages();
  logger.info(`🌐 Languages: ${languages}`);

  // Outer loop: countries
  for (const countryCode of Object.keys(supportedCountries)) {
    const countryName = countryCode.toUpperCase();

    logger.info(`\n🌍 COUNTRY START: ${countryName}`);

    // Inner loop: languages
    for (const language of languages) {
      logger.info(`🈳 Generating for ${countryName} → Language: ${language}`);

      let skip = 0;
      while (skip < totalCount) {
        const postalCodes = await PostalCode.find({ isDeleted: false, status: true }).skip(skip).limit(LIMIT_PER_BATCH).lean();

        if (postalCodes.length === 0) break;

        logger.info(`🚚 Processing batch: skip=${skip}, limit=${LIMIT_PER_BATCH}`);

        for (const postal of postalCodes) {
          const city = postal.area || '';
          const region = postal.state || '';
          const postalCode = postal.code;

          const prompt = buildPrompt({
            country: countryName,
            city,
            region,
            postalCode,
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
              logger.warn(`❌ No content for ${countryCode}-${postalCode} (${language})`);
              continue;
            }

            let parsed;
            try {
              const jsonStart = aiMessage.indexOf('{');
              const jsonEnd = aiMessage.lastIndexOf('}');
              parsed = JSON.parse(aiMessage.slice(jsonStart, jsonEnd + 1));
            } catch (err) {
              logger.error(`⚠️ Invalid JSON for ${countryCode}-${postalCode}:`, err.message);
              continue;
            }

            const { description, keyFeatures, faqs } = parsed;

            await ContentMeta.findOneAndUpdate(
              {
                refModel: 'PostalCode',
                refId: postal._id,
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

            logger.info(`✅ Saved ${countryCode}-${postalCode} (${language})`);
            await sleep(DELAY_BETWEEN_REQUESTS);
          } catch (err) {
            logger.error(`🚨 Error ${countryCode}-${postalCode} (${language}):`, err.message);
          }
        }

        skip += LIMIT_PER_BATCH; // ⏭️ move to next batch
      }

      logger.info(`✅ LANGUAGE DONE: ${countryName}-${language}`);
    }

    logger.info(`🏁 COUNTRY DONE: ${countryName}`);
  }

  logger.info('\n🎉 All countries + languages processed successfully!');
  await mongoose.disconnect();
  process.exit(0); // clean exit
}

generatePostalContent();
