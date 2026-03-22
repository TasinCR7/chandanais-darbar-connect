import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uezrdvjbazehzjorhfrl.supabase.co';
const supabaseKey = 'sb_publishable_jcSthwFxzUPKKEi5i5cjDA_gZG94j_h';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log("Checking votes...");
  const r1 = await supabase.from('votes').select('*').limit(1);
  console.log("votes:", r1.error ? r1.error.message : "Exists");

  console.log("Checking committee_comments...");
  const r2 = await supabase.from('committee_comments').select('*').limit(1);
  console.log("committee_comments:", r2.error ? r2.error.message : "Exists");

  console.log("Checking committee_members...");
  const r3 = await supabase.from('committee_members').select('*').limit(1);
  console.log("committee_members:", r3.error ? r3.error.message : "Exists");
}

checkTables();
