import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: false },
    email: {
      type: String,
      required: false,
      unique: true, // Email should be unique across drivers
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    phone: {
      type: String,
      required: false,
      default: '',
      match: [/^\+?\d{10,15}$/, 'Invalid phone number format'], // Added validation for phone format
    },
    status: {
      type: Boolean,
      default: true // Ensures new drivers are active by default
    },
    verified: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      required: false,
      minlength: [8, 'Password must be at least 8 characters long'], // Enforced password length validation
    },
    profile: {
      type: String,
      default: ''
    },
    otp: {
      type: Number,
      default: 0
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN'],
      default: 'USER',
    },
  },
  { timestamps: true }
);

// Add unique index for email and joinBy combination for verification process
userSchema.index({ email: 1 }, { unique: true });

// Adding a pre-save hook to hash passwords before storing
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
