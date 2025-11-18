# 🎮 Lobby Page Implementation Guide

**Status:** ✅ Backend updated | ✅ v0.dev prompt ready | Ready to implement

---

## ✅ **What's Done**

### **1. Backend Updated** ✅
- **Entry fee tiers** updated to include **0.05 SOL**
- New tiers: `[0.05, 0.1, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]`
- **File:** `backend/matchmaker/server.ts` (line 86)

### **2. v0.dev Prompt Created** ✅
- **File:** `V0_DEV_PROMPT_LOBBY_PAGE.md`
- Complete prompt ready to copy/paste into v0.dev
- Includes all requirements:
  - Arcade/neon style
  - All 5 games with Find Game buttons
  - 2 coming soon games (Osu, Crash)
  - Bet amount dropdown (0.05 - 5.0 SOL)
  - Instant entry after clicking Find Game

---

## 📋 **Next Steps**

### **Step 1: Generate Lobby Page with v0.dev**

1. **Open v0.dev** in your browser
2. **Copy the entire prompt** from `V0_DEV_PROMPT_LOBBY_PAGE.md`
3. **Paste into v0.dev** and generate
4. **Review the generated code**
5. **Copy the generated component code**

### **Step 2: Integrate Generated Code**

**Option A: Replace Home Page** (Recommended)
- Replace `src/app/page.tsx` with the new lobby page
- This makes it the main landing page

**Option B: Create New Route**
- Create `src/app/lobby/page.tsx`
- Keep existing home page
- Add navigation to `/lobby`

**I recommend Option A** - make the lobby page the main landing page!

### **Step 3: Update Navigation**

The "Find Game" button should:
1. Show loading state
2. Call backend `/find-or-join-lobby` endpoint with:
   - `gameType`: game ID (e.g., 'sol-bird-race')
   - `entryTier`: selected bet amount (e.g., 0.1)
3. Navigate to `/play/[game-id]?entry=[bet-amount]&lobbyId=[lobby-id]`

### **Step 4: Test**

1. **Start backend:** `cd backend/matchmaker && npm run dev`
2. **Start frontend:** `cd degn-arcade && npm run dev`
3. **Test:**
   - Lobby page loads
   - Game cards display correctly
   - Bet dropdown works
   - Find Game button works
   - Navigation to game page works

---

## 🎨 **Design Requirements (for v0.dev)**

### **Games to Show:**

**Available (with Find Game):**
1. **Sol Bird** - `gameId: 'sol-bird-race'`
2. **Suroi** - `gameId: 'suroi'`
3. **Slither** - `gameId: 'slither'`
4. **Agar** - `gameId: 'agar'`
5. **Coinflip** - `gameId: 'coinflip'`

**Coming Soon:**
6. **Osu** - `gameId: 'osu'`
7. **Crash** - `gameId: 'crash'`

### **Bet Amounts:**
```typescript
const BET_AMOUNTS = [0.05, 0.1, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
```

### **Navigation:**
When "Find Game" clicked:
```typescript
router.push(`/play/${gameId}?entry=${betAmount}`);
```

---

## 🔧 **Integration Points**

### **1. Wallet Connection**
- Use existing `ConnectWalletButton` component
- Show wallet status at top of page
- Check if wallet connected before allowing "Find Game"

### **2. Backend Integration**
- Use `useMatchmaker` hook for:
  - `findAndJoinBestMatch(gameType, entryTier)`
  - Or call `/find-or-join-lobby` endpoint directly

### **3. Game Pages**
- Ensure game pages (`/play/sol-bird`, etc.) accept `entry` query param
- They should already be set up for this

---

## 📝 **Files to Update**

### **After v0.dev Generation:**

1. **Main Page** (`src/app/page.tsx`)
   - Replace with generated lobby page
   - Or create new route

2. **Navigation** (if needed)
   - Update any nav links to point to lobby

3. **Type Definitions** (if needed)
   - Add game types if not already defined

---

## ✅ **Checklist**

After generating with v0.dev:

- [ ] Lobby page generated and looks good
- [ ] All 5 games displayed with Find Game buttons
- [ ] 2 coming soon games displayed
- [ ] Bet dropdown works (0.05 - 5.0 SOL)
- [ ] Find Game button navigates correctly
- [ ] Wallet connection integrated
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Neon/arcade styling applied
- [ ] Loading states work
- [ ] Tested locally

---

## 🚀 **After Implementation**

1. **Test locally** (verify everything works)
2. **Deploy to Vercel** (test on production)
3. **Verify game flow** (create lobby → join → play)
4. **Final polish** (any UI tweaks needed)

---

## 📄 **v0.dev Prompt Location**

**File:** `V0_DEV_PROMPT_LOBBY_PAGE.md`

**Copy the entire contents** and paste into v0.dev!

---

**Ready to generate! Copy the prompt from `V0_DEV_PROMPT_LOBBY_PAGE.md` and paste into v0.dev! 🎮**



