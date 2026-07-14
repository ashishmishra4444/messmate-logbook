import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env
const envText = fs.readFileSync('.env', 'utf-8');
const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('Connecting to:', url);
const supabase = createClient(url, key);

async function check() {
  const { data: member, error: e1 } = await supabase.from('members').select('*').limit(1);
  if (e1) console.error('Members Error:', e1);
  else console.log('Member keys:', member && member[0] ? Object.keys(member[0]) : 'no members', member && member[0]);

  const { data: attendance, error: e2 } = await supabase.from('attendance').select('*').limit(1);
  if (e2) console.error('Attendance Error:', e2);
  else console.log('Attendance keys:', attendance && attendance[0] ? Object.keys(attendance[0]) : 'no attendance', attendance && attendance[0]);
}

check();
