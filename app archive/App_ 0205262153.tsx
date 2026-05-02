import React, { useState, useRef, useEffect } from "react";

// Firebase imports - Real Firebase integration
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  deleteUser,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  increment,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// Updated Firebase configuration with your real config
const firebaseConfig = {
  apiKey: "AIzaSyCSCjlUR-_9qRJjPGyhqOaowzX2NItmHh0",
  authDomain: "catwalkapp1.firebaseapp.com",
  projectId: "catwalkapp1",
  storageBucket: "catwalkapp1.firebasestorage.app",
  messagingSenderId: "90595764395",
  appId: "1:90595764395:web:93b4eab99394cb56afafee",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

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
  id: string;
  url: string;
  contributor: string;
  contributorId: string;
  date: string;
  uploadedAt?: any;
  objectPosition?: string;
  locationMetadata?: {
    lat: number;
    lng: number;
  };
}

interface Description {
  id: string;
  text: string;
  contributor: string;
  contributorId: string;
  date: string;
  type: "description" | "anecdote" | "behavior";
}

interface Cat {
  id: string;
  createdDate: string;
  name: string;
  alternativeNames?: string[];
  emoji: string;
  location: CatLocation;
  photos: CatPhoto[];
  description?: string;
  descriptions?: Description[];
  personality: string[];
  allowsPetting: boolean | null;
  acceptsTreats: boolean | null;
  favoriteTreats?: string[];
  livingLocation: "indoor" | "outdoor" | "both" | null;
  visits: Visit[];
  userVisits?: { [userId: string]: number };
  totalVisits: number;
  slowBlinks: SlowBlink[];
  contributors: Contributor[];
  creator: string;
  creatorId: string;
}

interface Visit {
  userId: string;
  date: string;
  userName?: string;
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

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  joinDate: string;
  totalContributions: number;
  catsFound: number;
  photosAdded: number;
  catsVisited: string[];
  location?: string;
  profilePicture?: string;
  identity: "human-of-cat" | "unattached-catwalker";
}

interface User {
  uid: string;
  email: string | null;
}

interface FilterState {
  emoji: string | null;
  personality: string[];
  allowsPetting: boolean | null;
  acceptsTreats: boolean | null;
  livingLocation: "indoor" | "outdoor" | "both" | null;
}

const DEFAULT_CAT_PHOTO_POSITION = "50% 50%";

const normalisePhotoObjectPosition = (position?: string | null) => {
  if (!position) return DEFAULT_CAT_PHOTO_POSITION;

  const legacyPositions: Record<string, string> = {
    "center top": "50% 15%",
    "center center": "50% 50%",
    "center bottom": "50% 85%",
  };

  if (legacyPositions[position]) return legacyPositions[position];

  const percentPattern = /^\s*(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%\s*$/;
  const match = position.match(percentPattern);
  if (!match) return DEFAULT_CAT_PHOTO_POSITION;

  const x = Math.min(100, Math.max(0, Number(match[1])));
  const y = Math.min(100, Math.max(0, Number(match[2])));
  return `${x}% ${y}%`;
};

const getCatPhotoPosition = (photo?: Partial<CatPhoto> | null) =>
  normalisePhotoObjectPosition(photo?.objectPosition);

const pointToObjectPosition = (xPercent: number, yPercent: number) => {
  const x = Math.min(100, Math.max(0, Math.round(xPercent)));
  const y = Math.min(100, Math.max(0, Math.round(yPercent)));
  return `${x}% ${y}%`;
};

const objectPositionToPoint = (position?: string | null) => {
  const normalised = normalisePhotoObjectPosition(position);
  const [x, y] = normalised
    .split(" ")
    .map((value) => Number(value.replace("%", "")));
  return { x: Number.isFinite(x) ? x : 50, y: Number.isFinite(y) ? y : 50 };
};

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

const TrashIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
  </svg>
);

const PlusIcon = ({ size = 32 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const LogoutIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const FilterIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const ArrowBackIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="m12 19-7-7 7-7"></path>
    <path d="M19 12H5"></path>
  </svg>
);

const LockIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CameraCaptureIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"></path>
  </svg>
);

// Photo Capture Component - gallery or live camera
function PhotoCaptureButton({
  onPhotoSelected,
  children,
  style,
}: {
  onPhotoSelected: (file: File) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const [showOptions, setShowOptions] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setStreaming(true);
      }
    } catch {
      fileInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
          onPhotoSelected(file);
          stopCamera();
          setShowOptions(false);
        }
      }, "image/jpeg");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { onPhotoSelected(file); setShowOptions(false); }
  };

  return (
    <>
      <div onClick={() => setShowOptions(true)} style={style}>{children}</div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
      {showOptions && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => { setShowOptions(false); stopCamera(); }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", maxWidth: "400px", width: "90%" }}
            onClick={(e) => e.stopPropagation()}>
            {!streaming ? (
              <>
                <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", textAlign: "center" }}>Add Photo</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <button onClick={() => fileInputRef.current?.click()}
                    style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "#f3f4f6", border: "none", borderRadius: "12px", cursor: "pointer", fontSize: "16px" }}>
                    <CameraIcon /> Choose from Gallery
                  </button>
                  <button onClick={startCamera}
                    style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "#1a0dab", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontSize: "16px" }}>
                    <CameraCaptureIcon /> Take Photo
                  </button>
                </div>
              </>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline style={{ width: "100%", borderRadius: "12px", marginBottom: "16px" }} />
                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <button onClick={capturePhoto} style={{ padding: "12px 24px", background: "#10b981", color: "white", border: "none", borderRadius: "12px", cursor: "pointer" }}>Capture</button>
                  <button onClick={() => { stopCamera(); setShowOptions(false); }} style={{ padding: "12px 24px", background: "#ef4444", color: "white", border: "none", borderRadius: "12px", cursor: "pointer" }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </>
  );
}


function PhotoFocusPicker({
  imageUrl,
  objectPosition,
  onChange,
  height = 260,
}: {
  imageUrl: string;
  objectPosition: string;
  onChange: (objectPosition: string) => void;
  height?: number;
}) {
  const point = objectPositionToPoint(objectPosition);
  const pickerRef = useRef<HTMLDivElement>(null);

  const updateFocusFromClientPoint = (clientX: number, clientY: number) => {
    const rect = pickerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    onChange(pointToObjectPosition(x, y));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFocusFromClientPoint(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) return;
    updateFocusFromClientPoint(event.clientX, event.clientY);
  };

  return (
    <div>
      <div
        ref={pickerRef}
        role="slider"
        tabIndex={0}
        aria-label="Drag the focus point for this photo"
        aria-valuetext={`${Math.round(point.x)}% across, ${Math.round(point.y)}% down`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 10 : 3;
          if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
          event.preventDefault();
          const nextX = event.key === "ArrowLeft" ? point.x - step : event.key === "ArrowRight" ? point.x + step : point.x;
          const nextY = event.key === "ArrowUp" ? point.y - step : event.key === "ArrowDown" ? point.y + step : point.y;
          onChange(pointToObjectPosition(nextX, nextY));
        }}
        style={{
          position: "relative",
          width: "100%",
          height,
          borderRadius: "12px",
          overflow: "hidden",
          background: "#f3f4f6",
          cursor: "grab",
          border: "1px solid #e5e7eb",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <img
          src={imageUrl}
          alt="Photo focus preview"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: normalisePhotoObjectPosition(objectPosition),
            display: "block",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${point.x}%`,
            top: `${point.y}%`,
            width: "34px",
            height: "34px",
            borderRadius: "999px",
            border: "3px solid white",
            background: "rgba(26,13,171,0.85)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: "9px",
              height: "9px",
              borderRadius: "999px",
              background: "white",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#6b7280", lineHeight: 1.4 }}>
        Drag the dot onto the cat’s face or body. Catwalk will keep that point centred when it crops the image into cards.
      </p>
    </div>
  );
}

// Updated Cat emoji options with color coding
const CAT_EMOJIS = [
  { emoji: "🐈‍⬛", label: "Black cats", color: "black" },
  { emoji: "🐈", label: "Orange cats", color: "orange" },
  { emoji: "🩶", label: "Grey cats", color: "grey" },
  { emoji: "💙", label: "Blue cats", color: "blue" },
  { emoji: "🤍", label: "White cats", color: "white" },
  { emoji: "🤎", label: "Brown cats", color: "brown" },
  { emoji: "🐱", label: "Multi-coloured cats", color: "multi" },
  { emoji: "🩷", label: "Any colour cats", color: "any" },
];

// Personality traits
const PERSONALITY_TRAITS = [
  "Friendly",
  "Shy",
  "Playful",
  "Vocal",
  "Curious",
  "Independent",
  "Cuddly",
  "Energetic",
  "Calm",
  "Mysterious",
  "Loves sunbathing",
  "Very vocal",
];

// Helper functions

// Handles both Firestore Timestamps and ISO strings
function toDate(value: any): Date | null {
  if (!value) return null;
  if (value?.toDate) return value.toDate(); // Firestore Timestamp
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(value: any, options?: Intl.DateTimeFormatOptions): string {
  const d = toDate(value);
  if (!d) return "Unknown date";
  return d.toLocaleDateString("en-GB", options || { day: "numeric", month: "short", year: "numeric" });
}


function getDateKey(value: any): string {
  const d = toDate(value);
  if (!d) return "Unknown date";
  return d.toISOString().slice(0, 10);
}

function formatDateTime(value: any): string {
  const d = toDate(value);
  if (!d) return "Unknown date";
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getDistanceFromLatLonInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function fuzzyLocation(_lat: number, _lng: number): string {
  const streets = [
    "High Street",
    "Main Street",
    "Park Lane",
    "Church Road",
    "Victoria Street",
  ];
  const street1 = streets[Math.floor(Math.random() * streets.length)];
  const street2 = streets[Math.floor(Math.random() * streets.length)];
  return `Near ${street1} & ${street2}`;
}

function extractLocationFromPhoto(
  _file: File
): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    const mockLocation: [number, number] = [
      51.5074 + (Math.random() - 0.5) * 0.01,
      -0.1278 + (Math.random() - 0.5) * 0.01,
    ];
    setTimeout(() => resolve(mockLocation), 500);
  });
}

// Firebase helper functions
async function uploadPhotoToStorage(
  file: File,
  catId: string,
  userId: string
): Promise<string> {
  try {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please choose an image file.");
    }

    const maxSizeMB = 8;
    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new Error(`Please choose an image smaller than ${maxSizeMB}MB.`);
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `cats/${catId}/photos/${userId}_${timestamp}_${safeName}`;
    const imageRef = storageRef(storage, fileName);

    const snapshot = await uploadBytes(imageRef, file, {
      contentType: file.type || "image/jpeg",
    });
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading photo:", error);
    throw error;
  }
}

async function createUserProfile(
  user: FirebaseUser,
  additionalData: any
): Promise<void> {
  try {
    await addDoc(collection(db, "users"), {
      uid: user.uid,
      email: user.email,
      displayName: additionalData.displayName || user.email?.split("@")[0],
      joinDate: serverTimestamp(),
      totalContributions: 0,
      catsFound: 0,
      photosAdded: 0,
      catsVisited: [],
      location: additionalData.location || "",
      identity: additionalData.identity || "unattached-catwalker",
      profilePicture: additionalData.profilePicture || "",
    });
  } catch (error) {
    console.error("Error creating user profile:", error);
  }
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const q = query(collection(db, "users"), where("uid", "==", userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { ...(doc.data() as UserProfile) };
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

// Auth Required Modal Component
function AuthRequiredModal({
  onClose,
  onLogin,
}: {
  onClose: () => void;
  onLogin: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "32px",
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>
          <LockIcon />
        </div>
        <h3
          style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}
        >
          Sign in required
        </h3>
        <p
          style={{ color: "#6b7280", marginBottom: "24px", lineHeight: "1.5" }}
        >
          To interact with cats, add new cats, or upload photos, you need to
          create an account or sign in.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={onLogin}
            style={{
              padding: "12px 24px",
              background: "#1a0dab",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "500",
            }}
          >
            Sign In
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "12px 24px",
              background: "#f3f4f6",
              color: "#111827",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Browse as Guest
          </button>
        </div>
      </div>
    </div>
  );
}

// Login Component
function LoginScreen({
  onLogin,
  onClose,
  embedded = false,
}: {
  onLogin: () => void;
  onClose: () => void;
  embedded?: boolean;
}) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [identity, setIdentity] = useState<
    "human-of-cat" | "unattached-catwalker"
  >("unattached-catwalker");
  const [location, setLocation] = useState("");
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleProfilePictureSelect = (file: File) => {
    setProfilePictureFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setProfilePicturePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        let profilePictureURL = "";
        if (profilePictureFile) {
          try {
            profilePictureURL = await uploadPhotoToStorage(profilePictureFile, "profiles", userCredential.user.uid);
          } catch { /* non-fatal */ }
        }
        await createUserProfile(userCredential.user, { displayName, identity, location, profilePicture: profilePictureURL });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={
        embedded
          ? { width: "100%" }
          : {
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }
      }
      onClick={embedded ? undefined : onClose}
    >
      <div
        style={{
          background: "white",
          padding: embedded ? 0 : "40px",
          borderRadius: embedded ? 0 : "20px",
          boxShadow: embedded ? "none" : "0 2px 8px rgba(0, 0, 0, 0.1)",
          width: "100%",
          maxWidth: embedded ? "none" : "400px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!embedded && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h1 style={{ fontSize: "28px", margin: 0, fontStyle: "italic", fontWeight: "normal" }}>Catwalk</h1>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#6b7280",
                padding: "4px",
              }}
            >
              <XIcon />
            </button>
          </div>
        )}

        <h2
          style={{
            textAlign: "center",
            color: "#4a5568",
            marginBottom: "30px",
            fontSize: "20px",
          }}
        >
          {isRegistering ? "Join the Community" : "Welcome Back"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {isRegistering && (
            <>
              {/* Profile Picture */}
              <div style={{ textAlign: "center" }}>
                <label style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", display: "block" }}>
                  Profile Picture (Optional)
                </label>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#f3f4f6", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px dashed #d1d5db" }}>
                  {profilePicturePreview ? (
                    <img src={profilePicturePreview} alt="Profile preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : <UserIcon />}
                </div>
                <PhotoCaptureButton onPhotoSelected={handleProfilePictureSelect}
                  style={{ display: "inline-block", padding: "8px 16px", background: "#f3f4f6", borderRadius: "12px", cursor: "pointer", fontSize: "14px" }}>
                  {profilePictureFile ? "Change Photo" : "Add Photo"}
                </PhotoCaptureButton>
              </div>
              <input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{
                  padding: "12px 16px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  fontSize: "16px",
                }}
              />
              <div>
                <label
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  I am a:
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setIdentity("human-of-cat")}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "none",
                      borderRadius: "12px",
                      background:
                        identity === "human-of-cat" ? "#1a0dab" : "#f3f4f6",
                      color: identity === "human-of-cat" ? "white" : "#111827",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    Human of a Cat
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdentity("unattached-catwalker")}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "none",
                      borderRadius: "12px",
                      background:
                        identity === "unattached-catwalker"
                          ? "#1a0dab"
                          : "#f3f4f6",
                      color:
                        identity === "unattached-catwalker"
                          ? "white"
                          : "#111827",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    Unattached Catwalker
                  </button>
                </div>
              </div>
              <input
                type="text"
                placeholder="Location (optional)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{
                  padding: "12px 16px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  fontSize: "16px",
                }}
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "12px 16px",
              border: "2px solid #e2e8f0",
              borderRadius: "10px",
              fontSize: "16px",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "12px 16px",
              border: "2px solid #e2e8f0",
              borderRadius: "10px",
              fontSize: "16px",
            }}
          />

          {error && (
            <div
              style={{
                color: "#e53e3e",
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "14px",
              background: "#1a0dab",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading
              ? "Loading..."
              : isRegistering
              ? "Create Account"
              : "Sign In"}
          </button>
        </div>

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          style={{
            background: "none",
            border: "none",
            color: "#1a0dab",
            fontSize: "14px",
            cursor: "pointer",
            marginTop: "20px",
            width: "100%",
          }}
        >
          {isRegistering
            ? "Already have an account? Sign in"
            : "Need an account? Register"}
        </button>
      </div>
    </div>
  );
}

// User's Cats List Component
function UserCatsScreen({
  onBack,
  currentUser,
}: {
  onBack: () => void;
  currentUser: User;
}) {
  const [userCats, setUserCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserCats = async () => {
      try {
        const q = query(
          collection(db, "cats"),
          where("creatorId", "==", currentUser.uid),
          orderBy("createdDate", "desc")
        );
        const querySnapshot = await getDocs(q);
        const cats = querySnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        })) as Cat[];
        setUserCats(cats);
      } catch (error) {
        console.error("Error fetching user cats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserCats();
  }, [currentUser.uid]);

  return (
    <div
      style={{
        position: "fixed",
        top: "72px",
        left: 0,
        right: 0,
        bottom: "60px",
        background: "white",
        zIndex: 1500,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "white",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          borderBottom: "1px solid #e5e7eb",
          zIndex: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            padding: "8px",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          <ArrowBackIcon />
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>
          My Cats ({userCats.length})
        </h2>
      </div>

      <div style={{ padding: "20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            Loading your cats...
          </div>
        ) : userCats.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🐱</div>
            <p>You haven't added any cats yet!</p>
            <p>Start by adding a cat to the map.</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            {userCats.map((cat) => (
              <div
                key={cat.id}
                style={{
                  background: "white",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "260px",
                    background: "#f3f4f6",
                  }}
                >
                  {cat.photos[0] ? (
                    <img
                      src={cat.photos[0].url}
                      alt={cat.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#9ca3af",
                        fontSize: "14px",
                      }}
                    >
                      No photo
                    </div>
                  )}
                </div>
                <div style={{ padding: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>{cat.emoji}</span>
                    <h4
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        margin: 0,
                        color: "#111827",
                      }}
                    >
                      {cat.name}
                    </h4>
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    <div>📍 {cat.location.area}</div>
                    <div>
                      📅 Added {formatDate(cat.createdDate)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// User's Photos Gallery Component
function UserPhotosScreen({
  onBack,
  currentUser,
}: {
  onBack: () => void;
  currentUser: User;
}) {
  const [userPhotos, setUserPhotos] = useState<
    (CatPhoto & { catName: string })[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPhotos = async () => {
      try {
        const q = query(collection(db, "cats"));
        const querySnapshot = await getDocs(q);
        const allPhotos: (CatPhoto & { catName: string })[] = [];

        querySnapshot.docs.forEach((doc: any) => {
          const catData = doc.data() as Cat;
          const userCatPhotos = catData.photos
            .filter((photo) => photo.contributorId === currentUser.uid)
            .map((photo) => ({ ...photo, catName: catData.name }));
          allPhotos.push(...userCatPhotos);
        });

        // Sort by date (newest first)
        allPhotos.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setUserPhotos(allPhotos);
      } catch (error) {
        console.error("Error fetching user photos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPhotos();
  }, [currentUser.uid]);

  return (
    <div
      style={{
        position: "fixed",
        top: "72px",
        left: 0,
        right: 0,
        bottom: "60px",
        background: "white",
        zIndex: 1500,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "white",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          borderBottom: "1px solid #e5e7eb",
          zIndex: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            padding: "8px",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          <ArrowBackIcon />
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>
          My Photos ({userPhotos.length})
        </h2>
      </div>

      <div style={{ padding: "20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            Loading your photos...
          </div>
        ) : userPhotos.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📸</div>
            <p>You haven't uploaded any photos yet!</p>
            <p>Start by adding photos to cat profiles.</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "12px",
            }}
          >
            {userPhotos.map((photo, index) => (
              <div
                key={photo.id || index}
                style={{
                  position: "relative",
                  aspectRatio: "1",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
              >
                <img
                  src={photo.url}
                  alt={`Photo of ${photo.catName}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                    color: "white",
                    padding: "8px",
                    fontSize: "12px",
                  }}
                >
                  {photo.catName}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// User's Visited Cats Component
function UserVisitsScreen({
  onBack,
  currentUser,
}: {
  onBack: () => void;
  currentUser: User;
}) {
  const [visitedCats, setVisitedCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisitedCats = async () => {
      try {
        const q = query(collection(db, "cats"));
        const querySnapshot = await getDocs(q);
        const cats = querySnapshot.docs
          .map((doc: any) => ({ id: doc.id, ...doc.data() }))
          .filter(
            (cat: any) => cat.userVisits && cat.userVisits[currentUser.uid] > 0
          ) as Cat[];

        // Sort by visit count (most visited first)
        cats.sort(
          (a, b) =>
            (b.userVisits?.[currentUser.uid] || 0) -
            (a.userVisits?.[currentUser.uid] || 0)
        );
        setVisitedCats(cats);
      } catch (error) {
        console.error("Error fetching visited cats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVisitedCats();
  }, [currentUser.uid]);

  return (
    <div
      style={{
        position: "fixed",
        top: "72px",
        left: 0,
        right: 0,
        bottom: "60px",
        background: "white",
        zIndex: 1500,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "white",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          borderBottom: "1px solid #e5e7eb",
          zIndex: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            padding: "8px",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          <ArrowBackIcon />
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>
          Visited Cats ({visitedCats.length})
        </h2>
      </div>

      <div style={{ padding: "20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            Loading visited cats...
          </div>
        ) : visitedCats.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🐾</div>
            <p>You haven't visited any cats yet!</p>
            <p>Mark cats as visited when you see them.</p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {visitedCats.map((cat) => (
              <div
                key={cat.id}
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "16px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    background: "#f3f4f6",
                    flexShrink: 0,
                  }}
                >
                  {cat.photos[0] ? (
                    <img
                      src={cat.photos[0].url}
                      alt={cat.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                      }}
                    >
                      {cat.emoji}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>{cat.emoji}</span>
                    <h4
                      style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}
                    >
                      {cat.name}
                    </h4>
                  </div>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      margin: "0 0 8px 0",
                    }}
                  >
                    📍 {cat.location.area}, {cat.location.city}
                  </p>
                  <div
                    style={{
                      background: "rgba(26,13,171,0.08)",
                      color: "#1a0dab",
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "500",
                      display: "inline-block",
                    }}
                  >
                    Visited {cat.userVisits?.[currentUser.uid] || 0} times
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Map Snapshot Component for location display
function MapSnapshot({
  lat,
  lng,
  zoom = 16,
  blur = false,
}: {
  lat: number;
  lng: number;
  zoom?: number;
  blur?: boolean;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (mapRef.current && window.L && !mapInstanceRef.current) {
      const timer = setTimeout(() => {
        const map = window.L.map(mapRef.current, {
          center: [lat, lng],
          zoom: blur ? zoom - 2 : zoom,
          zoomControl: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          dragging: false,
          touchZoom: false,
          boxZoom: false,
          keyboard: false,
          attributionControl: false,
        });

        window.L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        ).addTo(map);

        const locationIcon = window.L.divIcon({
          html: '<div style="width: 12px; height: 12px; background: #ef4444; border: 2px solid white; border-radius: 50%; box-shadow: 0 1px 4px rgba(239, 68, 68, 0.5);"></div>',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });

        // Slightly randomise pin position for privacy when blurred
        const displayLat = blur ? lat + (Math.random() - 0.5) * 0.002 : lat;
        const displayLng = blur ? lng + (Math.random() - 0.5) * 0.002 : lng;

        window.L.marker([displayLat, displayLng], { icon: locationIcon }).addTo(map);
        mapInstanceRef.current = map;
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [lat, lng, zoom, blur]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "12px",
        overflow: "hidden",
        filter: blur ? "blur(2px)" : "none",
        opacity: blur ? 0.8 : 1,
      }}
    />
  );
}

// Filter Modal Component
function FilterModal({
  filters,
  onUpdateFilters,
  onClose,
}: {
  filters: FilterState;
  onUpdateFilters: (newFilters: FilterState) => void;
  onClose: () => void;
}) {
  const [tempFilters, setTempFilters] = useState(filters);

  const handleApply = () => {
    onUpdateFilters(tempFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      emoji: null,
      personality: [],
      allowsPetting: null,
      acceptsTreats: null,
      livingLocation: null,
    };
    setTempFilters(resetFilters);
    onUpdateFilters(resetFilters);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        zIndex: 2000,
        display: "flex",
        alignItems: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          width: "100%",
          maxHeight: "80vh",
          borderRadius: "24px 24px 0 0",
          padding: "24px",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>
            Filter Cats
          </h2>
          <button
            onClick={handleReset}
            style={{
              background: "none",
              border: "none",
              color: "#1a0dab",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>

        {/* Emoji Filter */}
        <div style={{ marginBottom: "24px" }}>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "500",
              marginBottom: "12px",
            }}
          >
            Cat Color
          </h3>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {CAT_EMOJIS.map((catEmoji) => (
              <button
                key={catEmoji.emoji}
                onClick={() =>
                  setTempFilters((prev) => ({
                    ...prev,
                    emoji:
                      prev.emoji === catEmoji.emoji ? null : catEmoji.emoji,
                  }))
                }
                style={{
                  fontSize: "28px",
                  padding: "8px",
                  borderRadius: "12px",
                  background:
                    tempFilters.emoji === catEmoji.emoji
                      ? "rgba(26,13,171,0.08)"
                      : "#f3f4f6",
                  border:
                    tempFilters.emoji === catEmoji.emoji
                      ? "2px solid #1a0dab"
                      : "2px solid transparent",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>{catEmoji.emoji}</span>
                <span style={{ fontSize: "10px", color: "#6b7280" }}>
                  {catEmoji.label.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Personality Filter */}
        <div style={{ marginBottom: "24px" }}>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "500",
              marginBottom: "12px",
            }}
          >
            Personality Traits
          </h3>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {PERSONALITY_TRAITS.map((trait) => (
              <button
                key={trait}
                onClick={() =>
                  setTempFilters((prev) => ({
                    ...prev,
                    personality: prev.personality.includes(trait)
                      ? prev.personality.filter((t) => t !== trait)
                      : [...prev.personality, trait],
                  }))
                }
                style={{
                  padding: "6px 16px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  background: tempFilters.personality.includes(trait)
                    ? "rgba(26,13,171,0.08)"
                    : "#f3f4f6",
                  color: tempFilters.personality.includes(trait)
                    ? "#1a0dab"
                    : "#6b7280",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {trait}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleApply}
          style={{
            width: "100%",
            padding: "16px",
            background: "#1a0dab",
            color: "white",
            border: "none",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}

// Add Cat Form Component
function AddCatForm({
  userLocation,
  manualLocation,
  onSubmit,
  onCancel,
  currentUser,
  userProfile,
}: {
  userLocation: [number, number] | null;
  manualLocation: [number, number] | null;
  onSubmit: (cat: Partial<Cat>) => void;
  onCancel: () => void;
  currentUser: User | null;
  userProfile: UserProfile | null;
}) {
  const [selectedEmoji, setSelectedEmoji] = useState(CAT_EMOJIS[0].emoji);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [allowsPetting, _setAllowsPetting] = useState<boolean | null>(null);
  const [acceptsTreats, _setAcceptsTreats] = useState<boolean | null>(null);
  const [favoriteTreats, _setFavoriteTreats] = useState("");
  const [livingLocation, _setLivingLocation] = useState<
    "indoor" | "outdoor" | "both" | null
  >(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoObjectPosition, setPhotoObjectPosition] = useState(DEFAULT_CAT_PHOTO_POSITION);
  const [approximateAddress, setApproximateAddress] = useState("");
  const [uploading, setUploading] = useState(false);

  const location = manualLocation || userLocation;

  const handleSubmit = async () => {
    if (!name || !location || !currentUser || !userProfile) return;

    setUploading(true);

    try {
      // Create the cat document first
      const catData = {
        name,
        emoji: selectedEmoji,
        description,
        personality: selectedTraits,
        allowsPetting,
        acceptsTreats,
        favoriteTreats: favoriteTreats
          ? favoriteTreats.split(",").map((t) => t.trim())
          : [],
        livingLocation,
        location: {
          lat: location[0],
          lng: location[1],
          area: "Local Area",
          city: "London",
          country: "United Kingdom",
          continent: "Europe",
          approximateAddress:
            approximateAddress || fuzzyLocation(location[0], location[1]),
        },
        createdDate: serverTimestamp(),
        totalVisits: 0,
        userVisits: {},
        visits: [],
        slowBlinks: [],
        creator: userProfile.displayName,
        creatorId: currentUser.uid,
        contributors: [
          {
            id: currentUser.uid,
            name: userProfile.displayName,
            type: "creator" as const,
            contributions: 1,
          },
        ],
        photos: [],
        descriptions: [],
      };

      const docRef = await addDoc(collection(db, "cats"), catData);

      // Upload photo if provided
      if (photoFile) {
        const photoURL = await uploadPhotoToStorage(
          photoFile,
          docRef.id,
          currentUser.uid
        );
        const photoData = {
          id: `${docRef.id}_${Date.now()}`,
          url: photoURL,
          contributor: userProfile.displayName,
          contributorId: currentUser.uid,
          date: new Date().toISOString(),
          uploadedAt: new Date().toISOString(),
          objectPosition: photoObjectPosition,
        };

        await updateDoc(docRef, {
          photos: arrayUnion(photoData),
        });
      }

      // Update user profile
      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", currentUser.uid)
      );
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        await updateDoc(userDoc.ref, {
          catsFound: increment(1),
          totalContributions: increment(1),
          ...(photoFile && { photosAdded: increment(1) }),
        });
      }

      onSubmit({ id: docRef.id, ...catData } as unknown as Partial<Cat>);
    } catch (error) {
      console.error("Error adding cat:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "72px",
        left: 0,
        right: 0,
        bottom: "60px",
        background: "white",
        zIndex: 1500,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "white",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb",
          zIndex: 10,
        }}
      >
        <button
          onClick={onCancel}
          style={{
            background: "none",
            border: "none",
            padding: "8px",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          <XIcon />
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>
          Add New Cat
        </h2>
        <button
          onClick={handleSubmit}
          disabled={!name || uploading}
          style={{
            color: "#1a0dab",
            fontWeight: "500",
            background: "none",
            border: "none",
            cursor: name && !uploading ? "pointer" : "not-allowed",
            fontSize: "16px",
            opacity: name && !uploading ? 1 : 0.5,
          }}
        >
          {uploading ? "Saving..." : "Save"}
        </button>
      </div>

      <div
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Location Notice */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px",
            background: "#f3f4f6",
            borderRadius: "12px",
            fontSize: "14px",
            color: "#4b5563",
          }}
        >
          <span>📍</span>
          {manualLocation
            ? "Using manually selected location"
            : "Using your current location"}
        </div>

        {/* Approximate Address */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "8px",
              color: "#111827",
            }}
          >
            Approximate Address
          </label>
          <input
            type="text"
            value={approximateAddress}
            onChange={(e) => setApproximateAddress(e.target.value)}
            placeholder="e.g., Near High Street & Park Lane"
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              fontSize: "16px",
            }}
          />
        </div>

        {/* Emoji Selection */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "8px",
              color: "#111827",
            }}
          >
            Choose Cat Color
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {CAT_EMOJIS.map((catEmoji) => (
              <button
                key={catEmoji.emoji}
                onClick={() => setSelectedEmoji(catEmoji.emoji)}
                style={{
                  fontSize: "24px",
                  padding: "8px",
                  borderRadius: "12px",
                  background:
                    selectedEmoji === catEmoji.emoji ? "rgba(26,13,171,0.08)" : "#f3f4f6",
                  border:
                    selectedEmoji === catEmoji.emoji
                      ? "2px solid #1a0dab"
                      : "2px solid transparent",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>{catEmoji.emoji}</span>
                <span style={{ fontSize: "10px", color: "#6b7280" }}>
                  {catEmoji.label.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "8px",
              color: "#111827",
            }}
          >
            Cat Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter cat's name"
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              fontSize: "16px",
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "8px",
              color: "#111827",
            }}
          >
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Tell us about this cat..."
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              fontSize: "16px",
              resize: "vertical",
            }}
          />
        </div>

        {/* Personality Traits */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "8px",
              color: "#111827",
            }}
          >
            Personality Traits
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {PERSONALITY_TRAITS.map((trait) => (
              <button
                key={trait}
                onClick={() => {
                  setSelectedTraits((prev) =>
                    prev.includes(trait)
                      ? prev.filter((t) => t !== trait)
                      : [...prev, trait]
                  );
                }}
                style={{
                  padding: "6px 16px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  background: selectedTraits.includes(trait)
                    ? "rgba(26,13,171,0.08)"
                    : "#f3f4f6",
                  color: selectedTraits.includes(trait) ? "#1a0dab" : "#6b7280",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {trait}
              </button>
            ))}
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#111827" }}>
            Add Photo
          </label>
          <PhotoCaptureButton
            onPhotoSelected={(file) => {
              setPhotoFile(file);
              setPhotoObjectPosition(DEFAULT_CAT_PHOTO_POSITION);
              const reader = new FileReader();
              reader.onloadend = () => setPhotoPreview(reader.result as string);
              reader.readAsDataURL(file);
            }}
            style={{ border: "2px dashed #d1d5db", borderRadius: "12px", padding: "32px", textAlign: "center", cursor: "pointer" }}
          >
            <>
              <CameraIcon />
              <p style={{ marginTop: "8px", color: "#6b7280", fontSize: "14px" }}>
                {photoPreview ? "Tap to change photo" : "Tap to add photo"}
              </p>
            </>
          </PhotoCaptureButton>
          {photoPreview && (
            <div style={{ marginTop: "12px" }}>
              <PhotoFocusPicker
                imageUrl={photoPreview}
                objectPosition={photoObjectPosition}
                onChange={setPhotoObjectPosition}
                height={220}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// Public profile preview shown from visitor lists
function PublicUserProfileModal({
  profile,
  onClose,
}: {
  profile: UserProfile;
  onClose: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "white", zIndex: 2600, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, background: "white", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb", zIndex: 10 }}>
        <h2 style={{ margin: 0 }}>{profile.displayName}</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", padding: "8px", cursor: "pointer", color: "#6b7280" }} aria-label="Close profile">
          <XIcon />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px 96px" }}>
        <div style={{ width: "120px", height: "120px", background: "#e5e7eb", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px", overflow: "hidden" }}>
          {profile.profilePicture ? (
            <img src={profile.profilePicture} alt={`${profile.displayName} profile`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <UserIcon />
          )}
        </div>

        <h3 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px", color: "#111827" }}>{profile.displayName}</h3>
        <p style={{ fontSize: "16px", color: "#1a0dab", margin: "0 0 8px", fontWeight: 600 }}>
          {profile.identity === "human-of-cat" ? "Human of a cat" : "Unattached catwalker"}
        </p>
        {profile.location && (
          <p style={{ fontSize: "16px", color: "#6b7280", margin: "0 0 8px" }}>📍 {profile.location}</p>
        )}
        <p style={{ fontSize: "14px", color: "#9ca3af", margin: "0 0 32px" }}>
          On the Catwalk since {profile.joinDate && formatDate(profile.joinDate)}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", width: "100%", maxWidth: "420px" }}>
          <div style={{ textAlign: "center", padding: "18px", background: "#f9fafb", borderRadius: "14px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: "32px", fontWeight: 800, color: "#1a0dab", marginBottom: "6px" }}>{profile.catsFound || 0}</div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>Cats added</div>
          </div>
          <div style={{ textAlign: "center", padding: "18px", background: "#f9fafb", borderRadius: "14px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: "32px", fontWeight: 800, color: "#1a0dab", marginBottom: "6px" }}>{profile.photosAdded || 0}</div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>Photos added</div>
          </div>
          <div style={{ textAlign: "center", padding: "18px", background: "#f9fafb", borderRadius: "14px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: "32px", fontWeight: 800, color: "#1a0dab", marginBottom: "6px" }}>{profile.totalContributions || 0}</div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>Info contributed</div>
          </div>
          <div style={{ textAlign: "center", padding: "18px", background: "#f9fafb", borderRadius: "14px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: "32px", fontWeight: 800, color: "#1a0dab", marginBottom: "6px" }}>{profile.catsVisited?.length || 0}</div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>Cats visited</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Cat Profile Component - Updated with auth requirement
function CatProfile({
  cat,
  onClose,
  currentUser,
  onVisit,
  onSlowBlink,
  onAddPhoto,
  onUpdatePhotoPosition,
  onDeletePhoto,
  onDeleteVisit,
  onContribute,
  onAuthRequired,
}: {
  cat: Cat;
  onClose: () => void;
  currentUser: User | null;
  onVisit: () => void;
  onSlowBlink: () => void;
  onAddPhoto: (file: File, objectPosition?: string) => void | Promise<void>;
  onUpdatePhotoPosition: (photoId: string, objectPosition: string) => void | Promise<void>;
  onDeletePhoto: (photoId: string) => void | Promise<void>;
  onDeleteVisit: (visitDate: string) => void | Promise<void>;
  onContribute: () => void;
  onAuthRequired: () => void;
}) {
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showVisitList, setShowVisitList] = useState(false);
  const [showMyVisitDetails, setShowMyVisitDetails] = useState(false);
  const [selectedVisitorProfile, setSelectedVisitorProfile] = useState<UserProfile | null>(null);
  const [loadingVisitorProfileId, setLoadingVisitorProfileId] = useState<string | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(null);
  const [pendingPhotoObjectPosition, setPendingPhotoObjectPosition] = useState(DEFAULT_CAT_PHOTO_POSITION);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userVisitCount =
    currentUser && cat.userVisits ? cat.userVisits[currentUser.uid] || 0 : 0;

  const canEditPhotoPosition = (photo: CatPhoto) =>
    Boolean(currentUser && (photo.contributorId === currentUser.uid || cat.creatorId === currentUser.uid));

  const visitorSummaries = Object.values(
    (cat.visits || []).reduce<Record<string, { userId: string; userName: string; count: number; latestDate: string }>>((acc, visit) => {
      const userId = visit.userId || "unknown";
      const existing = acc[userId];
      const visitDate = visit.date || "";
      if (!existing) {
        acc[userId] = {
          userId,
          userName: visit.userName || "Catwalker",
          count: 1,
          latestDate: visitDate,
        };
      } else {
        existing.count += 1;
        if (visitDate > existing.latestDate) existing.latestDate = visitDate;
      }
      return acc;
    }, {})
  ).sort((a, b) => b.latestDate.localeCompare(a.latestDate));

  const myVisits = currentUser
    ? (cat.visits || []).filter((visit) => visit.userId === currentUser.uid).sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const myPhotosByDate = currentUser
    ? (cat.photos || []).filter((photo) => photo.contributorId === currentUser.uid).reduce<Record<string, CatPhoto[]>>((acc, photo) => {
        const dateKey = getDateKey(photo.date || photo.uploadedAt);
        acc[dateKey] = [...(acc[dateKey] || []), photo];
        return acc;
      }, {})
    : {};

  const handleOpenVisitorProfile = async (visitor: { userId: string; userName: string }) => {
    if (!visitor.userId || visitor.userId === "unknown") {
      alert("This visitor profile isn’t available.");
      return;
    }

    setLoadingVisitorProfileId(visitor.userId);
    try {
      const profile = await getUserProfile(visitor.userId);
      if (profile) {
        setSelectedVisitorProfile(profile);
      } else {
        alert(`${visitor.userName}'s profile could not be found.`);
      }
    } catch (error) {
      console.error("Error opening visitor profile:", error);
      alert("Sorry, this profile couldn’t be opened right now.");
    } finally {
      setLoadingVisitorProfileId(null);
    }
  };

  const handleDeletePhoto = async (photo: CatPhoto) => {
    if (!canEditPhotoPosition(photo)) return;

    const confirmed = window.confirm("Delete this photo from the cat profile?");
    if (!confirmed) return;

    await onDeletePhoto(photo.id);
  };

  const handlePhotoClick = () => {
    if (!currentUser) {
      onAuthRequired();
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPendingPhotoFile(file);
    setPendingPhotoObjectPosition(DEFAULT_CAT_PHOTO_POSITION);
    const reader = new FileReader();
    reader.onloadend = () => setPendingPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleConfirmPhotoUpload = async () => {
    if (!pendingPhotoFile) return;
    await onAddPhoto(pendingPhotoFile, pendingPhotoObjectPosition);
    setPendingPhotoFile(null);
    setPendingPhotoPreview(null);
    setPendingPhotoObjectPosition(DEFAULT_CAT_PHOTO_POSITION);
  };

  const handleActionClick = (action: () => void) => {
    if (!currentUser) {
      onAuthRequired();
      return;
    }
    action();
  };

  if (showVisitList) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "white", zIndex: 2200, overflowY: "auto" }}>
        {selectedVisitorProfile && (
          <PublicUserProfileModal profile={selectedVisitorProfile} onClose={() => setSelectedVisitorProfile(null)} />
        )}
        <div style={{ position: "sticky", top: 0, background: "white", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb", zIndex: 10 }}>
          <h2 style={{ margin: 0 }}>Visits to {cat.name}</h2>
          <button onClick={() => setShowVisitList(false)} style={{ background: "none", border: "none", padding: "8px", cursor: "pointer", color: "#6b7280" }}><XIcon /></button>
        </div>
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {visitorSummaries.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No visits logged yet.</p>
          ) : (
            visitorSummaries.map((visitor) => (
              <button
                key={visitor.userId}
                type="button"
                onClick={() => handleOpenVisitorProfile(visitor)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, color: "#111827", marginBottom: "4px" }}>{visitor.userName}</div>
                <div style={{ fontSize: "14px", color: "#6b7280" }}>
                  {loadingVisitorProfileId === visitor.userId
                    ? "Opening profile…"
                    : `${visitor.count} ${visitor.count === 1 ? "visit" : "visits"} · Last visited ${formatDate(visitor.latestDate)}`}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  if (showMyVisitDetails) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "white", zIndex: 2200, overflowY: "auto" }}>
        <div style={{ position: "sticky", top: 0, background: "white", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb", zIndex: 10 }}>
          <h2 style={{ margin: 0 }}>Your visits to {cat.name}</h2>
          <button onClick={() => setShowMyVisitDetails(false)} style={{ background: "none", border: "none", padding: "8px", cursor: "pointer", color: "#6b7280" }}><XIcon /></button>
        </div>
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {myVisits.length === 0 ? (
            <p style={{ color: "#6b7280" }}>You haven’t logged a visit to this cat yet.</p>
          ) : (
            myVisits.map((visit, index) => {
              const dateKey = getDateKey(visit.date);
              const photosForDate = myPhotosByDate[dateKey] || [];
              return (
                <div key={`${visit.date}-${index}`} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: photosForDate.length ? "10px" : 0 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#111827" }}>
                        {formatDateTime(visit.date)}
                      </div>
                      {photosForDate.length > 0 && (
                        <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "3px" }}>
                          {photosForDate.length} {photosForDate.length === 1 ? "photo" : "photos"} uploaded on this date
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = window.confirm("Delete this visit from your visit history?");
                        if (!confirmed) return;
                        await onDeleteVisit(visit.date);
                      }}
                      style={{
                        border: "1px solid #fecaca",
                        background: "#fff1f2",
                        color: "#b91c1c",
                        borderRadius: "999px",
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: "13px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Delete visit
                    </button>
                  </div>
                  {photosForDate.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "8px" }}>
                      {photosForDate.map((photo) => (
                        <img key={photo.id} src={photo.url} alt={`${cat.name} uploaded on this visit`} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", objectPosition: getCatPhotoPosition(photo), borderRadius: "10px" }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (showAllPhotos) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "white",
          zIndex: 2000,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "white",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e5e7eb",
            zIndex: 10,
          }}
        >
          <h2>Photos of {cat.name}</h2>
          <button
            onClick={() => setShowAllPhotos(false)}
            style={{
              background: "none",
              border: "none",
              padding: "8px",
              cursor: "pointer",
              color: "#6b7280",
            }}
          >
            <XIcon />
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            padding: "20px",
          }}
        >
          {cat.photos.map((photo, index) => (
            <div key={photo.id || index} style={{ position: "relative" }}>
              <div
                style={{
                  position: "relative",
                  aspectRatio: "1",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "#f3f4f6",
                }}
              >
                <img
                  src={photo.url}
                  alt={`${cat.name} photo ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: getCatPhotoPosition(photo),
                  }}
                />
                {canEditPhotoPosition(photo) && (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      display: "flex",
                      gap: "8px",
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Edit photo focus"
                      onClick={() => setEditingPhotoId((prev) => prev === photo.id ? null : photo.id)}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "999px",
                        border: "none",
                        background: "rgba(255,255,255,0.92)",
                        color: "#111827",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      }}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete photo"
                      onClick={() => handleDeletePhoto(photo)}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "999px",
                        border: "none",
                        background: "rgba(255,255,255,0.92)",
                        color: "#dc2626",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                )}
              </div>
              {canEditPhotoPosition(photo) && editingPhotoId === photo.id && (
                <div style={{ marginTop: "8px" }}>
                  <PhotoFocusPicker
                    imageUrl={photo.url}
                    objectPosition={getCatPhotoPosition(photo)}
                    onChange={(position) => onUpdatePhotoPosition(photo.id, position)}
                    height={180}
                  />
                </div>
              )}
              <div
                style={{
                  textAlign: "center",
                  fontSize: "14px",
                  color: "#6b7280",
                  marginTop: "8px",
                }}
              >
                Photo {index + 1} of {cat.photos.length}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "72px",
        left: 0,
        right: 0,
        bottom: "60px",
        background: "white",
        zIndex: 1500,
        overflowY: "auto",
      }}
    >
      {pendingPhotoPreview && pendingPhotoFile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "20px",
              width: "min(520px, 100%)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            }}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 700 }}>Choose photo focus</h3>
            <PhotoFocusPicker
              imageUrl={pendingPhotoPreview}
              objectPosition={pendingPhotoObjectPosition}
              onChange={setPendingPhotoObjectPosition}
              height={300}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => {
                  setPendingPhotoFile(null);
                  setPendingPhotoPreview(null);
                  setPendingPhotoObjectPosition(DEFAULT_CAT_PHOTO_POSITION);
                }}
                style={{ padding: "10px 14px", borderRadius: "999px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPhotoUpload}
                style={{ padding: "10px 16px", borderRadius: "999px", border: "none", background: "#1a0dab", color: "white", cursor: "pointer", fontWeight: 600 }}
              >
                Add photo
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "white",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb",
          zIndex: 10,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            padding: "8px",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          <XIcon />
        </button>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              border: "none",
              borderRadius: "20px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: "pointer",
              background: "#10b981",
              color: "white",
            }}
            onClick={() => handleActionClick(onContribute)}
          >
            <EditIcon /> {currentUser ? "Contribute" : "Sign in to Contribute"}
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              border: "none",
              borderRadius: "20px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: "pointer",
              background: "#3b82f6",
              color: "white",
            }}
            onClick={handlePhotoClick}
          >
            <CameraIcon /> {currentUser ? "Add Photo" : "Sign in to Add Photo"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <span style={{ fontSize: "48px" }}>{cat.emoji}</span>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "700", margin: 0 }}>
              {cat.name}
            </h1>
            {cat.alternativeNames && cat.alternativeNames.length > 0 && (
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: "16px",
                  color: "#6b7280",
                }}
              >
                Also known as: {cat.alternativeNames.join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Visit and Slow Blink buttons */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
          <button
            onClick={() => handleActionClick(onVisit)}
            style={{
              flex: 1,
              padding: "12px 20px",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: "pointer",
              background: userVisitCount > 0 ? "#d1fae5" : "#f3f4f6",
              color: userVisitCount > 0 ? "#065f46" : "#4b5563",
            }}
          >
            {currentUser
              ? userVisitCount > 0
                ? `Visited ✓ x${userVisitCount}`
                : "Mark as Visited"
              : "Sign in to Mark Visited"}
          </button>
          <button
            onClick={() => handleActionClick(onSlowBlink)}
            style={{
              flex: 1,
              padding: "12px 20px",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: "pointer",
              background: "#fef3c7",
              color: "#92400e",
            }}
          >
            😊{" "}
            {currentUser
              ? `Slow Blink (${cat.slowBlinks.length})`
              : "Sign in to Slow Blink"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "24px",
            fontSize: "14px",
            color: "#6b7280",
          }}
        >
          <button
            type="button"
            onClick={() => setShowVisitList(true)}
            style={{ border: "none", background: "none", color: "#1a0dab", padding: 0, cursor: "pointer", fontSize: "14px", textDecoration: "underline" }}
          >
            Total visits: {cat.totalVisits}
          </button>
          <button
            type="button"
            onClick={() => currentUser ? setShowMyVisitDetails(true) : onAuthRequired()}
            style={{ border: "none", background: "none", color: "#1a0dab", padding: 0, cursor: "pointer", fontSize: "14px", textDecoration: "underline" }}
          >
            Your visits: {userVisitCount}
          </button>

        </div>

        {cat.photos.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                marginBottom: "16px",
              }}
            >
              Photos ({cat.photos.length})
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              {cat.photos.slice(0, 2).map((photo, index) => (
                <div
                  key={photo.id || index}
                  style={{
                    position: "relative",
                    aspectRatio: "1",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={photo.url}
                    alt={`${cat.name} photo ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: getCatPhotoPosition(photo),
                    }}
                  />
                </div>
              ))}
            </div>
            {(cat.photos.length > 2 || cat.photos.some(canEditPhotoPosition)) && (
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "#1a0dab",
                  fontSize: "16px",
                  fontWeight: "500",
                  cursor: "pointer",
                  textDecoration: "none",
                }}
                onClick={() => setShowAllPhotos(true)}
              >
                {cat.photos.length > 2 ? `View all ${cat.photos.length} photos` : "Edit photo focus"}
              </button>
            )}
          </div>
        )}

        <p
          style={{
            fontSize: "16px",
            color: "#4b5563",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          {cat.description}
        </p>

        <div style={{ marginBottom: "32px" }}>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            What we know about this cat:
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}
            >
              <span style={{ fontSize: "20px" }}>📍</span>
              <div>
                <div>
                  {cat.location.area}, {cat.location.city}
                </div>
                <div style={{ color: "#6b7280", fontSize: "14px" }}>
                  {cat.location.approximateAddress}
                </div>
              </div>
            </div>
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}
            >
              <span style={{ fontSize: "20px" }}>🌍</span>
              <div>{cat.location.country}</div>
            </div>
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}
            >
              <span style={{ fontSize: "20px" }}>📅</span>
              <div>
                Added {formatDate(cat.createdDate, { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
            {cat.allowsPetting && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "20px" }}>🤗</span>
                <div>Likes being petted</div>
              </div>
            )}
            {cat.acceptsTreats && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "20px" }}>🍖</span>
                <div>Likes treats</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "32px" }}>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            Characteristics:
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {cat.personality.map((trait) => (
              <span
                key={trait}
                style={{
                  padding: "4px 12px",
                  background: "transparent",
                  color: "#1a0dab",
                  borderRadius: "12px",
                  fontSize: "14px",
                }}
              >
                {trait}
              </span>
            ))}
          </div>
        </div>

        {/* Location Display with Map Snapshot */}
        <div style={{ marginBottom: "32px" }}>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            Location
          </h3>
          <div
            style={{
              background: "#f9fafb",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ height: "200px", marginBottom: "12px" }}>
              <MapSnapshot lat={cat.location.lat} lng={cat.location.lng} blur={true} />
            </div>
            <div
              style={{
                textAlign: "center",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                {cat.location.approximateAddress}
              </div>
              <div>
                {cat.location.area}, {cat.location.city}
              </div>
              <div style={{ fontSize: "12px", marginTop: "8px" }}>
                📍 Fuzzed location for privacy
              </div>
            </div>
          </div>
        </div>

        {/* Community Descriptions */}
        {cat.descriptions && cat.descriptions.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>
              Community Descriptions
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {cat.descriptions.map((desc) => (
                <div key={desc.id} style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "600", textTransform: "capitalize", background: "rgba(26,13,171,0.08)", color: "#1a0dab", padding: "2px 8px", borderRadius: "12px" }}>
                      {desc.type}
                    </span>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                      {formatDate(desc.date)}
                    </span>
                  </div>
                  <p style={{ fontSize: "15px", color: "#111827", lineHeight: "1.6", margin: "0 0 8px 0" }}>{desc.text}</p>
                  <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>— {desc.contributor}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function ContributeForm({
  cat,
  onSubmit,
  onCancel,
  currentUser,
  userProfile,
}: {
  cat: Cat;
  onSubmit: (updates: Partial<Cat>) => void;
  onCancel: () => void;
  currentUser: User | null;
  userProfile: UserProfile | null;
}) {
  const [description, setDescription] = useState(cat.description || "");
  const [selectedTraits, setSelectedTraits] = useState<string[]>(
    cat.personality || []
  );
  const [allowsPetting, _setAllowsPetting] = useState<boolean | null>(
    cat.allowsPetting
  );
  const [acceptsTreats, _setAcceptsTreats] = useState<boolean | null>(
    cat.acceptsTreats
  );
  const [favoriteTreats, _setFavoriteTreats] = useState(
    cat.favoriteTreats?.join(", ") || ""
  );
  const [livingLocation, _setLivingLocation] = useState<
    "indoor" | "outdoor" | "both" | null
  >(cat.livingLocation);
  const [alternativeNames, setAlternativeNames] = useState(
    cat.alternativeNames?.join(", ") || ""
  );
  const [newDescription, setNewDescription] = useState("");
  const [descriptionType, setDescriptionType] = useState<"description" | "anecdote" | "behavior">("description");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!currentUser || !userProfile) return;

    setSaving(true);

    try {
      const updates: any = {
        description,
        personality: selectedTraits,
        allowsPetting,
        acceptsTreats,
        favoriteTreats: favoriteTreats
          ? favoriteTreats
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t)
          : [],
        livingLocation,
        alternativeNames: alternativeNames
          ? alternativeNames
              .split(",")
              .map((n) => n.trim())
              .filter((n) => n)
          : [],
      };

      // Add community description if provided
      if (newDescription.trim()) {
        const newDescObj: Description = {
          id: `desc_${Date.now()}`,
          text: newDescription.trim(),
          contributor: userProfile.displayName,
          contributorId: currentUser.uid,
          date: new Date().toISOString(),
          type: descriptionType,
        };
        updates.descriptions = arrayUnion(newDescObj);
      }

      // Update in Firebase
      const catDoc = doc(db, "cats", cat.id);
      await updateDoc(catDoc, updates);

      // Update user contribution count
      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", currentUser.uid)
      );
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        await updateDoc(userDoc.ref, {
          totalContributions: increment(1),
        });
      }

      onSubmit(updates);
    } catch (error) {
      console.error("Error saving contribution:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "72px",
        left: 0,
        right: 0,
        bottom: "60px",
        background: "white",
        zIndex: 1500,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "white",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb",
          zIndex: 10,
        }}
      >
        <button
          onClick={onCancel}
          style={{
            background: "none",
            border: "none",
            padding: "8px",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          <XIcon />
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>
          Contribute to {cat.name}
        </h2>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            color: "#1a0dab",
            fontWeight: "500",
            background: "none",
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: "16px",
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Cat Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "16px",
            background: "#f9fafb",
            borderRadius: "12px",
          }}
        >
          <span style={{ fontSize: "32px" }}>{cat.emoji}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "20px" }}>{cat.name}</h3>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
              {cat.location.area}, {cat.location.city}
            </p>
          </div>
        </div>

        {/* Alternative Names */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "8px",
              color: "#111827",
            }}
          >
            Alternative Names
          </label>
          <input
            type="text"
            value={alternativeNames}
            onChange={(e) => setAlternativeNames(e.target.value)}
            placeholder="Other names this cat goes by (comma separated)"
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              fontSize: "16px",
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "8px",
              color: "#111827",
            }}
          >
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Tell us more about this cat..."
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              fontSize: "16px",
              resize: "vertical",
            }}
          />
        </div>

        {/* Community Description */}
        <div>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#111827" }}>
            Add Community Description
          </label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            {(["description", "anecdote", "behavior"] as const).map((type) => (
              <button key={type} type="button" onClick={() => setDescriptionType(type)}
                style={{ padding: "6px 12px", border: "none", borderRadius: "12px", background: descriptionType === type ? "#1a0dab" : "#f3f4f6", color: descriptionType === type ? "white" : "#111827", fontSize: "12px", cursor: "pointer", textTransform: "capitalize" }}>
                {type}
              </button>
            ))}
          </div>
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={3}
            placeholder={`Share a ${descriptionType} about ${cat.name}...`}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "12px", fontSize: "16px", resize: "vertical" }}
          />
        </div>

        {/* Personality Traits */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "8px",
              color: "#111827",
            }}
          >
            Personality Traits
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {PERSONALITY_TRAITS.map((trait) => (
              <button
                key={trait}
                onClick={() => {
                  setSelectedTraits((prev) =>
                    prev.includes(trait)
                      ? prev.filter((t) => t !== trait)
                      : [...prev, trait]
                  );
                }}
                style={{
                  padding: "6px 16px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  background: selectedTraits.includes(trait)
                    ? "rgba(26,13,171,0.08)"
                    : "#f3f4f6",
                  color: selectedTraits.includes(trait) ? "#1a0dab" : "#6b7280",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {trait}
              </button>
            ))}
          </div>
        </div>

        {/* Contribution Info */}
        <div
          style={{
            background: "#f0f9ff",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #e0f2fe",
          }}
        >
          <h4
            style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#0369a1" }}
          >
            ✨ Thank you for contributing!
          </h4>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#0891b2",
              lineHeight: "1.5",
            }}
          >
            Your updates help other cat lovers learn more about {cat.name}. All
            contributions are appreciated and help build a better community
            resource.
          </p>
        </div>
      </div>
    </div>
  );
}

// Catspotting Component - Updated with auth requirement
function CatspottingScreen({
  onClose,
  currentUser,
  userProfile,
  cats,
  onAddCat,
  onAuthRequired,
}: {
  onClose: () => void;
  currentUser: User | null;
  userProfile: UserProfile | null;
  cats: Cat[];
  onAddCat: (cat: Partial<Cat>) => void;
  onAuthRequired: () => void;
}) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoObjectPosition, setPhotoObjectPosition] = useState(DEFAULT_CAT_PHOTO_POSITION);
  const [extractedLocation, setExtractedLocation] = useState<
    [number, number] | null
  >(null);
  const [nearbyCats, setNearbyCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCatSelection, setShowCatSelection] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) {
      onAuthRequired();
      return;
    }

    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoObjectPosition(DEFAULT_CAT_PHOTO_POSITION);
      setLoading(true);

      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);

      try {
        const location = await extractLocationFromPhoto(file);
        if (location) {
          setExtractedLocation(location);
          const nearby = cats.filter((cat) => {
            const distance = getDistanceFromLatLonInMeters(
              location[0],
              location[1],
              cat.location.lat,
              cat.location.lng
            );
            return distance < 200;
          });
          setNearbyCats(nearby);
          if (nearby.length > 0) setShowCatSelection(true);
        }
      } catch (error) {
        console.error("Error extracting location:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddToExistingCat = async () => {
    if (!selectedCat || !photoFile || !currentUser || !userProfile) return;

    try {
      const photoURL = await uploadPhotoToStorage(
        photoFile,
        selectedCat.id,
        currentUser.uid
      );
      const photoData = {
        id: `${selectedCat.id}_${Date.now()}`,
        url: photoURL,
        contributor: userProfile.displayName,
        contributorId: currentUser.uid,
        date: new Date().toISOString(),
        uploadedAt: new Date().toISOString(),
        objectPosition: photoObjectPosition,
        locationMetadata: extractedLocation
          ? {
              lat: extractedLocation[0],
              lng: extractedLocation[1],
            }
          : undefined,
      };

      const catDoc = doc(db, "cats", selectedCat.id);
      await updateDoc(catDoc, {
        photos: arrayUnion(photoData),
      });

      // Update user profile
      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", currentUser.uid)
      );
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        await updateDoc(userDoc.ref, {
          photosAdded: increment(1),
        });
      }

      alert("Photo added successfully!");
      onClose();
    } catch (error) {
      console.error("Error adding photo:", error);
      alert("Error adding photo. Please try again.");
    }
  };

  const handleCreateNewCat = () => {
    if (!currentUser) {
      onAuthRequired();
      return;
    }

    if (extractedLocation && photoFile && currentUser && userProfile) {
      const newCat: Partial<Cat> = {
        name: "",
        emoji: CAT_EMOJIS[0].emoji,
        location: {
          lat: extractedLocation[0],
          lng: extractedLocation[1],
          area: "Local Area",
          city: "London",
          country: "United Kingdom",
          continent: "Europe",
          approximateAddress: fuzzyLocation(
            extractedLocation[0],
            extractedLocation[1]
          ),
        },
        photos: [
          {
            id: `new_${Date.now()}`,
            url: photoPreview || "",
            contributor: userProfile.displayName,
            contributorId: currentUser.uid,
            date: new Date().toISOString(),
            uploadedAt: new Date().toISOString(),
            objectPosition: photoObjectPosition,
            locationMetadata: {
              lat: extractedLocation[0],
              lng: extractedLocation[1],
            },
          },
        ],
        createdDate: new Date().toISOString(),
        totalVisits: 0,
        userVisits: {},
        visits: [],
        slowBlinks: [],
        personality: [],
        allowsPetting: null,
        acceptsTreats: null,
        livingLocation: null,
        creator: userProfile.displayName,
        creatorId: currentUser.uid,
        contributors: [
          {
            id: currentUser.uid,
            name: userProfile.displayName,
            type: "creator" as const,
            contributions: 1,
          },
        ],
      };
      onAddCat(newCat);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "72px",
        left: 0,
        right: 0,
        bottom: "60px",
        background: "white",
        zIndex: 1500,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "white",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb",
          zIndex: 10,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            padding: "8px",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          <XIcon />
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>
          📸 Catspotting
        </h2>
        <div style={{ width: "40px" }}></div>
      </div>

      <div style={{ padding: "20px 20px 96px" }}>
        {!currentUser ? (
          <div
            style={{
              border: "2px dashed #d1d5db",
              borderRadius: "12px",
              padding: "60px 20px",
              textAlign: "center",
              background: "#f9fafb",
            }}
          >
            <LockIcon />
            <p
              style={{ marginTop: "16px", fontSize: "18px", fontWeight: "500" }}
            >
              Sign in to use Catspotting
            </p>
            <p style={{ marginTop: "8px", color: "#6b7280", fontSize: "14px" }}>
              Upload photos of cats you've spotted and help build our community
              database
            </p>
            <button
              onClick={onAuthRequired}
              style={{
                marginTop: "16px",
                padding: "12px 24px",
                background: "#1a0dab",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              Sign In
            </button>
          </div>
        ) : !photoFile ? (
          <div
            style={{
              border: "2px dashed #d1d5db",
              borderRadius: "12px",
              padding: "60px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: "#f9fafb",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <CameraIcon />
            <p
              style={{ marginTop: "16px", fontSize: "18px", fontWeight: "500" }}
            >
              Spotted a cat?
            </p>
            <p style={{ marginTop: "8px", color: "#6b7280", fontSize: "14px" }}>
              Upload a photo and we'll help you identify if it's already in our
              database
            </p>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: "20px" }}>
              <PhotoFocusPicker
                imageUrl={photoPreview!}
                objectPosition={photoObjectPosition}
                onChange={setPhotoObjectPosition}
                height={300}
              />
            </div>

            {loading && (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <p>Analyzing photo location...</p>
              </div>
            )}

            {!loading && extractedLocation && (
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    background: "#f0f9ff",
                    padding: "12px",
                    borderRadius: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <p style={{ fontSize: "14px", color: "#0369a1", margin: 0 }}>
                    📍 Location detected: {extractedLocation[0].toFixed(4)},{" "}
                    {extractedLocation[1].toFixed(4)}
                  </p>
                </div>

                {showCatSelection && nearbyCats.length > 0 ? (
                  <div>
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: "500",
                        marginBottom: "12px",
                      }}
                    >
                      Is this one of these cats?
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        marginBottom: "16px",
                      }}
                    >
                      We found {nearbyCats.length} cat
                      {nearbyCats.length !== 1 ? "s" : ""} nearby:
                    </p>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        marginBottom: "20px",
                      }}
                    >
                      {nearbyCats.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px",
                            border:
                              selectedCat?.id === cat.id
                                ? "2px solid #1a0dab"
                                : "1px solid #e5e7eb",
                            borderRadius: "12px",
                            cursor: "pointer",
                            background:
                              selectedCat?.id === cat.id ? "#f3f4f6" : "white",
                            width: "100%",
                            textAlign: "left",
                            fontFamily: "inherit",
                          }}
                          onClick={() => setSelectedCat(cat)}
                        >
                          <span style={{ fontSize: "32px" }}>{cat.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <p
                              style={{ fontWeight: "600", marginBottom: "4px" }}
                            >
                              {cat.name}
                            </p>
                            <p style={{ fontSize: "14px", color: "#6b7280" }}>
                              {cat.location.approximateAddress}
                            </p>
                          </div>
                          {cat.photos[0] && (
                            <img
                              src={cat.photos[0].url}
                              alt={cat.name}
                              style={{
                                width: "48px",
                                height: "48px",
                                objectFit: "cover",
                                borderRadius: "12px",
                              }}
                            />
                          )}
                        </button>
                      ))}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <button
                        onClick={handleAddToExistingCat}
                        disabled={!selectedCat}
                        style={{
                          padding: "12px 20px",
                          background: selectedCat ? "#10b981" : "#e5e7eb",
                          color: selectedCat ? "white" : "#9ca3af",
                          border: "none",
                          borderRadius: "12px",
                          fontSize: "16px",
                          fontWeight: "500",
                          cursor: selectedCat ? "pointer" : "not-allowed",
                        }}
                      >
                        Yes, add photo to {selectedCat?.name || "selected cat"}
                      </button>

                      <button
                        onClick={handleCreateNewCat}
                        style={{
                          padding: "12px 20px",
                          background: "white",
                          color: "#1a0dab",
                          border: "2px solid #1a0dab",
                          borderRadius: "12px",
                          fontSize: "16px",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        No, this is a new cat
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: "500",
                        marginBottom: "12px",
                      }}
                    >
                      No cats found nearby
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        marginBottom: "16px",
                      }}
                    >
                      Looks like this might be a new cat! Let's add them to the
                      map.
                    </p>

                    <button
                      onClick={handleCreateNewCat}
                      style={{
                        width: "100%",
                        padding: "12px 20px",
                        background: "#1a0dab",
                        color: "white",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "16px",
                        fontWeight: "500",
                        cursor: "pointer",
                      }}
                    >
                      Add New Cat
                    </button>
                  </div>
                )}
              </div>
            )}

            {!loading && !extractedLocation && (
              <div>
                <div
                  style={{
                    background: "#fef3c7",
                    padding: "12px",
                    borderRadius: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <p style={{ fontSize: "14px", color: "#92400e", margin: 0 }}>
                    ⚠️ No location data found in photo. You can still add the
                    cat manually.
                  </p>
                </div>

                <button
                  onClick={handleCreateNewCat}
                  style={{
                    width: "100%",
                    padding: "12px 20px",
                    background: "#1a0dab",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  Continue to Add Cat
                </button>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}

// Enhanced User Profile Component
function UserProfile({
  onClose,
  userProfile,
  onShowUserCats,
  onShowUserPhotos,
  onShowUserVisits,
  onDeleteContributions,
  onDeleteAccount,
}: {
  onClose: () => void;
  userProfile: UserProfile | null;
  onShowUserCats: () => void;
  onShowUserPhotos: () => void;
  onShowUserVisits: () => void;
  onDeleteContributions: () => void | Promise<void>;
  onDeleteAccount: () => void | Promise<void>;
}) {
  if (!userProfile) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "white",
        zIndex: 2000,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "white",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb",
          zIndex: 10,
        }}
      >
        <h2>Your Profile</h2>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            padding: "8px",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          <XIcon />
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            width: "120px",
            height: "120px",
            background: "#e5e7eb",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px",
            overflow: "hidden",
          }}
        >
          {userProfile.profilePicture ? (
            <img
              src={userProfile.profilePicture}
              alt="Profile"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <UserIcon />
          )}
        </div>

        <h3
          style={{ fontSize: "28px", fontWeight: "600", marginBottom: "8px" }}
        >
          {userProfile.displayName}
        </h3>
        <p style={{ fontSize: "16px", color: "#6b7280", marginBottom: "8px" }}>
          {userProfile.email}
        </p>
        <p
          style={{
            fontSize: "16px",
            color: "#1a0dab",
            marginBottom: "8px",
            fontWeight: "500",
          }}
        >
          {userProfile.identity === "human-of-cat"
            ? "Human of a Cat"
            : "Unattached Catwalker"}
        </p>
        {userProfile.location && (
          <p
            style={{ fontSize: "16px", color: "#6b7280", marginBottom: "8px" }}
          >
            📍 {userProfile.location}
          </p>
        )}
        <p style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "40px" }}>
          On the Catwalk since{" "}
          {userProfile.joinDate && formatDate(userProfile.joinDate)}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
            width: "100%",
            maxWidth: "400px",
          }}
        >
          <button
            onClick={onShowUserCats}
            style={{
              textAlign: "center",
              padding: "20px",
              background: "#f9fafb",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                fontSize: "36px",
                fontWeight: "700",
                color: "#1a0dab",
                marginBottom: "8px",
              }}
            >
              {userProfile.catsFound}
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>Cats Added</div>
          </button>

          <button
            onClick={onShowUserPhotos}
            style={{
              textAlign: "center",
              padding: "20px",
              background: "#f9fafb",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                fontSize: "36px",
                fontWeight: "700",
                color: "#1a0dab",
                marginBottom: "8px",
              }}
            >
              {userProfile.photosAdded}
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              Photos Added
            </div>
          </button>

          <div
            style={{
              textAlign: "center",
              padding: "20px",
              background: "#f9fafb",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                fontSize: "36px",
                fontWeight: "700",
                color: "#1a0dab",
                marginBottom: "8px",
              }}
            >
              {userProfile.totalContributions}
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              Info Contributed
            </div>
          </div>

          <button
            onClick={onShowUserVisits}
            style={{
              textAlign: "center",
              padding: "20px",
              background: "#f9fafb",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                fontSize: "36px",
                fontWeight: "700",
                color: "#1a0dab",
                marginBottom: "8px",
              }}
            >
              {userProfile.catsVisited.length}
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              Cats Visited
            </div>
          </button>
        </div>

        <div style={{ width: "100%", maxWidth: "400px", marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: "16px", color: "#111827" }}>Account controls</h4>
          <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#6b7280", lineHeight: 1.45 }}>
            You can remove your own photos, visits, slow blinks and written contributions. Deleting your account also removes your profile record and then signs you out.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              type="button"
              onClick={onDeleteContributions}
              style={{ padding: "12px 14px", borderRadius: "12px", border: "1px solid #f59e0b", background: "#fffbeb", color: "#92400e", cursor: "pointer", fontWeight: 600 }}
            >
              Delete my contributions
            </button>
            <button
              type="button"
              onClick={onDeleteAccount}
              style={{ padding: "12px 14px", borderRadius: "12px", border: "1px solid #ef4444", background: "#fef2f2", color: "#991b1b", cursor: "pointer", fontWeight: 600 }}
            >
              Delete my account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Duplicate Modal Component
function DuplicateModal({
  cats,
  onSelectExisting,
  onCreateNew,
  onClose,
}: {
  cats: Cat[];
  onSelectExisting: (cat: Cat) => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "400px",
          width: "100%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}
        >
          Cats found nearby
        </h3>
        <p style={{ color: "#6b7280", marginBottom: "20px" }}>
          We found {cats.length} cat{cats.length !== 1 ? "s" : ""} near this
          location. Is this one of them?
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {cats.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectExisting(cat)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                cursor: "pointer",
                background: "white",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: "24px" }}>{cat.emoji}</span>
              <div>
                <p style={{ fontWeight: "600", margin: 0 }}>{cat.name}</p>
                <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                  {cat.location.approximateAddress}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onCreateNew}
            style={{
              flex: 1,
              padding: "12px",
              background: "#1a0dab",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
            }}
          >
            Add New Cat
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              background: "#f3f4f6",
              color: "#111827",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Main App Component
export default function CatwalkApp() {
  const [currentView, setCurrentView] = useState("catmap");
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserCats, setShowUserCats] = useState(false);
  const [showUserPhotos, setShowUserPhotos] = useState(false);
  const [showUserVisits, setShowUserVisits] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showContributeForm, setShowContributeForm] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCatspotting, setShowCatspotting] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showLocationConsent, setShowLocationConsent] = useState(false);
  const [potentialDuplicates, setPotentialDuplicates] = useState<Cat[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [manualLocation, setManualLocation] = useState<[number, number] | null>(
    null
  );
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [leafletMap, setLeafletMap] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const manualMarkerRef = useRef<any>(null);

  const invalidateMapSize = (map = mapInstanceRef.current) => {
    if (!map) return;
    const invalidate = () => {
      try {
        map.invalidateSize({ pan: false });
      } catch (error) {
        console.error("Error resizing Catwalk map:", error);
      }
    };

    requestAnimationFrame(invalidate);
    [60, 180, 360, 750, 1400].forEach((delay) => {
      window.setTimeout(invalidate, delay);
    });
  };

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    emoji: null,
    personality: [],
    allowsPetting: null,
    acceptsTreats: null,
    livingLocation: null,
  });

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        setCurrentUser({ uid: user.uid, email: user.email });
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load cats from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "cats"), orderBy("createdDate", "desc")),
      (snapshot: any) => {
        const catsData = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        })) as Cat[];
        setCats(catsData);
      },
      (error: any) => {
        console.error("Error fetching cats:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Keep an open cat profile synced with Firestore. Without this, actions like
  // Visit, Slow Blink, or Add Photo can save correctly but the currently open
  // profile still shows the old in-memory cat until you close and reopen it.
  useEffect(() => {
    if (!selectedCat) return;
    const latestCat = cats.find((cat) => cat.id === selectedCat.id);
    if (latestCat && latestCat !== selectedCat) {
      setSelectedCat(latestCat);
    }
  }, [cats, selectedCat?.id]);

  const requireAuth = (action: () => void) => {
    if (!currentUser) {
      setShowAuthRequired(true);
      return;
    }
    action();
  };

  const closeTransientPanels = () => {
    setSelectedCat(null);
    setShowProfile(false);
    setShowUserCats(false);
    setShowUserPhotos(false);
    setShowUserVisits(false);
    setShowAddCat(false);
    setShowContributeForm(false);
    setShowDuplicateModal(false);
    setShowFilterModal(false);
    setShowLogin(false);
    setShowAuthRequired(false);
    setShowGuide(false);
    setShowLocationConsent(false);
  };

  const navigateTo = (view: "catmap" | "list" | "catspotting") => {
    closeTransientPanels();
    if (view === "catspotting") {
      requireAuth(() => {
        setCurrentView("catmap");
        setShowCatspotting(true);
      });
      return;
    }
    setShowCatspotting(false);
    setIsPlacingPin(false);
    setCurrentView(view);
  };

  // Show location consent on first visit
  useEffect(() => {
    const asked = localStorage.getItem("catwalk-location-asked");
    if (!asked) setShowLocationConsent(true);
  }, []);

  // Get user location without blocking the first map render.
  // The map now mounts immediately using a saved/default centre, then recentres
  // if the browser returns a location quickly.
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
          localStorage.setItem("catwalk-last-location", JSON.stringify(loc));
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo(loc, 15, { duration: 0.6 });
          }
        },
        () => {
          // Permission denied or slow response — keep saved/default location
        },
        { timeout: 3500, maximumAge: 300000, enableHighAccuracy: false }
      );
    }
  }, []);

  // Load Leaflet
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    if (!leafletLoaded && !mapLoading) {
      setMapLoading(true);

      if (!document.querySelector('link[data-catwalk-leaflet-preconnect="true"]')) {
        const preconnect = document.createElement("link");
        preconnect.rel = "preconnect";
        preconnect.href = "https://unpkg.com";
        preconnect.setAttribute("data-catwalk-leaflet-preconnect", "true");
        document.head.appendChild(preconnect);
      }

      if (!document.querySelector('link[data-catwalk-osm-preconnect="true"]')) {
        const tilePreconnect = document.createElement("link");
        tilePreconnect.rel = "preconnect";
        tilePreconnect.href = "https://tile.openstreetmap.org";
        tilePreconnect.setAttribute("data-catwalk-osm-preconnect", "true");
        document.head.appendChild(tilePreconnect);
      }

      if (!document.querySelector('link[data-catwalk-leaflet="css"]')) {
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        cssLink.setAttribute("data-catwalk-leaflet", "css");
        document.head.appendChild(cssLink);
      }

      if (!document.querySelector('style[data-catwalk-global="true"]')) {
        const globalStyle = document.createElement("style");
        globalStyle.setAttribute("data-catwalk-global", "true");
        globalStyle.textContent = `* { box-sizing: border-box; } .leaflet-container { width: 100%; height: 100%; }`;
        document.head.appendChild(globalStyle);
      }

      if (!document.querySelector('style[data-catwalk-leaflet-controls="true"]')) {
        const zoomStyle = document.createElement("style");
        zoomStyle.setAttribute("data-catwalk-leaflet-controls", "true");
        zoomStyle.textContent = `.leaflet-top.leaflet-left { top: 310px !important; } .leaflet-control-zoom { z-index: 900 !important; border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important; } .leaflet-control-zoom a { width: 36px !important; height: 36px !important; line-height: 36px !important; }`;
        document.head.appendChild(zoomStyle);
      }

      const existingScript = document.querySelector('script[data-catwalk-leaflet="js"]') as HTMLScriptElement | null;
      if (existingScript) {
        if (window.L || existingScript.dataset.loaded === "true") {
          setLeafletLoaded(true);
          setMapLoading(false);
          return;
        }

        existingScript.addEventListener("load", () => {
          existingScript.dataset.loaded = "true";
          setLeafletLoaded(true);
          setMapLoading(false);
        });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.setAttribute("data-catwalk-leaflet", "js");
      script.onload = () => {
        script.dataset.loaded = "true";
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

  // Initialize map. Keep this independent from geolocation so the first map
  // render is not delayed by the browser's location lookup. This waits until
  // the map container has a real size before constructing Leaflet, which fixes
  // the blank first-load map that only appeared after changing tabs.
  useEffect(() => {
    const mapShouldBeVisible = currentView === "catmap" && !showCatspotting;
    if (!mapShouldBeVisible || !leafletLoaded || !window.L) return;

    let cancelled = false;
    let attempts = 0;
    let retryTimer: number | undefined;

    const initialiseWhenReady = () => {
      if (cancelled) return;
      const container = mapRef.current;
      if (!container) {
        retryTimer = window.setTimeout(initialiseWhenReady, 50);
        return;
      }

      const rect = container.getBoundingClientRect();
      const hasUsableSize = rect.width > 50 && rect.height > 50;
      if (!hasUsableSize && attempts < 30) {
        attempts += 1;
        retryTimer = window.setTimeout(initialiseWhenReady, 80);
        return;
      }

      try {
        const existingContainer = mapInstanceRef.current?.getContainer?.();
        if (mapInstanceRef.current && existingContainer === container) {
          invalidateMapSize(mapInstanceRef.current);
          return;
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          setLeafletMap(null);
        }

        // Hot reloads can leave Leaflet's internal id on the DOM node, which
        // prevents a fresh map from mounting and leaves the plain green fallback.
        if ((container as any)._leaflet_id) {
          (container as any)._leaflet_id = undefined;
        }
        container.innerHTML = "";

        let center: [number, number] = [51.5074, -0.1278];
        const saved = localStorage.getItem("catwalk-last-location");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length === 2) {
              center = [Number(parsed[0]), Number(parsed[1])];
            }
          } catch {
            // Keep London default if saved location is malformed.
          }
        }

        const map = window.L.map(container, {
          center,
          zoom: 15,
          minZoom: 5,
          maxZoom: 20,
          zoomControl: true,
          preferCanvas: true,
        });

        window.L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 20,
            updateWhenIdle: false,
            keepBuffer: 3,
          }
        ).addTo(map);

        map.whenReady(() => invalidateMapSize(map));
        mapInstanceRef.current = map;
        setLeafletMap(map);
        invalidateMapSize(map);
      } catch (error) {
        console.error("Error initialising Catwalk map:", error);
        mapInstanceRef.current = null;
        setLeafletMap(null);
      }
    };

    retryTimer = window.setTimeout(initialiseWhenReady, 0);

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [currentView, showCatspotting, leafletLoaded]);

  // Keep Leaflet in sync with the actual rendered container size. This prevents
  // the first map view from staying blank until the user changes tabs/views.
  useEffect(() => {
    const mapShouldBeVisible = currentView === "catmap" && !showCatspotting;
    if (!mapShouldBeVisible || !mapRef.current) return;

    invalidateMapSize();

    const onWindowResize = () => invalidateMapSize();
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("orientationchange", onWindowResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => invalidateMapSize());
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("orientationchange", onWindowResize);
      resizeObserver?.disconnect();
    };
  }, [currentView, showCatspotting, leafletLoaded, leafletMap]);

  // Recentre once the user's location arrives, without rebuilding the map.
  useEffect(() => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(userLocation, 15, { duration: 0.6 });
    }
  }, [userLocation]);

  // Update map click handler
  useEffect(() => {
    if (mapInstanceRef.current && window.L) {
      mapInstanceRef.current.off("click");
      mapInstanceRef.current.on("click", (e: any) => {
        if (isPlacingPin) {
          const { lat, lng } = e.latlng;
          setManualLocation([lat, lng]);

          if (manualMarkerRef.current) {
            mapInstanceRef.current.removeLayer(manualMarkerRef.current);
          }

          const manualIcon = window.L.divIcon({
            html: '<div style="width: 30px; height: 30px; background: #ef4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          manualMarkerRef.current = window.L.marker([lat, lng], {
            icon: manualIcon,
            draggable: true,
          }).addTo(mapInstanceRef.current);
          setIsPlacingPin(false);
        }
      });
    }
  }, [isPlacingPin]);

  // Clean up map when leaving the visible map screen
  useEffect(() => {
    const mapShouldBeVisible = currentView === "catmap" && !showCatspotting;
    if (!mapShouldBeVisible && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      manualMarkerRef.current = null;
      setLeafletMap(null);
    }
  }, [currentView, showCatspotting]);

  // Add markers to map
  useEffect(() => {
    if (leafletMap && window.L) {
      leafletMap.eachLayer((layer: any) => {
        if (
          layer._latlng &&
          !layer._isUserLocation &&
          layer !== manualMarkerRef.current
        ) {
          leafletMap.removeLayer(layer);
        }
      });

      cats.forEach((cat) => {
        const catIcon = window.L.divIcon({
          html: `<div style="font-size: 28px; line-height: 1; cursor: pointer; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));">${cat.emoji}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          className: '',
        });

        const marker = window.L.marker([cat.location.lat, cat.location.lng], {
          icon: catIcon,
        }).addTo(leafletMap);
        marker.on("click", () => setSelectedCat(cat));
      });

      if (userLocation) {
        const userIcon = window.L.divIcon({
          html: '<div style="width: 16px; height: 16px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          className: '',
        });
        const userMarker = window.L.marker(userLocation, {
          icon: userIcon,
        }).addTo(leafletMap);
        userMarker._isUserLocation = true;
      }
    }
  }, [leafletMap, cats, userLocation]);

  const handleCheckForDuplicates = () => {
    requireAuth(() => {
      const location = manualLocation || userLocation;
      if (!location) {
        alert(
          "Please set a location by dropping a pin or allowing location access"
        );
        return;
      }

      const [lat, lng] = location;
      const duplicates = cats.filter((cat) => {
        const dist = getDistanceFromLatLonInMeters(
          lat,
          lng,
          cat.location.lat,
          cat.location.lng
        );
        return dist < 200;
      });

      if (duplicates.length > 0) {
        setPotentialDuplicates(duplicates);
        setShowDuplicateModal(true);
      } else {
        setShowAddCat(true);
      }
    });
  };

  const handleAddCat = async (_newCatData: Partial<Cat>) => {
    if (!currentUser || !userProfile) return;

    try {
      setShowAddCat(false);
      setManualLocation(null);

      if (manualMarkerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(manualMarkerRef.current);
        manualMarkerRef.current = null;
      }
    } catch (error) {
      console.error("Error adding cat:", error);
    }
  };

  const handleVisit = async () => {
    if (!selectedCat || !currentUser || !userProfile) return;

    try {
      const catDoc = doc(db, "cats", selectedCat.id);
      const newVisit = {
        userId: currentUser.uid,
        date: new Date().toISOString(),
        userName: userProfile.displayName,
      };

      await updateDoc(catDoc, {
        totalVisits: increment(1),
        [`userVisits.${currentUser.uid}`]: increment(1),
        visits: arrayUnion(newVisit),
      });

      setSelectedCat((prev) =>
        prev && prev.id === selectedCat.id
          ? {
              ...prev,
              totalVisits: (prev.totalVisits || 0) + 1,
              userVisits: {
                ...(prev.userVisits || {}),
                [currentUser.uid]: ((prev.userVisits || {})[currentUser.uid] || 0) + 1,
              },
              visits: [...(prev.visits || []), newVisit],
            }
          : prev
      );

      // Update user's visited cats list
      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", currentUser.uid)
      );
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const currentVisited = userProfile.catsVisited || [];
        if (!currentVisited.includes(selectedCat.id)) {
          await updateDoc(userDoc.ref, {
            catsVisited: arrayUnion(selectedCat.id),
          });
        }
      }
    } catch (error) {
      console.error("Error recording visit:", error);
    }
  };

  const handleSlowBlink = async () => {
    if (!selectedCat || !currentUser || !userProfile) return;

    try {
      const catDoc = doc(db, "cats", selectedCat.id);
      const newSlowBlink = {
        userId: currentUser.uid,
        userName: userProfile.displayName,
        date: new Date().toISOString(),
      };

      await updateDoc(catDoc, {
        slowBlinks: arrayUnion(newSlowBlink),
      });

      setSelectedCat((prev) =>
        prev && prev.id === selectedCat.id
          ? { ...prev, slowBlinks: [...(prev.slowBlinks || []), newSlowBlink] }
          : prev
      );
    } catch (error) {
      console.error("Error recording slow blink:", error);
    }
  };

  const handleAddPhoto = async (file: File, objectPosition = DEFAULT_CAT_PHOTO_POSITION) => {
    if (!selectedCat || !currentUser || !userProfile) return;

    try {
      const photoURL = await uploadPhotoToStorage(
        file,
        selectedCat.id,
        currentUser.uid
      );
      const photoData = {
        id: `${selectedCat.id}_${Date.now()}`,
        url: photoURL,
        contributor: userProfile.displayName,
        contributorId: currentUser.uid,
        date: new Date().toISOString(),
        uploadedAt: new Date().toISOString(),
        objectPosition,
      };

      const catDoc = doc(db, "cats", selectedCat.id);
      await updateDoc(catDoc, {
        photos: arrayUnion(photoData),
      });

      setSelectedCat((prev) =>
        prev && prev.id === selectedCat.id
          ? { ...prev, photos: [...(prev.photos || []), photoData] }
          : prev
      );

      // Update user profile
      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", currentUser.uid)
      );
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        await updateDoc(userDoc.ref, {
          photosAdded: increment(1),
        });
      }
    } catch (error) {
      console.error("Error adding photo:", error);
      const message = error instanceof Error ? error.message : "Please try again.";
      alert(`Photo upload failed: ${message}`);
    }
  };

  const handleUpdatePhotoPosition = async (photoId: string, objectPosition: string) => {
    if (!selectedCat || !currentUser) return;

    const photo = selectedCat.photos.find((item) => item.id === photoId);
    if (!photo) return;

    const canEdit = photo.contributorId === currentUser.uid || selectedCat.creatorId === currentUser.uid;
    if (!canEdit) {
      alert("Only the photo contributor or cat profile creator can adjust this image.");
      return;
    }

    try {
      const updatedPhotos = selectedCat.photos.map((item) =>
        item.id === photoId ? { ...item, objectPosition } : item
      );
      const catDoc = doc(db, "cats", selectedCat.id);
      await updateDoc(catDoc, { photos: updatedPhotos });
      setSelectedCat((prev) =>
        prev && prev.id === selectedCat.id ? { ...prev, photos: updatedPhotos } : prev
      );
    } catch (error) {
      console.error("Error updating photo position:", error);
      alert("Could not update the photo position. Please try again.");
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!selectedCat || !currentUser) return;

    const photo = selectedCat.photos.find((item) => item.id === photoId);
    if (!photo) return;

    const canEdit = photo.contributorId === currentUser.uid || selectedCat.creatorId === currentUser.uid;
    if (!canEdit) {
      alert("Only the photo contributor or cat profile creator can delete this photo.");
      return;
    }

    const updatedPhotos = selectedCat.photos.filter((item) => item.id !== photoId);

    try {
      const catDoc = doc(db, "cats", selectedCat.id);
      await updateDoc(catDoc, { photos: updatedPhotos });
      setSelectedCat((prev) =>
        prev && prev.id === selectedCat.id ? { ...prev, photos: updatedPhotos } : prev
      );

      try {
        await deleteObject(storageRef(storage, photo.url));
      } catch (storageError) {
        console.warn("Photo removed from profile, but the Storage file could not be deleted:", storageError);
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Could not delete the photo. Please try again.");
    }
  };

  const handleDeleteVisit = async (visitDate: string) => {
    if (!selectedCat || !currentUser) return;

    let removed = false;
    const updatedVisits = (selectedCat.visits || []).filter((visit) => {
      if (!removed && visit.userId === currentUser.uid && visit.date === visitDate) {
        removed = true;
        return false;
      }
      return true;
    });

    if (!removed) {
      alert("Could not find that visit to delete. Please refresh and try again.");
      return;
    }

    const previousUserCount = selectedCat.userVisits?.[currentUser.uid] || 0;
    const nextUserCount = Math.max(0, previousUserCount - 1);
    const nextTotalVisits = Math.max(0, (selectedCat.totalVisits || 0) - 1);
    const updatedUserVisits = { ...(selectedCat.userVisits || {}) };

    if (nextUserCount > 0) {
      updatedUserVisits[currentUser.uid] = nextUserCount;
    } else {
      delete updatedUserVisits[currentUser.uid];
    }

    try {
      const catDoc = doc(db, "cats", selectedCat.id);
      await updateDoc(catDoc, {
        totalVisits: nextTotalVisits,
        userVisits: updatedUserVisits,
        visits: updatedVisits,
      });

      setSelectedCat((prev) =>
        prev && prev.id === selectedCat.id
          ? {
              ...prev,
              totalVisits: nextTotalVisits,
              userVisits: updatedUserVisits,
              visits: updatedVisits,
            }
          : prev
      );
    } catch (error) {
      console.error("Error deleting visit:", error);
      alert("Could not delete that visit. Please try again.");
    }
  };

  const handleContribute = async (updates: Partial<Cat>) => {
    if (!selectedCat || !currentUser || !userProfile) return;

    try {
      const catDoc = doc(db, "cats", selectedCat.id);
      await updateDoc(catDoc, updates);

      // Update user contribution count
      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", currentUser.uid)
      );
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        await updateDoc(userDoc.ref, {
          totalContributions: increment(1),
        });
      }

      setShowContributeForm(false);
    } catch (error) {
      console.error("Error saving contribution:", error);
    }
  };

  const removeCurrentUserContributions = async () => {
    if (!currentUser || !userProfile) return;

    const uid = currentUser.uid;
    const displayName = userProfile.displayName || "Deleted user";
    const updatedCats: Cat[] = [];

    for (const cat of cats) {
      const previousUserVisitCount = cat.userVisits?.[uid] || 0;
      const photosToRemove = (cat.photos || []).filter((photo) => photo.contributorId === uid);
      const remainingPhotos = (cat.photos || []).filter((photo) => photo.contributorId !== uid);
      const remainingVisits = (cat.visits || []).filter((visit) => visit.userId !== uid);
      const remainingSlowBlinks = (cat.slowBlinks || []).filter((blink) => blink.userId !== uid);
      const remainingDescriptions = (cat.descriptions || []).filter((description) => description.contributorId !== uid);
      const remainingContributors = (cat.contributors || []).filter((contributor) => contributor.id !== uid);
      const nextUserVisits = { ...(cat.userVisits || {}) };
      delete nextUserVisits[uid];

      const wasChanged =
        photosToRemove.length > 0 ||
        previousUserVisitCount > 0 ||
        (cat.slowBlinks || []).length !== remainingSlowBlinks.length ||
        (cat.descriptions || []).length !== remainingDescriptions.length ||
        (cat.contributors || []).length !== remainingContributors.length ||
        cat.creatorId === uid;

      if (!wasChanged) {
        updatedCats.push(cat);
        continue;
      }

      const nextCat: Cat = {
        ...cat,
        photos: remainingPhotos,
        visits: remainingVisits,
        slowBlinks: remainingSlowBlinks,
        descriptions: remainingDescriptions,
        contributors: remainingContributors,
        userVisits: nextUserVisits,
        totalVisits: Math.max(0, (cat.totalVisits || 0) - previousUserVisitCount),
        creator: cat.creatorId === uid ? "Deleted user" : cat.creator,
        creatorId: cat.creatorId === uid ? "deleted-user" : cat.creatorId,
      };

      const catDoc = doc(db, "cats", cat.id);
      await updateDoc(catDoc, {
        photos: nextCat.photos,
        visits: nextCat.visits,
        slowBlinks: nextCat.slowBlinks,
        descriptions: nextCat.descriptions || [],
        contributors: nextCat.contributors || [],
        userVisits: nextCat.userVisits || {},
        totalVisits: nextCat.totalVisits,
        creator: nextCat.creator,
        creatorId: nextCat.creatorId,
      });

      for (const photo of photosToRemove) {
        try {
          await deleteObject(storageRef(storage, photo.url));
        } catch (storageError) {
          console.warn(`Removed ${displayName}'s photo from Firestore, but could not delete the Storage file:`, storageError);
        }
      }

      updatedCats.push(nextCat);
    }

    setCats(updatedCats);
    setSelectedCat((prev) => (prev ? updatedCats.find((cat) => cat.id === prev.id) || null : prev));
  };

  const handleDeleteMyContributions = async () => {
    if (!currentUser || !userProfile) return;
    const confirmed = window.confirm(
      "Delete your photos, visits, slow blinks and written contributions from Catwalk? Cat profiles you created will stay visible but will be anonymised."
    );
    if (!confirmed) return;

    try {
      await removeCurrentUserContributions();
      alert("Your contributions have been removed.");
    } catch (error) {
      console.error("Error deleting contributions:", error);
      alert("Could not delete your contributions. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser || !userProfile) return;
    const confirmed = window.confirm(
      "Delete your Catwalk account? This removes your profile and contributions, then signs you out. Firebase may ask you to log in again first for security."
    );
    if (!confirmed) return;

    try {
      await removeCurrentUserContributions();

      const userQuery = query(collection(db, "users"), where("uid", "==", currentUser.uid));
      const userSnapshot = await getDocs(userQuery);
      await Promise.all(userSnapshot.docs.map((userDoc) => deleteDoc(userDoc.ref)));

      const authUser = auth.currentUser;
      if (authUser) {
        await deleteUser(authUser);
      } else {
        await firebaseSignOut(auth);
      }

      setUserProfile(null);
      setShowProfile(false);
      alert("Your account has been deleted.");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error?.code === "auth/requires-recent-login") {
        alert("For security, Firebase needs you to log in again before deleting your account. Please sign out, sign back in, then try Delete my account again.");
      } else {
        alert("Could not delete your account. Please try again.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleLocationSearch = async (query: string) => {
    setLocationSearch(query);
    if (query.length < 3) { setLocationResults([]); return; }
    setSearchingLocation(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      setLocationResults(data);
    } catch {
      setLocationResults([]);
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleLocationSelect = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setLocationSearch(result.display_name.split(",").slice(0, 2).join(","));
    setLocationResults([]);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 15);
    }
  };

  const screenOverlayOpen = Boolean(
    selectedCat ||
      showProfile ||
      showUserCats ||
      showUserPhotos ||
      showUserVisits ||
      showAddCat ||
      showContributeForm ||
      showDuplicateModal ||
      showFilterModal ||
      showCatspotting ||
      showLogin ||
      showAuthRequired ||
      showGuide ||
      showLocationConsent
  );

  const showMapChrome = currentView === "catmap" && !screenOverlayOpen;

  // Header Component - Updated with guest mode support
  function HeaderBar({
    onProfileClick,
    userProfile,
    onLogout,
    currentUser,
    onLogin,
    onGuide,
    onHomeClick,
  }: {
    onProfileClick: () => void;
    userProfile: UserProfile | null;
    onLogout: () => void;
    currentUser: User | null;
    onLogin: () => void;
    onGuide: () => void;
    onHomeClick: () => void;
  }) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: "white",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          height: "72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={onHomeClick}
            style={{ fontSize: "24px", fontWeight: "bold", margin: 0, background: "none", border: "none", cursor: "pointer", padding: 0, color: "#111827" }}
          >
            Catwalk
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "999px", padding: "7px 12px", cursor: "pointer", color: "#4b5563", fontSize: "13px", fontWeight: "500" }}
            onClick={onGuide}
          >
            How to use
          </button>
          {currentUser ? (
            <>
              <button
                style={{ display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                onClick={onProfileClick}
              >
                <UserIcon />
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                    {userProfile?.displayName || "Guest"}
                  </div>
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>
                    {userProfile?.totalContributions || 0} contributions
                  </div>
                </div>
              </button>
              <button style={{ background: "none", border: "none", padding: "8px", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center" }} onClick={onLogout}>
                <LogoutIcon />
              </button>
            </>
          ) : (
            <button
              style={{ padding: "8px 16px", background: "#1a0dab", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}
              onClick={onLogin}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    );
  }

  // Cat List Component - Updated for public browsing
  function CatList({
    cats,
    onSelectCat,
    onAddCat,
  }: {
    cats: Cat[];
    onSelectCat: (cat: Cat) => void;
    onAddCat: () => void;
  }) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredCats = cats.filter((cat) => {
      const matchesSearch = cat.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesEmoji = !filters.emoji || cat.emoji === filters.emoji;
      const matchesPersonality =
        filters.personality.length === 0 ||
        filters.personality.some((trait) => cat.personality.includes(trait));
      const matchesPetting =
        filters.allowsPetting === null ||
        cat.allowsPetting === filters.allowsPetting;
      const matchesTreats =
        filters.acceptsTreats === null ||
        cat.acceptsTreats === filters.acceptsTreats;
      const matchesLiving =
        filters.livingLocation === null ||
        cat.livingLocation === filters.livingLocation;

      return (
        matchesSearch &&
        matchesEmoji &&
        matchesPersonality &&
        matchesPetting &&
        matchesTreats &&
        matchesLiving
      );
    });

    const hasActiveFilters =
      filters.emoji ||
      filters.personality.length > 0 ||
      filters.allowsPetting !== null ||
      filters.acceptsTreats !== null ||
      filters.livingLocation !== null;

    const canEditBrowsePhotoPosition = (cat: Cat, photo?: CatPhoto) =>
      Boolean(
        currentUser &&
          photo &&
          (photo.contributorId === currentUser.uid || cat.creatorId === currentUser.uid)
      );

    const browsePhotoPositions: Array<[string, string]> = [
      ["Top", "center top"],
      ["Centre", "center center"],
      ["Bottom", "center bottom"],
    ];

    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: "60px",
          background: "#f9fafb",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            background: "white",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                position: "relative",
                flex: 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{ position: "absolute", left: "16px", color: "#9ca3af" }}
              >
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search cats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px 12px 48px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  fontSize: "16px",
                  background: "#f9fafb",
                }}
              />
            </div>
            <button
              onClick={() => setShowFilterModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 16px",
                background: hasActiveFilters ? "#1a0dab" : "white",
                color: hasActiveFilters ? "white" : "#111827",
                border: hasActiveFilters ? "none" : "1px solid #e5e7eb",
                borderRadius: "12px",
                cursor: "pointer",
              }}
            >
              <FilterIcon />
              {hasActiveFilters && (
                <span style={{ fontSize: "12px" }}>Active</span>
              )}
            </button>
          </div>
        </div>

        <div style={{ padding: "20px", background: "white" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "600", margin: 0 }}>
              Browse Cats
            </h2>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: "#1a0dab",
                border: "none",
                borderRadius: "12px",
                color: "white",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
              }}
              onClick={() => requireAuth(onAddCat)}
            >
              <PlusIcon size={20} />{" "}
              {currentUser ? "Add Cat" : "Sign in to Add Cat"}
            </button>
          </div>
        </div>

        <div style={{ padding: "20px 20px 96px" }}>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            All Cats ({filteredCats.length})
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            {filteredCats.map((cat) => (
              <button
                key={cat.id}
                type="button"
                style={{
                  background: "white",
                  border: "none",
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  padding: 0,
                  textAlign: "left",
                  width: "100%",
                  fontFamily: "inherit",
                }}
                onClick={() => onSelectCat(cat)}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "220px",
                    background: "#f3f4f6",
                  }}
                >
                  {cat.photos[0] ? (
                    <img
                      src={cat.photos[0].url}
                      alt={cat.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: getCatPhotoPosition(cat.photos[0]),
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#9ca3af",
                        fontSize: "14px",
                      }}
                    >
                      No photo
                    </div>
                  )}
                  {false && canEditBrowsePhotoPosition(cat, cat.photos[0]) && (
                    <div
                      style={{
                        position: "absolute",
                        left: "10px",
                        bottom: "10px",
                        display: "flex",
                        gap: "6px",
                        padding: "6px",
                        borderRadius: "999px",
                        background: "rgba(255, 255, 255, 0.92)",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.16)",
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {browsePhotoPositions.map(([label, position]) => (
                        <button
                          key={position}
                          type="button"
                          title={`Reposition photo: ${label}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleUpdatePhotoPosition(cat.photos[0].id, position);
                          }}
                          style={{
                            border: "none",
                            borderRadius: "999px",
                            padding: "5px 8px",
                            background:
                              getCatPhotoPosition(cat.photos[0]) === position
                                ? "#1a0dab"
                                : "transparent",
                            color:
                              getCatPhotoPosition(cat.photos[0]) === position
                                ? "white"
                                : "#111827",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "rgba(0, 0, 0, 0.7)",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    📸 {cat.photos.length}
                  </div>
                </div>
                <div style={{ padding: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>{cat.emoji}</span>
                    <h4
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        margin: 0,
                        color: "#111827",
                      }}
                    >
                      {cat.name}
                    </h4>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      fontSize: "12px",
                      color: "#6b7280",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      📍 {cat.location.area}
                    </span>
                    <span>{cat.totalVisits} visits</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Bottom Bar - Updated for public browsing
  const BottomBar = () => (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "white",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-around",
        padding: "8px 0",
        zIndex: 1000,
      }}
    >
      <button onClick={() => navigateTo("catmap")}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", background: "none", border: "none", padding: "8px 20px", cursor: "pointer", color: !showCatspotting && currentView === "catmap" ? "#1a0dab" : "#6b7280", fontSize: "14px" }}>
        <MapIcon /><span>Map</span>
      </button>
      <button onClick={() => navigateTo("list")}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", background: "none", border: "none", padding: "8px 20px", cursor: "pointer", color: !showCatspotting && currentView === "list" ? "#1a0dab" : "#6b7280", fontSize: "14px" }}>
        <SearchIcon /><span>Browse</span>
      </button>
      <button onClick={() => navigateTo("catspotting")}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", background: "none", border: "none", padding: "8px 20px", cursor: "pointer", color: showCatspotting ? "#1a0dab" : "#6b7280", fontSize: "14px" }}>
        <CameraIcon /><span>Catspotting</span>
      </button>
    </div>
  );


  const GuideModal = () => (
    showGuide ? (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "white", zIndex: 3000, overflowY: "auto" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "40px 28px 100px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
              <div>
                <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af", marginBottom: "12px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Guide</p>
                <h1 style={{ fontSize: "28px", fontWeight: "normal", fontStyle: "italic", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: "#111827" }}>How to use Catwalk</h1>
              </div>
              <button onClick={() => setShowGuide(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: "20px" }}>×</button>
            </div>

            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px 18px", marginBottom: "28px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "20px", flexShrink: 0 }}>🤝</span>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: "600", margin: "0 0 6px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: "#111827" }}>Approximate locations protect cats</h3>
                <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: "1.65", margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  Catwalk keeps map pins intentionally vague. Please use the map to share cats you already know or naturally come across, not to seek them out. Always respect each cat’s space, their humans, and the neighbourhood they live in.
                </p>
              </div>
            </div>

            {[
              {
                q: "What is Catwalk?",
                a: "Catwalk is a community-built map of neighbourhood cats. Anyone can add a cat they've spotted, contribute information about it, upload photos, and log visits. The more people contribute, the richer each cat's profile becomes."
              },
              {
                q: "How do I navigate the map?",
                a: "The map opens centred on your location. Pinch to zoom, drag to pan. Cat markers appear as emoji — tap one to open that cat's profile. Use the search box in the top-left to fly the map to any location in the world. The + / − controls adjust zoom."
              },
              {
                q: "How do I add a cat?",
                a: "You need to be signed in. On the map, tap 'Add cat' or use the drop pin to mark the location first, then tap 'Add cat'. Fill in the name, colour, personality traits, and an optional photo. The cat will appear on the map immediately."
              },
              {
                q: "What is Catspotting?",
                a: "Catspotting (the camera tab) lets you snap a photo of a cat you've just seen. It tries to detect nearby cats and lets you attach the photo to an existing profile, or create a new one. Useful when you're out and spot a cat quickly."
              },
              {
                q: "How do I contribute to an existing cat's profile?",
                a: "Open a cat's profile and tap 'Contribute'. You can update the description, add personality traits, or submit a community description — a short note about the cat's behaviour, appearance, or an anecdote. Choose the type (description, anecdote, or behaviour) before submitting."
              },
              {
                q: "What does 'Visited' do?",
                a: "Tapping 'Visited' on a cat's profile logs a visit for your account. Your visit count is visible on the profile. It's a way to track cats you've actually met in person. The profile shows total community visits and your personal count separately."
              },
              {
                q: "What is a slow blink?",
                a: "A slow blink is a cat's way of showing trust and affection — sometimes called a 'cat kiss'. Tapping 'Slow Blink' on a profile records that you've exchanged a slow blink with that cat. The total count is a loose measure of how friendly or well-known the cat is."
              },
              {
                q: "Why is the map location blurred on cat profiles?",
                a: "Cat profile maps show an approximate location, not an exact one, to protect the cat's safety. The pin is slightly randomised and the zoom is pulled back. The neighbourhood and street name are shown in text, but the precise coordinates are never displayed."
              },
              {
                q: "Do I need an account to use Catwalk?",
                a: "Yes. You need an account to use Catwalk, including viewing the map, adding cats, uploading photos, logging visits, or contributing information. Creating an account is free and just requires an email and password."
              },
              {
                q: "How do I change what location the map shows?",
                a: "Type any place — a street name, neighbourhood, city, or country — into the search box in the top-left of the map. Results from OpenStreetMap will appear below; tap one to fly there. You can also drop a custom pin anywhere on the map using the 'Drop custom pin' button."
              },
            ].map((item, i) => (
              <div key={i} style={{ borderTop: "1px solid #e5e5e5", paddingTop: "24px", paddingBottom: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "normal", fontStyle: "italic", marginBottom: "10px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: "#111827" }}>{item.q}</h3>
                <p style={{ fontSize: "14px", lineHeight: "1.75", color: "#4b5563", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{item.a}</p>
              </div>
            ))}

            <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "24px", marginTop: "8px" }}>
              <button onClick={() => setShowGuide(false)}
                style={{ padding: "10px 24px", background: "white", border: "1px solid #1a1a1a", cursor: "pointer", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: "13px", color: "#111827", letterSpacing: "0.04em" }}>
                Close guide
              </button>
            </div>
          </div>
        </div>
    ) : null
  );

  // Loading state while Firebase resolves auth
  if (authLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f5f5" }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🐱</div>
          <p>Loading Catwalk...</p>
        </div>
      </div>
    );
  }

  // Login wall — shown if not signed in
  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: "440px", width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>Catwalk</h1>
            <p style={{ fontSize: "16px", color: "#6b7280", lineHeight: "1.6" }}>A community-built map of neighbourhood cats.</p>
          </div>
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "20px", flexShrink: 0 }}>🤝</span>
            <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: "1.6", margin: 0 }}>
              Catwalk keeps map pins intentionally vague. Please use the map to share cats you already know or naturally come across, not to seek them out. Always respect each cat’s space, their humans, and the neighbourhood they live in.
            </p>
          </div>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <button
              onClick={() => setShowGuide(true)}
              style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "999px", padding: "8px 14px", cursor: "pointer", color: "#4b5563", fontSize: "13px", fontWeight: "500" }}
            >
              How to use Catwalk
            </button>
          </div>
          <div style={{ background: "white", borderRadius: "16px", padding: "32px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <LoginScreen onLogin={() => {}} onClose={() => {}} embedded />
          </div>
        </div>
        <GuideModal />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        paddingTop: "72px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: "#f5f5f5",
      }}
    >
      <HeaderBar
        onProfileClick={() => requireAuth(() => setShowProfile(true))}
        userProfile={userProfile}
        onLogout={handleLogout}
        currentUser={currentUser}
        onLogin={() => setShowLogin(true)}
        onGuide={() => setShowGuide(true)}
        onHomeClick={() => navigateTo("catmap")}
      />

      {currentView === "catmap" && !showCatspotting && (
        <>
          {showMapChrome && (
          <div
            style={{
              position: "absolute",
              top: "90px",
              left: "10px",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* Location search */}
            <div style={{ position: "relative" }}>
              <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)", display: "flex", alignItems: "center", padding: "10px 14px", gap: "8px" }}>
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Search for a location..."
                  value={locationSearch}
                  onChange={(e) => handleLocationSearch(e.target.value)}
                  style={{ border: "none", outline: "none", fontSize: "14px", width: "200px", background: "transparent" }}
                />
                {searchingLocation && <span style={{ fontSize: "12px", color: "#9ca3af" }}>...</span>}
                {locationSearch && <button onClick={() => { setLocationSearch(""); setLocationResults([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "16px", padding: 0 }}>×</button>}
              </div>
              {locationResults.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)", marginTop: "4px", overflow: "hidden", zIndex: 1001 }}>
                  {locationResults.map((result: any, i: number) => (
                    <button key={i} onClick={() => handleLocationSelect(result)}
                      style={{ display: "block", width: "100%", padding: "10px 14px", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontSize: "13px", color: "#111827", borderBottom: i < locationResults.length - 1 ? "1px solid #f3f4f6" : "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      {result.display_name.split(",").slice(0, 3).join(",")}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div
              style={{
                background: "white",
                padding: "12px 20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ color: "#ef4444" }}>📍</span>
              <span>
                {manualLocation
                  ? `Custom location selected (${manualLocation[0].toFixed(
                      4
                    )}, ${manualLocation[1].toFixed(4)})`
                  : userLocation
                  ? "Using your current location"
                  : "Location not available"}
              </span>
              {(manualLocation || userLocation) && (
                <button
                  style={{
                    color: "#ef4444",
                    textDecoration: "underline",
                    marginLeft: "8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                  onClick={() => {
                    setManualLocation(null);
                    if (manualMarkerRef.current && mapInstanceRef.current) {
                      mapInstanceRef.current.removeLayer(
                        manualMarkerRef.current
                      );
                      manualMarkerRef.current = null;
                    }
                    if (userLocation && mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo(userLocation, 15);
                    } else if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          const nextLocation: [number, number] = [
                            position.coords.latitude,
                            position.coords.longitude,
                          ];
                          setUserLocation(nextLocation);
                          mapInstanceRef.current?.flyTo(nextLocation, 15);
                        },
                        () => {
                          alert("Could not get your current location. Please check browser location permissions.");
                        },
                        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
                      );
                    } else {
                      alert("Location services are not available in this browser.");
                    }
                  }}
                >
                  Reset location
                </button>
              )}
            </div>
            <button
              style={{
                background: isPlacingPin ? "#1a0dab" : "white",
                color: isPlacingPin ? "white" : "black",
                padding: "12px 20px",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                fontSize: "14px",
                cursor: "pointer",
              }}
              onClick={() => setIsPlacingPin(!isPlacingPin)}
            >
              📌 {isPlacingPin ? "Click map to place pin" : "Drop custom pin"}
            </button>
            {isPlacingPin && (
              <div
                style={{
                  background: "#fef3c7",
                  color: "#92400e",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
              >
                Click anywhere on the map to place a pin
              </div>
            )}
          </div>
          )}
          <div
            ref={mapRef}
            style={{
              cursor: isPlacingPin ? "crosshair" : "grab",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: "60px",
              minHeight: "320px",
              background: "#e8f5e9",
              zIndex: 1,
              pointerEvents: screenOverlayOpen ? "none" : "auto",
            }}
          />
          {showMapChrome && (
          <div
            style={{
              position: "absolute",
              top: "90px",
              right: "10px",
              background: "rgba(255, 255, 255, 0.8)",
              padding: "4px 8px",
              fontSize: "12px",
              borderRadius: "4px",
              zIndex: 1001,
            }}
          >
            {
              cats.filter((cat) => {
                if (!userLocation && !manualLocation) return true;
                const location = manualLocation || userLocation;
                if (!location) return true;
                const distance = getDistanceFromLatLonInMeters(
                  location[0],
                  location[1],
                  cat.location.lat,
                  cat.location.lng
                );
                return distance < 2000;
              }).length
            }{" "}
            cats in this area
          </div>
          )}

          {/* Floating Action Buttons - Show for authenticated users only */}
          {currentUser && showMapChrome && (
            <div
              style={{
                position: "absolute",
                bottom: "100px",
                right: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                zIndex: 999,
              }}
            >
              {/* Catspotting Button */}
              <button
                style={{
                  width: "64px",
                  height: "64px",
                  background: "#10b981",
                  border: "none",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
                  cursor: "pointer",
                }}
                onClick={() => navigateTo("catspotting")}
              >
                <CameraIcon />
              </button>

              {/* Add Cat Button */}
              <button
                style={{
                  width: "64px",
                  height: "64px",
                  background: "#1a0dab",
                  border: "none",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  boxShadow: "0 4px 12px rgba(139, 92, 246, 0.4)",
                  cursor: "pointer",
                }}
                onClick={handleCheckForDuplicates}
              >
                <PlusIcon />
              </button>
            </div>
          )}
        </>
      )}

      {currentView === "list" && (
        <CatList
          cats={cats}
          onSelectCat={setSelectedCat}
          onAddCat={handleCheckForDuplicates}
        />
      )}

      {/* Auth Required Modal */}
      {showAuthRequired && (
        <AuthRequiredModal
          onClose={() => setShowAuthRequired(false)}
          onLogin={() => {
            setShowAuthRequired(false);
            setShowLogin(true);
          }}
        />
      )}

      {/* Login Modal */}
      {showLogin && (
        <LoginScreen
          onLogin={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      {/* User's Cats Screen */}
      {showUserCats && currentUser && (
        <UserCatsScreen
          onBack={() => setShowUserCats(false)}
          currentUser={currentUser}
        />
      )}

      {/* User's Photos Screen */}
      {showUserPhotos && currentUser && (
        <UserPhotosScreen
          onBack={() => setShowUserPhotos(false)}
          currentUser={currentUser}
        />
      )}

      {/* User's Visited Cats Screen */}
      {showUserVisits && currentUser && (
        <UserVisitsScreen
          onBack={() => setShowUserVisits(false)}
          currentUser={currentUser}
        />
      )}

      {/* Cat Profile Modal */}
      {selectedCat && (
        <CatProfile
          cat={selectedCat}
          onClose={() => setSelectedCat(null)}
          currentUser={currentUser}
          onVisit={handleVisit}
          onSlowBlink={handleSlowBlink}
          onAddPhoto={handleAddPhoto}
          onUpdatePhotoPosition={handleUpdatePhotoPosition}
          onDeletePhoto={handleDeletePhoto}
          onDeleteVisit={handleDeleteVisit}
          onContribute={() => setShowContributeForm(true)}
          onAuthRequired={() => setShowAuthRequired(true)}
        />
      )}

      {/* User Profile Modal */}
      {showProfile && (
        <UserProfile
          onClose={() => setShowProfile(false)}
          userProfile={userProfile}
          onShowUserCats={() => {
            setShowProfile(false);
            setShowUserCats(true);
          }}
          onShowUserPhotos={() => {
            setShowProfile(false);
            setShowUserPhotos(true);
          }}
          onShowUserVisits={() => {
            setShowProfile(false);
            setShowUserVisits(true);
          }}
          onDeleteContributions={handleDeleteMyContributions}
          onDeleteAccount={handleDeleteAccount}
        />
      )}

      {/* Add Cat Form */}
      {showAddCat && (
        <AddCatForm
          userLocation={userLocation}
          manualLocation={manualLocation}
          onSubmit={handleAddCat}
          onCancel={() => setShowAddCat(false)}
          currentUser={currentUser}
          userProfile={userProfile}
        />
      )}

      {/* Contribute Form */}
      {showContributeForm && selectedCat && (
        <ContributeForm
          cat={selectedCat}
          onSubmit={handleContribute}
          onCancel={() => setShowContributeForm(false)}
          currentUser={currentUser}
          userProfile={userProfile}
        />
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <FilterModal
          filters={filters}
          onUpdateFilters={setFilters}
          onClose={() => setShowFilterModal(false)}
        />
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <DuplicateModal
          cats={potentialDuplicates}
          onSelectExisting={(cat) => {
            setSelectedCat(cat);
            setShowDuplicateModal(false);
          }}
          onCreateNew={() => {
            setShowDuplicateModal(false);
            setShowAddCat(true);
          }}
          onClose={() => setShowDuplicateModal(false)}
        />
      )}

      {/* Catspotting Screen */}
      {showCatspotting && (
        <CatspottingScreen
          onClose={() => setShowCatspotting(false)}
          currentUser={currentUser}
          userProfile={userProfile}
          cats={cats}
          onAddCat={handleAddCat}
          onAuthRequired={() => {
            setShowCatspotting(false);
            setShowAuthRequired(true);
          }}
        />
      )}

      {/* Location Consent Modal */}
      {showLocationConsent && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "white", padding: "40px 36px", maxWidth: "400px", width: "100%", borderTop: "2px solid #1a1a1a" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af", marginBottom: "20px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Location</p>
            <h2 style={{ fontSize: "22px", fontWeight: "normal", fontStyle: "italic", marginBottom: "16px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: "#111827" }}>Allow location access?</h2>
            <p style={{ fontSize: "14px", lineHeight: "1.7", color: "#4b5563", marginBottom: "32px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              Catwalk uses your location to centre the map on your neighbourhood and help you find cats nearby. Your precise location is never stored or shared — only used locally in your browser.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                onClick={() => {
                  localStorage.setItem("catwalk-location-asked", "true");
                  setShowLocationConsent(false);
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                        setUserLocation(loc);
                        localStorage.setItem("catwalk-last-location", JSON.stringify(loc));
                        if (mapInstanceRef.current) mapInstanceRef.current.flyTo(loc, 15);
                      },
                      () => {}
                    );
                  }
                }}
                style={{ padding: "12px 20px", background: "white", border: "1px solid #1a1a1a", cursor: "pointer", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: "14px", color: "#111827" }}
              >
                Allow location
              </button>
              <button
                onClick={() => {
                  localStorage.setItem("catwalk-location-asked", "true");
                  setShowLocationConsent(false);
                }}
                style={{ padding: "12px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: "13px", color: "#6b7280", textDecoration: "underline", textUnderlineOffset: "2px" }}
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}

      <GuideModal />

      <BottomBar />
    </div>
  );
}
