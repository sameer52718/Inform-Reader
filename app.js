import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import ErrorHandler from './middlewares/ErrorHandler.js';
import os from 'os';
import ApiV1Router from './routes/api/v1/index.js';
import connectDB from './db/index.js';
import { initializeSocket } from './socket.js';
import youtubeVideo from './cronJobs/youtubeVideo.js';
import startCron from './jobs/feeds.js';

const app = express();

dotenv.config();

app.use('/uploads', express.static('uploads'));
app.use('/youtubeVideos', express.static('youtubeVideos'));

connectDB();
app.use(cors());
app.use(morgan('common'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.use('/api/v1', ApiV1Router);

const PORT = process.env.PORT || 1000;

app.use(ErrorHandler);

const server = http.createServer(app);
initializeSocket(server);

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

startCron();
server.listen(PORT, () => {
  const ip = getLocalIP();
  console.log(`Server is listening on  Link: http://${ip}:${PORT}`);
});
