import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Nationality from '../models/Nationality.js'; // Ensure correct path

dotenv.config();

const nationalities = [
  { name: 'Afghan', countryCode: 'AF' },
  { name: 'Albanian', countryCode: 'AL' },
  { name: 'Algerian', countryCode: 'DZ' },
  { name: 'Andorran', countryCode: 'AD' },
  { name: 'Angolan', countryCode: 'AO' },
  { name: 'Antiguan and Barbudan', countryCode: 'AG' },
  { name: 'Argentine', countryCode: 'AR' },
  { name: 'Armenian', countryCode: 'AM' },
  { name: 'Australian', countryCode: 'AU' },
  { name: 'Austrian', countryCode: 'AT' },
  { name: 'Azerbaijani', countryCode: 'AZ' },
  { name: 'Bahamian', countryCode: 'BS' },
  { name: 'Bahraini', countryCode: 'BH' },
  { name: 'Bangladeshi', countryCode: 'BD' },
  { name: 'Barbadian', countryCode: 'BB' },
  { name: 'Belarusian', countryCode: 'BY' },
  { name: 'Belgian', countryCode: 'BE' },
  { name: 'Belizean', countryCode: 'BZ' },
  { name: 'Beninese', countryCode: 'BJ' },
  { name: 'Bhutanese', countryCode: 'BT' },
  { name: 'Bolivian', countryCode: 'BO' },
  { name: 'Bosnian and Herzegovinian', countryCode: 'BA' },
  { name: 'Botswanan', countryCode: 'BW' },
  { name: 'Brazilian', countryCode: 'BR' },
  { name: 'Bruneian', countryCode: 'BN' },
  { name: 'Bulgarian', countryCode: 'BG' },
  { name: 'Burkinabe', countryCode: 'BF' },
  { name: 'Burundian', countryCode: 'BI' },
  { name: 'Cambodian', countryCode: 'KH' },
  { name: 'Cameroonian', countryCode: 'CM' },
  { name: 'Canadian', countryCode: 'CA' },
  { name: 'Central African', countryCode: 'CF' },
  { name: 'Chadian', countryCode: 'TD' },
  { name: 'Chilean', countryCode: 'CL' },
  { name: 'Chinese', countryCode: 'CN' },
  { name: 'Colombian', countryCode: 'CO' },
  { name: 'Comorian', countryCode: 'KM' },
  { name: 'Congolese', countryCode: 'CG' },
  { name: 'Costa Rican', countryCode: 'CR' },
  { name: 'Croatian', countryCode: 'HR' },
  { name: 'Cuban', countryCode: 'CU' },
  { name: 'Cypriot', countryCode: 'CY' },
  { name: 'Czech', countryCode: 'CZ' },
  { name: 'Danish', countryCode: 'DK' },
  { name: 'Djiboutian', countryCode: 'DJ' },
  { name: 'Dominican', countryCode: 'DO' },
  { name: 'Ecuadorian', countryCode: 'EC' },
  { name: 'Egyptian', countryCode: 'EG' },
  { name: 'Salvadoran', countryCode: 'SV' },
  { name: 'Equatorial Guinean', countryCode: 'GQ' },
  { name: 'Eritrean', countryCode: 'ER' },
  { name: 'Estonian', countryCode: 'EE' },
  { name: 'Ethiopian', countryCode: 'ET' },
  { name: 'Fijian', countryCode: 'FJ' },
  { name: 'Finnish', countryCode: 'FI' },
  { name: 'French', countryCode: 'FR' },
  { name: 'Gabonese', countryCode: 'GA' },
  { name: 'Gambian', countryCode: 'GM' },
  { name: 'Georgian', countryCode: 'GE' },
  { name: 'German', countryCode: 'DE' },
  { name: 'Ghanaian', countryCode: 'GH' },
  { name: 'Greek', countryCode: 'GR' },
  { name: 'Grenadian', countryCode: 'GD' },
  { name: 'Guatemalan', countryCode: 'GT' },
  { name: 'Guinean', countryCode: 'GN' },
  { name: 'Guyanese', countryCode: 'GY' },
  { name: 'Haitian', countryCode: 'HT' },
  { name: 'Honduran', countryCode: 'HN' },
  { name: 'Hungarian', countryCode: 'HU' },
  { name: 'Icelandic', countryCode: 'IS' },
  { name: 'Indian', countryCode: 'IN' },
  { name: 'Indonesian', countryCode: 'ID' },
  { name: 'Iranian', countryCode: 'IR' },
  { name: 'Iraqi', countryCode: 'IQ' },
  { name: 'Irish', countryCode: 'IE' },
];

const seedNationalities = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await Nationality.deleteMany();
    await Nationality.insertMany(nationalities);

    console.log('✅ Nationality data seeded successfully');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding nationality data:', error);
    process.exit(1);
  }
};

seedNationalities();
