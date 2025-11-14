import { getAdminClient, canUseAdmin } from './admin';

// Required tables and their expected columns
const REQUIRED_SCHEMA = {
  profiles: [
    'id',
    'wallet_address',
    'username',
    'created_at',
    'updated_at'
  ],
  lobbies: [
    'id',
    'game_type',
    'max_players',
    'status',
    'created_at',
    'updated_at'
  ],
  entries: [
    'id',
    'lobby_id',
    'wallet',
    'paid',
    'transaction_signature',
    'amount_sol',
    'entry_amount',
    'created_at'
  ],
  matches: [
    'id',
    'lobby_id',
    'winner_wallet',
    'pot_amount',
    'game_duration',
    'created_at'
  ],
  payments: [
    'id',
    'lobby_id',
    'player_address',
    'transaction_signature',
    'amount_sol',
    'entry_amount',
    'status',
    'created_at'
  ]
} as const;

export type TableName = keyof typeof REQUIRED_SCHEMA;

export interface SchemaValidationResult {
  valid: boolean;
  missingTables: string[];
  missingColumns: Record<string, string[]>;
  errors: string[];
}

/**
 * Validate that all required tables and columns exist
 */
export async function validateSchema(): Promise<SchemaValidationResult> {
  const result: SchemaValidationResult = {
    valid: true,
    missingTables: [],
    missingColumns: {},
    errors: []
  };

  if (!canUseAdmin()) {
    result.valid = false;
    result.errors.push('Admin client not available - cannot validate schema');
    return result;
  }

  try {
    const admin = getAdminClient();

    // Check each required table
    for (const [tableName, requiredColumns] of Object.entries(REQUIRED_SCHEMA)) {
      try {
        // Try to query the table structure
        const { data, error } = await admin
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
            result.missingTables.push(tableName);
            result.valid = false;
          } else {
            result.errors.push(`Error checking table ${tableName}: ${error.message}`);
            result.valid = false;
          }
          continue;
        }

        // Table exists, now check columns by trying to select them
        const columnCheckPromises = requiredColumns.map(async (column) => {
          try {
            const { error: columnError } = await admin
              .from(tableName)
              .select(column)
              .limit(1);
            
            if (columnError && columnError.message.includes('does not exist')) {
              if (!result.missingColumns[tableName]) {
                result.missingColumns[tableName] = [];
              }
              result.missingColumns[tableName].push(column);
              result.valid = false;
            }
          } catch (err) {
            // Column doesn't exist
            if (!result.missingColumns[tableName]) {
              result.missingColumns[tableName] = [];
            }
            result.missingColumns[tableName].push(column);
            result.valid = false;
          }
        });

        await Promise.all(columnCheckPromises);

      } catch (err) {
        result.errors.push(`Failed to check table ${tableName}: ${err}`);
        result.valid = false;
      }
    }

  } catch (err) {
    result.errors.push(`Schema validation failed: ${err}`);
    result.valid = false;
  }

  return result;
}

/**
 * Generate SQL migration script for missing tables/columns
 */
export function generateMigrationSQL(validation: SchemaValidationResult): string {
  const migrations: string[] = [
    '-- Auto-generated migration script for DEGN.gg',
    '-- Run this in your Supabase SQL editor',
    '',
    '-- Enable UUID extension',
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
    ''
  ];

  // Create missing tables
  if (validation.missingTables.length > 0) {
    migrations.push('-- Create missing tables');
    
    for (const tableName of validation.missingTables) {
      switch (tableName) {
        case 'profiles':
          migrations.push(
            'CREATE TABLE profiles (',
            '  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),',
            '  wallet_address TEXT UNIQUE NOT NULL,',
            '  username TEXT,',
            '  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),',
            '  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
            ');',
            ''
          );
          break;
          
        case 'lobbies':
          migrations.push(
            'CREATE TABLE lobbies (',
            '  id TEXT PRIMARY KEY,',
            '  game_type TEXT NOT NULL,',
            '  max_players INTEGER NOT NULL DEFAULT 2,',
            '  status TEXT DEFAULT \'waiting\',',
            '  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),',
            '  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
            ');',
            ''
          );
          break;
          
        case 'entries':
          migrations.push(
            'CREATE TABLE entries (',
            '  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),',
            '  lobby_id TEXT NOT NULL,',
            '  wallet TEXT NOT NULL,',
            '  paid BOOLEAN DEFAULT FALSE,',
            '  transaction_signature TEXT,',
            '  amount_sol DECIMAL(10, 9),',
            '  entry_amount DECIMAL(10, 9),',
            '  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),',
            '  UNIQUE(lobby_id, wallet)',
            ');',
            ''
          );
          break;
          
        case 'matches':
          migrations.push(
            'CREATE TABLE matches (',
            '  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),',
            '  lobby_id TEXT NOT NULL,',
            '  winner_wallet TEXT,',
            '  pot_amount DECIMAL(10, 9),',
            '  game_duration INTEGER,',
            '  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
            ');',
            ''
          );
          break;
          
        case 'payments':
          migrations.push(
            'CREATE TABLE payments (',
            '  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),',
            '  lobby_id TEXT NOT NULL,',
            '  player_address TEXT NOT NULL,',
            '  transaction_signature TEXT UNIQUE NOT NULL,',
            '  amount_sol DECIMAL(10, 9) NOT NULL,',
            '  entry_amount DECIMAL(10, 9) NOT NULL,',
            '  status TEXT DEFAULT \'confirmed\',',
            '  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
            ');',
            ''
          );
          break;
      }
    }
  }

  // Add foreign key constraints
  migrations.push(
    '-- Add foreign key constraints',
    'ALTER TABLE entries ADD CONSTRAINT fk_entries_lobby_id',
    '  FOREIGN KEY (lobby_id) REFERENCES lobbies(id) ON DELETE CASCADE;',
    '',
    'ALTER TABLE matches ADD CONSTRAINT fk_matches_lobby_id',
    '  FOREIGN KEY (lobby_id) REFERENCES lobbies(id);',
    ''
  );

  // Enable RLS
  migrations.push(
    '-- Enable Row Level Security',
    'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE entries ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE matches ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE payments ENABLE ROW LEVEL SECURITY;',
    ''
  );

  // Create permissive policies for development
  migrations.push(
    '-- Create permissive policies (adjust for production)',
    'CREATE POLICY "Allow all on profiles" ON profiles FOR ALL USING (true);',
    'CREATE POLICY "Allow all on lobbies" ON lobbies FOR ALL USING (true);',
    'CREATE POLICY "Allow all on entries" ON entries FOR ALL USING (true);',
    'CREATE POLICY "Allow all on matches" ON matches FOR ALL USING (true);',
    'CREATE POLICY "Allow all on payments" ON payments FOR ALL USING (true);',
    ''
  );

  return migrations.join('\n');
}

/**
 * Auto-validate schema and log results
 */
export async function autoValidateSchema(): Promise<void> {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ Schema validation should only run server-side');
    return;
  }

  console.log('🔍 Validating Supabase schema...');
  
  try {
    const validation = await validateSchema();
    
    if (validation.valid) {
      console.log('✅ All required tables and columns exist');
    } else {
      console.warn('⚠️ Schema validation issues found:');
      
      if (validation.missingTables.length > 0) {
        console.warn(`  Missing tables: ${validation.missingTables.join(', ')}`);
      }
      
      if (Object.keys(validation.missingColumns).length > 0) {
        for (const [table, columns] of Object.entries(validation.missingColumns)) {
          console.warn(`  Missing columns in ${table}: ${columns.join(', ')}`);
        }
      }
      
      if (validation.errors.length > 0) {
        validation.errors.forEach(error => console.error(`  ❌ ${error}`));
      }
      
      console.log('📄 Run the migration script: scripts/sync-schema.sql');
    }
  } catch (error) {
    console.error('❌ Schema validation failed:', error);
  }
}
