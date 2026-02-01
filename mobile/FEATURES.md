# Lumina - VT Campus Safety App
## Feature Report

**Version:** 1.0
**Platform:** React Native / Expo
**Target:** Virginia Tech Campus

---

## Overview

Lumina is a comprehensive campus safety application designed for Virginia Tech students. The app provides real-time navigation, emergency assistance, and community-based safety features to help students travel safely across campus, especially during nighttime hours.

---

## Core Features

### 1. Home Screen Dashboard

| Feature | Description |
|---------|-------------|
| **Campus Status Indicator** | Real-time safety status display showing current campus conditions with timestamp |
| **Quick Actions** | Three-button quick access to: Find Blue Light, Join Group, Emergency Contacts |
| **Nearby Safety Card** | Shows nearest Blue Light station with distance and directions |
| **Active Walking Groups** | Displays active walking groups near user with member count and destination |
| **Notification Bell** | Access to safety alerts and updates |

---

### 2. Interactive Campus Map

| Feature | Description |
|---------|-------------|
| **Dark Theme Map** | Custom dark-styled map optimized for nighttime viewing |
| **Blue Light Station Markers** | 5 verified Blue Light emergency stations with interactive callouts |
| **Walking Group Markers** | Real-time display of active walking groups on map |
| **Activity/Risk Zones** | Color-coded circular zones showing risk levels (High/Medium/Low) |
| **Zone Toggle** | Button to show/hide activity zones |
| **Map Legend** | Visual guide explaining marker and zone colors |
| **User Location** | Shows user's current position on map |

**Blue Light Stations:**
- Squires Student Center
- War Memorial Hall
- Newman Library
- Torgersen Hall
- Burruss Hall

---

### 3. Safe Route Planning

| Feature | Description |
|---------|-------------|
| **Start/End Location Selection** | Tap-to-select interface for choosing route endpoints |
| **"Use My Location" Option** | GPS-based current location as starting point |
| **VT Campus Presets** | 13 pre-configured campus locations with verified coordinates |
| **Address Autocomplete** | Real-time search with Geoapify API integration |
| **Smart Location Matching** | Fuzzy matching with aliases (e.g., "West AJ" matches "Ambler Johnston Hall") |
| **Route Visualization** | Green polyline showing safe walking path |
| **Route Info Display** | Shows total distance and estimated walking time |

**Preset Campus Locations:**
- Ambler Johnston Hall (West AJ)
- Pritchard Hall
- D2 (Dietrick)
- West End Market
- Newman Library
- Torgersen Hall
- McBryde Hall
- Goodwin Hall
- Squires Student Center
- War Memorial Hall
- Drillfield
- Burruss Hall
- Lane Stadium

---

### 4. Live Turn-by-Turn Navigation

| Feature | Description |
|---------|-------------|
| **Live GPS Tracking** | Real-time location updates every 1 second or 3 meters |
| **Auto-Advance Steps** | Automatically advances to next instruction when within 15m of waypoint |
| **Distance to Next Turn** | Live countdown showing meters to next navigation point |
| **3D Map View** | Tilted 60° pitch with heading-based rotation during navigation |
| **Step-by-Step Instructions** | Clear text directions from Geoapify API |
| **Progress Indicator** | Visual dots showing completed and upcoming steps |
| **Previous/Next Controls** | Manual navigation through route steps |
| **Blue Light Proximity Alerts** | Notes when route passes near Blue Light stations |
| **Exit Navigation** | One-tap button to end navigation mode |

---

### 5. SOS Emergency System

| Feature | Description |
|---------|-------------|
| **Floating SOS Button** | Always-visible emergency button on all screens |
| **Long-Press Activation** | 1-second hold to prevent accidental triggers |
| **Emergency Modal** | Full-screen emergency interface when activated |
| **Campus Security Alert** | Simulated alert to campus security |
| **Nearest Blue Light Display** | Shows closest emergency station |
| **911 Call Button** | Direct phone call to emergency services |
| **Cancel Option** | Ability to cancel false alarms |
| **Pulse Animation** | Visual feedback during emergency mode |

---

### 6. Walking Groups System

| Feature | Description |
|---------|-------------|
| **Active Groups List** | Shows all nearby walking groups with details |
| **Group Details** | Displays member count, destination, and time created |
| **Join Group Modal** | Confirmation interface to join a group |
| **Join Confirmation** | Visual checkmark feedback on successful join |
| **Create Group Button** | Interface to create new walking group (UI only) |
| **Map Integration** | Groups displayed as markers on campus map |

**Sample Groups:**
- Wolfpack Group (to Ambler Johnston Hall)
- Night Owls (to D2 Dietrick)
- Library Squad (to Newman Library)

---

### 7. User Profile & Settings

| Feature | Description |
|---------|-------------|
| **User Profile Card** | Avatar, name, and email display |
| **Edit Profile Button** | Access to profile editing |
| **Safety Statistics** | Safe Walks (12), Groups Joined (5), Groups Created (3) |
| **Emergency Contacts** | Campus Police quick-dial (540-231-6411) |
| **Notifications Settings** | Safety alerts and updates preferences |
| **Safety Tips** | Campus safety guidelines access |
| **Help & Support** | FAQs and contact information |

---

## Technical Features

### APIs & Integrations

| Service | Purpose |
|---------|---------|
| **Geoapify Routing API** | Walking route calculation with turn-by-turn steps |
| **Geoapify Autocomplete API** | Address search and suggestions |
| **Geoapify Places API** | Location coordinate verification |
| **Google Gemini AI** | AI-powered safe route optimization (with local fallback) |
| **Expo Location** | GPS tracking and permissions |

### API Keys Configured
- Geoapify Autocomplete: `84e16742fa54436489f86ea8562d4ddc`
- Geoapify Places: `79ae9dcc178e421c923852cf69ba3f5b`
- Geoapify Routing: `d71af4a47bf8434ea3a24100091cb45e`
- Google Gemini: `AIzaSyCpE13VC-Pf0OKiTKrsg0EFU0tnezdPOdU`

---

## UI/UX Features

| Feature | Description |
|---------|-------------|
| **Dark Theme** | Consistent dark color scheme (#0f172a background) |
| **Custom Tab Navigation** | 4-tab bottom navigation (Home, Map, Groups, Profile) |
| **Orange Accent Color** | Brand color #FF6B35 for highlights |
| **Responsive Modals** | Slide-up and fade animations |
| **Loading States** | Visual feedback during API calls |
| **Touch Feedback** | Active opacity on all interactive elements |
| **Safe Area Support** | Proper handling of device notches |

---

## Safety-Focused Design

1. **Blue Light Priority** - Routes consider proximity to emergency stations
2. **Risk Zone Avoidance** - Visual display of areas with reported activity
3. **Group Walking** - Encourages safety in numbers
4. **One-Tap Emergency** - SOS accessible from any screen
5. **Live Tracking** - Real-time location during navigation
6. **Campus-Specific** - Optimized for VT campus with verified coordinates

---

## Data Models

### Blue Light Station
```javascript
{
  id: number,
  name: string,
  latitude: number,
  longitude: number,
  distance: string
}
```

### Walking Group
```javascript
{
  id: number,
  name: string,
  latitude: number,
  longitude: number,
  destination: string,
  members: number,
  time: string
}
```

### Activity Zone
```javascript
{
  id: number,
  latitude: number,
  longitude: number,
  radius: number,
  intensity: 'high' | 'medium' | 'low'
}
```

### VT Location
```javascript
{
  name: string,
  latitude: number,
  longitude: number,
  aliases: string[]
}
```

---

## File Structure

```
lumina/mobile/
├── App.js              # Main application (all screens & components)
├── package.json        # Dependencies
├── babel.config.js     # Babel configuration
├── app.json           # Expo configuration
└── FEATURES.md        # This document
```

---

## Dependencies

- `react-native` - Core framework
- `expo` - Development platform
- `react-native-maps` - Map component
- `expo-location` - GPS services
- `lucide-react-native` - Icon library
- `@react-navigation/*` - Navigation (drawer/tab)

---

## Future Enhancement Opportunities

1. **Push Notifications** - Real-time safety alerts
2. **User Authentication** - Account system with Firebase/Auth0
3. **Real-time Groups** - WebSocket-based group tracking
4. **Incident Reporting** - User-submitted safety reports
5. **Historical Data** - Route history and statistics
6. **Offline Mode** - Cached maps and routes
7. **Emergency Contacts Sync** - Import from phone contacts
8. **Campus Events Integration** - Safety info for large events
9. **Weather Integration** - Safety recommendations based on conditions
10. **Accessibility Features** - Voice navigation, screen reader support

---

*Generated: January 2026*
*Lumina v1.0 - VT Campus Safety*
