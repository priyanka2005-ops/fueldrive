# FuelDrive - Firebase Setup Guide

## ✅ Firebase Integration Complete!

Your FuelDrive app now has **real-time database** and **authentication** powered by Firebase.

### 📋 Features Added:
- ✅ User Authentication (Email/Password)
- ✅ Cloud Firestore Database
- ✅ Cloud Storage (for document uploads)
- ✅ Real-time user data sync
- ✅ Order history storage
- ✅ Vehicle information storage

---

## 🚀 Setup Instructions

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"**
3. Enter project name: `fueldrive`
4. Accept the terms and create

### Step 2: Enable Authentication

1. In the left sidebar, go to **Authentication**
2. Click **"Get Started"**
3. Select **"Email/Password"**
4. Enable it and click **Save**

### Step 3: Create Firestore Database

1. In the left sidebar, go to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Select your preferred region
5. Click **"Create"**

### Step 4: Set Up Cloud Storage

1. In the left sidebar, go to **Storage**
2. Click **"Get Started"**
3. Choose **"Start in test mode"**
4. Select your region
5. Click **"Done"**

### Step 5: Get Firebase Credentials

1. Go to **Project Settings** (gear icon in top-left)
2. Scroll down to **"Your apps"**
3. Click the web icon (</>) to create a web app
4. Follow the steps and copy the Firebase config
5. Your config object will look like:
```javascript
{
  apiKey: "AIzaSy...",
  authDomain: "fueldrive-xxx.firebaseapp.com",
  projectId: "fueldrive-xxx",
  storageBucket: "fueldrive-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
}
```

### Step 6: Add Credentials to .env File

1. Open `.env` file in the project root
2. Replace the placeholder values with your Firebase config:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=fueldrive-xxx.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=fueldrive-xxx
REACT_APP_FIREBASE_STORAGE_BUCKET=fueldrive-xxx.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef
```

3. Save the file

### Step 7: Restart the Dev Server

```bash
# Stop the server (Ctrl+C in terminal)
# Then restart:
npm start
```

---

## 🎯 How It Works

### User Registration
1. User enters email & password
2. Click **"Don't have an account? Sign Up"** toggle
3. Click **"Sign Up"** button
4. Firebase creates user account
5. User data saved to Firestore

### User Login
1. User enters email & password
2. Click **"Login"** button
3. Firebase authenticates user
4. User data loaded from Firestore
5. App navigates to home screen

### Vehicle Information
- Saved to Firestore when user completes vehicle setup
- Automatically loaded on next login

### Documents (License, RC, Insurance, PUC)
- Uploaded to Cloud Storage
- File references saved to Firestore
- Available for quick access in emergencies

### Order History
- Each fuel order saved to Firestore
- Visible in user profile
- Tracked in real-time

---

## 🔐 Security Rules (Important!)

By default, you started in **"test mode"** which allows anyone to read/write data. For production, update these rules:

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

**Storage Rules:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/* {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

---

## 📱 Testing the Integration

1. **Sign Up:**
   - Email: `test@example.com`
   - Password: `TestPassword123!`
   - Click **"Don't have an account? Sign Up"**
   - Click **"Sign Up"** button

2. **Complete Vehicle Setup:**
   - Fill in vehicle details
   - Save vehicle

3. **Make an Order:**
   - Add fuel to cart
   - Proceed to checkout
   - Order saved to Firestore

4. **Logout & Login:**
   - Go to Profile → Logout
   - Login with same credentials
   - Your data will reload from Firestore!

---

## 🆘 Troubleshooting

### "Firebase is not defined" Error
- Make sure `.env` file has all Firebase credentials
- Restart the dev server: `npm start`

### "Firebase Authentication is not enabled" Error
- Go to Firebase Console > Authentication
- Enable Email/Password provider

### "Permission denied" on document upload
- Check Firestore Security Rules
- Start mode should allow test access
- Or update rules with proper auth checks

### Data not saving
- Check browser console for errors
- Verify Firestore Database is created
- Check Firebase credentials in `.env`

---

## 📚 Database Schema

### Users Collection
```javascript
/users/{uid}
{
  email: string,
  createdAt: timestamp,
  vehicleInfo: {
    number: string,
    make: string,
    model: string,
    year: number,
    color: string,
    fuelType: string,
    transmission: string,
    mileage: string
  },
  documents: {
    licence: { name, url, uploadedAt },
    rc: { name, url, uploadedAt },
    insurance: { name, url, uploadedAt },
    puc: { name, url, uploadedAt }
  },
  orders: [
    {
      orderId: string,
      items: array,
      total: number,
      date: timestamp,
      status: string
    }
  ]
}
```

---

## 🎉 You're All Set!

Your FuelDrive app now has:
- ✅ Real user authentication
- ✅ Cloud database (Firestore)
- ✅ Document storage
- ✅ Real-time data sync

All user data persists across sessions!

---

## 📖 Next Steps (Optional)

- Deploy to Firebase Hosting: `firebase deploy`
- Add phone authentication
- Implement push notifications
- Add payment integration
- Create admin dashboard

Enjoy building! 🚀
