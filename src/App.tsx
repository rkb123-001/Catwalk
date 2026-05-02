import { useState, useRef, useEffect } from "react";

// TypeScript declarations
declare global {
  interface Window {
    L: any;
  }
}

// Types
interface CatLocation {
  lat: number;
  lng: number;
  area: string;
  city: string;
  country: string;
  continent: string;
  approximateAddress: string;
}

interface CatPhoto {
  url: string;
  contributor: string;
  contributorId: string;
  date: string;
}

interface Cat {
  id: number;
  createdDate: string;
  name: string;
  alternativeNames?: string[];
  emoji: string;
  location: CatLocation;
  photos: CatPhoto[];
  description?: string;
  personality: string[];
  allowsPetting: boolean | null;
  acceptsTreats: boolean | null;
  favoriteTreats?: string[];
  visits: Visit[];
  slowBlinks: SlowBlink[];
  contributors: Contributor[];
  creator: string;
  creatorId: string;
}

interface Visit {
  userId: string;
  date: string;
}

interface SlowBlink {
  userId: string;
  userName: string;
  date: string;
}

interface Contributor {
  id: string;
  name: string;
  type: "creator" | "photo" | "info";
  contributions: number;
}

// Icons as React components
const MapIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const SearchIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

const UserIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const XIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const CameraIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>
);

const EditIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const PlusIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);



// Components
function HeaderBar({
  onProfileClick,
  userName = "Sarah Chen",
  contributions = 15,
}: {
  onProfileClick: () => void;
  userName?: string;
  contributions?: number;
}) {
  return (
    <div className="header-bar">
      <h1 className="header-title">
        <span className="cat-logo">😺</span> Catwalk
      </h1>
      <button className="profile-button" onClick={onProfileClick}>
        <UserIcon />
        <div className="profile-info">
          <div className="profile-name">{userName}</div>
          <div className="profile-contributions">
            {contributions} contributions
          </div>
        </div>
      </button>
    </div>
  );
}

function CatProfile({ cat, onClose }: { cat: Cat; onClose: () => void }) {
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  if (showAllPhotos) {
    return (
      <div className="cat-profile">
        <div className="profile-header">
          <h2>Photos of {cat.name}</h2>
          <button
            onClick={() => setShowAllPhotos(false)}
            className="close-button"
          >
            <XIcon />
          </button>
        </div>
        <div className="photos-grid full-gallery">
          {cat.photos.map((photo, index) => (
            <div key={index} className="photo-item">
              <img src={photo.url} alt={`${cat.name} photo ${index + 1}`} />
              <div className="photo-label">
                <div>{cat.name}</div>
                <div>Photo {index + 1}</div>
              </div>
              <div className="photo-caption">
                Photo {index + 1} of {cat.photos.length}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="cat-profile">
      <div className="profile-header">
        <button onClick={onClose} className="close-button">
          <XIcon />
        </button>
        <div className="profile-actions">
          <button className="action-button contribute">
            <EditIcon /> Contribute
          </button>
          <button className="action-button add-photo">
            <CameraIcon /> Add Photo
          </button>
        </div>
      </div>

      <div className="profile-content">
        <div className="cat-header">
          <span className="cat-emoji">{cat.emoji}</span>
          <h1 className="cat-name">{cat.name}</h1>
        </div>

        {cat.photos.length > 0 && (
          <div className="photos-section">
            <h3>Photos ({cat.photos.length})</h3>
            <div className="photos-preview">
              {cat.photos.slice(0, 2).map((photo, index) => (
                <div key={index} className="photo-item">
                  <img src={photo.url} alt={`${cat.name} photo ${index + 1}`} />
                  <div className="photo-label">
                    <div>{cat.name}</div>
                    <div>Photo {index + 1}</div>
                  </div>
                </div>
              ))}
            </div>
            {cat.photos.length > 2 && (
              <button
                className="view-all-photos"
                onClick={() => setShowAllPhotos(true)}
              >
                View all {cat.photos.length} photos
              </button>
            )}
          </div>
        )}

        <p className="cat-description">{cat.description}</p>

        <div className="info-section">
          <h3>What we know about this cat:</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-icon">📍</span>
              <div>
                <div>
                  {cat.location.area}, {cat.location.city}
                </div>
                <div className="info-detail">
                  {cat.location.approximateAddress}
                </div>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">🏴</span>
              <div>{cat.location.country}</div>
            </div>
            <div className="info-item">
              <span className="info-icon">📅</span>
              <div>
                Added{" "}
                {new Date(cat.createdDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            {cat.allowsPetting && (
              <div className="info-item">
                <span className="info-icon">😺</span>
                <div>Likes being petted</div>
              </div>
            )}
            {cat.acceptsTreats && (
              <div className="info-item">
                <span className="info-icon">🐟</span>
                <div>Likes treats</div>
              </div>
            )}
            {cat.favoriteTreats && cat.favoriteTreats.length > 0 && (
              <div className="info-item">
                <span className="info-icon">❤️</span>
                <div>Loves: {cat.favoriteTreats.join(", ")}</div>
              </div>
            )}
          </div>
        </div>

        <div className="characteristics-section">
          <h3>Characteristics:</h3>
          <div className="traits-list">
            {cat.personality.map((trait) => (
              <span key={trait} className="trait-tag">
                {trait}
              </span>
            ))}
          </div>
        </div>

        <div className="contributors-info">
          {cat.contributors.length} contributors
        </div>

        <div className="location-section">
          <h3>Location</h3>
          <div className="mini-map">
            <div className="map-placeholder">
              <div className="map-info">
                <div>
                  Added{" "}
                  {new Date(cat.createdDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="map-marker">{cat.emoji}</div>
              <div className="map-location">
                <div>{cat.location.approximateAddress}</div>
                <div>{cat.location.area}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserProfile({
  onClose,
  userName = "Sarah Chen",
  location = "London, United Kingdom",
}: {
  onClose: () => void;
  userName?: string;
  location?: string;
}) {
  return (
    <div className="user-profile">
      <div className="profile-header">
        <h2>Your Profile</h2>
        <button onClick={onClose} className="close-button">
          <XIcon />
        </button>
      </div>

      <div className="profile-content">
        <div className="user-avatar">
          <UserIcon />
        </div>

        <h3 className="user-name">{userName}</h3>
        <p className="user-location">{location}</p>

        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">15</div>
            <div className="stat-label">Total Contributions</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">2</div>
            <div className="stat-label">Cats Found</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">8</div>
            <div className="stat-label">Photos Added</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CatList({
  cats,
  onSelectCat,
}: {
  cats: Cat[];
  onSelectCat: (cat: Cat) => void;
}) {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="cat-list-view">
      <div className="search-section">
        <div className="search-bar">
          <SearchIcon />
          <input type="text" placeholder="Search cats..." />
        </div>
      </div>

      <div className="browse-section">
        <h2>Browse by Location</h2>
        <div className="location-tabs">
          <button
            className={`location-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Cats ({cats.length})
          </button>
          <button
            className={`location-tab ${
              activeTab === "country" ? "active" : ""
            }`}
            onClick={() => setActiveTab("country")}
          >
            By Country
          </button>
          <button
            className={`location-tab ${activeTab === "city" ? "active" : ""}`}
            onClick={() => setActiveTab("city")}
          >
            By City
          </button>
        </div>
      </div>

      <div className="cats-section">
        <h3>All Cats ({cats.length})</h3>
        <div className="cat-cards">
          {cats.map((cat) => (
            <div
              key={cat.id}
              className="cat-card"
              onClick={() => onSelectCat(cat)}
            >
              <div className="cat-card-emoji">{cat.emoji}</div>
              <div className="cat-card-photo">
                {cat.photos[0] && (
                  <img src={cat.photos[0].url} alt={cat.name} />
                )}
                <div className="photo-label">
                  <div>{cat.name}</div>
                  <div>Photo 1</div>
                </div>
              </div>
              <div className="cat-card-info">
                <h4>{cat.name}</h4>
                <p>{cat.description}</p>
                <div className="cat-card-traits">
                  {cat.personality.slice(0, 2).map((trait) => (
                    <span key={trait} className="trait-tag">
                      {trait}
                    </span>
                  ))}
                </div>
                <div className="cat-card-meta">
                  <span>
                    <MapIcon /> {cat.location.area}
                  </span>
                  <span>{cat.photos.length} photos</span>
                  <span>{cat.contributors.length} contributors</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="floating-add-button">
        <PlusIcon />
      </button>
    </div>
  );
}

export default function CatwalkApp() {
  const [leafletMap, setLeafletMap] = useState<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [currentView, setCurrentView] = useState("catmap");
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const [cats] = useState<Cat[]>([
    {
      id: 1,
      createdDate: "2024-12-15T12:00:00Z",
      name: "Luna",
      alternativeNames: ["Princess Luna", "Loony"],
      emoji: "😺",
      location: {
        lat: 51.5074,
        lng: -0.1278,
        area: "Covent Garden",
        city: "London",
        country: "United Kingdom",
        continent: "Europe",
        approximateAddress: "Near Russell Street & Bow Street",
      },
      photos: [
        {
          url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23e09f3e'/%3E%3Ctext x='50%25' y='40%25' text-anchor='middle' fill='white' font-size='24' font-family='Arial'%3ELuna%3C/text%3E%3Ctext x='50%25' y='60%25' text-anchor='middle' fill='white' font-size='18' font-family='Arial'%3EPhoto 1%3C/text%3E%3C/svg%3E",
          contributor: "Sarah Chen",
          contributorId: "user1",
          date: "2024-12-15T12:00:00Z",
        },
        {
          url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23ff6b6b'/%3E%3Ctext x='50%25' y='40%25' text-anchor='middle' fill='white' font-size='24' font-family='Arial'%3ELuna%3C/text%3E%3Ctext x='50%25' y='60%25' text-anchor='middle' fill='white' font-size='18' font-family='Arial'%3EPhoto 2%3C/text%3E%3C/svg%3E",
          contributor: "Mike Wilson",
          contributorId: "user2",
          date: "2024-12-16T10:00:00Z",
        },
        {
          url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23ee5a24'/%3E%3Ctext x='50%25' y='40%25' text-anchor='middle' fill='white' font-size='24' font-family='Arial'%3ELuna%3C/text%3E%3Ctext x='50%25' y='60%25' text-anchor='middle' fill='white' font-size='18' font-family='Arial'%3EPhoto 3%3C/text%3E%3C/svg%3E",
          contributor: "Emma Jones",
          contributorId: "user3",
          date: "2024-12-17T15:00:00Z",
        },
      ],
      description:
        "A friendly tabby who loves chin scratches and afternoon naps in the sun.",
      personality: ["Friendly", "Loves sunbathing", "Very vocal"],
      allowsPetting: true,
      acceptsTreats: true,
      favoriteTreats: ["Tuna", "Chicken"],
      visits: [],
      slowBlinks: [],
      contributors: [
        { id: "user1", name: "Sarah Chen", type: "creator", contributions: 1 },
        { id: "user2", name: "Mike Wilson", type: "photo", contributions: 3 },
        { id: "user3", name: "Alex Brown", type: "info", contributions: 2 },
      ],
      creator: "Sarah Chen",
      creatorId: "user1",
    },
    {
      id: 2,
      createdDate: "2024-12-10T09:00:00Z",
      name: "Oreo",
      emoji: "🐈‍⬛",
      location: {
        lat: 51.5094,
        lng: -0.1303,
        area: "Shoreditch",
        city: "London",
        country: "United Kingdom",
        continent: "Europe",
        approximateAddress: "Near High Street",
      },
      photos: [
        {
          url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23333333'/%3E%3Ctext x='50%25' y='40%25' text-anchor='middle' fill='white' font-size='24' font-family='Arial'%3EOreo%3C/text%3E%3Ctext x='50%25' y='60%25' text-anchor='middle' fill='white' font-size='18' font-family='Arial'%3EPhoto 1%3C/text%3E%3C/svg%3E",
          contributor: "Tom Davis",
          contributorId: "user5",
          date: "2024-12-10T09:00:00Z",
        },
      ],
      description: "Black and white tuxedo cat with a playful personality.",
      personality: ["Playful", "Curious"],
      allowsPetting: false,
      acceptsTreats: null,
      visits: [],
      slowBlinks: [],
      contributors: [
        { id: "user5", name: "Tom Davis", type: "creator", contributions: 1 },
      ],
      creator: "Tom Davis",
      creatorId: "user5",
    },
  ]);

  // Load Leaflet
  useEffect(() => {
    if (!leafletLoaded && !mapLoading) {
      setMapLoading(true);

      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(cssLink);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => {
        setLeafletLoaded(true);
        setMapLoading(false);
      };
      script.onerror = () => {
        console.error("Leaflet failed to load");
        setMapLoading(false);
      };
      document.body.appendChild(script);
    }
  }, [leafletLoaded, mapLoading]);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation([lat, lng]);
      });
    }
  }, []);

  // Initialize or refresh map
  useEffect(() => {
    if (
      currentView === "catmap" &&
      leafletLoaded &&
      mapRef.current &&
      window.L
    ) {
      const timer = setTimeout(() => {
        if (!mapInstanceRef.current) {
          const map = window.L.map(mapRef.current, {
            center: userLocation || [51.5074, -0.1278],
            zoom: 15,
            minZoom: 5,
            maxZoom: 20,
            zoomControl: true,
          });

          window.L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              attribution: "© Catwalk Demo Map",
            }
          ).addTo(map);

          mapInstanceRef.current = map;
          setLeafletMap(map);
        } else {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [currentView, leafletLoaded, userLocation]);

  // Clean up map when switching away
  useEffect(() => {
    if (currentView !== "catmap" && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      setLeafletMap(null);
    }
  }, [currentView]);

  // Add markers to map
  useEffect(() => {
    if (leafletMap && window.L) {
      leafletMap.eachLayer((layer: any) => {
        if (layer._latlng && !layer._isUserLocation)
          leafletMap.removeLayer(layer);
      });

      cats.forEach((cat) => {
        const catIcon = window.L.divIcon({
          html: `<div class="cat-marker">${cat.emoji}</div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          className: "cat-marker-container",
        });

        const marker = window.L.marker([cat.location.lat, cat.location.lng], {
          icon: catIcon,
        }).addTo(leafletMap);

        marker.on("click", () => {
          setSelectedCat(cat);
        });
      });

      if (userLocation) {
        const userIcon = window.L.divIcon({
          html: '<div class="user-location-marker"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          className: "user-marker-container",
        });
        const userMarker = window.L.marker(userLocation, {
          icon: userIcon,
        }).addTo(leafletMap);
        userMarker._isUserLocation = true;

        // Add "You are here" label
        const labelIcon = window.L.divIcon({
          html: '<div class="user-location-label">You are here</div>',
          iconSize: [120, 30],
          iconAnchor: [60, -10],
          className: "user-label-container",
        });
        window.L.marker(userLocation, { icon: labelIcon }).addTo(leafletMap);
      }
    }
  }, [leafletMap, cats, userLocation]);

  const BottomBar = () => (
    <div className="bottom-bar">
      <button
        onClick={() => setCurrentView("catmap")}
        className={`bottom-bar-button ${
          currentView === "catmap" ? "active" : ""
        }`}
      >
        <MapIcon />
        <span>Map</span>
      </button>
      <button
        onClick={() => setCurrentView("list")}
        className={`bottom-bar-button ${
          currentView === "list" ? "active" : ""
        }`}
      >
        <SearchIcon />
        <span>Browse</span>
      </button>
    </div>
  );

  return (
    <div className="app-container">
      <HeaderBar onProfileClick={() => setShowProfile(true)} />

      {currentView === "catmap" && (
        <>
          <div className="map-overlay-controls">
            <div className="map-label">
              <span className="map-icon">🎮</span> Demo Map
            </div>
            <div className="location-info">
              <span className="location-icon">📍</span>
              <span>London, United Kingdom</span>
              <a href="#" className="retry-location">
                Retry location?
              </a>
            </div>
          </div>
          <div ref={mapRef} className="map-container" />
          <div className="map-attribution">United Kingdom</div>
          <button className="floating-add-button">
            <PlusIcon />
          </button>
        </>
      )}

      {currentView === "list" && (
        <CatList cats={cats} onSelectCat={setSelectedCat} />
      )}

      {selectedCat && (
        <CatProfile cat={selectedCat} onClose={() => setSelectedCat(null)} />
      )}

      {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}

      <BottomBar />

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
          background: #f5f5f5;
        }

        .app-container {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
        }

        /* Header */
        .header-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: white;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .header-title {
          font-size: 24px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cat-logo {
          font-size: 28px;
        }

        .profile-button {
          display: flex;
          align-items: center;
          gap: 12px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }

        .profile-button svg {
          color: #6b7280;
        }

        .profile-info {
          text-align: right;
        }

        .profile-name {
          font-size: 16px;
          font-weight: 600;
          color: #111;
        }

        .profile-contributions {
          font-size: 14px;
          color: #6b7280;
        }

        /* Map */
        .map-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 60px;
          background: #e8f5e9;
        }

        .map-overlay-controls {
          position: absolute;
          top: 80px;
          left: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .map-label {
          background: white;
          padding: 12px 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          font-size: 16px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .location-info {
          background: white;
          padding: 12px 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .location-icon {
          color: #ef4444;
        }

        .retry-location {
          color: #ef4444;
          text-decoration: underline;
          margin-left: 8px;
        }

        .map-attribution {
          position: absolute;
          bottom: 70px;
          left: 10px;
          background: rgba(255, 255, 255, 0.8);
          padding: 4px 8px;
          font-size: 12px;
          border-radius: 4px;
        }

        .cat-marker-container {
          background: none !important;
          border: none !important;
        }

        .cat-marker {
          width: 40px;
          height: 40px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          transition: transform 0.2s;
        }

        .cat-marker:hover {
          transform: scale(1.1);
        }

        .user-marker-container {
          background: none !important;
          border: none !important;
        }

        .user-location-marker {
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
        }

        .user-label-container {
          background: none !important;
          border: none !important;
        }

        .user-location-label {
          background: #3b82f6;
          color: white;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }

        /* Bottom Bar */
        .bottom-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-around;
          padding: 8px 0;
          z-index: 1000;
        }

        .bottom-bar-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          padding: 8px 24px;
          cursor: pointer;
          color: #6b7280;
          font-size: 14px;
          transition: color 0.2s;
        }

        .bottom-bar-button.active {
          color: #8b5cf6;
        }

        .bottom-bar-button:hover {
          color: #8b5cf6;
        }

        .floating-add-button {
          position: absolute;
          bottom: 80px;
          right: 20px;
          width: 64px;
          height: 64px;
          background: #8b5cf6;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          z-index: 999;
        }

        .floating-add-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(139, 92, 246, 0.5);
        }

        /* Cat List View */
        .cat-list-view {
          position: absolute;
          top: 72px;
          left: 0;
          right: 0;
          bottom: 60px;
          background: #f9fafb;
          overflow-y: auto;
        }

        .search-section {
          padding: 16px 20px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
        }

        .search-bar {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-bar svg {
          position: absolute;
          left: 16px;
          color: #9ca3af;
        }

        .search-bar input {
          width: 100%;
          padding: 12px 16px 12px 48px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 16px;
          background: #f9fafb;
        }

        .search-bar input:focus {
          outline: none;
          border-color: #8b5cf6;
          background: white;
        }

        .browse-section {
          padding: 20px;
          background: white;
        }

        .browse-section h2 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .location-tabs {
          display: flex;
          gap: 12px;
        }

        .location-tab {
          padding: 8px 20px;
          border: none;
          border-radius: 20px;
          background: #e5e7eb;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .location-tab.active {
          background: #8b5cf6;
          color: white;
        }

        .cats-section {
          padding: 20px;
        }

        .cats-section h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .cat-cards {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .cat-card {
          background: white;
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: box-shadow 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .cat-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .cat-card-emoji {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .cat-card-photo {
          position: relative;
          width: 100%;
          height: 120px;
          background: #f3f4f6;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .cat-card-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cat-card-photo .photo-label {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          padding: 8px;
          text-align: center;
          font-size: 14px;
        }

        .cat-card-info h4 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .cat-card-info p {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 12px;
          line-height: 1.5;
        }

        .cat-card-traits {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .trait-tag {
          padding: 4px 12px;
          background: #e9d5ff;
          color: #7c3aed;
          border-radius: 16px;
          font-size: 14px;
        }

        .cat-card-meta {
          display: flex;
          gap: 16px;
          font-size: 14px;
          color: #6b7280;
        }

        .cat-card-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Cat Profile */
        .cat-profile {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 2000;
          overflow-y: auto;
        }

        .profile-header {
          position: sticky;
          top: 0;
          background: white;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e5e7eb;
          z-index: 10;
        }

        .close-button {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: #6b7280;
        }

        .profile-actions {
          display: flex;
          gap: 12px;
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 20px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button.contribute {
          background: #10b981;
          color: white;
        }

        .action-button.add-photo {
          background: #3b82f6;
          color: white;
        }

        .profile-content {
          padding: 20px;
        }

        .cat-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .cat-emoji {
          font-size: 48px;
        }

        .cat-name {
          font-size: 32px;
          font-weight: 700;
        }

        .cat-description {
          font-size: 16px;
          color: #4b5563;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .photos-section {
          margin-bottom: 32px;
        }

        .photos-section h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .photos-preview {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .photo-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 12px;
          overflow: hidden;
        }

        .photo-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-label {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          padding: 8px;
          text-align: center;
          font-size: 14px;
        }

        .view-all-photos {
          background: none;
          border: none;
          color: #8b5cf6;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
        }

        .view-all-photos:hover {
          text-decoration: underline;
        }

        .info-section {
          margin-bottom: 32px;
        }

        .info-section h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .info-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .info-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .info-detail {
          color: #6b7280;
          font-size: 14px;
        }

        .characteristics-section {
          margin-bottom: 32px;
        }

        .characteristics-section h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .traits-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .contributors-info {
          font-size: 16px;
          color: #6b7280;
          margin-bottom: 32px;
        }

        .location-section h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .mini-map {
          background: #e8f5e9;
          border-radius: 12px;
          padding: 16px;
          position: relative;
          height: 200px;
        }

        .map-placeholder {
          position: relative;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .map-info {
          position: absolute;
          top: 8px;
          right: 8px;
          background: white;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 14px;
          color: #6b7280;
        }

        .map-marker {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .map-location {
          text-align: center;
          font-size: 14px;
          color: #4b5563;
        }

        .photos-grid.full-gallery {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          padding: 20px;
        }

        .photos-grid .photo-item {
          position: relative;
        }

        .photo-caption {
          text-align: center;
          font-size: 14px;
          color: #6b7280;
          margin-top: 8px;
        }

        /* User Profile */
        .user-profile {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 2000;
        }

        .user-profile .profile-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px;
        }

        .user-avatar {
          width: 120px;
          height: 120px;
          background: #e5e7eb;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .user-avatar svg {
          width: 60px;
          height: 60px;
          color: #6b7280;
        }

        .user-name {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .user-location {
          font-size: 16px;
          color: #6b7280;
          margin-bottom: 40px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          width: 100%;
          max-width: 300px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          font-size: 48px;
          font-weight: 700;
          color: #8b5cf6;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 16px;
          color: #6b7280;
        }

        /* Make leaflet controls respect header */
        .leaflet-top {
          top: 160px !important;
        }

        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
        }

        .leaflet-control-zoom a {
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
        }
      `}</style>
    </div>
  );
}
