import cron from 'node-cron';
import Mining from './models/Mining.js';
import { getIo } from './socket.js'; // Make sure the socket instance is correctly exported from 'socket.js'

const calculateEarnings = (startTime, finishTime, ratePerHour) => {
    const elapsedTimeInMs = new Date(finishTime) - new Date(startTime);
    const elapsedTimeInHours = Math.floor(elapsedTimeInMs / (1000 * 60 * 60));
    return elapsedTimeInHours * ratePerHour;
};

// Cron job that runs every minute
const miningCronJob = cron.schedule('* * * * *', async () => {
    try {
        // Find completed mining sessions that have not been processed yet
        const completedMiningSessions = await Mining.find({
            finishTime: { $lt: new Date() },
            socketAlert: { $ne: true }, // Assuming you have a `socketAlert` field to track if the session has been handled
        });

        // Loop through completed mining sessions
        for (const miningSession of completedMiningSessions) {
            const { userId, finishTime } = miningSession;

            // Emit socket event to the user
            const io = getIo();  // Use the socket instance from the `getIo` function
            io.to(userId.toString()).emit('miningFinished', {
                message: 'Your mining session has completed.',
                miningSessionId: miningSession._id,
                finishTime,
            });

            // Mark the session as processed
            miningSession.socketAlert = true;
            await miningSession.save();
        }

        // Optionally log out the count of completed mining sessions
        console.log(`Checked for completed mining sessions. ${completedMiningSessions.length} sessions processed.`);
    } catch (error) {
        console.error('Error in mining cron job:', error);
    }
});

// Export the cron job instance so it can be started elsewhere
export default miningCronJob;
