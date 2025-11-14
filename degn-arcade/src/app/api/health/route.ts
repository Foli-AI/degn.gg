import { NextResponse } from 'next/server';
import { validateServerEnv, validateClientEnv, printEnvDebug } from '@/lib/env';
import { canUseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // Print environment debug info
    printEnvDebug();
    
    // Validate environment
    const clientValidation = validateClientEnv();
    const serverValidation = validateServerEnv();
    
    // Check admin client availability
    const adminAvailable = canUseAdmin();
    
    // Try to validate schema if admin is available
    let schemaStatus = 'skipped';
    if (adminAvailable) {
      try {
        const { autoValidateSchema } = await import('@/lib/supabase/schema-validator');
        await autoValidateSchema();
        schemaStatus = 'validated';
      } catch (error) {
        console.error('Schema validation failed:', error);
        schemaStatus = 'failed';
      }
    }
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        client: {
          valid: clientValidation.valid,
          missing: clientValidation.missing
        },
        server: {
          valid: serverValidation.valid,
          missing: serverValidation.missing,
          warnings: serverValidation.warnings
        }
      },
      supabase: {
        adminAvailable,
        schemaStatus
      }
    };
    
    const statusCode = (clientValidation.valid && serverValidation.valid) ? 200 : 500;
    
    return NextResponse.json(health, { status: statusCode });
    
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
