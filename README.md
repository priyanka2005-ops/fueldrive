# FuelDrive

FuelDrive is a React application for managing fuel orders, vehicle information, and important vehicle documents. It uses Firebase Authentication, Firestore, and Storage for account management, data persistence, and document uploads.

## Features

- Email and password registration and login
- Firebase-backed user sessions
- Vehicle details stored in Firestore
- Fuel order history
- Upload and download vehicle documents
- Local Firebase emulator support for development
- Responsive React interface built with Tailwind CSS

## Technology Stack

- React 19 and React Scripts 5
- JavaScript
- Tailwind CSS
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- Jest and Testing Library

## Prerequisites

- Node.js and npm
- Java 21 for Firebase emulators
- Firebase CLI
- A Firebase project with Authentication, Firestore, and Storage enabled

## Installation

```bash
npm install
```

Create a local `.env` file in the project root and add your Firebase project configuration. `.env` is ignored by Git and must not be committed.

The application reads the following variables from `.env`:

```env
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
```

For local development, the application can use Firebase emulators. Set `REACT_APP_USE_FIREBASE_EMULATOR=true` in `.env` and start the emulators separately:

```bash
firebase emulators:start --only auth,firestore,storage
```

The emulator host and ports can be overridden with `REACT_APP_FIREBASE_EMULATOR_HOST`, `REACT_APP_FIREBASE_AUTH_EMULATOR_PORT`, `REACT_APP_FIREBASE_FIRESTORE_EMULATOR_PORT`, and `REACT_APP_FIREBASE_STORAGE_EMULATOR_PORT`.

## Run Locally

Start the React development server:

```bash
npm start
```

The development server is available at `http://localhost:3000` by default. If port 3000 is already in use, React Scripts selects another available port.

## Available Scripts

```bash
npm start   # Start the development server
npm test    # Run the test suite in watch mode
npm run build
```

Create a production build with:

```bash
npm run build
```

## Firebase Development

The Firebase emulator configuration is defined in `firebase.json`. The emulator ports are:

- Authentication: `9099`
- Firestore: `8080`
- Storage: `9199`

Run the emulators from the project directory:

```bash
firebase emulators:start --only auth,firestore,storage
```

The application uses emulator-aware Firebase initialization when emulator environment variables are enabled.

## Testing

Run the test suite once:

```bash
CI=true npm test -- --watchAll=false
```

## Project Notes

- User accounts and vehicle data are stored in Firebase Firestore.
- Vehicle documents are stored in Firebase Storage.
- Firebase security rules should be configured before using the application in production.
- Do not commit real Firebase credentials or emulator secrets.

## Supporting Documentation

- [Firebase setup guide](FIREBASE_SETUP.md)
- [Firebase integration summary](FIREBASE_INTEGRATION.md)
- [Firebase credential guidance](GET_FIREBASE_CREDENTIALS.md)
