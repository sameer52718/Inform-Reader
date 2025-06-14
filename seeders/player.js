import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Player from '../models/Player.js';
import Team from '../models/Team.js';

dotenv.config();

const BATCH_SIZE = 500; // Set batch size for insertions

const seedPlayers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('🚀 Connected to MongoDB');

        // Read the JSON file and parse it
        let rawData;
        try {
            rawData = fs.readFileSync('seeders/players.json');
        } catch (error) {
            console.error('❌ Error reading players.json:', error.message);
            process.exit(1);
        }

        let playersData;
        try {
            playersData = JSON.parse(rawData);
        } catch (error) {
            console.error('❌ Error parsing players.json:', error.message);
            process.exit(1);
        }

        // Map to cache teams to avoid redundant DB calls
        const teamMap = new Map();
        // Set to track unique players
        const existingPlayersSet = new Set();
        // Array to collect the players to insert in batches
        const batchData = [];
        let added = 0;
        let skipped = 0;

        for (const playerData of playersData) {
            // Check if player array is present and is an array
            if (!playerData.player || !Array.isArray(playerData.player)) {
                console.log(`⚠️ Skipped (player array is missing or not an array): ${JSON.stringify(playerData)}`);
                skipped++;
                continue; // Skip this iteration if player array is missing or not iterable
            }

            for (const item of playerData.player) {
                // Check if required fields are missing or invalid
                if (!item.idTeam || item.idTeam.trim() === '') {
                    console.log(`⚠️ Skipped (missing or invalid team): Player ${item.strPlayer} (idPlayer: ${item.idPlayer})`);
                    skipped++;
                    continue; // Skip if team is missing or invalid
                }

                if (!item.strPlayer || item.strPlayer.trim() === '') {
                    console.log(`⚠️ Skipped (missing or invalid player name): idPlayer ${item.idPlayer}`);
                    skipped++;
                    continue; // Skip if player name is missing or invalid
                }

                if (!item.strGender || !['Male', 'Female'].includes(item.strGender)) {
                    console.log(`⚠️ Skipped (missing or invalid gender): Player ${item.strPlayer} (idPlayer: ${item.idPlayer})`);
                    skipped++;
                    continue; // Skip if gender is missing or invalid
                }

                if (!item.strPosition || item.strPosition.trim() === '') {
                    console.log(`⚠️ Skipped (missing or invalid position): Player ${item.strPlayer} (idPlayer: ${item.idPlayer})`);
                    skipped++;
                    continue; // Skip if position is missing or invalid
                }

                if (!item.strNationality || item.strNationality.trim() === '') {
                    console.log(`⚠️ Skipped (missing or invalid nationality): Player ${item.strPlayer} (idPlayer: ${item.idPlayer})`);
                    skipped++;
                    continue; // Skip if nationality is missing or invalid
                }

                // Check and get team from map or database
                let team = teamMap.get(item.idTeam);
                if (!team) {
                    team = await Team.findOne({ idTeam: item.idTeam }).select('_id');
                    if (!team) {
                        console.log(`⚠️ Skipped (team not found in DB): Player ${item.strPlayer} (idPlayer: ${item.idPlayer})`);
                        skipped++;
                        continue; // Skip if team is not found
                    }
                    teamMap.set(item.idTeam, team); // Cache the result
                }

                // Skip if player is already in the batch
                if (existingPlayersSet.has(item.idPlayer)) {
                    console.log(`⚠️ Skipped (already exists in batch): Player ${item.strPlayer} (idPlayer: ${item.idPlayer})`);
                    skipped++;
                    continue; // Skip if player is already in the set
                }

                // Check if player already exists in the database
                // const existing = await Player.findOne({ idPlayer: item.idPlayer });
                // if (existing) {
                //     console.log(`⚠️ Skipped (already exists in DB): Player ${item.strPlayer} (idPlayer: ${item.idPlayer})`);
                //     skipped++;
                // } else {
                const formattedPlayer = {
                    idPlayer: item.idPlayer,
                    idAPIfootball: item.idAPIfootball || null,
                    name: item.strPlayer,
                    alternateName: item.strPlayerAlternate || null,
                    nationality: item.strNationality,
                    team: team._id,
                    sport: item.strSport || 'Soccer',
                    dateBorn: item.dateBorn ? new Date(item.dateBorn) : null,
                    number: item.strNumber || null,
                    signing: item.strSigning || null,
                    birthLocation: item.strBirthLocation || null,
                    position: item.strPosition,
                    height: item.strHeight || null,
                    weight: item.strWeight || null,
                    gender: item.strGender,
                    status: item.strStatus || 'Active',
                    description: item.strDescriptionEN || null,
                    thumb: item.strThumb || null,
                    cutout: item.strCutout || null,
                    render: item.strRender || null,
                    facebook: item.strFacebook || null,
                    twitter: item.strTwitter || null,
                    instagram: item.strInstagram || null,
                    youtube: item.strYoutube || null,
                };

                batchData.push(formattedPlayer); // Collect the data in the batch array
                existingPlayersSet.add(item.idPlayer); // Add player ID to the set to ensure uniqueness
                // }

                // If the batch size is reached, insert the data in bulk
                if (batchData.length >= BATCH_SIZE) {
                    await Player.insertMany(batchData);
                    added += batchData.length;
                    console.log(`✅ Inserted ${batchData.length} players into the database, total: ${added}`);
                    batchData.length = 0; // Clear the batch after insertion
                    existingPlayersSet.clear(); // Clear the set after batch insert
                }
            }
        }

        // Insert any remaining data that wasn't inserted in the last batch
        if (batchData.length > 0) {
            await Player.insertMany(batchData);
            added += batchData.length;
            console.log(`✅ Inserted ${batchData.length} players into the database, total: ${added}`);
        }

        console.log(`📊 Seeding complete: ${added} players inserted, ${skipped} players skipped`);

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit();
    } catch (error) {
        console.error('❌ Error seeding players:', error.message);
        process.exit(1);
    }
};

seedPlayers();