# Catwalk

A community-built map of neighbourhood cats.

Catwalk is a place to document the cats that share your streets — the porch sleeper on Brownlow Road, the corner shop cat, the one that appears every Tuesday outside the bakery. It's a slow, communal archive: somewhere between a field guide and a mutual appreciation society.

The app is built around the idea that neighbourhood cats are part of local memory. People move away. Cats stay. Catwalk keeps the record.

---

## What it does

**Map** — an interactive Leaflet/OpenStreetMap map centred on your location. Cat emoji markers appear as pins. Tap one to open its profile. Location data is approximate by design — cat positions are fuzzed to a ~500m radius on profile views to protect the animal's safety.

**Cat profiles** — each cat has a profile with photos, a description, personality traits, location context, visit history, and community descriptions (short notes about behaviour, anecdotes, or appearances contributed by anyone who has met the cat). Profiles show the first name of contributors only.

**Contributions** — any registered user can add a cat, upload photos, or contribute written descriptions to an existing profile. Contributions are attributed. You can also mark a cat as visited (once per 24 hours, to prevent data harvesting) or send a slow blink.

**Browse** — a searchable, filterable directory of all cats. Search by name, area, city, or country. Filter by colour, personality, or behaviour. Country and city filter chips appear automatically as the map grows internationally.

**Catspotting** — a quick-capture flow for when you're out and spot a cat on the fly. Upload or take a photo, the app attempts to match it to a nearby cat, and you can attach it or create a new profile from scratch.

**User profiles** — each user has a profile showing their contributions, cats visited, and photos added. Public profiles show first names only. You can view another user's profile and see which cats they've added.

---

## Safety

Catwalk stores location data about living animals, which carries real risk. Several layers of protection are built into the product:

- Login required before any data is accessible — no public cat map, Firestore reads require authentication
- Cat profile maps blur the pin ±500m and pull zoom back three levels
- Street-level address hidden from accounts under 30 days old with fewer than 3 contributions
- Visits limited to once per 24 hours per cat
- First names only — applied at write time, not just display time
- Anti-theft statement visible before first login

---

## Stack

- React 19 + TypeScript — single `App.tsx`, no external UI library
- Vite 6 for build
- Firebase Auth, Firestore, Storage
- Leaflet + OpenStreetMap for mapping
- Nominatim for reverse geocoding and location search
- Deployed on Vercel via GitHub

---

## Running locally

```bash
git clone https://github.com/rkb123-001/Catwalk.git
cd Catwalk
npm install
npm run dev
```

You will need a Firebase project with Auth, Firestore, and Storage enabled. Add your config to the relevant constants in `App.tsx`.

---

## License

Source-visible, not open source. See [LICENSE](./LICENSE) for full terms.

The codebase, product concept, safety architecture, and data model are the original work of Rebekah Kosonen Bide © 2026. All rights reserved. The codebase may not be reused, forked, redistributed, or used as the basis for a derivative product without written permission.

---

## Contributing

The code is source-visible for transparency. It is not open for fork-based redistribution.

If you want to contribute to the direction of the product — accessibility, safety design, community features — open an issue or get in touch directly.
