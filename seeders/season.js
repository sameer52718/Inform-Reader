import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Season from '../models/Season.js';
import League from '../models/League.js';

dotenv.config();

const BATCH_SIZE = 500; // Set batch size for insertions

const seedSeasons = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🚀 Connected to MongoDB');

    // Read the JSON file and parse it
    let rawData;
    try {
      rawData = fs.readFileSync('seeders/seasons.json');
    } catch (error) {
      console.error('❌ Error reading seasons.json:', error.message);
      process.exit(1);
    }

    let seasonsData;
    try {
      seasonsData = JSON.parse(rawData);
    } catch (error) {
      console.error('❌ Error parsing seasons.json:', error.message);
      process.exit(1);
    }

    // Map to cache leagues to avoid redundant DB calls
    const leagueMap = new Map();
    // Set to track unique seasons (league-season combination)
    const existingSeasonsSet = new Set();
    // Array to collect the seasons to insert in batches
    const batchData = [];
    let added = 0;
    let skipped = 0;

    for (const leagueData of seasonsData) {
      // Check if league_id is missing or invalid
      if (!leagueData.league_id || leagueData.league_id.trim() === '') {
        console.log(`⚠️ Skipped (missing or invalid league_id): ${JSON.stringify(leagueData)}`);
        skipped++;
        continue; // Skip this iteration if league_id is missing or invalid
      }

      // Check if seasons is present and is an array
      if (!leagueData.seasons || !Array.isArray(leagueData.seasons)) {
        console.log(`⚠️ Skipped (seasons is missing or not an array): league_id ${leagueData.league_id}, seasons: ${JSON.stringify(leagueData.seasons)}`);
        skipped++;
        continue; // Skip this iteration if seasons is missing or not iterable
      }

      // Check and get league from map or database
      let league = leagueMap.get(leagueData.league_id);
      if (!league) {
        league = await League.findOne({ idLeague: leagueData.league_id }).select('_id');
        if (!league) {
          console.log(`⚠️ Skipped (league not found in DB): Seasons for league_id ${leagueData.league_id}`);
          skipped += leagueData.seasons.length;
          continue; // Skip this iteration if league is not found
        }
        leagueMap.set(leagueData.league_id, league); // Cache the result
      }

      for (const season of leagueData.seasons) {
        // Validate season.strSeason
        if (!season.strSeason || season.strSeason.trim() === '') {
          console.log(`⚠️ Skipped (invalid season): league_id ${leagueData.league_id}, season: ${JSON.stringify(season)}`);
          skipped++;
          continue;
        }

        const seasonKey = `${leagueData.league_id}-${season.strSeason}`; // Unique key for league-season combination

        // Skip the season if it's already been added to the batch
        if (existingSeasonsSet.has(seasonKey)) {
          console.log(`⚠️ Skipped (already exists in batch): Season ${season.strSeason} for league_id ${leagueData.league_id}`);
          skipped++;
          continue; // Skip this iteration if the season is already in the set
        }

        // Check if the season already exists in the database
        const existing = await Season.findOne({
          league: league._id,
          season: season.strSeason,
        });
        if (existing) {
          console.log(`⚠️ Skipped (already exists in DB): Season ${season.strSeason} for league_id ${leagueData.league_id}`);
          skipped++;
        } else {
          const formattedSeason = {
            league: league._id,
            season: season.strSeason,
            status: true,
          };

          batchData.push(formattedSeason); // Collect the data in the batch array
          existingSeasonsSet.add(seasonKey); // Add season key to the set to ensure uniqueness
        }

        // If the batch size is reached, insert the data in bulk
        if (batchData.length >= BATCH_SIZE) {
          await Season.insertMany(batchData);
          added += batchData.length;
          console.log(`✅ Inserted ${batchData.length} seasons into the database, total: ${added}`);
          batchData.length = 0; // Clear the batch after insertion
          existingSeasonsSet.clear(); // Clear the set after batch insert
        }
      }
    }

    // Insert any remaining data that wasn't inserted in the last batch
    if (batchData.length > 0) {
      await Season.insertMany(batchData);
      added += batchData.length;
      console.log(`✅ Inserted ${batchData.length} seasons into the database, total: ${added}`);
    }

    console.log(`📊 Seeding complete: ${added} seasons inserted, ${skipped} seasons skipped`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding seasons:', error.message);
    process.exit(1);
  }
};

seedSeasons();