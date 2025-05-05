import mongoose from 'mongoose';

const connectDB = () => {
  mongoose
    .connect(process.env.MONGO_DB_URL, { connectTimeoutMS: 30000 })
    .then(() => {
      console.log('DB Connected Successfully');
    })
    .catch((error) => {
      console.log(error);
    });
};

export default connectDB;
