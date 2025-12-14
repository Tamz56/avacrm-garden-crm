import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve('e:\\my-projects\\garden-crm\\.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            if (key.trim() === 'REACT_APP_SUPABASE_URL') supabaseUrl = value.trim();
            if (key.trim() === 'REACT_APP_SUPABASE_ANON_KEY') supabaseKey = value.trim();
        }
    });
}

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase credentials not found in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking stock_zones schema...");
    const { data: zones, error: zoneError } = await supabase
        .from('stock_zones')
        .select('*')
        .limit(1);

    if (zoneError) {
        console.error("Error fetching stock_zones:", zoneError);
    } else if (zones.length > 0) {
        console.log("stock_zones columns:", Object.keys(zones[0]));
    } else {
        console.log("stock_zones is empty, cannot infer columns from data.");
        // Try inserting a dummy row to see errors? No, that's risky.
    }

    console.log("\nChecking stock_items schema...");
    const { data: items, error: itemError } = await supabase
        .from('stock_items')
        .select('*')
        .limit(1);

    if (itemError) {
        console.error("Error fetching stock_items:", itemError);
    } else if (items.length > 0) {
        console.log("stock_items columns:", Object.keys(items[0]));
    } else {
        console.log("stock_items is empty.");
    }
}

checkSchema();
