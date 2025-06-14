import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import League from '../models/League.js';
import Country from '../models/Country.js';

dotenv.config();

const BATCH_SIZE = 500; // Set batch size for insertions

const seedLeagues = async () => {
    try {
        await mongoose.connect(process.env.MONGO_DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('🚀 Connected to MongoDB');

        // Read the JSON file and parse it
        const rawData = fs.readFileSync('seeders/league.json');
        const leaguesData = JSON.parse(rawData);

        // Maps to cache countries to avoid redundant DB calls
        const countryMap = new Map();
        // Set to track unique leagues
        const existingLeaguesSet = new Set();
        // Array to collect the leagues to insert in batches
        const batchData = [];
        let added = 0;
        let skipped = 0;

        for (const countryData of leaguesData) {
            for (const item of countryData.countries) {
                // Check if country is missing or invalid
                if (!item.strCountry || item.strCountry.trim() === '') {
                    console.log(`⚠️ Skipped (missing or invalid country):${item.strCountry}: ${item.strLeague} (idLeague: ${item.idLeague})`);
                    skipped++;
                    continue; // Skip this iteration if country is missing or invalid
                }



                const formattedLeague = {
                    idLeague: item.idLeague,
                    idAPIfootball: item.idAPIfootball || null,
                    name: item.strLeague,
                    alternateName: item.strLeagueAlternate || null,
                    division: item.intDivision || null,
                    isCup: item.idCup === '1',
                    currentSeason: item.strCurrentSeason,
                    formedYear: item.intFormedYear || null,
                    firstEventDate: item.dateFirstEvent ? new Date(item.dateFirstEvent) : null,
                    gender: item.strGender,
                    country: item.strCountry,
                    website: item.strWebsite || null,
                    facebook: item.strFacebook || null,
                    instagram: item.strInstagram || null,
                    twitter: item.strTwitter || null,
                    youtube: item.strYoutube || null,
                    description: item.strDescriptionEN || null,
                    badge: item.strBadge || null,
                    logo: item.strLogo || null,
                    trophy: item.strTrophy || null,
                    status: true,
                };

                // Skip the league if it's already been added to the batch or exists in the database
                if (existingLeaguesSet.has(item.idLeague)) {
                    console.log(`⚠️ Skipped (already exists in batch): ${item.strLeague} (idLeague: ${item.idLeague})`);
                    skipped++;
                    continue; // Skip this iteration if the league is already in the set
                }

                // const existing = await League.findOne({ idLeague: item.idLeague });
                // if (existing) {
                //     console.log(`⚠️ Skipped (already exists in DB): ${item.strLeague} (idLeague: ${item.idLeague})`);
                //     skipped++;
                // } else {
                    batchData.push(formattedLeague); // Collect the data in the batch array
                    existingLeaguesSet.add(item.idLeague); // Add league ID to the set to ensure uniqueness
                // }

                // If the batch size is reached, insert the data in bulk
                if (batchData.length >= BATCH_SIZE) {
                    await League.insertMany(batchData);
                    added += batchData.length;
                    console.log(`✅ Inserted ${batchData.length} leagues into the database, total: ${added}`);
                    batchData.length = 0; // Clear the batch after insertion
                    existingLeaguesSet.clear(); // Clear the set after batch insert
                }
            }
        }

        // Insert any remaining data that wasn't inserted in the last batch
        if (batchData.length > 0) {
            await League.insertMany(batchData);
            added += batchData.length;
            console.log(`✅ Inserted ${batchData.length} leagues into the database, total: ${added}`);
        }

        console.log(`📊 Seeding complete: ${added} leagues inserted, ${skipped} leagues skipped`);

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit();
    } catch (error) {
        console.error('❌ Error seeding leagues:', error.message);
        process.exit(1);
    }
};

seedLeagues();