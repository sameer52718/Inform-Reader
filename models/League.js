import mongoose from 'mongoose';

const leagueSchema = new mongoose.Schema(
  {
    idLeague: { type: String, required: true, unique: true },
    idAPIfootball: { type: String, required: false,  },
    name: { type: String, required: true, trim: true },
    alternateName: { type: String, required: false, trim: true },
    division: { type: String, required: false },
    isCup: { type: Boolean, default: false },
    currentSeason: { type: String, required: true },
    formedYear: { type: String, required: false },
    firstEventDate: { type: Date, required: false },
    gender: { type: String, enum: ['Male', 'Female','Mixed'], required: true },
    country: { type: String, required: true },
    website: { type: String, required: false, trim: true },
    facebook: { type: String, required: false, trim: true },
    instagram: { type: String, required: false, trim: true },
    twitter: { type: String, required: false, trim: true },
    youtube: { type: String, required: false, trim: true },
    description: { type: String, required: false, trim: true },
    badge: { type: String, required: false, trim: true },
    logo: { type: String, required: false, trim: true },
    trophy: { type: String, required: false, trim: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const League = mongoose.model('League', leagueSchema);

export default League;