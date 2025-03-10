import mongoose from 'mongoose';
import Country from '../models/Country.js'; // Ensure correct path
import dotenv from 'dotenv';

dotenv.config();

const countries = [
    { name: "Afghanistan", countryCode: "AF", slug: "afghanistan" },
    { name: "Albania", countryCode: "AL", slug: "albania" },
    { name: "Algeria", countryCode: "DZ", slug: "algeria" },
    { name: "Andorra", countryCode: "AD", slug: "andorra" },
    { name: "Angola", countryCode: "AO", slug: "angola" },
    { name: "Antigua and Barbuda", countryCode: "AG", slug: "antigua-and-barbuda" },
    { name: "Argentina", countryCode: "AR", slug: "argentina" },
    { name: "Armenia", countryCode: "AM", slug: "armenia" },
    { name: "Australia", countryCode: "AU", slug: "australia" },
    { name: "Austria", countryCode: "AT", slug: "austria" },
    { name: "Azerbaijan", countryCode: "AZ", slug: "azerbaijan" },
    { name: "Bahamas", countryCode: "BS", slug: "bahamas" },
    { name: "Bahrain", countryCode: "BH", slug: "bahrain" },
    { name: "Bangladesh", countryCode: "BD", slug: "bangladesh" },
    { name: "Barbados", countryCode: "BB", slug: "barbados" },
    { name: "Belarus", countryCode: "BY", slug: "belarus" },
    { name: "Belgium", countryCode: "BE", slug: "belgium" },
    { name: "Belize", countryCode: "BZ", slug: "belize" },
    { name: "Benin", countryCode: "BJ", slug: "benin" },
    { name: "Bhutan", countryCode: "BT", slug: "bhutan" },
    { name: "Bolivia", countryCode: "BO", slug: "bolivia" },
    { name: "Bosnia and Herzegovina", countryCode: "BA", slug: "bosnia-and-herzegovina" },
    { name: "Botswana", countryCode: "BW", slug: "botswana" },
    { name: "Brazil", countryCode: "BR", slug: "brazil" },
    { name: "Brunei", countryCode: "BN", slug: "brunei" },
    { name: "Bulgaria", countryCode: "BG", slug: "bulgaria" },
    { name: "Burkina Faso", countryCode: "BF", slug: "burkina-faso" },
    { name: "Burundi", countryCode: "BI", slug: "burundi" },
    { name: "Canada", countryCode: "CA", slug: "canada" },
    { name: "China", countryCode: "CN", slug: "china" },
    { name: "Denmark", countryCode: "DK", slug: "denmark" },
    { name: "Egypt", countryCode: "EG", slug: "egypt" },
    { name: "Finland", countryCode: "FI", slug: "finland" },
    { name: "France", countryCode: "FR", slug: "france" },
    { name: "Germany", countryCode: "DE", slug: "germany" },
    { name: "India", countryCode: "IN", slug: "india" },
    { name: "Indonesia", countryCode: "ID", slug: "indonesia" },
    { name: "Iran", countryCode: "IR", slug: "iran" },
    { name: "Iraq", countryCode: "IQ", slug: "iraq" },
    { name: "Italy", countryCode: "IT", slug: "italy" },
    { name: "Japan", countryCode: "JP", slug: "japan" },
    { name: "Mexico", countryCode: "MX", slug: "mexico" },
    { name: "Netherlands", countryCode: "NL", slug: "netherlands" },
    { name: "New Zealand", countryCode: "NZ", slug: "new-zealand" },
    { name: "Nigeria", countryCode: "NG", slug: "nigeria" },
    { name: "Norway", countryCode: "NO", slug: "norway" },
    { name: "Pakistan", countryCode: "PK", slug: "pakistan" },
    { name: "Philippines", countryCode: "PH", slug: "philippines" },
    { name: "Poland", countryCode: "PL", slug: "poland" },
    { name: "Portugal", countryCode: "PT", slug: "portugal" },
    { name: "Russia", countryCode: "RU", slug: "russia" },
    { name: "Saudi Arabia", countryCode: "SA", slug: "saudi-arabia" },
    { name: "South Africa", countryCode: "ZA", slug: "south-africa" },
    { name: "Spain", countryCode: "ES", slug: "spain" },
    { name: "Sweden", countryCode: "SE", slug: "sweden" },
    { name: "Switzerland", countryCode: "CH", slug: "switzerland" },
    { name: "Turkey", countryCode: "TR", slug: "turkey" },
    { name: "United Arab Emirates", countryCode: "AE", slug: "united-arab-emirates" },
    { name: "United Kingdom", countryCode: "GB", slug: "united-kingdom" },
    { name: "United States", countryCode: "US", slug: "united-states" },
    { name: "Vietnam", countryCode: "VN", slug: "vietnam" },
    { name: "Zimbabwe", countryCode: "ZW", slug: "zimbabwe" }
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
