import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { validateServerEnv } from "@/lib/env";

type ProfileEnsureRequest = {
  walletAddress: string;
};

type ProfileResponse = {
  id: string;
  alias: string;
  walletAddress: string;
  created?: boolean;
};

export async function POST(request: Request) {
  try {
    // Validate server environment
    const envValidation = validateServerEnv();
    if (!envValidation.valid) {
      console.error("❌ Server environment not properly configured:", envValidation.missing);
      return NextResponse.json({ 
        error: "Server configuration error",
        details: envValidation.missing 
      }, { status: 500 });
    }

    // Parse and validate request
    const payload = (await request.json()) as Partial<ProfileEnsureRequest>;
    
    if (!payload.walletAddress || typeof payload.walletAddress !== "string") {
      return NextResponse.json({ 
        error: "Invalid wallet address",
        details: "walletAddress must be a non-empty string" 
      }, { status: 400 });
    }

    const { walletAddress } = payload;
    
    // Validate wallet address format (basic Solana address validation)
    if (walletAddress.length < 32 || walletAddress.length > 44) {
      return NextResponse.json({ 
        error: "Invalid wallet address format",
        details: "Wallet address must be a valid Solana address" 
      }, { status: 400 });
    }

    // Get admin client
    let admin;
    try {
      admin = getAdminClient();
    } catch (error) {
      console.error("❌ Failed to get admin client:", error);
      return NextResponse.json({ 
        error: "Database connection failed",
        details: "Unable to connect to database" 
      }, { status: 500 });
    }

    console.log(`🔍 Ensuring profile for wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`);

    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await admin
      .from("profiles")
      .select("id, wallet_address, username, created_at")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("❌ Profile fetch error:", fetchError);
      return NextResponse.json({ 
        error: "Database query failed",
        details: fetchError.message 
      }, { status: 500 });
    }

    // Profile exists - return it
    if (existingProfile) {
      const alias = existingProfile.username || `Player${existingProfile.id.toString().slice(-4)}`;
      console.log(`✅ Profile found for wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`);
      
      const response: ProfileResponse = {
        id: existingProfile.id,
        alias,
        walletAddress: existingProfile.wallet_address,
        created: false
      };
      
      return NextResponse.json(response);
    }

    // Create new profile
    console.log(`🆕 Creating new profile for wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`);
    
    const username = `Player${Date.now().toString().slice(-4)}`;
    
    const { data: newProfile, error: insertError } = await admin
      .from("profiles")
      .insert({ 
        wallet_address: walletAddress,
        username: username
      })
      .select("id, username, wallet_address")
      .single();

    if (insertError) {
      // Handle duplicate key error (23505) - profile already exists
      if (insertError.code === '23505') {
        console.log(`ℹ️ Profile already exists for wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}, fetching existing`);
        
        // Fetch the existing profile
        const { data: existingProfile, error: fetchError } = await admin
          .from("profiles")
          .select("id, wallet_address, username")
          .eq("wallet_address", walletAddress)
          .single();

        if (fetchError || !existingProfile) {
          console.error("❌ Failed to fetch existing profile:", fetchError);
          return NextResponse.json({ 
            error: "Profile exists but could not be retrieved",
            details: fetchError?.message 
          }, { status: 500 });
        }

        const alias = existingProfile.username || `Player${existingProfile.id.toString().slice(-4)}`;
        const response: ProfileResponse = {
          id: existingProfile.id,
          alias,
          walletAddress: existingProfile.wallet_address,
          created: false
        };

        return NextResponse.json({ status: "exists", profile: response });
      }

      // Other database errors
      console.error("❌ Profile creation error:", insertError);
      return NextResponse.json({ 
        error: "Failed to create profile",
        details: insertError.message 
      }, { status: 500 });
    }

    if (!newProfile) {
      return NextResponse.json({ 
        error: "Failed to create profile",
        details: "No data returned from insert" 
      }, { status: 500 });
    }

    console.log(`✅ Profile created successfully: ${newProfile.id}`);

    const response: ProfileResponse = {
      id: newProfile.id,
      alias: newProfile.username,
      walletAddress: newProfile.wallet_address,
      created: true
    };

    return NextResponse.json({ status: "ok", profile: response });

  } catch (error) {
    console.error("❌ Profile ensure error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}