import path from 'path';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { Feature, Geometry } from 'geojson';

const app = express();

// Load environment variables from .env file
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

const PORT = process.env.PORT || 8000;
const DATABASE_URL = process.env.DATABASE_URL || "";

app.use(express.json());

// Function to connect to the database with retry logic
async function connectWithRetry() {
    const client = new Client({
        connectionString: DATABASE_URL,
    });
    
    const maxRetries = 5; // Max number of retries
    let attempts = 0;

    for (let i = 0; i < maxRetries; i++) {
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

// Convert GeoJSON to WKT format
function convertGeoJsonToWkt(geoJson: Feature<Geometry>): string {
    const { type, coordinates } = geoJson.geometry;

    // Define the type for coordinates
    let wkt = '';
    switch (type) {
        case 'Point':
            wkt = `POINT(${coordinates.join(' ')})`;
            break;
        case 'LineString':
            // Type for coordinates in LineString is Array<Array<number>>
            wkt = `LINESTRING(${(coordinates as [number, number][]).map(coord => coord.join(' ')).join(', ')})`;
            break;
        case 'Polygon':
            // Type for coordinates in Polygon is Array<Array<Array<number>>>
            wkt = `POLYGON((${(coordinates[0] as [number, number][]).map(coord => coord.join(' ')).join(', ')}))`;
            break;
        // Add more cases if needed
        default:
            throw new Error('Unsupported GeoJSON type');
    }
    return wkt;
}

// Define the route to check intersection
app.post('/check-intersection', async (req: Request, res: Response) => {
    const userGeoJson: any = req.body;
    console.log('req.body', userGeoJson);

    // Convert userGeoJson to WKT (Well-Known Text) format
    const userGeoJsonWkt = convertGeoJsonToWkt(userGeoJson);

    try {
        // Query the database to find intersecting geometries
        const result = await dbClient.query(`
            SELECT id, ST_AsGeoJSON(geom) AS geom 
            FROM public.geojson_table
            WHERE ST_Intersects(
                geom, 
                ST_SetSRID(ST_GeomFromText($1), 4326)
            )
        `, [userGeoJsonWkt]);

        const intersectingFeatures = result.rows.map((row: { geom: string; }) => JSON.parse(row.geom));

        if (intersectingFeatures.length > 0) {
            res.json({ message: 'Intersection found', intersectingFeatures });
        } else {
            res.json({ message: 'No intersection found' });
        }
    } catch (error) {
        console.error('Error checking intersection:', error);
        res.status(500).json({ message: 'Error checking intersection' });
    }
});


let dbClient: any;
// Initialize and start the server
async function startServer() {
    dbClient = await connectWithRetry();

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Call the async function to start the server
startServer().catch(err => console.error('Error during initialization:', err));
