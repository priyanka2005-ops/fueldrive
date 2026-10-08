import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Fuel, Star, Check, Clock, Eye, EyeOff, Upload, FileText, ChevronRight, X, Navigation, Home, Wrench, Building2, TrendingUp, Bell, User } from 'lucide-react';
import { auth, db, storage } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Bottom Navigation Bar Component
const BottomNav = ({ activeScreen, onNavigate, hasCritical, fuelUrgency, reminderDismissed }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, color: 'text-blue-600' },
    { id: 'bunks', label: 'Bunks', icon: Fuel, color: 'text-green-600' },
    { id: 'garages', label: 'Garages', icon: Wrench, color: 'text-slate-600' },
    { id: 'showrooms', label: 'Showrooms', icon: Building2, color: 'text-purple-600' },
    { id: 'fuelprices', label: 'Prices', icon: TrendingUp, color: 'text-orange-600' },
  ];

  const hasAlerts = (hasCritical || (fuelUrgency !== 'ok' && !reminderDismissed));

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl max-w-md mx-auto">
      <div className="flex items-center justify-around">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-all relative ${
                isActive ? 'bg-gray-50 border-t-2 border-blue-600' : 'hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-blue-600' : item.color}`} />
              <span className={`text-xs font-bold ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                {item.label}
              </span>
              {item.id === 'home' && hasAlerts && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => onNavigate('alerts')}
          className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-all relative ${
            activeScreen === 'alerts' ? 'bg-gray-50 border-t-2 border-blue-600' : 'hover:bg-gray-50'
          }`}
        >
          <Bell className={`w-5 h-5 mb-1 ${activeScreen === 'alerts' ? 'text-blue-600' : 'text-yellow-600'}`} />
          <span className={`text-xs font-bold ${activeScreen === 'alerts' ? 'text-blue-600' : 'text-gray-600'}`}>
            Alerts
          </span>
          {hasAlerts && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          )}
        </button>
        <button
          onClick={() => onNavigate('profile')}
          className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-all ${
            activeScreen === 'profile' ? 'bg-gray-50 border-t-2 border-blue-600' : 'hover:bg-gray-50'
          }`}
        >
          <User className={`w-5 h-5 mb-1 ${activeScreen === 'profile' ? 'text-blue-600' : 'text-gray-600'}`} />
          <span className={`text-xs font-bold ${activeScreen === 'profile' ? 'text-blue-600' : 'text-gray-600'}`}>
            Profile
          </span>
        </button>
      </div>
    </div>
  );
};

export default function FuelDeliveryApp() {
  const [screen, setScreen] = useState('login');
  const [address, setAddress] = useState('BTM Layout, Bangalore');
  const [cart, setCart] = useState([]);
  const [paymentStep, setPaymentStep] = useState('method');
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [ambulanceArrival, setAmbulanceArrival] = useState(null);
  const [callStarted, setCallStarted] = useState(false);
  const [arrivalCountdown, setArrivalCountdown] = useState(12);
  const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '', phone: '' });
  const [loginType, setLoginType] = useState('email');
  const [documents, setDocuments] = useState({ licence: null, rc: null, insurance: null, puc: null });
  const [docScreen, setDocScreen] = useState('list');
  const [viewingDoc, setViewingDoc] = useState(null);
  const [vehicleInfo, setVehicleInfo] = useState(null); // null = not set yet
  const [vehicleForm, setVehicleForm] = useState({ number: '', make: '', model: '', year: '', color: '', fuelType: 'Petrol', transmission: 'Manual', mileage: '' });
  const [vehicleSetupStep, setVehicleSetupStep] = useState(1);
  const [isGuest, setIsGuest] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [selectedBunk, setSelectedBunk] = useState(null);
  const [garageFilter, setGarageFilter] = useState('all');
  const [showroomFilter, setShowroomFilter] = useState('all');
  const [bookingShowroom, setBookingShowroom] = useState(null);
  const [bookingForm, setBookingForm] = useState({ service: '', date: '', time: '', name: '', phone: '' });
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [fuelPriceCity, setFuelPriceCity] = useState('Bangalore');
  const [fuelPriceLastUpdated, setFuelPriceLastUpdated] = useState('Today, 6:00 AM');

  // Firebase Authentication State
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // ── Smart Fuel Reminder state ──────────────────────────────────────────────
  const [fuelUsageLog] = useState([
    { date: '14 Feb', litres: 12, km: 148 },
    { date: '10 Feb', litres: 15, km: 185 },
    { date: '06 Feb', litres: 11, km: 136 },
    { date: '01 Feb', litres: 14, km: 172 },
    { date: '27 Jan', litres: 13, km: 160 },
    { date: '22 Jan', litres: 16, km: 197 },
  ]);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [alertsDismissed, setAlertsDismissed] = useState({});

  // ── Doc expiry data (simulate expiry dates relative to today) ─────────────
  const today = new Date();
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const fmtDate = d => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const docExpiryDates = {
    insurance: { expiryDate: addDays(today, 18),  label: 'Insurance Policy',       icon: '🛡️', actionLabel: 'Renew Now',   color: 'red' },
    puc:       { expiryDate: addDays(today, 6),   label: 'PUC Certificate',        icon: '🌿', actionLabel: 'Book PUC',    color: 'red' },
    licence:   { expiryDate: addDays(today, 45),  label: 'Driving Licence',        icon: '🪪', actionLabel: 'Renew Licence', color: 'amber' },
    rc:        { expiryDate: addDays(today, 120), label: 'RC Fitness Certificate',  icon: '📋', actionLabel: 'Renew RC',    color: 'green' },
  };

  // Compute days left & urgency
  const expiryAlerts = Object.entries(docExpiryDates).map(([id, info]) => {
    const daysLeft = Math.ceil((info.expiryDate - today) / (1000 * 60 * 60 * 24));
    const urgency = daysLeft <= 7 ? 'critical' : daysLeft <= 30 ? 'warning' : 'ok';
    return { id, ...info, daysLeft, urgency, expiryStr: fmtDate(info.expiryDate) };
  }).sort((a, b) => a.daysLeft - b.daysLeft);

  const criticalAlerts = expiryAlerts.filter(a => a.urgency !== 'ok' && !alertsDismissed[a.id]);
  const hasCritical = criticalAlerts.length > 0;

  // ── Smart Fuel Reminder AI logic ──────────────────────────────────────────
  const avgKmPerLitre = Math.round(fuelUsageLog.reduce((s, l) => s + l.km / l.litres, 0) / fuelUsageLog.length * 10) / 10;
  const avgDailyKm = Math.round(fuelUsageLog.reduce((s, l) => s + l.km, 0) / (fuelUsageLog.length * 4));
  const currentFuelLitres = 9.2; // simulated litres remaining (75% of ~12L tank)
  const estimatedKmLeft = Math.round(currentFuelLitres * avgKmPerLitre);
  const daysUntilEmpty = Math.round(estimatedKmLeft / avgDailyKm);
  const fuelUrgency = daysUntilEmpty <= 1 ? 'critical' : daysUntilEmpty <= 3 ? 'warning' : 'ok';
  const fuelReminderMsg =
    daysUntilEmpty <= 1 ? "⚠️ Fuel critically low! Refuel today." :
    daysUntilEmpty <= 2 ? "You may need fuel tomorrow." :
    `You may need fuel in ${daysUntilEmpty} days.`;

  // Showrooms data
  const nearbyShowrooms = [
    { id: 1, name: 'Mandovi Motors – Maruti Suzuki', brand: 'Maruti Suzuki', dist: '1.2 km', rating: 4.5, reviews: 312, open: true, openTime: '9:00 AM – 7:00 PM', phone: '+91 80-4141-2000', address: 'Hosur Road, BTM Layout, Bangalore', logo: '🔵', brandColor: 'from-blue-500 to-blue-700', type: 'maruti', services: ['Free Vehicle Health Check', 'Periodic Service', 'Body Repair & Paint', 'Wheel Alignment', 'AC Service', 'Tyre Replacement', 'Battery Check', 'Insurance Renewal'], slots: ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'] },
    { id: 2, name: 'Trident Hyundai', brand: 'Hyundai', dist: '1.7 km', rating: 4.4, reviews: 198, open: true, openTime: '9:00 AM – 7:30 PM', phone: '+91 80-4242-3000', address: '27th Cross, Jayanagar, Bangalore', logo: '⚫', brandColor: 'from-gray-700 to-gray-900', type: 'hyundai', services: ['General Service', 'Accidental Repair', 'Engine Tune-up', 'Brake Service', 'Suspension Check', 'Air Filter Change', 'Coolant Flush', 'Warranty Claims'], slots: ['9:30 AM', '10:30 AM', '11:30 AM', '1:00 PM', '2:30 PM', '3:30 PM', '4:30 PM'] },
    { id: 3, name: 'Nippon Honda – Koramangala', brand: 'Honda', dist: '2.1 km', rating: 4.7, reviews: 445, open: true, openTime: '8:30 AM – 7:00 PM', phone: '+91 80-4343-4000', address: '80 Feet Road, Koramangala, Bangalore', logo: '🔴', brandColor: 'from-red-500 to-red-700', type: 'honda', services: ['Free Pick & Drop', 'Express Service', 'Genuine Parts Only', 'Transmission Service', 'AC Regassing', 'Engine Flush', 'Tyre Change', 'Roadside Assistance'], slots: ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '5:00 PM'] },
    { id: 4, name: 'Concorde Motors – Tata', brand: 'Tata Motors', dist: '2.6 km', rating: 4.3, reviews: 156, open: false, openTime: '9:00 AM – 6:30 PM', phone: '+91 80-4444-5000', address: 'Bannerghatta Road, JP Nagar, Bangalore', logo: '🟣', brandColor: 'from-purple-500 to-purple-700', type: 'tata', services: ['Tata EV Service', 'Body Work', 'Mechanical Repair', 'Software Update', 'Brake Inspection', 'Suspension Repair', 'Fuel System Clean', 'Insurance Claim'], slots: ['10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'] },
    { id: 5, name: 'Toyota Kirloskar – Silk Board', brand: 'Toyota', dist: '3.1 km', rating: 4.8, reviews: 521, open: true, openTime: '8:00 AM – 7:00 PM', phone: '+91 80-4545-6000', address: 'Silk Board Junction, Bangalore', logo: '🔶', brandColor: 'from-red-600 to-orange-600', type: 'toyota', services: ['Periodic Maintenance', 'Hybrid Battery Check', 'Rust Proofing', 'Interior Detailing', 'TPMS Reset', 'Coolant Check', 'Gearbox Oil Change', 'Pre-sale Inspection'], slots: ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'] },
    { id: 6, name: 'Mahindra First Choice', brand: 'Mahindra', dist: '3.8 km', rating: 4.2, reviews: 89, open: true, openTime: '9:30 AM – 6:00 PM', phone: '+91 80-4646-7000', address: 'Electronic City Phase 2, Bangalore', logo: '🟤', brandColor: 'from-amber-700 to-amber-900', type: 'mahindra', services: ['SUV Specialist', 'Off-road Setup', '4WD Service', 'Lift Kit Install', 'Winch Service', 'Engine Overhaul', 'Diff Service', 'Bull Bar Fitting'], slots: ['9:30 AM', '10:30 AM', '12:00 PM', '1:30 PM', '2:30 PM', '3:30 PM', '4:30 PM'] },
  ];

  // Live fuel price data (city-wise, simulated)
  const fuelPriceData = {
    Bangalore: { petrol92: 103.41, petrol95: 109.57, diesel: 89.62, cng: 75.50, trend: { petrol92: +0.12, petrol95: +0.12, diesel: -0.08, cng: 0 } },
    Mumbai:    { petrol92: 104.21, petrol95: 110.45, diesel: 92.15, cng: 68.30, trend: { petrol92: +0.12, petrol95: +0.12, diesel: -0.08, cng: 0 } },
    Delhi:     { petrol92: 96.72,  petrol95: 101.54, diesel: 89.62, cng: 73.59, trend: { petrol92: 0,     petrol95: 0,     diesel: -0.08, cng: +0.15 } },
    Chennai:   { petrol92: 102.63, petrol95: 108.90, diesel: 94.24, cng: 0,     trend: { petrol92: +0.12, petrol95: +0.12, diesel: 0,     cng: 0 } },
    Hyderabad: { petrol92: 107.41, petrol95: 113.50, diesel: 95.65, cng: 79.80, trend: { petrol92: +0.12, petrol95: +0.12, diesel: +0.05, cng: 0 } },
    Pune:      { petrol92: 104.95, petrol95: 110.80, diesel: 91.20, cng: 71.20, trend: { petrol92: +0.12, petrol95: +0.12, diesel: -0.08, cng: 0 } },
    Kolkata:   { petrol92: 106.03, petrol95: 112.10, diesel: 92.76, cng: 0,     trend: { petrol92: 0,     petrol95: 0,     diesel: -0.08, cng: 0 } },
    Ahmedabad: { petrol92: 96.63,  petrol95: 102.40, diesel: 92.38, cng: 69.10, trend: { petrol92: 0,     petrol95: 0,     diesel: -0.08, cng: +0.10 } },
  };
  const cities = Object.keys(fuelPriceData);
  const currentFuelPrices = fuelPriceData[fuelPriceCity] || fuelPriceData['Bangalore'];

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setFirebaseUser(user);
        // Load user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.vehicleInfo) setVehicleInfo(data.vehicleInfo);
            if (data.documents) setDocuments(data.documents);
            setScreen('home');
          }
        } catch (err) {
          console.error('Error loading user data:', err);
        }
      } else {
        setFirebaseUser(null);
      }
    });
    return unsubscribe;
  }, []);

  // Firebase Login Handler
  const handleFirebaseLogin = async () => {
    if (!loginData.email || !loginData.password) {
      setAuthError('Please fill all fields');
      return;
    }
    
    setAuthLoading(true);
    setAuthError('');
    
    try {
      if (isSignUp) {
        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, loginData.email, loginData.password);
        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: loginData.email,
          createdAt: new Date(),
          vehicleInfo: null,
          documents: {},
          orders: []
        });
        setLoginData({ email: '', password: '', phone: '' });
        setIsSignUp(false);
      } else {
        // Sign In
        await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
      }
    } catch (error) {
      const firebaseCode = error?.code || '';
      if (firebaseCode === 'auth/user-not-found') {
        setAuthError('No account exists for this email. Create a new account first.');
      } else if (firebaseCode === 'auth/invalid-credential') {
        setAuthError('The email or password is incorrect. Please try again.');
      } else {
        setAuthError(error.message || 'Unable to sign in. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Firebase Logout Handler
  const handleFirebaseLogout = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setVehicleInfo(null);
      setDocuments({ licence: null, rc: null, insurance: null, puc: null });
      setLoginData({ email: '', password: '', phone: '' });
      setScreen('login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Nearby petrol bunks data (simulated GPS-based)
  const nearbyBunks = [
    { id: 1, name: 'Indian Oil – BTM 2nd Stage', brand: 'Indian Oil', dist: '0.4 km', eta: '2 min', rating: 4.5, reviews: 128, lat: 12.9141, lng: 77.6101, open: true, price92: 103.41, priceDiesel: 89.62, amenities: ['ATM', 'Air', 'Water'], address: '#12, BTM 2nd Stage, Bangalore' },
    { id: 2, name: 'HP Petrol Pump – Hosur Rd', brand: 'HP', dist: '0.9 km', eta: '4 min', rating: 4.2, reviews: 89, lat: 12.9098, lng: 77.6134, open: true, price92: 103.28, priceDiesel: 89.55, amenities: ['Air', 'Water', 'Wash'], address: 'Hosur Road, Near Silk Board, Bangalore' },
    { id: 3, name: 'BPCL – Madiwala', brand: 'BPCL', dist: '1.3 km', eta: '6 min', rating: 4.7, reviews: 203, lat: 12.9207, lng: 77.6178, open: true, price92: 103.35, priceDiesel: 89.58, amenities: ['ATM', 'Air', 'Water', 'Wash', 'CNG'], address: 'Madiwala Junction, Bangalore' },
    { id: 4, name: 'Shell – Koramangala', brand: 'Shell', dist: '1.8 km', eta: '8 min', rating: 4.8, reviews: 312, lat: 12.9279, lng: 77.6271, open: false, price92: 104.10, priceDiesel: 90.15, amenities: ['ATM', 'Air', 'Water', 'Wash', 'Café'], address: '5th Block, Koramangala, Bangalore' },
    { id: 5, name: 'Reliance Petroleum – JP Nagar', brand: 'Reliance', dist: '2.1 km', eta: '10 min', rating: 4.1, reviews: 67, lat: 12.9063, lng: 77.5921, open: true, price92: 103.22, priceDiesel: 89.48, amenities: ['Air', 'Water'], address: 'JP Nagar 3rd Phase, Bangalore' },
    { id: 6, name: 'Essar Oil – Electronic City', brand: 'Essar', dist: '3.4 km', eta: '14 min', rating: 3.9, reviews: 45, lat: 12.8438, lng: 77.6632, open: true, price92: 103.18, priceDiesel: 89.40, amenities: ['Air', 'Water', 'CNG'], address: 'Electronic City Phase 1, Bangalore' },
  ];

  const brandColors = { 'Indian Oil': 'from-red-500 to-red-600', 'HP': 'from-blue-500 to-blue-700', 'BPCL': 'from-orange-500 to-orange-600', 'Shell': 'from-yellow-500 to-amber-600', 'Reliance': 'from-blue-600 to-indigo-700', 'Essar': 'from-green-600 to-green-700' };
  const brandLogos = { 'Indian Oil': '🔴', 'HP': '🔵', 'BPCL': '🟠', 'Shell': '🐚', 'Reliance': '💎', 'Essar': '🟢' };

  // Nearby garages data
  const nearbyGarages = [
    { id: 1, name: 'Kumar Multi-Brand Workshop', owner: 'Suresh Kumar', phone: '+91 98451 23456', dist: '0.6 km', eta: '3 min', rating: 4.6, reviews: 156, open: true, availableFrom: 'Now', closesAt: '9:00 PM', speciality: ['Engine Repair', 'AC Service', 'Denting'], experience: '12 yrs', address: 'BTM Layout 1st Stage, Bangalore', type: 'multi' },
    { id: 2, name: 'Ravi Tyre & Alignment Center', owner: 'Ravi Shankar', phone: '+91 94483 67890', dist: '0.8 km', eta: '4 min', rating: 4.3, reviews: 98, open: true, availableFrom: 'Now', closesAt: '8:30 PM', speciality: ['Tyre Change', 'Wheel Alignment', 'Balancing'], experience: '8 yrs', address: 'Hosur Road, Madiwala, Bangalore', type: 'tyre' },
    { id: 3, name: 'Bangalore Maruti Service', owner: 'Prakash Nair', phone: '+91 80234 45678', dist: '1.1 km', eta: '5 min', rating: 4.8, reviews: 287, open: true, availableFrom: 'Now', closesAt: '7:00 PM', speciality: ['Maruti Suzuki', 'Periodic Service', 'Warranty Repairs'], experience: '15 yrs', address: '5th Cross, Koramangala, Bangalore', type: 'brand' },
    { id: 4, name: 'Sri Ganesh Auto Electricals', owner: 'Ganesh Rao', phone: '+91 76543 21098', dist: '1.5 km', eta: '7 min', rating: 4.4, reviews: 112, open: false, availableFrom: '9:00 AM Tomorrow', closesAt: 'Closed Now', speciality: ['Electrical Repairs', 'Battery', 'ECU Tuning'], experience: '10 yrs', address: 'JP Nagar 6th Phase, Bangalore', type: 'electrical' },
    { id: 5, name: 'FastFit – Koramangala', owner: 'Vikram Hegde', phone: '+91 88991 00234', dist: '1.9 km', eta: '9 min', rating: 4.5, reviews: 189, open: true, availableFrom: 'In 30 mins', closesAt: '10:00 PM', speciality: ['Quick Service', 'Oil Change', 'Brake Repair', 'AC Gas'], experience: '6 yrs', address: '80 Feet Road, Koramangala, Bangalore', type: 'multi' },
    { id: 6, name: 'Honda Authorized Service', owner: 'Manager: Deepak', phone: '+91 80123 98765', dist: '2.7 km', eta: '12 min', rating: 4.7, reviews: 334, open: true, availableFrom: 'Now', closesAt: '6:30 PM', speciality: ['Honda Cars', 'Genuine Parts', 'Insurance Repairs'], experience: '20 yrs', address: 'Silk Board, Bangalore', type: 'brand' },
  ];

  const garageTypeColors = { multi: 'bg-blue-100 text-blue-700', tyre: 'bg-orange-100 text-orange-700', brand: 'bg-purple-100 text-purple-700', electrical: 'bg-yellow-100 text-yellow-700' };
  const garageTypeLabels = { multi: '🔧 Multi-Brand', tyre: '🛞 Tyre Shop', brand: '🏭 Authorized', electrical: '⚡ Electrical' };

  const fuelTypes = [
    { id: 'petrol', name: 'Petrol', price: 110, unit: 'Litre', icon: '⛽', color: 'from-green-500 to-emerald-600', desc: 'Premium 95 Octane' },
    { id: 'diesel', name: 'Diesel', price: 95, unit: 'Litre', icon: '🛢️', color: 'from-blue-500 to-blue-700', desc: 'Regular Diesel' },
    { id: 'oil', name: 'Engine Oil', price: 250, unit: '1L', icon: '🔧', color: 'from-amber-500 to-amber-600', desc: 'Premium 10W-30' },
    { id: 'atf', name: 'ATF', price: 300, unit: '1L', icon: '⚙️', color: 'from-purple-500 to-purple-700', desc: 'Transmission Fluid' },
    { id: 'gear', name: 'Gear Oil', price: 180, unit: '1L', icon: '🔩', color: 'from-red-500 to-rose-600', desc: 'Heavy Duty Oil' },
    { id: 'coolant', name: 'Coolant', price: 320, unit: '1L', icon: '❄️', color: 'from-cyan-500 to-cyan-700', desc: 'Engine Coolant' },
  ];

  const docTypes = [
    { id: 'licence', label: 'Driving Licence', icon: '🪪', desc: 'Upload front & back' },
    { id: 'rc', label: 'RC Book', icon: '📋', desc: 'Vehicle Registration' },
    { id: 'insurance', label: 'Insurance', icon: '🛡️', desc: 'Policy document' },
    { id: 'puc', label: 'PUC Certificate', icon: '🌿', desc: 'Pollution check cert' },
  ];

  const addToCart = (fuel) => {
    const existing = cart.find(item => item.id === fuel.id);
    if (existing) {
      setCart(cart.map(item => item.id === fuel.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...fuel, qty: 1 }]);
    }
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));
  const updateQty = (id, qty) => qty < 1 ? removeFromCart(id) : setCart(cart.map(item => item.id === id ? { ...item, qty } : item));
  const getTotal = () => cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  useEffect(() => {
    if (!callStarted) return;
    const interval = setInterval(() => {
      setArrivalCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          alert('🚑 Ambulance Arrived!\n\nEmergency team is here to help you.');
          setCallStarted(false); setEmergencyActive(false); setAmbulanceArrival(null); setArrivalCountdown(12);
          return 0;
        }
        return prev - 1;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [callStarted]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !uploadTarget) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDocuments(prev => ({ ...prev, [uploadTarget]: { name: file.name, data: ev.target.result, type: file.type, uploadedAt: new Date().toLocaleDateString('en-IN') } }));
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = (docId) => {
    setUploadTarget(docId);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const docsUploaded = Object.values(documents).filter(Boolean).length;

  // Emergency screen
  if (emergencyActive && ambulanceArrival) {
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gradient-to-br from-red-700 via-red-600 to-red-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-center text-white">
              <div className="text-6xl mb-3 animate-bounce">🚑</div>
              <h1 className="text-2xl font-black tracking-tight">EMERGENCY ACTIVATED</h1>
              <p className="text-red-100 text-sm mt-1">Ambulance dispatched to your location</p>
            </div>

            {callStarted && (
              <div className="mx-4 mt-4 bg-green-50 border-2 border-green-400 rounded-2xl p-3 flex items-center gap-3">
                <div className="text-2xl animate-pulse">📞</div>
                <div>
                  <p className="text-green-700 font-bold text-sm">Call Connected</p>
                  <p className="text-green-600 text-xs">{ambulanceArrival.driver}</p>
                </div>
              </div>
            )}

            <div className="p-4 space-y-3">
              <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-2 gap-3">
                {[
                  { label: '👨 Driver', value: ambulanceArrival.driver },
                  { label: '📞 Phone', value: ambulanceArrival.phone },
                  { label: '🚗 Vehicle', value: ambulanceArrival.vehicle },
                  { label: '🏥 From', value: ambulanceArrival.location },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                    <p className="font-bold text-xs text-gray-800">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className={`${callStarted ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'} text-white rounded-2xl p-5 text-center`}>
                <p className="text-xs opacity-80 mb-1">⏱️ {callStarted ? 'Arriving In' : 'ETA'}</p>
                <p className="text-5xl font-black">{callStarted ? arrivalCountdown : 12}</p>
                <p className="text-sm opacity-90">minutes • 📍 {ambulanceArrival.distance}</p>
              </div>

              {/* Show user documents in emergency */}
              {docsUploaded > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                  <p className="text-blue-800 font-bold text-sm mb-2">📄 Your Documents (Quick Access)</p>
                  <div className="flex flex-wrap gap-2">
                    {docTypes.map(dt => documents[dt.id] && (
                      <button key={dt.id} onClick={() => { setViewingDoc(dt.id); setScreen('viewdoc'); setEmergencyActive(false); setAmbulanceArrival(null); }}
                        className="bg-white border border-blue-300 rounded-lg px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100">
                        {dt.icon} {dt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">Tap to show documents to emergency responders</p>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-800">⚠️ Stay calm. Emergency services notified. Location shared with hospital.</p>
              </div>

              <div className="space-y-2">
                <button onClick={() => setCallStarted(true)} disabled={callStarted}
                  className={`w-full p-4 rounded-xl font-black text-base transition-all ${callStarted ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 shadow-lg'}`}>
                  {callStarted ? '📞 Call In Progress...' : '📞 Call Ambulance Driver'}
                </button>
                <button onClick={() => { setEmergencyActive(false); setAmbulanceArrival(null); setCallStarted(false); setArrivalCountdown(12); }}
                  className="w-full bg-gray-100 text-gray-700 p-3 rounded-xl font-bold hover:bg-gray-200">
                  Cancel Emergency
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // View Document screen
  if (screen === 'viewdoc' && viewingDoc) {
    const doc = documents[viewingDoc];
    const docInfo = docTypes.find(d => d.id === viewingDoc);
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gray-900 flex flex-col">
        <div className="bg-gray-800 p-4 flex items-center gap-3">
          <button onClick={() => { setScreen('documents'); setViewingDoc(null); }} className="text-white"><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="text-white font-bold">{docInfo?.icon} {docInfo?.label}</h1>
            <p className="text-gray-400 text-xs">Uploaded {doc?.uploadedAt}</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          {doc?.type?.startsWith('image') ? (
            <img src={doc.data} alt={docInfo?.label} className="max-w-full max-h-96 rounded-xl shadow-2xl object-contain" />
          ) : doc?.type === 'application/pdf' ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-2xl max-w-sm w-full">
              <div className="text-6xl mb-4">📄</div>
              <p className="font-bold text-gray-800 mb-2">{doc.name}</p>
              <p className="text-gray-500 text-sm mb-4">{docInfo?.label}</p>
              <p className="text-xs text-gray-400">PDF document uploaded successfully</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 text-center"><p className="text-gray-600">Preview not available</p></div>
          )}
        </div>
        <div className="p-4 bg-gray-800">
          <p className="text-gray-400 text-xs text-center">Show this to the traffic police or emergency responders</p>
        </div>
      </div>
    );
  }

  // Documents screen
  if (screen === 'documents') {
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gray-50">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 pb-8">
          <div className="max-w-md mx-auto">
            <button onClick={() => setScreen('home')} className="text-white mb-4 flex items-center gap-1"><ArrowLeft className="w-5 h-5" /> Back</button>
            <h1 className="text-2xl font-black">My Documents</h1>
            <p className="text-indigo-200 text-sm mt-1">Upload once, access anytime — even in emergencies</p>
            <div className="mt-3 bg-white/20 rounded-xl p-3 flex items-center gap-3">
              <div className="text-3xl">📁</div>
              <div>
                <p className="font-bold text-sm">{docsUploaded}/4 Documents Uploaded</p>
                <div className="w-full bg-white/30 rounded-full h-1.5 mt-1">
                  <div className="bg-white rounded-full h-1.5 transition-all" style={{ width: `${(docsUploaded / 4) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-md mx-auto -mt-4 space-y-3 pb-20">
          {/* Vehicle Info Card */}
          <div className="bg-white rounded-2xl shadow-md p-4 mb-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-2xl">🚗</div>
              <div>
                <p className="font-bold text-gray-800">Vehicle Details</p>
                <p className="text-xs text-gray-500">Linked to your account</p>
              </div>
            </div>
            {vehicleInfo ? (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Number', value: vehicleInfo.number },
                  { label: 'Model', value: `${vehicleInfo.make} ${vehicleInfo.model}` },
                  { label: 'Fuel Type', value: vehicleInfo.fuelType },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="font-bold text-xs text-gray-800 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No vehicle added. <button onClick={() => setScreen('vehiclesetup')} className="text-blue-600 underline font-bold">Add vehicle</button></p>
            )}
          </div>

          <p className="text-xs text-gray-500 font-semibold px-1 uppercase tracking-wide">Upload Documents</p>

          {docTypes.map(doc => {
            const uploaded = documents[doc.id];
            return (
              <div key={doc.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${uploaded ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {doc.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">{doc.label}</p>
                    <p className="text-xs text-gray-500">{uploaded ? `✅ Uploaded • ${uploaded.uploadedAt}` : doc.desc}</p>
                    {uploaded && <p className="text-xs text-gray-400 truncate max-w-40">{uploaded.name}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    {uploaded ? (
                      <>
                        <button onClick={() => { setViewingDoc(doc.id); setScreen('viewdoc'); }}
                          className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold hover:bg-indigo-200">View</button>
                        <button onClick={() => triggerUpload(doc.id)}
                          className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-bold hover:bg-gray-200">Replace</button>
                      </>
                    ) : (
                      <button onClick={() => triggerUpload(doc.id)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-indigo-700">
                        <Upload className="w-3 h-3" /> Upload
                      </button>
                    )}
                  </div>
                </div>
                {uploaded && (
                  <div className="bg-green-50 border-t border-green-100 px-4 py-2 flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-600" />
                    <p className="text-xs text-green-700">Available for emergency quick-access</p>
                  </div>
                )}
              </div>
            );
          })}

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mt-2">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div>
                <p className="font-bold text-amber-800 text-sm">Emergency Access</p>
                <p className="text-xs text-amber-700 mt-1">In an emergency, tap the 🚑 button on the home screen. Your uploaded documents will be instantly accessible to show to emergency responders or traffic police — even without internet.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── VEHICLE SETUP SCREEN (mandatory after first login) ──────────────────
  if (screen === 'vehiclesetup') {
    const fuelOptions = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];
    const transmissionOptions = ['Manual', 'Automatic', 'CVT'];
    const colorOptions = ['White', 'Black', 'Silver', 'Red', 'Blue', 'Grey', 'Brown', 'Green', 'Orange', 'Other'];
    const colorDots = { White: '#f3f4f6', Black: '#1f2937', Silver: '#9ca3af', Red: '#ef4444', Blue: '#3b82f6', Grey: '#6b7280', Brown: '#92400e', Green: '#16a34a', Orange: '#f97316', Other: '#a855f7' };

    const step1Valid = vehicleForm.number.trim().length >= 5 && vehicleForm.make.trim() && vehicleForm.model.trim();
    const step2Valid = vehicleForm.year && vehicleForm.color && vehicleForm.fuelType;
    const step3Valid = vehicleForm.transmission;

    const handleFinish = () => {
      setVehicleInfo({
        number: vehicleForm.number.toUpperCase(),
        make: vehicleForm.make,
        model: vehicleForm.model,
        year: vehicleForm.year,
        color: vehicleForm.color,
        fuelType: vehicleForm.fuelType,
        transmission: vehicleForm.transmission,
        mileage: vehicleForm.mileage || 'Not set',
        fuel: vehicleForm.fuelType,
      });
      setScreen('home');
    };

    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">🚗</div>
            <h1 className="text-2xl font-black text-white">Set Up Your Vehicle</h1>
            <p className="text-blue-200 text-sm mt-1">This helps us deliver fuel to the right car</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-5 px-2">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-sm flex-shrink-0 transition-all ${vehicleSetupStep > s ? 'bg-green-400 text-white' : vehicleSetupStep === s ? 'bg-white text-blue-700' : 'bg-white/20 text-white/50'}`}>
                  {vehicleSetupStep > s ? '✓' : s}
                </div>
                <div className={`flex-1 h-1 rounded-full transition-all ${vehicleSetupStep > s ? 'bg-green-400' : 'bg-white/20'}`}></div>
              </React.Fragment>
            ))}
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-sm flex-shrink-0 ${vehicleSetupStep === 3 && step3Valid ? 'bg-green-400 text-white' : vehicleSetupStep === 3 ? 'bg-white text-blue-700' : 'bg-white/20 text-white/50'}`}>✓</div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-2xl">
            {/* Step 1: Basic info */}
            {vehicleSetupStep === 1 && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-3">Step 1 · Basic Details</p>
                  <h2 className="font-black text-gray-800 text-lg mb-4">What's your vehicle number?</h2>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Registration Number *</label>
                  <input type="text" placeholder="e.g. KA-01-MJ-2024" value={vehicleForm.number}
                    onChange={e => setVehicleForm({...vehicleForm, number: e.target.value.toUpperCase()})}
                    className="w-full border-2 p-3 rounded-xl focus:outline-none focus:border-blue-600 font-mono text-sm uppercase tracking-widest" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Make / Brand *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Maruti', 'Hyundai', 'Honda', 'Tata', 'Toyota', 'Other'].map(brand => (
                      <button key={brand} onClick={() => setVehicleForm({...vehicleForm, make: brand})}
                        className={`py-2 rounded-xl text-sm font-bold border-2 transition-all ${vehicleForm.make === brand ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {brand}
                      </button>
                    ))}
                  </div>
                  {vehicleForm.make === 'Other' && (
                    <input type="text" placeholder="Enter brand name" className="w-full border-2 p-3 rounded-xl mt-2 focus:outline-none focus:border-blue-600 text-sm"
                      onChange={e => setVehicleForm({...vehicleForm, make: e.target.value})} />
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Model *</label>
                  <input type="text" placeholder="e.g. Swift, City, Nexon..." value={vehicleForm.model}
                    onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})}
                    className="w-full border-2 p-3 rounded-xl focus:outline-none focus:border-blue-600 text-sm" />
                </div>
                <button onClick={() => step1Valid ? setVehicleSetupStep(2) : alert('Please fill all required fields')}
                  className={`w-full p-3.5 rounded-xl font-black transition-all ${step1Valid ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                  Next →
                </button>
              </div>
            )}

            {/* Step 2: Vehicle specs */}
            {vehicleSetupStep === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Step 2 · Vehicle Specs</p>
                  <h2 className="font-black text-gray-800 text-lg mb-4">Tell us more about your car</h2>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Year of Manufacture *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[2024,2023,2022,2021,2020,2019,2018,2017].map(y => (
                      <button key={y} onClick={() => setVehicleForm({...vehicleForm, year: y})}
                        className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${vehicleForm.year === y ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Fuel Type *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {fuelOptions.map(f => (
                      <button key={f} onClick={() => setVehicleForm({...vehicleForm, fuelType: f})}
                        className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${vehicleForm.fuelType === f ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {f === 'Petrol' ? '⛽' : f === 'Diesel' ? '🛢️' : f === 'CNG' ? '🟢' : f === 'Electric' ? '⚡' : '🔋'} {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Color *</label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map(c => (
                      <button key={c} onClick={() => setVehicleForm({...vehicleForm, color: c})}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${vehicleForm.color === c ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        <span className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: colorDots[c] }}></span>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setVehicleSetupStep(1)} className="flex-1 p-3.5 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">← Back</button>
                  <button onClick={() => step2Valid ? setVehicleSetupStep(3) : alert('Please select year, fuel type and color')}
                    className={`flex-1 p-3.5 rounded-xl font-black transition-all ${step2Valid ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Final details + preview */}
            {vehicleSetupStep === 3 && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Step 3 · Final Details</p>
                  <h2 className="font-black text-gray-800 text-lg mb-4">Almost done!</h2>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Transmission *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {transmissionOptions.map(t => (
                      <button key={t} onClick={() => setVehicleForm({...vehicleForm, transmission: t})}
                        className={`py-2 rounded-xl text-sm font-bold border-2 transition-all ${vehicleForm.transmission === t ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Current Mileage (km) <span className="text-gray-400 normal-case font-normal">· optional</span></label>
                  <input type="number" placeholder="e.g. 12500" value={vehicleForm.mileage}
                    onChange={e => setVehicleForm({...vehicleForm, mileage: e.target.value})}
                    className="w-full border-2 p-3 rounded-xl focus:outline-none focus:border-blue-600 text-sm" />
                </div>

                {/* Summary preview */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4">
                  <p className="text-xs font-black text-blue-600 uppercase tracking-wide mb-3">📋 Your Vehicle Summary</p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl">🚗</div>
                    <div>
                      <p className="font-black text-gray-800">{vehicleForm.make} {vehicleForm.model}</p>
                      <p className="font-mono text-xs text-blue-700 font-bold">{vehicleForm.number}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { l: 'Year', v: vehicleForm.year },
                      { l: 'Color', v: vehicleForm.color },
                      { l: 'Fuel', v: vehicleForm.fuelType },
                      { l: 'Transmission', v: vehicleForm.transmission },
                    ].map((item, i) => (
                      <div key={i} className="bg-white rounded-xl p-2">
                        <p className="text-xs text-gray-400">{item.l}</p>
                        <p className="text-xs font-bold text-gray-800">{item.v || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setVehicleSetupStep(2)} className="flex-1 p-3.5 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">← Back</button>
                  <button onClick={handleFinish}
                    className="flex-1 p-3.5 rounded-xl font-black bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg transition-all shadow">
                    ✓ Save & Continue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'login') {
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">⛽</div>
            <h1 className="text-3xl font-bold text-white bg-blue-600 p-4">FuelDrive</h1>
            <p className="text-blue-200 mt-1">Fuel- Fast- Forward</p>
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="flex gap-2 mb-6 bg-gray-100 rounded-xl p-1">
              <button onClick={() => setLoginType('email')} className={`flex-1 p-2 rounded-lg font-bold text-sm transition-all ${loginType === 'email' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}>Email</button>
              <button onClick={() => setLoginType('phone')} className={`flex-1 p-2 rounded-lg font-bold text-sm transition-all ${loginType === 'phone' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}>Phone</button>
            </div>
            <div className="space-y-3">
              {loginType === 'email' ? (
                <>
                  <input type="email" placeholder="your@email.com" value={loginData.email} onChange={(e) => setLoginData({...loginData, email: e.target.value})} className="w-full border-2 p-3 rounded-xl focus:outline-none focus:border-blue-600 text-sm" />
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} className="w-full border-2 p-3 rounded-xl focus:outline-none focus:border-blue-600 text-sm" />
                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                  {authError && <p className="text-red-500 text-xs font-bold">{authError}</p>}
                </>
              ) : (
                <input type="tel" placeholder="+91 98765 43210" value={loginData.phone} onChange={(e) => setLoginData({...loginData, phone: e.target.value})} className="w-full border-2 p-3 rounded-xl focus:outline-none focus:border-blue-600 text-sm" />
              )}
              <button onClick={handleFirebaseLogin} disabled={authLoading}
                className={`w-full p-3.5 rounded-xl font-black transition-all shadow-lg ${authLoading ? 'bg-gray-400 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {authLoading ? 'Logging in...' : isSignUp ? 'Sign Up' : 'Login'}
              </button>
              <button onClick={() => setIsSignUp(!isSignUp)} className="w-full text-blue-600 p-2 rounded-xl font-bold text-sm hover:bg-blue-50">
                {isSignUp ? 'Have an account? Login' : "Don't have an account? Sign Up"}
              </button>
              <button onClick={() => { setIsGuest(true); setScreen('home'); }} className="w-full bg-gray-100 text-gray-700 p-3.5 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm">Continue as Guest</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'home') {
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gray-50">
        <div className="bg-white sticky top-0 z-10 shadow-sm p-4">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <div className="flex-1">
              <p className="text-xs text-gray-400">Deliver to</p>
              <p className="text-sm font-bold text-gray-800 truncate max-w-40">📍 {address}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setEmergencyActive(true); setAmbulanceArrival({ driver: 'Vikram Singh', phone: '+91 99876 54321', vehicle: 'AM-01-KA-1234', location: 'Downtown Medical Center', distance: '3.2 km', time: 12 }); }}
                className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-xl hover:bg-red-200 transition-all" title="Emergency">🚑</button>
              <button onClick={() => setScreen('alerts')} className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center relative" title="Alerts">
                <span className="text-lg">🔔</span>
                {(hasCritical || fuelUrgency !== 'ok') && !reminderDismissed && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-black">
                    {criticalAlerts.length + (fuelUrgency !== 'ok' && !reminderDismissed ? 1 : 0)}
                  </span>
                )}
              </button>
              <button onClick={() => setScreen('documents')} className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center relative" title="My Documents">
                <FileText className="w-5 h-5 text-indigo-600" />
                {docsUploaded > 0 && <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">{docsUploaded}</span>}
              </button>
              <button onClick={() => setScreen('profile')} className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">👤</button>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-md mx-auto pb-36">
          {/* Quick access row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={() => setScreen('bunks')}
              className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-4 text-left shadow-md hover:shadow-lg transition-all active:scale-95">
              <div className="text-2xl mb-1">⛽</div>
              <p className="font-black text-sm">Petrol Bunks</p>
              <p className="text-green-100 text-xs">6 nearby · GPS</p>
            </button>
            <button onClick={() => setScreen('garages')}
              className="bg-gradient-to-br from-slate-600 to-slate-800 text-white rounded-2xl p-4 text-left shadow-md hover:shadow-lg transition-all active:scale-95">
              <div className="text-2xl mb-1">🔧</div>
              <p className="font-black text-sm">Garages</p>
              <p className="text-slate-300 text-xs">6 nearby · Book slot</p>
            </button>
            <button onClick={() => { setBookingConfirmed(false); setBookingShowroom(null); setBookingForm({ service: '', date: '', time: '', name: '', phone: '' }); setScreen('showrooms'); }}
              className="bg-gradient-to-br from-violet-500 to-purple-700 text-white rounded-2xl p-4 text-left shadow-md hover:shadow-lg transition-all active:scale-95">
              <div className="text-2xl mb-1">🏢</div>
              <p className="font-black text-sm">Showrooms</p>
              <p className="text-purple-200 text-xs">6 nearby · Book service</p>
            </button>
            <button onClick={() => setScreen('fuelprices')}
              className="bg-gradient-to-br from-orange-500 to-rose-600 text-white rounded-2xl p-4 text-left shadow-md hover:shadow-lg transition-all active:scale-95">
              <div className="text-2xl mb-1">📊</div>
              <p className="font-black text-sm">Fuel Prices</p>
              <p className="text-orange-100 text-xs">Live · All cities</p>
            </button>
          </div>

          {/* Vehicle Summary Dashboard Card */}
          {vehicleInfo ? (
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-lg mb-4 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide">My Vehicle</p>
                    <p className="font-black text-xl">{vehicleInfo.make} {vehicleInfo.model}</p>
                    <p className="font-mono text-sm bg-white/20 px-2 py-0.5 rounded-lg inline-block mt-1 tracking-widest">{vehicleInfo.number}</p>
                  </div>
                  <div className="text-5xl opacity-80">🚗</div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[
                    { label: 'Year', value: vehicleInfo.year },
                    { label: 'Color', value: vehicleInfo.color },
                    { label: 'Fuel', value: vehicleInfo.fuelType },
                    { label: 'Gear', value: vehicleInfo.transmission },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/15 rounded-xl p-2 text-center">
                      <p className="text-blue-200 text-xs">{item.label}</p>
                      <p className="font-black text-white text-xs mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-black/20 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-orange-300" />
                  <span className="text-xs text-blue-100">Est. Fuel Level</span>
                  <span className="font-black text-orange-300">75%</span>
                </div>
                <button onClick={() => setScreen('vehiclesetup')} className="text-xs text-blue-200 underline hover:text-white">Edit</button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl p-4 mb-4 shadow-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-orange-100 text-xs">Fuel Level (Guest)</p>
                  <p className="text-4xl font-black">—</p>
                  <p className="text-orange-100 text-xs mt-1">Login to see vehicle details</p>
                </div>
                <Fuel className="w-14 h-14 opacity-80" />
              </div>
            </div>
          )}

          {/* ── Smart Fuel Reminder Banner ──────────────────────────────── */}
          {vehicleInfo && !reminderDismissed && fuelUrgency !== 'ok' && (
            <div className={`rounded-2xl p-4 mb-3 flex items-start gap-3 shadow-md relative ${fuelUrgency === 'critical' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'}`}>
              <div className="text-2xl mt-0.5">🤖</div>
              <div className="flex-1">
                <p className="font-black text-sm">AI Fuel Reminder</p>
                <p className="text-white/90 text-xs mt-0.5">{fuelReminderMsg}</p>
                <div className="flex gap-3 mt-1.5">
                  <p className="text-white/75 text-xs">~{estimatedKmLeft} km left · {daysUntilEmpty}d remaining</p>
                </div>
                <button onClick={() => setScreen('alerts')} className="mt-2 bg-white/25 hover:bg-white/35 text-white text-xs font-bold px-3 py-1 rounded-full transition-all">
                  View Details →
                </button>
              </div>
              <button onClick={() => setReminderDismissed(true)} className="text-white/60 hover:text-white text-lg leading-none mt-0.5">×</button>
            </div>
          )}

          {/* ── Document Expiry Alert Banner ────────────────────────────── */}
          {hasCritical && (
            <button onClick={() => setScreen('alerts')} className="w-full bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-2xl p-4 mb-3 flex items-center gap-3 hover:border-red-400 transition-all shadow-sm text-left">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl">⚠️</span>
              </div>
              <div className="flex-1">
                <p className="font-black text-red-700 text-sm">{criticalAlerts.length} Document{criticalAlerts.length > 1 ? 's' : ''} Expiring Soon!</p>
                <p className="text-red-500 text-xs mt-0.5">{criticalAlerts.map(a => a.label).join(' · ')}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-red-400 flex-shrink-0" />
            </button>
          )}

          {/* Quick doc access banner */}
          {docsUploaded < 4 && (
            <button onClick={() => setScreen('documents')} className="w-full bg-indigo-50 border-2 border-indigo-200 border-dashed rounded-2xl p-3 mb-4 flex items-center gap-3 hover:bg-indigo-100 transition-all">
              <div className="text-2xl">📄</div>
              <div className="text-left flex-1">
                <p className="text-indigo-800 font-bold text-sm">Upload Your Documents</p>
                <p className="text-indigo-600 text-xs">{docsUploaded}/4 uploaded · Driving licence, RC, Insurance, PUC</p>
              </div>
              <ChevronRight className="w-4 h-4 text-indigo-400" />
            </button>
          )}
          {docsUploaded === 4 && (
            <button onClick={() => setScreen('documents')} className="w-full bg-green-50 border border-green-200 rounded-2xl p-3 mb-4 flex items-center gap-3 hover:bg-green-100 transition-all">
              <div className="text-2xl">✅</div>
              <div className="text-left flex-1">
                <p className="text-green-800 font-bold text-sm">All Documents Uploaded</p>
                <p className="text-green-600 text-xs">Quick access available in emergencies</p>
              </div>
              <ChevronRight className="w-4 h-4 text-green-400" />
            </button>
          )}

          <h2 className="font-black text-gray-800 mb-3 text-base">Available Fuels & Fluids</h2>
          <div className="space-y-3">
            {fuelTypes.map(fuel => (
              <div key={fuel.id} className="bg-white rounded-2xl overflow-hidden shadow-md">
                <div className={`bg-gradient-to-r ${fuel.color} p-4 text-white`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-base">{fuel.name}</p>
                      <p className="text-xs opacity-80">{fuel.desc}</p>
                      <p className="text-2xl font-black mt-1">₹{fuel.price}<span className="text-sm font-normal opacity-80">/{fuel.unit}</span></p>
                    </div>
                    <div className="text-4xl">{fuel.icon}</div>
                  </div>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <p className="text-xs text-gray-500">⏱️ ~15 min delivery</p>
                  <button onClick={() => addToCart(fuel)} className="bg-blue-600 text-white px-5 py-2 rounded-full font-bold text-sm hover:bg-blue-700 transition-all shadow">
                    + Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {cart.length > 0 && (
          <button onClick={() => setScreen('cart')} className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 hover:shadow-3xl transition-all">
            🛒 <span>{cart.length} items</span> <span className="opacity-70">•</span> <span>₹{getTotal()}</span>
          </button>
        )}
        <BottomNav activeScreen={screen} onNavigate={setScreen} hasCritical={hasCritical} fuelUrgency={fuelUrgency} reminderDismissed={reminderDismissed} />
      </div>
    );
  }

  if (screen === 'cart') {
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gray-50">
        <div className="bg-white sticky top-0 z-10 shadow-sm p-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <button onClick={() => setScreen('home')} className="text-blue-600"><ArrowLeft className="w-6 h-6" /></button>
            <h1 className="font-black text-lg">Your Cart</h1>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{cart.length} items</span>
          </div>
        </div>
        <div className="p-4 max-w-md mx-auto pb-36">
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="bg-white rounded-2xl p-4 shadow-md">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{item.icon}</span>
                      <div>
                        <h3 className="font-black text-sm">{item.name}</h3>
                        <p className="text-xs text-gray-500">₹{item.price}/{item.unit}</p>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-full shadow text-sm font-bold">−</button>
                      <span className="w-6 text-center font-black text-sm">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-full shadow text-sm font-bold">+</button>
                    </div>
                    <div className="font-black text-blue-600">₹{item.price * item.qty}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 max-w-md mx-auto">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-600 text-sm">Total Amount</span>
              <span className="font-black text-xl text-blue-600">₹{getTotal()}</span>
            </div>
            <button onClick={() => { setPaymentStep('method'); setScreen('checkout'); }}
              className="w-full bg-blue-600 text-white p-4 rounded-xl font-black hover:bg-blue-700 shadow-lg">
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>
    );
  }

  if (screen === 'checkout') {
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gray-50">
        <div className="bg-white sticky top-0 z-10 shadow-sm p-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <button onClick={() => paymentStep === 'method' ? setScreen('cart') : setPaymentStep('method')} className="text-blue-600"><ArrowLeft className="w-6 h-6" /></button>
            <h1 className="font-black text-lg">{paymentStep === 'method' ? 'Payment Method' : paymentStep === 'upi' ? 'UPI Apps' : 'Card Payment'}</h1>
          </div>
        </div>
        <div className="p-4 max-w-md mx-auto">
          <div className="bg-blue-50 rounded-2xl p-3 mb-4 flex justify-between items-center">
            <span className="text-gray-600 text-sm">Order Total</span>
            <span className="font-black text-blue-600">₹{getTotal()}</span>
          </div>

          {paymentStep === 'method' && (
            <div className="space-y-3">
              {[
                { label: 'UPI', sublabel: 'Google Pay, PhonePe, Paytm', icon: '📱', action: () => setPaymentStep('upi') },
                { label: 'Credit/Debit Card', sublabel: 'Visa, Mastercard, RuPay', icon: '💳', action: () => setPaymentStep('card') },
                { label: 'Cash on Delivery', sublabel: 'Pay at delivery', icon: '💵', action: () => setScreen('tracking') },
              ].map((m, i) => (
                <button key={i} onClick={m.action} className="w-full p-4 rounded-2xl border-2 border-gray-200 bg-white text-left hover:border-blue-600 hover:bg-blue-50 transition-all flex items-center gap-4">
                  <span className="text-3xl">{m.icon}</span>
                  <div className="flex-1">
                    <p className="font-black text-sm">{m.label}</p>
                    <p className="text-xs text-gray-500">{m.sublabel}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}

          {paymentStep === 'upi' && (
            <div className="space-y-3">
              {[
                { name: 'Google Pay', icon: '🔵', color: 'from-blue-500 to-blue-600' },
                { name: 'PhonePe', icon: '📱', color: 'from-purple-500 to-purple-700' },
                { name: 'Paytm', icon: '🟦', color: 'from-sky-500 to-cyan-600' },
                { name: 'BHIM UPI', icon: '🟥', color: 'from-red-500 to-red-600' },
              ].map(app => (
                <button key={app.name} onClick={() => { alert(`✅ Redirecting to ${app.name}...`); setScreen('tracking'); }}
                  className={`w-full p-4 rounded-2xl shadow text-white bg-gradient-to-r ${app.color} flex items-center gap-4 hover:shadow-lg transition-all`}>
                  <span className="text-3xl">{app.icon}</span>
                  <div className="text-left">
                    <p className="font-black">{app.name}</p>
                    <p className="text-xs opacity-80">Instant & Secure</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {paymentStep === 'card' && (
            <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
              <input type="text" placeholder="Card Number" maxLength="19" value={cardData.number} onChange={(e) => setCardData({...cardData, number: e.target.value})} className="w-full border-2 p-3 rounded-xl focus:outline-none focus:border-blue-600 font-mono text-sm" />
              <input type="text" placeholder="Cardholder Name" value={cardData.name} onChange={(e) => setCardData({...cardData, name: e.target.value})} className="w-full border-2 p-3 rounded-xl focus:outline-none focus:border-blue-600 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="MM/YY" maxLength="5" value={cardData.expiry} onChange={(e) => setCardData({...cardData, expiry: e.target.value})} className="border-2 p-3 rounded-xl focus:outline-none focus:border-blue-600 font-mono text-sm" />
                <input type="text" placeholder="CVV" maxLength="3" value={cardData.cvv} onChange={(e) => setCardData({...cardData, cvv: e.target.value})} className="border-2 p-3 rounded-xl focus:outline-none focus:border-blue-600 font-mono text-sm" />
              </div>
              <button onClick={() => { if (cardData.number && cardData.name && cardData.expiry && cardData.cvv) { alert('✅ Payment processing...'); setScreen('tracking'); } else alert('Please fill all fields'); }}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl font-black hover:shadow-lg transition-all">
                Pay ₹{getTotal()} Securely
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'tracking') {
    const orderItems = cart.map(i => `${i.qty}×${i.name}`).join(', ') || 'Petrol 5L';
    const vInfo = vehicleInfo || { make: 'Your', model: 'Vehicle', number: '—', fuelType: 'Petrol' };
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 pb-8">
          <div className="max-w-md mx-auto">
            <button onClick={() => setScreen('home')} className="text-white mb-3 flex items-center gap-1 text-sm"><ArrowLeft className="w-4 h-4" /> Home</button>
            <h1 className="font-black text-xl">🚗 Fuel On The Way!</h1>
            <p className="text-blue-200 text-sm mt-0.5">Order #FD-2024-{Math.floor(Math.random() * 90000) + 10000}</p>
          </div>
        </div>

        <div className="p-4 max-w-md mx-auto -mt-4 space-y-3 pb-20">
          {/* Delivery agent card */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="bg-blue-50 px-4 py-2 border-b">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Delivery Agent</p>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center text-3xl">👨</div>
                <div className="flex-1">
                  <p className="font-black text-base">Rajesh Kumar</p>
                  <p className="text-xs text-gray-500">⭐ 4.8 · 320 deliveries</p>
                </div>
                <button onClick={() => alert('📞 Calling +91 98765 43210...')} className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow hover:bg-green-600">📞 Call</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: '📞 Phone', value: '+91 98765 43210' },
                  { label: '🚗 Vehicle No.', value: 'KA-01-AB-1234' },
                  { label: '📍 From', value: 'BTM Fuel Station, 2nd Stage, Bangalore' },
                  { label: '📍 Delivering To', value: address },
                ].map((row, i) => (
                  <div key={i} className={`bg-gray-50 rounded-xl p-3 ${i >= 2 ? 'col-span-2' : ''}`}>
                    <p className="text-xs text-gray-500 mb-0.5">{row.label}</p>
                    <p className="font-bold text-xs text-gray-800">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-white rounded-2xl shadow-md p-4">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">📦 Order Summary</p>
            <p className="text-sm font-bold text-gray-800">{orderItems}</p>
            <div className="flex justify-between mt-2 pt-2 border-t">
              <span className="text-xs text-gray-500">Total Paid</span>
              <span className="font-black text-blue-600">₹{getTotal() || 550}</span>
            </div>
          </div>

          {/* ETA card */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl shadow-md p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Estimated Arrival</p>
                <p className="text-4xl font-black">18 mins</p>
                <p className="text-orange-100 text-xs mt-1">Live tracking active 🟢</p>
              </div>
              <Clock className="w-14 h-14 opacity-70" />
            </div>
          </div>

          {/* Progress steps */}
          <div className="bg-white rounded-2xl shadow-md p-4">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-3">Delivery Progress</p>
            {[
              { label: 'Order Confirmed', done: true },
              { label: 'Fuel Being Loaded', done: true },
              { label: 'Agent On the Way', done: true, active: true },
              { label: 'Delivered', done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {step.done ? '✓' : i + 1}
                </div>
                <p className={`text-sm ${step.active ? 'font-black text-blue-600' : step.done ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{step.label}</p>
                {step.active && <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">In Progress</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'profile') {
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 pb-12">
          <div className="max-w-md mx-auto">
            <button onClick={() => setScreen('home')} className="text-white mb-4 flex items-center gap-1"><ArrowLeft className="w-5 h-5" /></button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl">👤</div>
              <div>
                <h2 className="text-2xl font-black">Rajesh Kumar</h2>
                <p className="text-blue-200 text-sm">rajesh@email.com</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 max-w-md mx-auto -mt-8 pb-36 space-y-3">
          <div className="bg-white rounded-2xl shadow-md p-4 grid grid-cols-2 gap-3">
            {[{ label: 'Total Orders', value: '15' }, { label: 'Total Spent', value: '₹16,525' }].map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="font-black text-2xl text-blue-600">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setScreen('documents')} className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:bg-gray-50 transition-all">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5 text-indigo-600" /></div>
            <div className="text-left flex-1">
              <p className="font-bold text-sm">My Documents</p>
              <p className="text-xs text-gray-500">{docsUploaded}/4 uploaded</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={() => setScreen('bunks')} className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:bg-gray-50 transition-all">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">⛽</div>
            <div className="text-left flex-1">
              <p className="font-bold text-sm">Nearby Petrol Bunks</p>
              <p className="text-xs text-gray-500">6 stations found</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={() => setScreen('garages')} className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:bg-gray-50 transition-all">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl">🔧</div>
            <div className="text-left flex-1">
              <p className="font-bold text-sm">Nearby Garages</p>
              <p className="text-xs text-gray-500">6 mechanics available</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={handleFirebaseLogout}
            className="w-full bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl font-bold hover:bg-red-100 transition-all">
            Logout
          </button>
        </div>
        <BottomNav activeScreen={screen} onNavigate={setScreen} hasCritical={hasCritical} fuelUrgency={fuelUrgency} reminderDismissed={reminderDismissed} />
      </div>
    );
  }

  // ─── NEARBY PETROL BUNKS SCREEN ───────────────────────────────────────────
  if (screen === 'bunks') {
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white p-4 pb-6">
          <div className="max-w-md mx-auto">
            <button onClick={() => setScreen('home')} className="text-white mb-3 flex items-center gap-1 text-sm"><ArrowLeft className="w-4 h-4" /> Home</button>
            <h1 className="font-black text-xl">⛽ Nearby Petrol Bunks</h1>
            <p className="text-green-100 text-sm mt-0.5">📍 Based on your location · BTM Layout</p>
          </div>
        </div>

        {/* Fake map strip */}
        <div className="bg-white border-b shadow-sm overflow-hidden relative" style={{ height: 160 }}>
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100">
            {/* Grid lines to mimic map */}
            <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
              {[0,1,2,3,4,5].map(i => <line key={`h${i}`} x1="0" y1={i*32} x2="100%" y2={i*32} stroke="#065f46" strokeWidth="1"/>)}
              {[0,1,2,3,4,5,6,7,8,9].map(i => <line key={`v${i}`} x1={i*45} y1="0" x2={i*45} y2="100%" stroke="#065f46" strokeWidth="1"/>)}
            </svg>
            {/* Road lines */}
            <div className="absolute top-1/2 left-0 right-0 h-3 bg-gray-300 opacity-60 -translate-y-1/2"></div>
            <div className="absolute left-1/3 top-0 bottom-0 w-3 bg-gray-300 opacity-60"></div>
            {/* User pin */}
            <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-full flex flex-col items-center">
              <div className="bg-blue-600 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-lg">YOU</div>
              <div className="w-3 h-3 bg-blue-600 rotate-45 -mt-1 shadow"></div>
            </div>
            {/* Bunk pins */}
            {nearbyBunks.slice(0, 5).map((b, i) => {
              const positions = [
                { top: '30%', left: '48%' }, { top: '60%', left: '55%' }, { top: '20%', left: '60%' },
                { top: '45%', left: '70%' }, { top: '70%', left: '25%' }
              ];
              return (
                <button key={b.id} onClick={() => setSelectedBunk(b.id === selectedBunk ? null : b.id)}
                  className={`absolute flex flex-col items-center cursor-pointer transition-all ${selectedBunk === b.id ? 'scale-125 z-10' : ''}`}
                  style={positions[i]}>
                  <div className={`text-xs font-black px-1.5 py-0.5 rounded-full shadow-lg border-2 border-white ${b.open ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                    {b.dist}
                  </div>
                </button>
              );
            })}
            <p className="absolute bottom-1 right-2 text-xs text-gray-400">© Map (Simulated)</p>
          </div>
        </div>

        <div className="p-4 max-w-md mx-auto space-y-3 pb-36">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">{nearbyBunks.length} Stations Found</p>
            <p className="text-xs text-green-600 font-bold">📍 Sorted by distance</p>
          </div>

          {nearbyBunks.map(bunk => (
            <div key={bunk.id}
              className={`bg-white rounded-2xl shadow-md overflow-hidden transition-all border-2 ${selectedBunk === bunk.id ? 'border-green-500' : 'border-transparent'}`}>
              {/* Header */}
              <div className={`bg-gradient-to-r ${brandColors[bunk.brand]} p-3 flex items-center gap-3`}>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">{brandLogos[bunk.brand]}</div>
                <div className="flex-1">
                  <p className="font-black text-white text-sm">{bunk.name}</p>
                  <p className="text-white/80 text-xs">{bunk.address}</p>
                </div>
                <div className={`text-xs font-black px-2 py-1 rounded-full ${bunk.open ? 'bg-green-400 text-white' : 'bg-gray-300 text-gray-700'}`}>
                  {bunk.open ? '🟢 Open' : '🔴 Closed'}
                </div>
              </div>

              {/* Info row */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-xs font-black text-gray-800">{bunk.dist}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-xs text-gray-600">{bunk.eta} drive</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-bold text-gray-800">{bunk.rating}</span>
                    <span className="text-xs text-gray-400">({bunk.reviews})</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-green-50 rounded-xl p-2 text-center">
                    <p className="text-xs text-gray-500">⛽ Petrol (92)</p>
                    <p className="font-black text-green-700 text-sm">₹{bunk.price92}/L</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2 text-center">
                    <p className="text-xs text-gray-500">🛢️ Diesel</p>
                    <p className="font-black text-blue-700 text-sm">₹{bunk.priceDiesel}/L</p>
                  </div>
                </div>

                {/* Amenities */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {bunk.amenities.map(a => (
                    <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{a}</span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${bunk.lat},${bunk.lng}`, '_blank')}
                    className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-black hover:bg-green-700 transition-all flex items-center justify-center gap-1">
                    <Navigation className="w-3.5 h-3.5" /> Get Directions
                  </button>
                  <button onClick={() => setSelectedBunk(selectedBunk === bunk.id ? null : bunk.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedBunk === bunk.id ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {selectedBunk === bunk.id ? '✓ Selected' : 'Select'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <BottomNav activeScreen={screen} onNavigate={setScreen} hasCritical={hasCritical} fuelUrgency={fuelUrgency} reminderDismissed={reminderDismissed} />
      </div>
    );
  }

  // ─── NEARBY GARAGES SCREEN ────────────────────────────────────────────────
  if (screen === 'garages') {
    const filtered = garageFilter === 'all' ? nearbyGarages : nearbyGarages.filter(g => g.type === garageFilter);
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 pb-6">
          <div className="max-w-md mx-auto">
            <button onClick={() => setScreen('home')} className="text-white mb-3 flex items-center gap-1 text-sm"><ArrowLeft className="w-4 h-4" /> Home</button>
            <h1 className="font-black text-xl">🔧 Nearby Garages</h1>
            <p className="text-slate-300 text-sm mt-0.5">📍 Based on your location · BTM Layout</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="bg-white border-b shadow-sm sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: '🔍 All' },
              { key: 'multi', label: '🔧 Multi-Brand' },
              { key: 'tyre', label: '🛞 Tyre' },
              { key: 'brand', label: '🏭 Authorized' },
              { key: 'electrical', label: '⚡ Electrical' },
            ].map(f => (
              <button key={f.key} onClick={() => setGarageFilter(f.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${garageFilter === f.key ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 max-w-md mx-auto space-y-3 pb-36">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">{filtered.length} Garages Found · Sorted by Distance</p>

          {filtered.map(garage => (
            <div key={garage.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-4">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <p className="font-black text-white text-sm">{garage.name}</p>
                    <p className="text-slate-300 text-xs mt-0.5">{garage.address}</p>
                  </div>
                  <span className={`text-xs font-black px-2 py-1 rounded-full ml-2 flex-shrink-0 ${garage.open ? 'bg-green-400 text-white' : 'bg-red-400 text-white'}`}>
                    {garage.open ? '🟢 Open' : '🔴 Closed'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${garageTypeColors[garage.type]}`}>{garageTypeLabels[garage.type]}</span>
                  <span className="text-xs text-slate-300">· {garage.experience} exp</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                {/* Stats row */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-xs font-black text-gray-800">{garage.dist}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-xs text-gray-600">{garage.eta} away</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-bold">{garage.rating}</span>
                    <span className="text-xs text-gray-400">({garage.reviews})</span>
                  </div>
                </div>

                {/* Mechanic info */}
                <div className="bg-gray-50 rounded-xl p-3 mb-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-200 rounded-xl flex items-center justify-center text-xl">👨‍🔧</div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-gray-800">{garage.owner}</p>
                    <p className="text-xs text-gray-500">{garage.phone}</p>
                  </div>
                  <button onClick={() => alert(`📞 Calling ${garage.owner}...\n${garage.phone}`)}
                    className="bg-green-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-green-600 shadow">📞 Call</button>
                </div>

                {/* Availability */}
                <div className={`rounded-xl p-3 mb-3 flex items-center gap-3 ${garage.open ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="text-xl">{garage.open ? '✅' : '⏰'}</div>
                  <div>
                    <p className={`text-xs font-bold ${garage.open ? 'text-green-700' : 'text-red-700'}`}>
                      {garage.open ? `Available: ${garage.availableFrom}` : `Next Available: ${garage.availableFrom}`}
                    </p>
                    <p className="text-xs text-gray-500">Closes: {garage.closesAt}</p>
                  </div>
                </div>

                {/* Specialities */}
                <div className="mb-3">
                  <p className="text-xs text-gray-400 font-semibold mb-1.5">SPECIALITIES</p>
                  <div className="flex flex-wrap gap-1">
                    {garage.speciality.map(s => (
                      <span key={s} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium border border-slate-200">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(garage.name + ' ' + garage.address)}`, '_blank')}
                    className="flex-1 bg-slate-700 text-white py-2.5 rounded-xl text-sm font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-1">
                    <Navigation className="w-3.5 h-3.5" /> Directions
                  </button>
                  <button onClick={() => alert(`📞 Booking appointment with ${garage.name}...\nCall ${garage.phone}`)}
                    className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-black hover:bg-orange-600 transition-all">
                    📅 Book Slot
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <BottomNav activeScreen={screen} onNavigate={setScreen} hasCritical={hasCritical} fuelUrgency={fuelUrgency} reminderDismissed={reminderDismissed} />
      </div>
    );
  }

  // ─── SHOWROOM BOOKING SCREEN ──────────────────────────────────────────────
  if (screen === 'showrooms') {
    const brandTypes = ['all', 'maruti', 'hyundai', 'honda', 'tata', 'toyota', 'mahindra'];
    const brandLabels = { all: '🔍 All', maruti: '🔵 Maruti', hyundai: '⚫ Hyundai', honda: '🔴 Honda', tata: '🟣 Tata', toyota: '🔶 Toyota', mahindra: '🟤 Mahindra' };
    const filtered = showroomFilter === 'all' ? nearbyShowrooms : nearbyShowrooms.filter(s => s.type === showroomFilter);

    // Booking form sub-screen
    if (bookingShowroom) {
      const sw = nearbyShowrooms.find(s => s.id === bookingShowroom);
      const today = new Date();
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today); d.setDate(today.getDate() + i + 1);
        return { label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), value: d.toISOString().split('T')[0] };
      });

      if (bookingConfirmed) {
        return (
          <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center text-white">
                <div className="text-6xl mb-3 animate-bounce">✅</div>
                <h1 className="text-2xl font-black">Booking Confirmed!</h1>
                <p className="text-green-100 text-sm mt-1">Your service appointment is set</p>
              </div>
              <div className="p-6 space-y-3">
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  {[
                    { icon: '🏢', label: 'Showroom', value: sw.name },
                    { icon: '🔧', label: 'Service', value: bookingForm.service },
                    { icon: '📅', label: 'Date', value: bookingForm.date },
                    { icon: '🕐', label: 'Time', value: bookingForm.time },
                    { icon: '👤', label: 'Name', value: bookingForm.name },
                    { icon: '📞', label: 'Phone', value: bookingForm.phone },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xl w-8">{row.icon}</span>
                      <div>
                        <p className="text-xs text-gray-400">{row.label}</p>
                        <p className="font-bold text-sm text-gray-800">{row.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700">⚠️ Please arrive 10 mins early. Carry your RC Book & Insurance documents.</p>
                </div>
                <button onClick={() => { setBookingConfirmed(false); setBookingShowroom(null); setBookingForm({ service: '', date: '', time: '', name: '', phone: '' }); setScreen('showrooms'); }}
                  className="w-full bg-purple-600 text-white p-4 rounded-xl font-black hover:bg-purple-700">
                  Back to Showrooms
                </button>
                <button onClick={() => setScreen('home')} className="w-full bg-gray-100 text-gray-700 p-3 rounded-xl font-bold">Go to Home</button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gray-50">
          <div className={`bg-gradient-to-r ${sw.brandColor} text-white p-4 pb-8`}>
            <div className="max-w-md mx-auto">
              <button onClick={() => setBookingShowroom(null)} className="text-white mb-3 flex items-center gap-1 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">{sw.logo}</div>
                <div>
                  <h1 className="font-black text-lg leading-tight">{sw.name}</h1>
                  <p className="text-white/80 text-xs">{sw.address}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 max-w-md mx-auto -mt-4 space-y-4 pb-8">
            {/* Service select */}
            <div className="bg-white rounded-2xl shadow-md p-4">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">1. Choose Service *</p>
              <div className="grid grid-cols-2 gap-2">
                {sw.services.map(svc => (
                  <button key={svc} onClick={() => setBookingForm({ ...bookingForm, service: svc })}
                    className={`p-2.5 rounded-xl text-xs font-bold border-2 text-left transition-all ${bookingForm.service === svc ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {bookingForm.service === svc ? '✓ ' : ''}{svc}
                  </button>
                ))}
              </div>
            </div>

            {/* Date select */}
            <div className="bg-white rounded-2xl shadow-md p-4">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">2. Choose Date *</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {dates.map(d => (
                  <button key={d.value} onClick={() => setBookingForm({ ...bookingForm, date: d.label })}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${bookingForm.date === d.label ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time slot */}
            <div className="bg-white rounded-2xl shadow-md p-4">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">3. Choose Time Slot *</p>
              <div className="grid grid-cols-4 gap-2">
                {sw.slots.map(slot => (
                  <button key={slot} onClick={() => setBookingForm({ ...bookingForm, time: slot })}
                    className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${bookingForm.time === slot ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-2xl shadow-md p-4 space-y-3">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide">4. Your Details *</p>
              <input type="text" placeholder="Full Name" value={bookingForm.name}
                onChange={e => setBookingForm({ ...bookingForm, name: e.target.value })}
                className="w-full border-2 p-3 rounded-xl focus:outline-none focus:border-purple-600 text-sm" />
              <input type="tel" placeholder="+91 Phone Number" value={bookingForm.phone}
                onChange={e => setBookingForm({ ...bookingForm, phone: e.target.value })}
                className="w-full border-2 p-3 rounded-xl focus:outline-none focus:border-purple-600 text-sm" />
            </div>

            <button onClick={() => {
              if (!bookingForm.service || !bookingForm.date || !bookingForm.time || !bookingForm.name || !bookingForm.phone)
                return alert('Please fill all required fields');
              setBookingConfirmed(true);
            }} className="w-full bg-gradient-to-r from-purple-600 to-violet-700 text-white p-4 rounded-xl font-black shadow-lg hover:shadow-xl transition-all">
              ✅ Confirm Booking
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white p-4 pb-6">
          <div className="max-w-md mx-auto">
            <button onClick={() => setScreen('home')} className="text-white mb-3 flex items-center gap-1 text-sm"><ArrowLeft className="w-4 h-4" /> Home</button>
            <h1 className="font-black text-xl">🏢 Nearby Showrooms</h1>
            <p className="text-purple-200 text-sm mt-0.5">Book vehicle service appointments instantly</p>
          </div>
        </div>

        {/* Brand filter */}
        <div className="bg-white border-b shadow-sm sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-2 flex gap-2 overflow-x-auto">
            {brandTypes.map(b => (
              <button key={b} onClick={() => setShowroomFilter(b)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${showroomFilter === b ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {brandLabels[b]}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 max-w-md mx-auto space-y-3 pb-36">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">{filtered.length} Showrooms · Sorted by Distance</p>
          {filtered.map(sw => (
            <div key={sw.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className={`bg-gradient-to-r ${sw.brandColor} p-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-2xl">{sw.logo}</div>
                    <div>
                      <p className="font-black text-white text-sm leading-tight">{sw.name}</p>
                      <p className="text-white/75 text-xs">{sw.address}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-2 py-1 rounded-full flex-shrink-0 ml-2 ${sw.open ? 'bg-green-400 text-white' : 'bg-red-400 text-white'}`}>
                    {sw.open ? '🟢 Open' : '🔴 Closed'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1"><Navigation className="w-3.5 h-3.5 text-purple-600" /><span className="text-xs font-black text-gray-800">{sw.dist}</span></div>
                  <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs text-gray-500">{sw.openTime}</span></div>
                  <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /><span className="text-xs font-bold">{sw.rating}</span><span className="text-xs text-gray-400">({sw.reviews})</span></div>
                </div>

                {/* Services preview */}
                <div className="mb-3">
                  <p className="text-xs text-gray-400 font-semibold mb-1.5">AVAILABLE SERVICES</p>
                  <div className="flex flex-wrap gap-1">
                    {sw.services.slice(0, 4).map(s => (
                      <span key={s} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100 font-medium">{s}</span>
                    ))}
                    {sw.services.length > 4 && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">+{sw.services.length - 4} more</span>}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => alert(`📞 Calling ${sw.name}...\n${sw.phone}`)}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200">📞 Call</button>
                  <button onClick={() => { setBookingShowroom(sw.id); setBookingForm({ service: '', date: '', time: '', name: vehicleInfo ? 'Rajesh Kumar' : '', phone: '' }); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all shadow ${sw.open ? 'bg-gradient-to-r from-purple-600 to-violet-700 text-white hover:shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    disabled={!sw.open}>
                    {sw.open ? '📅 Book Service' : 'Currently Closed'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <BottomNav activeScreen={screen} onNavigate={setScreen} hasCritical={hasCritical} fuelUrgency={fuelUrgency} reminderDismissed={reminderDismissed} />
      </div>
    );
  }

  // ─── LIVE FUEL PRICE TRACKER SCREEN ──────────────────────────────────────
  if (screen === 'fuelprices') {
    const prices = currentFuelPrices;
    const trendIcon = (val) => val > 0 ? '🔺' : val < 0 ? '🔻' : '➡️';
    const trendColor = (val) => val > 0 ? 'text-red-500' : val < 0 ? 'text-green-600' : 'text-gray-400';
    const trendLabel = (val) => val === 0 ? 'No change' : `${val > 0 ? '+' : ''}₹${Math.abs(val).toFixed(2)} today`;

    // 7-day mock history for chart bars
    const history7 = [101.85, 102.10, 103.00, 102.75, 103.20, 103.30, prices.petrol92];
    const maxH = Math.max(...history7);
    const minH = Math.min(...history7);

    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-orange-500 to-rose-600 text-white p-4 pb-8">
          <div className="max-w-md mx-auto">
            <button onClick={() => setScreen('home')} className="text-white mb-3 flex items-center gap-1 text-sm"><ArrowLeft className="w-4 h-4" /> Home</button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-black text-xl">📊 Live Fuel Prices</h1>
                <p className="text-orange-100 text-sm mt-0.5">🕐 Last updated: {fuelPriceLastUpdated}</p>
              </div>
              <div className="bg-white/20 rounded-xl px-3 py-1 text-xs font-bold">🟢 Live</div>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-md mx-auto -mt-4 space-y-4 pb-36">
          {/* City selector */}
          <div className="bg-white rounded-2xl shadow-md p-4">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">📍 Select City</p>
            <div className="flex flex-wrap gap-2">
              {cities.map(city => (
                <button key={city} onClick={() => setFuelPriceCity(city)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${fuelPriceCity === city ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* Price cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Petrol (92 Oct)', icon: '⛽', price: prices.petrol92, trend: prices.trend.petrol92, bg: 'from-green-500 to-emerald-600' },
              { label: 'Petrol (95 Oct)', icon: '💎', price: prices.petrol95, trend: prices.trend.petrol95, bg: 'from-teal-500 to-teal-700' },
              { label: 'Diesel', icon: '🛢️', price: prices.diesel, trend: prices.trend.diesel, bg: 'from-blue-500 to-blue-700' },
              { label: 'CNG', icon: '🟢', price: prices.cng, trend: prices.trend.cng, bg: 'from-lime-500 to-lime-700' },
            ].map((item, i) => (
              <div key={i} className={`bg-gradient-to-br ${item.bg} text-white rounded-2xl p-4 shadow-md`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">/Litre</span>
                </div>
                <p className="text-2xl font-black">{item.price > 0 ? `₹${item.price.toFixed(2)}` : 'N/A'}</p>
                <p className="text-white/80 text-xs mt-0.5 leading-tight">{item.label}</p>
                {item.price > 0 && (
                  <div className="mt-2 bg-white/15 rounded-lg px-2 py-1 flex items-center gap-1">
                    <span className="text-xs">{trendIcon(item.trend)}</span>
                    <span className={`text-xs font-bold text-white`}>{trendLabel(item.trend)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 7-day trend chart for Petrol 92 */}
          <div className="bg-white rounded-2xl shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-black text-gray-800 text-sm">⛽ Petrol 92 – 7-Day Trend</p>
                <p className="text-xs text-gray-400">{fuelPriceCity} · Price per litre</p>
              </div>
              <div className="text-right">
                <p className="font-black text-orange-600 text-lg">₹{prices.petrol92.toFixed(2)}</p>
                <p className={`text-xs font-bold ${trendColor(prices.trend.petrol92)}`}>{trendIcon(prices.trend.petrol92)} {trendLabel(prices.trend.petrol92)}</p>
              </div>
            </div>
            {/* Bar chart */}
            <div className="flex items-end gap-1.5 h-24">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'].map((day, i) => {
                const val = history7[i];
                const pct = maxH === minH ? 70 : ((val - minH) / (maxH - minH)) * 70 + 30;
                const isToday = i === 6;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-xs font-black text-orange-600" style={{ fontSize: 9 }}>₹{val.toFixed(0)}</p>
                    <div className={`w-full rounded-t-lg transition-all ${isToday ? 'bg-orange-500' : 'bg-orange-200'}`} style={{ height: `${pct}%` }}></div>
                    <p className="text-gray-400 font-medium" style={{ fontSize: 9 }}>{day}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Diesel 7-day trend */}
          <div className="bg-white rounded-2xl shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-black text-gray-800 text-sm">🛢️ Diesel – 7-Day Trend</p>
                <p className="text-xs text-gray-400">{fuelPriceCity} · Price per litre</p>
              </div>
              <div className="text-right">
                <p className="font-black text-blue-600 text-lg">₹{prices.diesel.toFixed(2)}</p>
                <p className={`text-xs font-bold ${trendColor(prices.trend.diesel)}`}>{trendIcon(prices.trend.diesel)} {trendLabel(prices.trend.diesel)}</p>
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-20">
              {[88.90, 89.10, 89.30, 89.50, 89.55, 89.60, prices.diesel].map((val, i) => {
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
                const allVals = [88.90, 89.10, 89.30, 89.50, 89.55, 89.60, prices.diesel];
                const mx = Math.max(...allVals), mn = Math.min(...allVals);
                const pct = mx === mn ? 70 : ((val - mn) / (mx - mn)) * 60 + 30;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-xs font-black text-blue-600" style={{ fontSize: 9 }}>₹{val.toFixed(0)}</p>
                    <div className={`w-full rounded-t-lg ${i === 6 ? 'bg-blue-500' : 'bg-blue-200'}`} style={{ height: `${pct}%` }}></div>
                    <p className="text-gray-400 font-medium" style={{ fontSize: 9 }}>{days[i]}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* City comparison table */}
          <div className="bg-white rounded-2xl shadow-md p-4">
            <p className="font-black text-gray-800 text-sm mb-3">🗺️ City-wise Comparison</p>
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-xs text-gray-400 font-bold uppercase tracking-wide pb-1 border-b">
                <span>City</span><span className="text-center">Petrol 92</span><span className="text-center">Diesel</span><span className="text-center">CNG</span>
              </div>
              {cities.map(city => {
                const p = fuelPriceData[city];
                const isSelected = city === fuelPriceCity;
                return (
                  <button key={city} onClick={() => setFuelPriceCity(city)}
                    className={`w-full grid grid-cols-4 gap-2 text-xs py-2 px-2 rounded-xl transition-all ${isSelected ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'}`}>
                    <span className={`text-left font-bold ${isSelected ? 'text-orange-700' : 'text-gray-700'}`}>{city}</span>
                    <span className={`text-center font-bold ${isSelected ? 'text-orange-600' : 'text-gray-600'}`}>₹{p.petrol92.toFixed(2)}</span>
                    <span className={`text-center font-bold ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>₹{p.diesel.toFixed(2)}</span>
                    <span className={`text-center font-bold ${isSelected ? 'text-green-600' : 'text-gray-600'}`}>{p.cng > 0 ? `₹${p.cng.toFixed(2)}` : '—'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-bold text-amber-800 text-sm">Price Update Schedule</p>
              <p className="text-xs text-amber-700 mt-1">Fuel prices are revised daily at 6:00 AM IST by oil marketing companies (IOC, BPCL, HPCL). Prices shown are indicative and may vary slightly by pump.</p>
            </div>
          </div>
        </div>
        <BottomNav activeScreen={screen} onNavigate={setScreen} hasCritical={hasCritical} fuelUrgency={fuelUrgency} reminderDismissed={reminderDismissed} />
      </div>
    );
  }

  // ─── ALERTS SCREEN (Smart Fuel Reminder + Doc Expiry) ────────────────────
  if (screen === 'alerts') {
    const urgencyStyles = {
      critical: { bar: 'bg-red-500',   badge: 'bg-red-100 text-red-700 border-red-200',   card: 'border-red-300 bg-red-50',   label: '🔴 Critical',  days: 'text-red-600' },
      warning:  { bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-200', card: 'border-amber-300 bg-amber-50', label: '🟡 Expiring Soon', days: 'text-amber-600' },
      ok:       { bar: 'bg-green-500', badge: 'bg-green-100 text-green-700 border-green-200', card: 'border-green-200 bg-green-50', label: '🟢 Valid',     days: 'text-green-600' },
    };

    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif" }} className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4 pb-8">
          <div className="max-w-md mx-auto">
            <button onClick={() => setScreen('home')} className="text-white mb-3 flex items-center gap-1 text-sm"><ArrowLeft className="w-4 h-4" /> Home</button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-black text-xl">🔔 Smart Alerts</h1>
                <p className="text-gray-300 text-sm mt-0.5">AI reminders & document expiry</p>
              </div>
              {(criticalAlerts.length > 0 || fuelUrgency !== 'ok') && (
                <div className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full">
                  {criticalAlerts.length + (fuelUrgency !== 'ok' ? 1 : 0)} Active
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 max-w-md mx-auto -mt-4 space-y-4 pb-36">

          {/* ── SMART FUEL REMINDER CARD ────────────────────────────────── */}
          <div className={`rounded-2xl shadow-md overflow-hidden border-2 ${fuelUrgency === 'critical' ? 'border-red-400' : fuelUrgency === 'warning' ? 'border-amber-400' : 'border-green-300'}`}>
            <div className={`p-4 text-white ${fuelUrgency === 'critical' ? 'bg-gradient-to-r from-red-500 to-red-600' : fuelUrgency === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-green-500 to-emerald-600'}`}>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🤖</div>
                <div>
                  <p className="font-black text-base">AI Smart Fuel Reminder</p>
                  <p className="text-white/80 text-xs">Based on your driving history</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 space-y-3">
              {/* Prediction */}
              <div className={`rounded-xl p-3 border ${fuelUrgency === 'critical' ? 'bg-red-50 border-red-200' : fuelUrgency === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                <p className={`font-black text-sm ${fuelUrgency === 'critical' ? 'text-red-700' : fuelUrgency === 'warning' ? 'text-amber-700' : 'text-green-700'}`}>{fuelReminderMsg}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <p className="text-xs text-gray-400">Est. km remaining</p>
                    <p className="font-black text-gray-800">{estimatedKmLeft} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Days until empty</p>
                    <p className={`font-black ${fuelUrgency === 'critical' ? 'text-red-600' : fuelUrgency === 'warning' ? 'text-amber-600' : 'text-green-600'}`}>{daysUntilEmpty} day{daysUntilEmpty !== 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Fuel left</p>
                    <p className="font-black text-gray-800">{currentFuelLitres}L (~75%)</p>
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">📊 AI Analysis — Usage History</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: 'Avg Mileage', value: `${avgKmPerLitre} km/L` },
                    { label: 'Avg Daily km', value: `${avgDailyKm} km/day` },
                    { label: 'Avg Fill-up', value: `${Math.round(fuelUsageLog.reduce((s,l)=>s+l.litres,0)/fuelUsageLog.length)}L` },
                    { label: 'Refuel Freq.', value: 'Every ~4 days' },
                  ].map((s, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-xs text-gray-400">{s.label}</p>
                      <p className="font-black text-gray-800 text-sm">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Past usage bar chart */}
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Recent Refuels</p>
                <div className="space-y-1.5">
                  {fuelUsageLog.map((log, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <p className="text-xs text-gray-400 w-14 flex-shrink-0">{log.date}</p>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${(log.litres / 20) * 100}%` }}>
                          <span className="text-white text-xs font-black" style={{ fontSize: 9 }}>{log.litres}L</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 w-14 text-right">{log.km} km</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setScreen('home')} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-sm hover:bg-blue-700 shadow">
                  🛒 Order Fuel Now
                </button>
                <button onClick={() => setScreen('bunks')} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black text-sm hover:bg-green-700 shadow">
                  ⛽ Find Bunk
                </button>
              </div>
              {fuelUrgency !== 'ok' && (
                <button onClick={() => setReminderDismissed(true)} className="w-full bg-gray-100 text-gray-500 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">
                  Dismiss Reminder
                </button>
              )}
            </div>
          </div>

          {/* ── DOCUMENT EXPIRY ALERTS ──────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-black text-gray-800">📄 Document Expiry Alerts</p>
              {criticalAlerts.length > 0 && (
                <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200">
                  {criticalAlerts.length} urgent
                </span>
              )}
            </div>

            <div className="space-y-3">
              {expiryAlerts.map(alertItem => {
                const st = urgencyStyles[alertItem.urgency];
                const dismissed = alertsDismissed[alertItem.id];
                return (
                  <div key={alertItem.id} className={`rounded-2xl border-2 overflow-hidden shadow-sm ${dismissed ? 'opacity-50' : ''} ${st.card}`}>
                    {/* Urgency strip */}
                    <div className={`h-1.5 w-full ${st.bar}`}></div>

                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${alertItem.urgency === 'critical' ? 'bg-red-100' : alertItem.urgency === 'warning' ? 'bg-amber-100' : 'bg-green-100'}`}>
                          {alertItem.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-black text-sm text-gray-800">{alertItem.label}</p>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${st.badge}`}>{st.label}</span>
                          </div>
                          <p className="text-xs text-gray-500">Expires: <span className="font-bold text-gray-700">{alertItem.expiryStr}</span></p>

                          {/* Days remaining visual */}
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`text-xs font-black ${st.days}`}>
                                {alertItem.daysLeft <= 0 ? '🚨 Already Expired!' : `${alertItem.daysLeft} day${alertItem.daysLeft !== 1 ? 's' : ''} remaining`}
                              </p>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className={`h-2 rounded-full transition-all ${st.bar}`}
                                style={{ width: `${Math.min(100, Math.max(4, (180 - alertItem.daysLeft) / 180 * 100))}%` }}></div>
                            </div>
                          </div>

                          {/* Action row */}
                          {!dismissed && (
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => alertItem.urgency === 'ok' ? null : window.alert(`🔔 Redirecting to renew ${alertItem.label}...`)}
                                className={`flex-1 text-xs font-black py-2 rounded-xl transition-all ${alertItem.urgency !== 'ok' ? 'bg-red-600 text-white hover:bg-red-700 shadow' : 'bg-green-600 text-white'}`}>
                                {alertItem.urgency !== 'ok' ? `⚡ ${alertItem.actionLabel}` : '✅ Valid'}
                              </button>
                              <button onClick={() => setAlertsDismissed(prev => ({ ...prev, [alertItem.id]: true }))}
                                className="px-3 py-2 bg-gray-100 text-gray-500 text-xs rounded-xl font-medium hover:bg-gray-200">
                                Dismiss
                              </button>
                            </div>
                          )}
                          {dismissed && <p className="text-xs text-gray-400 mt-2 italic">Reminder dismissed</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tip card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-black text-blue-800 text-sm">Stay Ahead</p>
              <p className="text-xs text-blue-600 mt-1">Upload your documents in the Documents section to enable real-time expiry tracking. Renew PUC &amp; Insurance at least 7 days before expiry to avoid penalties.</p>
            </div>
          </div>
        </div>
        <BottomNav activeScreen={screen} onNavigate={setScreen} hasCritical={hasCritical} fuelUrgency={fuelUrgency} reminderDismissed={reminderDismissed} />
      </div>
    );
  }

  return null;
}