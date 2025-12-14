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

async function checkColumns() {
    console.log("Checking deals table columns...");
    const { data: deals, error } = await supabase
        .from('deals')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else if (deals.length > 0) {
        console.log("deals columns:", Object.keys(deals[0]));
    } else {
        console.log("deals table empty, cannot infer columns.");
    }
}

checkColumns();
