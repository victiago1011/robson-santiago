import { ImageResponse } from "next/og";

// This image is rendered as PNG for WhatsApp, Facebook, LinkedIn and other
// crawlers. It belongs only to /financas: the site's RS identity is unchanged.
export const alt = "Panorama 360° — Brasil, Mundo, Economia e Política. Por Robson Santiago.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function PanoramaOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(123deg, #06182e 0%, #082c55 53%, #05152a 100%)",
          color: "#f9f6e9",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 850,
            height: 850,
            top: -340,
            right: -250,
            borderRadius: 9999,
            border: "2px solid rgba(71, 161, 219, 0.2)",
            background: "radial-gradient(circle at center, rgba(7, 104, 194, 0.23), transparent 68%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 1100,
            height: 170,
            left: -180,
            top: 450,
            borderTop: "4px solid rgba(238, 177, 71, 0.9)",
            borderRadius: "50%",
            transform: "rotate(-6deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 1180,
            height: 150,
            left: 220,
            top: 506,
            borderTop: "3px solid rgba(21, 153, 240, 0.8)",
            borderRadius: "50%",
            transform: "rotate(-4deg)",
          }}
        />

        <div style={{ display: "flex", width: 440, alignItems: "center", paddingLeft: 28 }}>
          <svg width="415" height="415" viewBox="0 0 420 420" aria-hidden="true">
            <defs>
              <radialGradient id="sea" cx="37%" cy="24%" r="79%">
                <stop offset="0%" stopColor="#157bd0" />
                <stop offset="43%" stopColor="#074d94" />
                <stop offset="100%" stopColor="#041b3a" />
              </radialGradient>
              <linearGradient id="gold" x1="0%" x2="100%" y1="0%" y2="70%">
                <stop offset="0%" stopColor="#fff0a7" />
                <stop offset="43%" stopColor="#d19c31" />
                <stop offset="100%" stopColor="#f6d47d" />
              </linearGradient>
            </defs>
            <circle cx="210" cy="210" r="173" fill="url(#sea)" stroke="#f1c870" strokeWidth="3" />
            <g stroke="#58b1eb" strokeWidth="1.4" fill="none" opacity="0.6">
              <ellipse cx="210" cy="210" rx="65" ry="173" />
              <ellipse cx="210" cy="210" rx="130" ry="173" />
              <path d="M37 210h346M66 110h288M66 310h288M46 155h328M46 265h328" />
            </g>
            <g fill="url(#gold)" opacity="0.98">
              <path d="M97 88 132 71 168 79 184 108 160 132 151 162 126 176 121 207 102 218 83 194 63 174 58 146 72 119Z" />
              <path d="m144 219 29 10 25 29-9 34-17 34-9 39-21-20 2-38-21-22-7-34Z" />
              <path d="m223 87 28-25 32 8 13 18 32-3 31 32-5 31-29 6-19 19-35-7-13-33-36-5Z" />
              <path d="m251 163 28 6 31 36-10 43-19 23-10 41-20-31-10-50-18-22Z" />
              <path d="m324 282 33 12 10 26-31 11-25-20Z" />
            </g>
            <ellipse cx="210" cy="212" rx="199" ry="55" fill="none" stroke="#f2bd56" strokeWidth="8" transform="rotate(-21 210 212)" />
            <ellipse cx="210" cy="212" rx="199" ry="55" fill="none" stroke="#fff0b3" strokeWidth="2" opacity="0.8" transform="rotate(-21 210 212)" />
            <circle cx="210" cy="210" r="173" fill="none" stroke="#29a4f3" strokeWidth="2" opacity="0.8" />
          </svg>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 730,
            padding: "54px 50px 70px 0",
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 26,
              letterSpacing: 5,
              color: "#edca7f",
              fontWeight: 700,
              marginBottom: 22,
              display: "flex",
            }}
          >
            BRASIL • MUNDO • ECONOMIA & POLÍTICA
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontWeight: 900, lineHeight: 0.96 }}>
            <span style={{ fontSize: 92, letterSpacing: -5, color: "#fff7e7" }}>PANORAMA</span>
            <span style={{ fontSize: 162, letterSpacing: -8, color: "#f5bf57", marginTop: 7 }}>360°</span>
          </div>
          <div style={{ width: 510, height: 4, marginTop: 30, marginBottom: 22, background: "#dda543" }} />
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 3, color: "#e7eef7" }}>
            ROBSON SANTIAGO
          </div>
        </div>
      </div>
    ),
    size,
  );
}
