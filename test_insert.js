import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uezrdvjbazehzjorhfrl.supabase.co';
const supabaseKey = 'sb_publishable_jcSthwFxzUPKKEi5i5cjDA_gZG94j_h';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Starting test insert...");
  const { data, error } = await supabase.from('vote_topics').insert({
    title: 'Node Test Poll',
    description: '[POLL_OPTIONS: Node1, Node2] This is a test from node script',
    type: 'monthly',
  });

  if (error) {
    console.error("SUPABASE ERROR:", error);
  } else {
    console.log("SUCCESS:", data);
  }
}

testInsert();
