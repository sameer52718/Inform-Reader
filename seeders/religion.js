import mongoose from 'mongoose';
import Religion from '../models/Religion.js'; // Ensure this model exists
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const createReligions = async () => {
    const religions = [
        // Major World Religions
        { name: "Christianity", status: true },
        { name: "Islam", status: true },
        { name: "Hinduism", status: true },
        { name: "Buddhism", status: true },
        { name: "Judaism", status: true },
        { name: "Sikhism", status: true },
        { name: "Jainism", status: true },
        { name: "Zoroastrianism", status: true },
    
        // East Asian Religions
        { name: "Taoism", status: false },
        { name: "Shinto", status: false },
        { name: "Confucianism", status: false },
        { name: "Shingon Buddhism", status: false },
        { name: "Nichiren Buddhism", status: false },
        { name: "Tendai Buddhism", status: false }, // Added Japanese Buddhist sect
        { name: "Pure Land Buddhism", status: false }, // Added widespread East Asian Buddhist tradition
    
        // Indigenous & Folk Religions
        { name: "Animism", status: false },
        { name: "African Traditional Religions", status: false },
        { name: "Native American Spirituality", status: false },
        { name: "Australian Aboriginal Spirituality", status: false },
        { name: "Maori Religion (Polynesian)", status: false },
        { name: "Druze", status: false },
        { name: "Rastafarianism", status: false },
        { name: "Santería", status: false },
        { name: "Vodou (Voodoo)", status: false },
        { name: "Candomblé", status: false },
        { name: "Umbanda", status: false },
        { name: "Shamanism", status: false }, // Added widespread indigenous practice
        { name: "Inuit Spirituality", status: false }, // Added Arctic indigenous tradition
        { name: "Yoruba Religion", status: false }, // Added specific African tradition
        { name: "Tengriism", status: false }, // Added Central Asian indigenous religion
    
        // New Religious Movements
        { name: "Bahá'í Faith", status: true },
        { name: "Tenrikyo", status: false },
        { name: "Cao Dai", status: false },
        { name: "Falun Gong", status: false },
        { name: "Unitarian Universalism", status: false }, // Added modern inclusive movement
        { name: "Mormonism (Latter-day Saints)", status: false }, // Added Christian-derived movement
        { name: "Jehovah's Witnesses", status: false }, // Added Christian-derived movement
        { name: "Raëlism", status: false }, // Added UFO-based new religion
    
        // Esoteric & Occult Traditions
        { name: "Thelema", status: false },
        { name: "Wicca", status: false },
        { name: "Neopaganism", status: false },
        { name: "Eckankar", status: false },
        { name: "Scientology", status: false },
        { name: "Rosicrucianism", status: false }, // Added Western esoteric tradition
        { name: "Hermeticism", status: false }, // Added philosophical-occult tradition
        { name: "Kabbalah", status: false }, // Added Jewish mysticism (distinct from Judaism)
        { name: "Asatru (Norse Paganism)", status: false }, // Added specific Neopagan tradition
    
        // Atheism & Related Beliefs
        { name: "Atheism", status: false },
        { name: "Agnosticism", status: false },
        { name: "Deism", status: false },
        { name: "Secular Humanism", status: false },
        { name: "Pantheism", status: false }, // Added belief in a divine universe
        { name: "Pandeism", status: false }, // Added blend of pantheism and deism
    
        // Other Historical or Minor Religions
        { name: "Manichaeism", status: false }, // Added ancient syncretic religion
        { name: "Mandaeism", status: false }, // Added Gnostic religion from Mesopotamia
        { name: "Yazidism", status: false }, // Added Kurdish monotheistic faith
        { name: "Samaritanism", status: false } // Added offshoot of ancient Judaism
    ];

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    for (const religion of religions) {
      const existingReligion = await Religion.findOne({ name: religion.name });
      if (!existingReligion) {
        await Religion.create(religion);
        console.log(`Created religion: ${religion.name}`);
      } else {
        console.log(`Religion '${religion.name}' already exists.`);
      }
    }
  } catch (error) {
    console.error("Error in creating religions:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

// Run the function
createReligions();
