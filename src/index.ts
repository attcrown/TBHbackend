import express, { Request, Response } from "express";
import { Client } from "pg";
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || "";

// Function to connect to the database with retry logic
const connectWithRetry = async () => {
    const client = new Client({
        connectionString: DATABASE_URL,
    });

    const maxRetries = 5; // Max number of retries
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            await client.connect();
            console.log('Connected to the database');
            return client;
        } catch (err: any) {
            attempts++;
            console.error(`Connection attempt ${attempts} failed: ${err.message}`);
            if (attempts >= maxRetries) {
                console.error('Max retries reached. Exiting...');
                process.exit(1);
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        }
    }
};

app.get("/", (req: Request, res: Response) => {
    res.send("Hello, Express with TypeScript!");
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Connect to the database
connectWithRetry()
    .catch(err => console.error('Final connection error', err.stack));
