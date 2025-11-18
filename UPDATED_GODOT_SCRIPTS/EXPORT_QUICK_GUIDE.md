# 🚀 Quick Export Guide

**Time:** ~5 minutes | **Difficulty:** Easy

---

## 📋 **Export Steps**

### **1. Open Export Dialog**
```
Godot Editor → Project → Export
```

### **2. Add HTML5 Preset (if not exists)**
- Click **Add...** → Select **Web**
- Name: `Sol Bird HTML5`

### **3. Configure Export Path**
- **Export Path:** Click folder icon
- Navigate to: `C:\Users\mojo\Documents\degn\degn-arcade\public\games\sol-bird\client\`
- **File name:** `index.html`
- ✅ **Full path:** `C:\Users\mojo\Documents\degn\degn-arcade\public\games\sol-bird\client\index.html`

### **4. Export Settings (Quick)**
**General:**
- Variant: **Release**
- Debug: **Disabled**

**HTML:**
- Threads: **Enabled** ✅
- Audio Worklet: **Enabled** ✅
- GZip: **Disabled**
- FileSystem: **Virtualized**

### **5. Export!**
- Click **Export Project...**
- Save to: `index.html` (in the client folder)
- Wait ~1-2 minutes
- ✅ Done!

---

## ✅ **Verify Export**

### **Check Files Created:**
Navigate to: `degn-arcade\public\games\sol-bird\client\`

Should see:
- ✅ `index.html`
- ✅ `sol-bird.wasm` (or similar)
- ✅ `sol-bird.pck` (or similar)
- ✅ Other game files

### **Check ws-glue.js Injection:**
1. Open `index.html` in text editor
2. Search for `ws-glue.js`
3. Should see: `<script src="./ws-glue.js"></script>` before `</body>`

**If NOT there:**
- Run: `cd degn-arcade && npm run build`
- Or manually add the script tag

---

## 🧪 **Test Locally**

### **1. Start Backend**
```bash
cd backend/matchmaker
npm run dev
```

### **2. Start Frontend**
```bash
cd degn-arcade
npm run dev
```

### **3. Test in Browser**
1. Open: `http://localhost:3000`
2. Go to: `/find-game`
3. Create/join lobby
4. Game should load!

---

## 🐛 **Common Issues**

### **"index.html not found"**
- ✅ Check export path is correct
- ✅ Make sure folder exists: `public/games/sol-bird/client/`

### **"ws-glue.js not injected"**
- ✅ Run: `npm run build` in degn-arcade folder
- ✅ Or manually add script tag

### **"Game doesn't load"**
- ✅ Check browser console (F12) for errors
- ✅ Check Network tab for failed file loads
- ✅ Verify all files exported correctly

---

## 🚀 **Next Steps After Export**

1. ✅ **Test locally** (backend + frontend running)
2. ✅ **Fix any issues** (check console, logs)
3. ✅ **Deploy to production** (push to GitHub, auto-deploy)
4. ✅ **Test production** (full end-to-end flow)

---

## 📝 **Summary**

**Export:**
1. Project → Export
2. Add Web preset
3. Set path to `degn-arcade/public/games/sol-bird/client/index.html`
4. Export!

**Test:**
1. Start backend
2. Start frontend
3. Test in browser

**Deploy:**
1. Push to GitHub
2. Auto-deploy (Vercel/Render)
3. Test production

**That's it! Let me know when you've exported and we can test! 🎮**

