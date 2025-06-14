import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Team from '../models/Team.js';
import League from '../models/League.js';

dotenv.config();

const BATCH_SIZE = 500; // Set batch size for insertions

const seedTeams = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🚀 Connected to MongoDB');

    // Read the JSON file and parse it
    let rawData;
    try {
      rawData = fs.readFileSync('seeders/team.json');
    } catch (error) {
      console.error('❌ Error reading teams.json:', error.message);
      process.exit(1);
    }

    let teamsData;
    try {
      teamsData = JSON.parse(rawData);
    } catch (error) {
      console.error('❌ Error parsing teams.json:', error.message);
      process.exit(1);
    }

    // Maps to cache  leagues to avoid redundant DB calls
    const leagueMap = new Map();
    // Set to track unique teams
    const existingTeamsSet = new Set();
    // Array to collect the teams to insert in batches
    const batchData = [];
    let added = 0;
    let skipped = 0;

    for (const teamData of teamsData) {
      // Check if teams is present and is an array
      if (!teamData.teams || !Array.isArray(teamData.teams)) {
        console.log(`⚠️ Skipped (teams is missing or not an array): ${JSON.stringify(teamData)}`);
        skipped++;
        continue; // Skip this iteration if teams is missing or not iterable
      }

      for (const item of teamData.teams) {
        // Check if required fields are missing or invalid
        if (!item.strCountry || item.strCountry.trim() === '') {
          console.log(`⚠️ Skipped (missing or invalid country): Team ${item.strTeam} (idTeam: ${item.idTeam})`);
          skipped++;
          continue; // Skip if country is missing or invalid
        }

        if (!item.idLeague || item.idLeague.trim() === '') {
          console.log(`⚠️ Skipped (missing or invalid primary league): Team ${item.strTeam} (idTeam: ${item.idTeam})`);
          skipped++;
          continue; // Skip if primary league is missing or invalid
        }

        

        // Process leagues (strLeague to strLeague7)
        const leagues = [];
        for (let i = 1; i <= 7; i++) {
          const leagueKey = i === 1 ? 'idLeague' : `idLeague${i}`;
          const leagueNameKey = i === 1 ? 'strLeague' : `strLeague${i}`;
          if (item[leagueKey] && item[leagueNameKey]) {
            let league = leagueMap.get(item[leagueKey]);
            if (!league) {
              league = await League.findOne({ idLeague: item[leagueKey] }).select('_id');
              if (league) {
                leagueMap.set(item[leagueKey], league); // Cache the result
                leagues.push({
                  league: league._id,
                  leagueName: item[leagueNameKey],
                });
              }
            } else {
              leagues.push({
                league: league._id,
                leagueName: item[leagueNameKey],
              });
            }
          }
        }

        // Skip if no valid leagues were found (at least the primary league should exist)
        if (leagues.length === 0) {
          console.log(`⚠️ Skipped (no valid leagues found): Team ${item.strTeam} (idTeam: ${item.idTeam})`);
          skipped++;
          continue;
        }

        // Skip if team is already in the batch
        if (existingTeamsSet.has(item.idTeam)) {
          console.log(`⚠️ Skipped (already exists in batch): Team ${item.strTeam} (idTeam: ${item.idTeam})`);
          skipped++;
          continue; // Skip if team is already in the set
        }

        // Check if team already exists in the database
        const existing = await Team.findOne({ idTeam: item.idTeam });
        if (existing) {
          console.log(`⚠️ Skipped (already exists in DB): Team ${item.strTeam} (idTeam: ${item.idTeam})`);
          skipped++;
        } else {
          const formattedTeam = {
            idTeam: item.idTeam,
            idAPIfootball: item.idAPIfootball || null,
            name: item.strTeam,
            alternateName: item.strTeamAlternate || null,
            shortName: item.strTeamShort || null,
            formedYear: item.intFormedYear || null,
            sport: item.strSport || 'Soccer',
            leagues: leagues,
            stadium: {
              idVenue: item.idVenue || null,
              name: item.strStadium || null,
              location: item.strLocation || null,
              capacity: item.intStadiumCapacity || null,
            },
            keywords: item.strKeywords || null,
            website: item.strWebsite || null,
            facebook: item.strFacebook || null,
            twitter: item.strTwitter || null,
            instagram: item.strInstagram || null,
            youtube: item.strYoutube || null,
            description: item.strDescriptionEN || null,
            badge: item.strBadge || null,
            logo: item.strLogo || null,
            gender: item.strGender || "Mixed",
            country: item.strCountry,
            status: true,
          };

          batchData.push(formattedTeam); // Collect the data in the batch array
          existingTeamsSet.add(item.idTeam); // Add team ID to the set to ensure uniqueness
        }

        // If the batch size is reached, insert the data in bulk
        if (batchData.length >= BATCH_SIZE) {
          await Team.insertMany(batchData);
          added += batchData.length;
          console.log(`✅ Inserted ${batchData.length} teams into the database, total: ${added}`);
          batchData.length = 0; // Clear the batch after insertion
          existingTeamsSet.clear(); // Clear the set after batch insert
        }
      }
    }

    // Insert any remaining data that wasn't inserted in the last batch
    if (batchData.length > 0) {
      await Team.insertMany(batchData);
      added += batchData.length;
      console.log(`✅ Inserted ${batchData.length} teams into the database, total: ${added}`);
    }

    console.log(`📊 Seeding complete: ${added} teams inserted, ${skipped} teams skipped`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding teams:', error.message);
    process.exit(1);
  }
};

seedTeams();