import { runWeeklyAnalysis } from './services/analyzer';
import 'dotenv/config';

// Run immediately for testing
runWeeklyAnalysis();

// Later, set up a cron job (example: every Monday at 8 AM)
// import cron from 'node-cron';
// cron.schedule('0 8 * * 1', runWeeklyAnalysis);
