import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
    {
        idTeam: { type: String, required: true, unique: true },
        idAPIfootball: { type: String, required: false, },
        name: { type: String, required: true, trim: true },
        alternateName: { type: String, required: false, trim: true },
        shortName: { type: String, required: false, trim: true },
        formedYear: { type: String, required: false },
        sport: { type: String, required: true, default: 'Soccer' },
        leagues: [
            {
                league: { type: mongoose.Schema.Types.ObjectId, ref: 'League', required: true },
                leagueName: { type: String, required: true, trim: true },
            },
        ],
        stadium: {
            idVenue: { type: String, required: false },
            name: { type: String, required: false, trim: true },
            location: { type: String, required: false, trim: true },
            capacity: { type: Number, required: false },
        },
        keywords: { type: String, required: false, trim: true },
        website: { type: String, required: false, trim: true },
        facebook: { type: String, required: false, trim: true },
        twitter: { type: String, required: false, trim: true },
        instagram: { type: String, required: false, trim: true },
        youtube: { type: String, required: false, trim: true },
        description: { type: String, required: false, trim: true },
        badge: { type: String, required: false, trim: true },
        logo: { type: String, required: false, trim: true },
        gender: { type: String, enum: ['Male', 'Female',"Mixed"], required: true },
        country: { type: String, required: true },
        status: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Team = mongoose.model('Team', teamSchema);

export default Team;