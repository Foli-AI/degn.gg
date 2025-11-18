# Render.com WebSocket Connection Fix

## Issue
Socket.IO connections are timing out when connecting to Render.com backend.

## Root Cause
Render.com free tier services may have issues with WebSocket connections. Polling transport is more reliable.

## Solution Applied
1. **Changed transport order**: `["polling", "websocket"]` - Try polling first
2. **Increased timeouts**: 20 seconds for Render's slower response times
3. **Added health check**: Test backend accessibility before connecting socket
4. **Better error handling**: More detailed logging

## Verify Backend is Running

1. **Check Render Dashboard**:
   - Go to your Render service
   - Check if it's "Live" (not sleeping)
   - Free tier services sleep after 15 minutes of inactivity

2. **Test Health Endpoint**:
   ```bash
   curl https://degn-gg-1.onrender.com/health
   ```
   Should return: `{"status":"ok"}`

3. **Check Environment Variables**:
   - Make sure `NEXT_PUBLIC_MATCHMAKER_URL` in Vercel = `https://degn-gg-1.onrender.com`
   - No trailing slash!

## If Still Not Working

### Option 1: Wake Up Render Service
- Free tier services sleep after inactivity
- Make a request to `/health` endpoint to wake it up
- Or upgrade to paid tier (always-on)

### Option 2: Check Render Logs
- Go to Render dashboard → Logs
- Look for any errors or connection issues
- Check if service is actually running

### Option 3: Verify CORS
- Backend should allow all origins in production
- Check Render logs for CORS errors

## Testing
1. Open browser console
2. You should see: `[Socket] ✅ Backend health check passed`
3. Then: `[Socket] ✅ Connected to matchmaker: [socket-id]`

If you see health check failed, the backend is down or unreachable.

