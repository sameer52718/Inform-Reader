import BaseController from '../BaseController.js';
import ytdl from 'ytdl-core';
import sanitize from 'sanitize-filename';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class YoutubeController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
    }

    async get(req, res, next) {
        try {
            const videoUrl = req.query.url;

            // Validate URL
            if (!videoUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'YouTube URL is required',
                });
            }

            // Ensure the downloads directory exists
            const downloadDir = path.join(__dirname, '../../youtubeVideos/'); // Directory to store the downloaded video
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir);
            }

            // Call the Python script to download the video
            const pythonProcess = spawn('python', ['python/ytDownload.py', videoUrl, downloadDir]);

            // Capture Python script's output (the downloaded video path)
            pythonProcess.stdout.on('data', (data) => {
                const filePath = data.toString().trim();
                console.log(`Video downloaded: ${filePath}`);

                // Return the URL to the downloaded video in the response
                const PORT = process.env.PORT || 3000; // Default to 3000 if PORT not set
                const videoUrl = `http://192.168.100.2:${PORT}/youtubeVideos/${path.basename(filePath)}`;
                if (!res.headersSent) {
                    res.json({ success: true, videoUrl }); // Send back the URL to the frontend
                }
            });

            // Handle errors from Python script
            pythonProcess.stderr.on('data', (data) => {
                console.error(`Error: ${data}`);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to download video',
                    });
                }
            });

            // Handle Python process close
            pythonProcess.on('close', (code) => {
                if (code !== 0 && !res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: `Python process exited with code ${code}`,
                    });
                }
            });

            // Handle Python process errors
            pythonProcess.on('error', (err) => {
                console.error('Python Process Error:', err);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Error executing Python script',
                    });
                }
            });

        } catch (error) {
            console.error('Controller Error:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                });
            }
        }
    }
}

export default new YoutubeController();