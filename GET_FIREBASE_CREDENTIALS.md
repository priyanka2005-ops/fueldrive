# Quick Firebase Credentials Guide

## Your Firebase Project Details
- **Project Name**: fueldrive
- **Project ID**: fueldrive-14ec8
- **Region**: us-central1 (default)

---

## 🔑 Getting Your API Credentials (2 minutes)

### Step 1: Go to Firebase Settings
1. In Firebase Console, click the **⚙️ Settings** icon (top-left corner)
2. Select **Project Settings**

### Step 2: Find "Your apps" Section
1. In Project Settings, scroll down to **"Your apps"**
2. Click the **Web icon** `</>`
3. A config object will appear looking like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy_XXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "fueldrive-14ec8.firebaseapp.com",
  projectId: "fueldrive-14ec8",
  storageBucket: "fueldrive-14ec8.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

### Step 3: Copy Each Value
- Copy **apiKey** → Paste in `.env` as `REACT_APP_FIREBASE_API_KEY`
- Copy **messagingSenderId** → Paste in `.env` as `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- Copy **appId** → Paste in `.env` as `REACT_APP_FIREBASE_APP_ID`

The other fields are already pre-filled in `.env`:
- `REACT_APP_FIREBASE_AUTH_DOMAIN=fueldrive-14ec8.firebaseapp.com`
- `REACT_APP_FIREBASE_PROJECT_ID=fueldrive-14ec8`
- `REACT_APP_FIREBASE_STORAGE_BUCKET=fueldrive-14ec8.appspot.com`

---

## ✅ Enable Firebase Services

### Authentication
1. Left sidebar → **Authentication**
2. Click **Get Started**
3. Select **Email/Password**
4. Enable it → **Save**

### Firestore Database  
1. Left sidebar → **Firestore Database**
2. Click **Create database**
3. Choose **Test mode** (for development)
4. Select region → **Create**

### Cloud Storage
1. Left sidebar → **Storage**
2. Click **Get Started**
3. Choose **Test mode**
4. Select region → **Done**

---

## 📝 Your `.env` File

Once you have your credentials, your `.env` should look like:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSy_XXXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=fueldrive-14ec8.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=fueldrive-14ec8
REACT_APP_FIREBASE_STORAGE_BUCKET=fueldrive-14ec8.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

---

## 🚀 After Filling `.env`

1. Save the `.env` file
2. Stop dev server (Ctrl+C in terminal)
3. Restart: `npm start`
4. Open http://localhost:3001 (or the port shown)
5. Try signing up with test@example.com + password

---

## 🔗 Direct Links

- **Firebase Console**: https://console.firebase.google.com/project/fueldrive-14ec8
- **Project Settings**: https://console.firebase.google.com/project/fueldrive-14ec8/settings/general
- **Authentication**: https://console.firebase.google.com/project/fueldrive-14ec8/authentication/providers
- **Firestore**: https://console.firebase.google.com/project/fueldrive-14ec8/firestore
- **Storage**: https://console.firebase.google.com/project/fueldrive-14ec8/storage

---

## ❓ Can't Find API Key?

Make sure you're in the right place:
- **NOT** in "Service Accounts" or "Keys"
- **YES** in **Project Settings** → **"Your apps"** → **Web app config**

The web config should show:
```
apiKey: "AIzaSy..."  ← This is what you need
```

---

**Once you fill in the 3 values (apiKey, messagingSenderId, appId), your app will work!**
