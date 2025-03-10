import mongoose from 'mongoose';
import Country from '../models/Country.js'; // Ensure correct path
import dotenv from 'dotenv';

dotenv.config();

const countries = [
    { name: "Afghanistan", countryCode: "AF", slug: "afghanistan", flag: "https://flagcdn.com/w320/af.png" },
    { name: "Albania", countryCode: "AL", slug: "albania", flag: "https://flagcdn.com/w320/al.png" },
    { name: "Algeria", countryCode: "DZ", slug: "algeria", flag: "https://flagcdn.com/w320/dz.png" },
    { name: "Andorra", countryCode: "AD", slug: "andorra", flag: "https://flagcdn.com/w320/ad.png" },
    { name: "Angola", countryCode: "AO", slug: "angola", flag: "https://flagcdn.com/w320/ao.png" },
    { name: "Argentina", countryCode: "AR", slug: "argentina", flag: "https://flagcdn.com/w320/ar.png" },
    { name: "Armenia", countryCode: "AM", slug: "armenia", flag: "https://flagcdn.com/w320/am.png" },
    { name: "Australia", countryCode: "AU", slug: "australia", flag: "https://flagcdn.com/w320/au.png" },
    { name: "Austria", countryCode: "AT", slug: "austria", flag: "https://flagcdn.com/w320/at.png" },
    { name: "Azerbaijan", countryCode: "AZ", slug: "azerbaijan", flag: "https://flagcdn.com/w320/az.png" },
    { name: "Bahamas", countryCode: "BS", slug: "bahamas", flag: "https://flagcdn.com/w320/bs.png" },
    { name: "Bahrain", countryCode: "BH", slug: "bahrain", flag: "https://flagcdn.com/w320/bh.png" },
    { name: "Bangladesh", countryCode: "BD", slug: "bangladesh", flag: "https://flagcdn.com/w320/bd.png" },
    { name: "Belarus", countryCode: "BY", slug: "belarus", flag: "https://flagcdn.com/w320/by.png" },
    { name: "Belgium", countryCode: "BE", slug: "belgium", flag: "https://flagcdn.com/w320/be.png" },
    { name: "Belize", countryCode: "BZ", slug: "belize", flag: "https://flagcdn.com/w320/bz.png" },
    { name: "Benin", countryCode: "BJ", slug: "benin", flag: "https://flagcdn.com/w320/bj.png" },
    { name: "Bhutan", countryCode: "BT", slug: "bhutan", flag: "https://flagcdn.com/w320/bt.png" },
    { name: "Bolivia", countryCode: "BO", slug: "bolivia", flag: "https://flagcdn.com/w320/bo.png" },
    { name: "Bosnia and Herzegovina", countryCode: "BA", slug: "bosnia-and-herzegovina", flag: "https://flagcdn.com/w320/ba.png" },
    { name: "Botswana", countryCode: "BW", slug: "botswana", flag: "https://flagcdn.com/w320/bw.png" },
    { name: "Brazil", countryCode: "BR", slug: "brazil", flag: "https://flagcdn.com/w320/br.png" },
    { name: "Bulgaria", countryCode: "BG", slug: "bulgaria", flag: "https://flagcdn.com/w320/bg.png" },
    { name: "Burkina Faso", countryCode: "BF", slug: "burkina-faso", flag: "https://flagcdn.com/w320/bf.png" },
    { name: "Canada", countryCode: "CA", slug: "canada", flag: "https://flagcdn.com/w320/ca.png" },
    { name: "Chile", countryCode: "CL", slug: "chile", flag: "https://flagcdn.com/w320/cl.png" },
    { name: "China", countryCode: "CN", slug: "china", flag: "https://flagcdn.com/w320/cn.png" },
    { name: "Colombia", countryCode: "CO", slug: "colombia", flag: "https://flagcdn.com/w320/co.png" },
    { name: "Denmark", countryCode: "DK", slug: "denmark", flag: "https://flagcdn.com/w320/dk.png" },
    { name: "Egypt", countryCode: "EG", slug: "egypt", flag: "https://flagcdn.com/w320/eg.png" },
    { name: "Finland", countryCode: "FI", slug: "finland", flag: "https://flagcdn.com/w320/fi.png" },
    { name: "France", countryCode: "FR", slug: "france", flag: "https://flagcdn.com/w320/fr.png" },
    { name: "Germany", countryCode: "DE", slug: "germany", flag: "https://flagcdn.com/w320/de.png" },
    { name: "United Kingdom", countryCode: "GB", slug: "united-kingdom", flag: "https://flagcdn.com/w320/gb.png" },
    { name: "United States", countryCode: "US", slug: "united-states", flag: "https://flagcdn.com/w320/us.png" },
    { name: "Vietnam", countryCode: "VN", slug: "vietnam", flag: "https://flagcdn.com/w320/vn.png" },
    { name: "Zimbabwe", countryCode: "ZW", slug: "zimbabwe", flag: "https://flagcdn.com/w320/zw.png" }
];


const seedCountries = async () => {
    try {
        await mongoose.connect(process.env.MONGO_DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Database connected');

        // Remove existing data to prevent duplicates
        await Country.deleteMany();
        console.log('⚠️ Existing country data removed');

        // Ensure country codes are stored in lowercase
        const formattedCountries = countries.map(country => ({
            ...country,
            countryCode: country.countryCode.toLowerCase()
        }));

        // Insert new countries
        await Country.insertMany(formattedCountries);
        console.log('✅ Countries seeded successfully');

    } catch (error) {
        console.error('❌ Error seeding countries:', error);
    } finally {
        mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
};

// Run the seeder
seedCountries();
