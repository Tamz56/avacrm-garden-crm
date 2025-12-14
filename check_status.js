import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    console.log("Fetching distinct status values from stock_items...");

    // Fetch all statuses
    const { data, error } = await supabase
        .from('stock_items')
        .select('status');

    if (error) {
        console.error("Error:", error);
        return;
    }

    // Count occurrences
    const statusCounts = {};
    data.forEach(item => {
        const s = item.status;
        statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    console.log("Status counts:", statusCounts);

    // Check if there's a check constraint on the column (requires querying information_schema, might be complex via client, 
    // but we can infer valid values from what's there or just report what's used)
}

checkStatus();
