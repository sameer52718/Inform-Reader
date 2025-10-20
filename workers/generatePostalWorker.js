import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import ollama from 'ollama';
import PostalCode from '../models/PostalCode.js';
import ContentMeta from '../models/ContentMeta.js';
import logger from '../logger.js';
import { exec } from 'child_process';
import axios from 'axios';

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

dotenv.config();

import { redisOptions } from '../queue/connection.js';

const MONGODB_URI = process.env.MONGO_DB_URL;
await mongoose.connect(MONGODB_URI);
logger.info('✅ MongoDB connected for PostalCode worker');

// 🧠 Helper: Sleep function
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// 🔍 Check if Ollama is alive
async function checkOllamaHealth() {
  try {
    const res = await axios.get('http://127.0.0.1:11434/api/tags', { timeout: 2000 });
    return res.status === 200;
  } catch {
    return false;
  }
}

// 🔁 Restart Ollama (Linux systemd)
async function restartOllama() {
  return new Promise((resolve, reject) => {
    exec('systemctl restart ollama', (err) => {
      if (err) {
        logger.error('⚠️ Failed to restart Ollama:', err.message);
        return reject(err);
      }
      logger.info('🔁 Ollama restarted successfully');
      resolve();
    });
  });
}

// 🧠 Helper: Build prompt dynamically
function buildPrompt({ country, city, region, postalCode, language, tone = 'informative' }) {
  return MASTER_PROMPT.replace('{{Country_Name}}', country)
    .replace('{{City_Name}}', city || '')
    .replace('{{Region_Name}}', region || '')
    .replace('{{Postal_Code}}', postalCode)
    .replace('{{Language}}', language)
    .replace('{{Tone}}', tone);
}

// 🧩 Worker — 1 job = 1 postal code
const worker = new Worker(
  'generatePostalCode',
  async (job) => {
    const { postalId, countryCode, language = 'en' } = job.data;

    if (!postalId) {
      logger.warn('⚠️ Skipped: No postalId provided in job');
      return;
    }

    const postal = await PostalCode.findById(postalId).lean();
    if (!postal) {
      logger.warn(`⚠️ Postal code not found for ID: ${postalId}`);
      return;
    }

    const city = postal.area || '';
    const region = postal.state || '';
    const postalCode = postal.code;
    const countryName = countryCode?.toUpperCase() || 'UNKNOWN';

    const prompt = buildPrompt({
      country: countryName,
      city,
      region,
      postalCode,
      language,
    });

    try {
      if (!(await checkOllamaHealth())) {
        logger.error('💀 Ollama not responding — restarting...');
        await restartOllama();
        await sleep(6000); // wait before retry
      }

      logger.info(`🚀 Generating content for ${countryName}-${postalCode} (${language})`);

      const response = await ollama.chat({
        model: 'llama3.2',
        messages: [{ role: 'user', content: prompt }],
      });

      const data = response.message.content?.trim();
      if (!data) {
        logger.warn(`⚠️ No response for ${countryName}-${postalCode}`);
        return;
      }

      let parsed;
      try {
        const jsonStart = data.indexOf('{');
        const jsonEnd = data.lastIndexOf('}');
        parsed = JSON.parse(data.slice(jsonStart, jsonEnd + 1));
      } catch (err) {
        logger.error(`💥 Invalid JSON for ${countryName}-${postalCode}: ${err.message}`);
        return;
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

      logger.info(`✅ Saved content for ${countryName}-${postalCode} (${language})`);

      await sleep(2000); // delay between jobs
      return { success: true, postalCode };
    } catch (err) {
      logger.error(`🚨 Error on ${countryCode}-${postalCode}: ${err.message}`);
      // ⚡ if Ollama crashed, restart and throw to retry job
      if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed') || err.message.includes('socket hang up')) {
        await restartOllama();
      }
      throw err;
    }
  },
  { connection: redisOptions },
);

worker.on('completed', (job) => {
  logger.info(`🎯 Job completed: ${job.id}`);
});

worker.on('failed', (job, err) => {
  logger.error(`❌ Job failed (${job.id}): ${err.message}`);
});
