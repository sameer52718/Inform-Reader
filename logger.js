// logger.js
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

// Create logs folder if not exists
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const transport = new DailyRotateFile({
  filename: path.join(logDir, "app-%DATE%.log"), // e.g., logs/app-2025-09-20.log
  datePattern: "YYYY-MM-DD",
  zippedArchive: true, // compress old logs
  maxSize: "20m", // optional: rotate if file > 20MB
  maxFiles: "7d", // keep logs for 7 days
});

const logger = winston.createLogger({
  level: "info", // levels: error, warn, info, http, verbose, debug, silly
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(
      (info) => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`
    )
  ),
  transports: [
    transport, // daily file logging
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          (info) => `${info.timestamp} [${info.level}]: ${info.message}`
        )
      ),
    }),
  ],
});

export default logger;
