import fs from 'fs/promises';
import path from 'path';
import express, { Request, Response } from 'express';
import * as turf from '@turf/turf';
import dotenv from 'dotenv';
import { Client } from 'pg';

const app = express();

// Load environment variables from .env file
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

const PORT = process.env.PORT || 8000;
const DATABASE_URL = process.env.DATABASE_URL || "";

app.get("/", (req: Request, res: Response) => {
    res.send("Hello, Express with TypeScript!");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

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
}

connectWithRetry().catch(err => console.error('Final connection error', err.stack));


// Path to the forest.geojson file
const forestGeoJsonPath = path.resolve(__dirname, '../geojson/forest.geojson');
const protectedArea = path.resolve(__dirname, '../geojson/ProtectedArea.geojson');

// Load the geojson file asynchronously
let existingGeojson: any;
let existingGeojson2: any;

const loadGeoJson = async () => {
    try {
        const data = await fs.readFile(forestGeoJsonPath, 'utf8');
        const data2 = await fs.readFile(protectedArea, 'utf8');

        existingGeojson = JSON.parse(data);
        existingGeojson2 = JSON.parse(data2);

    } catch (error) {
        console.error('Error reading or parsing forest.geojson:', error);
    }
};

// Load the GeoJSON file when starting the server
loadGeoJson();

app.use(express.json());

app.post('/check-intersection', async (req: Request, res: Response) => {
    const userGeoJson: any = req.body;
    console.log(userGeoJson);

    // Check if existingGeojson has features and it's an array
    const [forest ,protect] = await Promise.all([
        checkGeojson(userGeoJson),
        checkGeojson2(userGeoJson)
    ])

    res.json({ message: forest, message2: protect });

});

function checkGeojson(geojsonAns: any) {
    try {
        if (!existingGeojson || !Array.isArray(existingGeojson.features)) {
            return 'GeoJSON data is not loaded';
        }
        for (const feature of existingGeojson.features) {
            const intersection = turf.booleanOverlap(geojsonAns, feature);
            if (intersection) {
                return 'The polygons intersect';
            }
        }
    } catch (error) {
        console.error('Error checking GeoJSON:', error);
        return 'Error checking existingGeojson';
    }
}

function checkGeojson2(geojsonAns: any) {
    try {
        if (!existingGeojson2 || !Array.isArray(existingGeojson2.features)) {
            return 'GeoJSON data is not loaded';
        }
        for (const feature of existingGeojson2.features) {
            const intersection = turf.booleanOverlap(geojsonAns, feature);
            if (intersection) {
                return 'The polygons intersect';
            }
        }
    } catch (error) {
        console.error('Error checking GeoJSON:', error);
        return 'Error checking existingGeojson';
    }
}
