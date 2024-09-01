import fs from 'fs/promises';
import path from 'path';
import express, { Request, Response } from 'express';
import * as turf from '@turf/turf';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { promises } from 'dns';


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

let arrayForestarea2020 = [];
for (let i = 1; i <= 519; i++) {
    arrayForestarea2020.push(path.resolve(__dirname, `../geojson/forestarea2020/forest2020_part_${i}.geojson`));
}

// Load the geojson file asynchronously
let existingGeojson: any;
let existingGeojson2: any;
let existingGeojsonArray: any;

const loadGeoJson = async () => {
    try {
        const data = await fs.readFile(forestGeoJsonPath, 'utf8');
        const data2 = await fs.readFile(protectedArea, 'utf8');

        existingGeojson = JSON.parse(data);
        existingGeojson2 = JSON.parse(data2);
        existingGeojsonArray = await Promise.all(arrayForestarea2020.map(file => fs.readFile(file, 'utf8')));

        console.log('GeoJSON data loaded successfully');
    } catch (error) {
        console.error('Error reading or parsing the GeoJSON file:', error);
    }
};

// Load the GeoJSON file when starting the server
loadGeoJson();

app.use(express.json());

app.post('/check-intersection', async (req: Request, res: Response) => {
    const userGeoJson: any = req.body;
    console.log('req.body',userGeoJson);

    // Check if existingGeojson has features and it's an array
    const [forest ,protect ,forest2020] = await Promise.all([
        checkGeojson(userGeoJson , existingGeojson),
        checkGeojson(userGeoJson , existingGeojson2),
        checkGeojsonArray(userGeoJson, existingGeojsonArray)
    ])
    console.log('Success');
    res.json({ message: forest, message2: protect, message3: forest2020 });

});

async function checkGeojson(geojsonAns: any , existing: any) {
    try {
        if (!existing || !Array.isArray(existing.features)) {
            return 'GeoJSON data is not loaded';
        }
        for (const feature of existing.features) {
            const intersection = await turf.booleanOverlap(geojsonAns, feature);
            if (intersection) {
                return 'The polygons intersect';
            }
        }
        return 'The polygons do not intersect';
    } catch (error) {
        console.error('Error checking GeoJSON:', error);
        return 'Error checking existing';
    }
}

async function checkGeojsonArray(geojsonAns: any , existing: any) {
    try {
        let i = 0;
        for (const feature of existing) {
            const ans = await checkGeojson(geojsonAns, feature);
            if(ans === 'The polygons intersect'){
                return 'The polygons intersect';
            }
            i++
            console.log(ans ,i);
        }
        return 'The polygons do not intersect';
    } catch (error) {
        console.error('Error checking GeoJSON:', error);
        return 'Error checking existing';
    }
}