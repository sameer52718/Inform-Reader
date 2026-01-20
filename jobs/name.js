import cron from 'node-cron';
import Name from '../models/Name.js';
import Sitemap from '../models/Sitemap.js';
import logger from '../logger.js';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DAILY_LIMIT = 150;

// Sleep helper (ms)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Same system prompt used in worker
const SYSTEM_PROMPT = `SYSTEM ROLE (MANDATORY)
You are an Omni-Level Baby Names Intelligence Engine combining:
• Professional onomastics & linguistics researcher
 • Global cultural & religious naming analyst
 • Google EEAT & Helpful Content strategist
 • Programmatic SEO architect
 • Factual accuracy & hallucination auditor
 • Neutral human editorial writer
 • Structured-data & schema designer
STRICT RULES (NON-NEGOTIABLE)
• Do NOT invent facts
 • If information varies by region, state uncertainty clearly
 • Astrology, numerology, destiny, folklore, or supernatural claims are forbidden
 • No poetic, emotional, promotional, or marketing language
 • Tone must be neutral, encyclopedic, parent-focused
 • Avoid repetition across sections
 • Famous people ≠ endorsement ≠ popularity cause
WORD COUNT ENFORCEMENT (ABSOLUTE)
Narrative text only (JSON keys excluded):
• Minimum: 550 words
 • Maximum: 650 words
Never exceed. Never go below.
AI OVERVIEW OPTIMIZATION (MANDATORY)
Include ONE concise definition for Google AI Overview.
Rules:
 • 25–35 words
 • One sentence only
 • Fact-based
 • No adjectives
 • No symbolism
PRIMARY OBJECTIVE
Generate a HIGH-TRUST, EEAT-COMPLIANT, SEO-OPTIMIZED baby name profile that:
• Is safe for Google indexing
 • Scales to 100,000+ programmatic pages
 • Matches real parent search intent
 • Is delivered in VALID JSON ONLY
KEYWORD INTELLIGENCE (HARD LOCK)
Provide minimum 3 keywords per category (max 5):
• hard_keywords
 • query_based_keywords
 • paa_keywords
HEADING STRUCTURE (HARD LOCK)
H1 (ONLY ONE)
{Name} Name Meaning, Origin, and Usage
Used once only.
H2 (FIXED ORDER — USE EACH ONCE)
1.	Introduction

2.	Meaning and Linguistic Analysis

3.	Etymology and Historical Context

4.	Cultural and Religious Context

5.	Usage and Relevance

6.	Community Usage

7.	Traditionally Admired Qualities

8.	Notable Individuals

9.	Practical Details

10.	Frequently Asked Questions

KEYWORD PLACEMENT LOCK
Primary hard keyword:
 • H1 → once
 • Introduction → once
 • Meaning → once
 • Nowhere else
INTERNAL LINKING PLACEHOLDERS
Allowed placeholders ONLY:
• {related_arabic_names}
 • {related_islamic_names}
 • {related_boy_names}
 • {related_girl_names}
 • {related_name_variants}
Use 1–2 max.
QUICK FACTS — TABLE RENDER CONTRACT
Allowed table fields ONLY
JSON Key	Display Label
name	Name
gender	Gender
language	Language of Origin
region	Regional Roots
meaning_short	Meaning
syllable_count	Syllables
pronunciation	Pronunciation
name_length	Name Length
Rules:
 • Table only
 • After Introduction
 • No explanations
 • No links
STRICT OUTPUT FORMAT — JSON ONLY
{
  "name": "",
  "slug": "",
  "gender": "",
  "luckyNumber": "",
  "luckyColor": "",
  "luckyStone": "",
  "origin": {
    "language": "",
    "region": "",
    "historical_background": ""
  },
  "religion": "",
  "country_focus": "",
  "seo": {
    "title": "",
    "meta_description": "",
    "h1": "",
    "meta_tags": []
  },
  "focus_keywords": {
    "hard_keywords": [],
    "query_based_keywords": [],
    "paa_keywords": []
  },
  "ai_overview_summary": "",
  "introduction": "",
  "quick_facts": {
    "name": "",
    "gender": "",
    "language": "",
    "region": "",
    "meaning_short": "",
    "syllable_count": "",
    "pronunciation": "",
    "name_length": ""
  },
  "meaning": {
    "primary": "",
    "linguistic_analysis": "",
    "variations": []
  },
  "etymology": "",
  "cultural_context": "",
  "popularity_trends": "",
  "modern_vs_traditional": "",
  "regional_usage": "",
  "ethnic_community_usage": {
    "description": "",
    "regions": [],
    "disclaimer": ""
  },
  "traditionally_admired_qualities": "",
  "notable_individuals": [],
  "internal_linking_signals": [],
  "nicknames": [],
  "similar_names": [],
  "pronunciation": "",
  "search_intent_analysis": {
    "primary_intent": "",
    "secondary_intents": []
  },
  "faqs": [
    {
      "question": "",
      "answer": ""
    }
  ],
  "eeat_note": ""
}

Process the provided name using all rules above. Return ONLY valid JSON. Do NOT explain. Do NOT add extra text.`;

const gemini = new GoogleGenAI({ apiKey: "AIzaSyBjE7p0mRv5pZm49z2TQsbbjIoq_UXKRd4" });

// Daily job: pick up to 150 unprocessed names from DB and process directly with Gemini
export async function scheduleNameProcessingCron() {

    const jobId = Date.now().toString();
    logger.info(`[NamesCron][Job:${jobId}] Starting daily name processing cron (direct Gemini)`);

    try {
        // Find up to 150 names which are not yet processed
        const names = await Name.find({
            isProcessed: { $ne: true },
            isDeleted: false,
            status: true,
        })
            .sort({ createdAt: 1 })
            .limit(DAILY_LIMIT)
            .populate('religionId', 'name')
            .populate('categoryId', 'name')
            .lean();

        if (!names.length) {
            logger.info(`[NamesCron][Job:${jobId}] No unprocessed names found`);
            return;
        }

        logger.info(
            `[NamesCron][Job:${jobId}] Found ${names.length} unprocessed names, processing with Gemini (1/minute)`,
        );

        let processedCount = 0;

        for (const n of names) {
            try {
                // Prepare input
                const genderLabel =
                    n.gender === 'MALE' ? 'MALE' : n.gender === 'FEMALE' ? 'FEMALE' : 'OTHER';

                const inputData = {
                    names_list: [
                        {
                            name: n.name,
                            gender: genderLabel,
                            origin: n.origion || n.origin?.language || '',
                            religion: n.religionId?.name || '',
                            country: 'global',
                        },
                    ],
                };

                const prompt = `${SYSTEM_PROMPT}\n\nInput:\n${JSON.stringify(inputData, null, 2)}`;

                logger.info(
                    `[NamesCron][Job:${jobId}] [${processedCount + 1}/${names.length}] Calling Gemini for ${n.name} (${n.slug})`,
                );

                const response = await gemini.models.generateContent({
                    model: 'gemini-2.5-flash-lite',
                    contents: prompt,
                });

                const responseText = response.candidates[0].content.parts[0].text.trim();

                // Extract JSON (handle ```json blocks)
                let jsonText = responseText;
                if (jsonText.includes('```json')) {
                    jsonText = jsonText.split('```json')[1].split('```')[0].trim();
                } else if (jsonText.includes('```')) {
                    jsonText = jsonText.split('```')[1].split('```')[0].trim();
                }

                let parsedData;
                try {
                    parsedData = JSON.parse(jsonText);
                } catch (parseError) {
                    logger.error(
                        `[NamesCron][Job:${jobId}] JSON parse error for ${n.name}: ${parseError.message}`,
                    );
                    logger.error(`Response text: ${responseText.substring(0, 500)}`);
                    continue;
                }
                logger.info(parsedData,'parsedData');

                // Prepare update
                const nameData = {
                    name: parsedData.name || n.name,
                    slug: n.slug,
                    gender: n.gender,
                    initialLetter: n.initialLetter || (n.name ? n.name.charAt(0).toUpperCase() : ''),
                    shortMeaning:
                        parsedData.quick_facts?.meaning_short ||
                        parsedData.meaning?.primary ||
                        n.shortMeaning ||
                        '',
                    luckyNumber: parsedData.luckyNumber || n.luckyNumber || '',
                    luckyColor: parsedData.luckyColor || n.luckyColor || '',
                    luckyStone: parsedData.luckyStone || n.luckyStone || '',
                    longMeaning: parsedData.introduction || n.longMeaning || '',
                    origion: parsedData.origin?.language || n.origion || '',
                    shortName: n.shortName || 'YES',
                    nameLength: n.nameLength || (n.name ? n.name.length : 0),

                    // structured fields
                    origin: parsedData.origin || {},
                    country_focus: parsedData.country_focus || null,
                    seo: parsedData.seo || {},
                    focus_keywords: parsedData.focus_keywords || {},
                    ai_overview_summary: parsedData.ai_overview_summary || null,
                    introduction: parsedData.introduction || null,
                    quick_facts: parsedData.quick_facts || {},
                    meaning: parsedData.meaning || {},
                    etymology: parsedData.etymology || null,
                    cultural_context: parsedData.cultural_context || null,
                    popularity_trends: parsedData.popularity_trends || null,
                    modern_vs_traditional: parsedData.modern_vs_traditional || null,
                    regional_usage: parsedData.regional_usage || null,
                    ethnic_community_usage: parsedData.ethnic_community_usage || {},
                    traditionally_admired_qualities: parsedData.traditionally_admired_qualities || null,
                    notable_individuals: parsedData.notable_individuals || [],
                    internal_linking_signals: parsedData.internal_linking_signals || [],
                    nicknames: parsedData.nicknames || [],
                    similar_names: parsedData.similar_names || [],
                    pronunciation: parsedData.pronunciation || null,
                    search_intent_analysis: parsedData.search_intent_analysis || {},
                    faqs: parsedData.faqs || [],
                    eeat_note: parsedData.eeat_note || null,

                    isProcessed: true,
                    processedAt: new Date(),
                };

                const updated = await Name.findOneAndUpdate({ _id: n._id }, nameData, {
                    new: true,
                });

                logger.info(
                    `[NamesCron][Job:${jobId}] Processed & saved name ${updated.name} (${updated.slug})`,
                );

                // Sitemap entry
                const sitemapUrl = `https://informreaders.com/baby-names/${updated.slug}`;
                await Sitemap.findOneAndUpdate(
                    { url: sitemapUrl },
                    {
                        url: sitemapUrl,
                        lastModified: new Date(),
                        changeFreq: 'weekly',
                        priority: 0.7,
                        type: 'page',
                    },
                    { upsert: true },
                );

                processedCount++;

                // 1 minute delay between Gemini calls
                if (processedCount < names.length) {
                    logger.info(
                        `[NamesCron][Job:${jobId}] Sleeping 60s before next Gemini call (processed: ${processedCount})`,
                    );
                    await sleep(60_000);
                }
            } catch (err) {
                logger.error(
                    `[NamesCron][Job:${jobId}] Error processing name ${n.name} (${n.slug}): ${err.message}`,
                );
                await sleep(2000);
            }
        }

        logger.info(
            `[NamesCron][Job:${jobId}] Finished daily run. Successfully processed ${processedCount} names.`,
        );
    } catch (error) {
        logger.error(
            `[NamesCron][Job:${jobId}] Unexpected error in daily name cron: ${error.message}`,
        );
    }
}

