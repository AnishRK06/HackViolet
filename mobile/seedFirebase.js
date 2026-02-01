// Firebase Seed Script for Lumina App
// Run with: node seedFirebase.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyChN9Mi5SMmhOdiaYvoYE75p2NvLjGMZjo",
  authDomain: "lumina-40bfb.firebaseapp.com",
  projectId: "lumina-40bfb",
  storageBucket: "lumina-40bfb.firebasestorage.app",
  messagingSenderId: "236558238455",
  appId: "1:236558238455:web:4a07e44725f3469ac589f2",
  measurementId: "G-D8430HVC09"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============ MOCK DATA ============

const BLUE_LIGHTS = [
  { id: 1, name: 'Drillfield - North (Burruss)', latitude: 37.2290, longitude: -80.4235 },
  { id: 2, name: 'Drillfield - South (Duck Pond Path)', latitude: 37.2255, longitude: -80.4235 },
  { id: 3, name: 'Drillfield - East (War Memorial)', latitude: 37.2273, longitude: -80.4195 },
  { id: 4, name: 'Drillfield - West (McBryde)', latitude: 37.2273, longitude: -80.4265 },
  { id: 5, name: 'Squires Student Center', latitude: 37.2296, longitude: -80.4180 },
  { id: 6, name: 'Newman Library', latitude: 37.2288, longitude: -80.4194 },
  { id: 7, name: 'Torgersen Hall', latitude: 37.2297, longitude: -80.4202 },
  { id: 8, name: 'Burruss Hall', latitude: 37.2284, longitude: -80.4236 },
  { id: 9, name: 'War Memorial Hall', latitude: 37.2271, longitude: -80.4171 },
  { id: 10, name: 'Norris Hall', latitude: 37.2292, longitude: -80.4247 },
  { id: 11, name: 'Randolph Hall', latitude: 37.2299, longitude: -80.4257 },
  { id: 12, name: 'Holden Hall', latitude: 37.2305, longitude: -80.4240 },
  { id: 13, name: 'Derring Hall', latitude: 37.2295, longitude: -80.4232 },
  { id: 14, name: 'Hahn Hall', latitude: 37.2312, longitude: -80.4195 },
  { id: 15, name: 'Patton Hall', latitude: 37.2303, longitude: -80.4220 },
  { id: 16, name: 'Hancock Hall', latitude: 37.2283, longitude: -80.4265 },
  { id: 17, name: 'Davidson Hall', latitude: 37.2278, longitude: -80.4254 },
  { id: 18, name: 'Whittemore Hall', latitude: 37.2316, longitude: -80.4210 },
  { id: 19, name: 'Durham Hall', latitude: 37.2308, longitude: -80.4183 },
  { id: 20, name: 'Pamplin Hall', latitude: 37.2310, longitude: -80.4225 },
  { id: 21, name: 'Robeson Hall', latitude: 37.2278, longitude: -80.4245 },
  { id: 22, name: 'Goodwin Hall', latitude: 37.2308, longitude: -80.4208 },
  { id: 23, name: 'Ambler Johnston Hall', latitude: 37.2231, longitude: -80.4209 },
  { id: 24, name: 'Pritchard Hall', latitude: 37.2239, longitude: -80.4223 },
  { id: 25, name: "O'Shaughnessy Hall", latitude: 37.2247, longitude: -80.4228 },
  { id: 26, name: 'Slusher Hall', latitude: 37.2253, longitude: -80.4198 },
  { id: 27, name: 'Vawter Hall', latitude: 37.2260, longitude: -80.4210 },
  { id: 28, name: 'Miles Hall', latitude: 37.2248, longitude: -80.4175 },
  { id: 29, name: 'New Residence Hall East', latitude: 37.2267, longitude: -80.4157 },
  { id: 30, name: 'New Residence Hall West', latitude: 37.2273, longitude: -80.4163 },
  { id: 31, name: 'Payne Hall', latitude: 37.2255, longitude: -80.4165 },
  { id: 32, name: 'Harper Hall', latitude: 37.2285, longitude: -80.4155 },
  { id: 33, name: 'Lee Hall', latitude: 37.2297, longitude: -80.4160 },
  { id: 34, name: 'Eggleston Hall', latitude: 37.2282, longitude: -80.4167 },
  { id: 35, name: 'East Ambler Johnston', latitude: 37.2227, longitude: -80.4195 },
  { id: 36, name: 'D2 Dietrick Dining', latitude: 37.2242, longitude: -80.4214 },
  { id: 37, name: 'West End Market', latitude: 37.2229, longitude: -80.4230 },
  { id: 38, name: 'Turner Place', latitude: 37.2285, longitude: -80.4185 },
  { id: 39, name: "Owens Food Court", latitude: 37.2279, longitude: -80.4178 },
  { id: 40, name: 'Graduate Life Center', latitude: 37.2275, longitude: -80.4170 },
  { id: 41, name: 'Perry Street Lot', latitude: 37.2310, longitude: -80.4265 },
  { id: 42, name: 'Chicken Hill Lot', latitude: 37.2325, longitude: -80.4180 },
  { id: 43, name: 'Stadium Lot (Lane Stadium)', latitude: 37.2200, longitude: -80.4175 },
  { id: 44, name: 'Litton Reaves Lot', latitude: 37.2190, longitude: -80.4255 },
  { id: 45, name: 'Duck Pond Lot', latitude: 37.2245, longitude: -80.4275 },
  { id: 46, name: 'Cassell Coliseum Lot', latitude: 37.2218, longitude: -80.4200 },
  { id: 47, name: 'Lane Stadium - North', latitude: 37.2210, longitude: -80.4181 },
  { id: 48, name: 'Lane Stadium - South', latitude: 37.2185, longitude: -80.4181 },
  { id: 49, name: 'Cassell Coliseum', latitude: 37.2220, longitude: -80.4185 },
  { id: 50, name: 'Rector Field House', latitude: 37.2208, longitude: -80.4165 },
  { id: 51, name: 'McComas Hall', latitude: 37.2228, longitude: -80.4155 },
  { id: 52, name: 'Vet Med Complex', latitude: 37.2175, longitude: -80.4260 },
  { id: 53, name: 'Duck Pond', latitude: 37.2240, longitude: -80.4260 },
  { id: 54, name: 'Alumni Mall', latitude: 37.2265, longitude: -80.4205 },
  { id: 55, name: 'Henderson Hall', latitude: 37.2262, longitude: -80.4190 },
  { id: 56, name: 'McBryde Hall', latitude: 37.2283, longitude: -80.4252 },
];

const VT_LOCATIONS = [
  { name: 'Ambler Johnston Hall', latitude: 37.2230926, longitude: -80.4209309, aliases: ['aj', 'west aj', 'ambler'] },
  { name: 'Pritchard Hall', latitude: 37.22385, longitude: -80.42232, aliases: ['pritchard'] },
  { name: 'D2 (Dietrick)', latitude: 37.22417, longitude: -80.42139, aliases: ['d2', 'dietrick', 'dining'] },
  { name: 'West End Market', latitude: 37.22291, longitude: -80.42305, aliases: ['west end', 'wem'] },
  { name: 'Newman Library', latitude: 37.2288144, longitude: -80.4194466, aliases: ['library', 'newman'] },
  { name: 'Torgersen Hall', latitude: 37.2297057, longitude: -80.4201748, aliases: ['torg', 'torgersen'] },
  { name: 'McBryde Hall', latitude: 37.2283, longitude: -80.4252, aliases: ['mcbryde', 'math'] },
  { name: 'Goodwin Hall', latitude: 37.2308, longitude: -80.4208, aliases: ['goodwin', 'engineering'] },
  { name: 'Squires Student Center', latitude: 37.2295934, longitude: -80.4179647, aliases: ['squires', 'student center'] },
  { name: 'War Memorial Hall', latitude: 37.2271281, longitude: -80.4171392, aliases: ['war memorial', 'gym'] },
  { name: 'Drillfield', latitude: 37.2273, longitude: -80.4235, aliases: ['drillfield', 'drill field'] },
  { name: 'Burruss Hall', latitude: 37.2284, longitude: -80.4236, aliases: ['burruss'] },
  { name: 'Lane Stadium', latitude: 37.2200, longitude: -80.4181, aliases: ['lane', 'stadium', 'football'] },
];

const ACTIVITY_ZONES = [
  { id: 1, name: 'Washington St Corridor', latitude: 37.2240, longitude: -80.4210, radius: 80, intensity: 'high', score: 85, peakHours: [20, 21, 22, 23, 0, 1, 2], recentIncidents: 3, recentCrimes: ['Assault', 'Rape', 'Destruction of Property'] },
  { id: 2, name: 'Ag Quad / Slusher', latitude: 37.2248, longitude: -80.4206, radius: 60, intensity: 'high', score: 75, peakHours: [21, 22, 23, 0, 1], recentIncidents: 1, recentCrimes: ['Assault'] },
  { id: 3, name: 'Kent Street Area', latitude: 37.2285, longitude: -80.4160, radius: 50, intensity: 'high', score: 70, peakHours: [19, 20, 21, 22, 23], recentIncidents: 3, recentCrimes: ['Assault', 'Rape', 'Fondling'] },
  { id: 4, name: 'Drillfield', latitude: 37.2273, longitude: -80.4235, radius: 70, intensity: 'medium', score: 55, peakHours: [20, 21, 22, 23], recentIncidents: 2, recentCrimes: ['Harassment', 'Warrant Service'] },
  { id: 5, name: 'Alumni Mall', latitude: 37.2295, longitude: -80.4155, radius: 40, intensity: 'medium', score: 50, peakHours: [18, 19, 20, 21], recentIncidents: 2, recentCrimes: ['Fondling', 'Assault'] },
  { id: 6, name: 'Lane Stadium', latitude: 37.2200, longitude: -80.4181, radius: 60, intensity: 'medium', score: 45, peakHours: [19, 20, 21, 22, 23], peakDays: [5, 6], recentIncidents: 0, recentCrimes: [] },
  { id: 7, name: 'Squires Area', latitude: 37.2296, longitude: -80.4180, radius: 35, intensity: 'low', score: 30, peakHours: [21, 22, 23], recentIncidents: 1, recentCrimes: ['Assault', 'Disorderly Conduct'] },
];

const MOCK_INCIDENTS = [
  { id: 1, type: 'harassment', title: 'Assault and Battery - Simple', location: 'Hoge Hall, 570 Washington St SW', description: 'Simple assault and battery incident reported. Occurred between 10/01/2025 - 10/31/2025.', isVTPD: true, verifications: 0, createdAt: new Date('2026-01-26') },
  { id: 2, type: 'threat', title: 'Sex Offense - Rape / Sexual Battery', location: 'East Ambler Johnston Hall, 700 Washington St SW', description: 'Report of rape, sexual battery, and object sexual penetration. VTPD investigating.', isVTPD: true, verifications: 0, createdAt: new Date('2026-01-24') },
  { id: 3, type: 'threat', title: 'Sex Offense - Rape / Abduction', location: 'Pritchard Hall, 630 Washington St SW', description: 'Report of rape, sexual battery, abduction and kidnapping. VTPD investigating.', isVTPD: true, verifications: 0, createdAt: new Date('2026-01-23') },
  { id: 4, type: 'theft', title: 'Burglary', location: "O'Shaughnessy Hall, 530 Washington St SW", description: 'Burglary reported. Occurred between 12/16/2025 - 01/18/2026.', isVTPD: true, verifications: 0, createdAt: new Date('2026-01-21') },
  { id: 5, type: 'threat', title: 'Aggravated Assault - Strangulation', location: 'Dietrick Hall, 285 Ag Quad Lane', description: 'Aggravated assault involving strangulation reported. Incident occurred 11/05/2025.', isVTPD: true, verifications: 0, createdAt: new Date('2026-01-21') },
  { id: 6, type: 'harassment', title: 'Threatening Language Over Public Airway', location: 'Public Safety Building, 330 Sterrett Dr', description: 'Profane and threatening language transmitted over public airway. Occurred 01/03/2026.', isVTPD: true, verifications: 0, createdAt: new Date('2026-01-10') },
];

const WALKING_GROUPS = [
  { id: 1, name: 'Wolfpack Group', startLocation: 'Squires Student Center', startCoords: { latitude: 37.2295934, longitude: -80.4179647 }, destination: 'Ambler Johnston Hall', destCoords: { latitude: 37.2230926, longitude: -80.4209309 }, departureMinutes: 120, createdAt: new Date(), members: [{ id: 'user1', name: 'Alex H.', isReady: true, isCreator: true }, { id: 'user2', name: 'Jordan M.', isReady: true, isCreator: false }, { id: 'user3', name: 'Sam K.', isReady: false, isCreator: false }] },
  { id: 2, name: 'Night Owls', startLocation: 'Newman Library', startCoords: { latitude: 37.2288144, longitude: -80.4194466 }, destination: 'D2 (Dietrick)', destCoords: { latitude: 37.22417, longitude: -80.42139 }, departureMinutes: 120, createdAt: new Date(), members: [{ id: 'user4', name: 'Taylor B.', isReady: true, isCreator: true }, { id: 'user5', name: 'Casey L.', isReady: true, isCreator: false }] },
  { id: 3, name: 'Library Squad', startLocation: 'Torgersen Hall', startCoords: { latitude: 37.2297057, longitude: -80.4201748 }, destination: 'Newman Library', destCoords: { latitude: 37.2288144, longitude: -80.4194466 }, departureMinutes: 120, createdAt: new Date(), members: [{ id: 'user9', name: 'Jamie R.', isReady: true, isCreator: true }, { id: 'user10', name: 'Drew T.', isReady: true, isCreator: false }] },
  { id: 4, name: 'Drillfield Walkers', startLocation: 'Burruss Hall', startCoords: { latitude: 37.2284, longitude: -80.4236 }, destination: 'War Memorial Hall', destCoords: { latitude: 37.2271281, longitude: -80.4171392 }, departureMinutes: 120, createdAt: new Date(), members: [{ id: 'user11', name: 'Chris M.', isReady: true, isCreator: true }, { id: 'user12', name: 'Pat L.', isReady: false, isCreator: false }] },
];

// ============ SEED FUNCTIONS ============

async function seedCollection(collectionName, data, useCustomId = false) {
  console.log(`\nSeeding ${collectionName}...`);

  for (const item of data) {
    try {
      const docData = { ...item };

      // Convert Date objects to Firestore Timestamps
      if (docData.createdAt instanceof Date) {
        docData.createdAt = Timestamp.fromDate(docData.createdAt);
      }

      // Use custom ID or let Firestore generate one
      const docId = useCustomId ? String(item.id) : undefined;
      const docRef = docId
        ? doc(db, collectionName, docId)
        : doc(collection(db, collectionName));

      await setDoc(docRef, docData);
      console.log(`  + Added: ${item.name || item.title || docRef.id}`);
    } catch (error) {
      console.error(`  ! Error adding ${item.name || item.title}:`, error.message);
    }
  }

  console.log(`Completed ${collectionName}: ${data.length} documents`);
}

async function seedDatabase() {
  console.log('========================================');
  console.log('  Lumina Firebase Seed Script');
  console.log('========================================');
  console.log(`\nProject: lumina-40bfb`);
  console.log(`Starting seed at ${new Date().toISOString()}\n`);

  try {
    // Seed all collections
    await seedCollection('blueLights', BLUE_LIGHTS, true);
    await seedCollection('vtLocations', VT_LOCATIONS, false);
    await seedCollection('activityZones', ACTIVITY_ZONES, true);
    await seedCollection('incidents', MOCK_INCIDENTS, true);
    await seedCollection('walkingGroups', WALKING_GROUPS, true);

    console.log('\n========================================');
    console.log('  Seed Complete!');
    console.log('========================================');
    console.log('\nCollections created:');
    console.log('  - blueLights (56 documents)');
    console.log('  - vtLocations (13 documents)');
    console.log('  - activityZones (7 documents)');
    console.log('  - incidents (6 documents)');
    console.log('  - walkingGroups (4 documents)');
    console.log('\nTotal: 86 documents');
    console.log('\nCheck Firebase Console: https://console.firebase.google.com/project/lumina-40bfb/firestore');

  } catch (error) {
    console.error('\nSeed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seed
seedDatabase();
