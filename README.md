# 🐾 Catwalk

**Catwalk** is a community archive and fuzzy mapping app for neighbourhood cats — indoor, outdoor, or both. It offers a privacy-conscious space for people to gently document their feline encounters, share photos, and track visits in a way that’s emotionally expressive and socially meaningful.

Whether it’s a known porch-sleeper or a mystery window-watcher, Catwalk invites slow observation and communal memory, helping connect people through the presence of cats.

---

## ✨ Features

### 🌍 Fuzzy Map & Location Tracking

- Interactive map built with Leaflet.js
- All cat locations are fuzzed to protect privacy (no exact lat/lng stored or shown)
- Duplicate-checking for nearby cats within a 200m radius
- Manually drop a pin or let the app detect your approximate location

### 🐱 Cat Profiles

- Each cat has a unique profile page
- Customisable emoji tag (🖤 🧡 🤍 etc.) used on map markers
- Personality traits (Shy, Friendly, Vocal, etc.)
- Petting and treat preferences
- Multiple user-contributed names and profile data
- Gallery showing photos from various contributors (2-column grid layout)

### 📷 Community Contributions

- Upload photos via device camera, manual file upload, or camera roll
- Add info to existing cats or create a new cat profile
- Contributions are attributed with emoji badges:  
  🏠 creator, 📸 photo contributor, 💡 info contributor

### 👁️ Visit Tracking

- “Visited” button shows when you’ve seen a cat
- Tracks visit count by user and globally
- Shows “Visited 🐾 x3” on profile pages
- Adds “Cats Visited” stat to your user profile

### 😻 Slow Blink Interaction

- Send affection to your favourite cats with a “Slow Blink”
- Stats show total blinks and recent blinkers
- Gentle, emotionally expressive alternative to "liking"

### 👤 User Accounts (Firebase)

- Sign up with email or username/password
- Log in to track contributions and visits
- Profile includes:
  - Username + join date
  - Cats contributed
  - Photos added
  - Visits logged
  - Slow blinks given

### 🔍 Browse & Filter

- View cats in list or map mode
- Filter by:
  - Continent, country, city, neighbourhood
  - Emoji colour, personality, treat/petting preferences
  - Name or description
- Each list card shows emoji, name, and one photo
- Clicking expands to full cat profile

## 🛡️ Privacy by Design

- No street numbers or precise location data is ever displayed
- All cat locations are approximated to fuzzy areas (e.g. “Near Hackney Central”)
- Location precision is never shared with other users unless explicitly chosen
- Profiles can be anonymous or pseudonymous

## 🧱 Tech Stack

- **Frontend**: React + TypeScript
- **Map**: Leaflet.js
- **State**: React hooks
- **Backend**: Firebase (auth + database + file storage)
- **Icons**: Lucide-react
- **Styling**: TailwindCSS

## 📜 License

This project is **not open source**. It is shared source-visible for transparency and community contribution only.

Use of this app is permitted via the official hosted version.  
The codebase may **not** be reused, copied, modified, or redistributed in any form without written permission.

All rights reserved © 2025 Rebekah Kosonen Bide.  
See [LICENSE](./LICENSE) for full terms.

## 🛠️ Contributing

While the code is source-visible, it is not open for fork-based redistribution.

If you're interested in helping shape Catwalk — especially in areas like accessibility, emotion-driven design, or geolocation UI — please [open an issue](../../issues) or reach out directly.

## 🚀 Getting Started (Dev)

```bash
git clone https://github.com/rkb123-001/Catwalk.git
cd Catwalk1
pnpm install
pnpm dev

