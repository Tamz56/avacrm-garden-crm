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
    console.log("Checking deal_payments schema...");
    const { data: payments, error: paymentError } = await supabase
        .from('deal_payments')
        .select('*')
        .limit(1);

    if (paymentError) {
        console.error("Error fetching deal_payments:", paymentError);
        if (paymentError.code === '42P01') {
            console.log("Table deal_payments does not exist.");
        }
    } else if (payments.length > 0) {
        console.log("deal_payments columns:", Object.keys(payments[0]));
    } else {
        console.log("deal_payments exists but is empty. Cannot infer columns.");
        // Try to get definition via rpc if possible, or just assume it exists if no error
    }
}

checkSchema();
