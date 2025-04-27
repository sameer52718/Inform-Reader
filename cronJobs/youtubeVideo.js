import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

// Path to youtubeVideos directory
const downloadDir = path.join(process.cwd(), 'youtubeVideos');
console.log(downloadDir);

// Function to delete the entire youtubeVideos directory
const deleteFolder = () => {
    try {
        // Check if the folder exists
        if (fs.existsSync(downloadDir)) {
            // Remove all files and subdirectories inside the folder first
            fs.rmdirSync(downloadDir, { recursive: true });
            console.log(`✅ Folder ${downloadDir} has been deleted successfully.`);
        } else {
            console.log(`ℹ️ Folder ${downloadDir} does not exist.`);
        }
    } catch (err) {
        console.error('❌ Error during folder deletion:', err.message);
    }
};

// Schedule the cron job to run every day at 3 AM
const cleanFolderJob = cron.schedule('0 4 * * *', () => {
    console.log('🧹 Cleaning up youtubeVideos folder started...');
    try {
        deleteFolder();
        console.log('🧹 Folder cleanup completed.');
    } catch (err) {
        console.error('❌ Error during folder cleanup:', err.message);
    }
});

export default cleanFolderJob;
