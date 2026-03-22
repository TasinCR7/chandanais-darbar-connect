import { createClient } from '@supabase/supabase-api';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!);

async function check() {
  const { data, error } = await supabase.from('committee_members').select('id, name, designation');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

check();
