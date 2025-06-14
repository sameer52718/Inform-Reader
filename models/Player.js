import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    idPlayer: { type: String, required: true, unique: true },
    idAPIfootball: { type: String, required: false,  },
    name: { type: String, required: true, trim: true },
    alternateName: { type: String, required: false, trim: true },
    nationality: { type: String, required: true, trim: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    sport: { type: String, required: true, default: 'Soccer' },
    dateBorn: { type: Date, required: false },
    number: { type: String, required: false, trim: true },
    signing: { type: String, required: false, trim: true },
    birthLocation: { type: String, required: false, trim: true },
    position: { type: String, required: true, trim: true },
    height: { type: String, required: false, trim: true },
    weight: { type: String, required: false, trim: true },
    gender: { type: String, enum: ['Male', 'Female','Mixed'], required: true },
    status: { type: String, enum: ['Active', 'Retired', 'Suspended','Coaching','Injured','Free Agent'], default: 'Active' },
    description: { type: String, required: false, trim: true },
    thumb: { type: String, required: false, trim: true },
    cutout: { type: String, required: false, trim: true },
    render: { type: String, required: false, trim: true },
    facebook: { type: String, required: false, trim: true },
    twitter: { type: String, required: false, trim: true },
    instagram: { type: String, required: false, trim: true },
    youtube: { type: String, required: false, trim: true },
  },
  { timestamps: true }
);

const Player = mongoose.model('Player', playerSchema);

export default Player;