// Quick test to verify Supabase configuration
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}\n`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables are not set.');
  console.log('Please create .env.local file with your Supabase credentials.');
  process.exit(1);
}

// Test client connections
console.log('Testing Supabase Connections:');

const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('✅ Supabase client created successfully');

if (supabaseServiceKey) {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('✅ Supabase Admin client created successfully');

  // Test table access
  console.log('\nTesting Table Access:');
  
  const tables = ['lobbies', 'entries', 'matches', 'payments', 'profiles'];
  
  for (const tableName of tables) {
    try {
      const { error } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.log(`⚠️  Table '${tableName}' not found`);
        } else {
          console.log(`❌ Error accessing '${tableName}': ${error.message}`);
        }
      } else {
        console.log(`✅ Table '${tableName}' accessible`);
      }
    } catch (err) {
      console.log(`❌ Failed to test '${tableName}': ${err.message}`);
    }
  }
} else {
  console.log('⚠️  Supabase Admin client not available (service key missing)');
}

console.log('\n🎯 Supabase configuration test complete!');
