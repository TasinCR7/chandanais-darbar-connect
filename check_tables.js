import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://uezrdvjbazehzjorhfrl.supabase.co";
const supabaseKey = "sb_publishable_jcSthwFxzUPKKEi5i5cjDA_gZG94j_h";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = [
    'committee_contributions',
    'committee_expenses',
    'committee_members',
    'votes',
    'committee_comments'
  ];

  for (const table of tables) {
    console.log(`Checking ${table}...`);
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`${table}: Error - ${error.message}`);
      } else {
        console.log(`${table}: OK`);
      }
    } catch (e) {
      console.log(`${table}: Fatal Error - ${e.message}`);
    }
  }
}

checkTables();
