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
import startCron from './jobs/feeds.js';
import { runSyncJob, startCronJob } from './jobs/murchant.js';
import { getSitemap } from './controllers/website/SitemapController.js';

const app = express();

dotenv.config();
process.env.GOOGLE_APPLICATION_CREDENTIALS = './teal-2a1a0-4eee03f2412b.json';

// app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/youtubeVideos', express.static('youtubeVideos'));

connectDB();

const allowedOrigins = ['http://localhost:3000', 'https://informreaders.com', 'https://*.informreaders.com'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.some((o) => o.includes('*') && origin.endsWith(o.replace('*.', '')))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
};

app.use(cors());
app.use(morgan('common'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', true);
app.get('/', (req, res) => {
  res.send('Hello, world!');
});


app.get('/sync-merchants', async (req, res) => {
  try {
    await runSyncJob();
    res.status(200).json({ message: 'Merchant sync job completed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to run merchant sync job', details: error.message });
  }
});

app.get('/sitemaps/:filename', getSitemap);
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
