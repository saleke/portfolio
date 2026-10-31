import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Solomon Aleke, software developer and saleke portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const portrait = await readFile(path.join(process.cwd(), "public/images/solomon-aleke.png"));
  const portraitUrl = `data:image/png;base64,${portrait.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#0b0d0c",
        color: "#f1f3ed",
        fontFamily: "Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 700,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "68px 54px 68px 76px",
          borderTop: "12px solid #c4f269",
        }}
      >
        <div style={{ display: "flex", color: "#c4f269", fontSize: 24, letterSpacing: 8 }}>
          SOLOMON
        </div>
        <div style={{ display: "flex", marginTop: 8, fontSize: 112, fontWeight: 800, letterSpacing: -8 }}>
          ALEKE<span style={{ color: "#c4f269" }}>.</span>
        </div>
        <div style={{ display: "flex", width: 110, height: 5, marginTop: 24, background: "#c4f269" }} />
        <div style={{ display: "flex", marginTop: 30, color: "#c0c8c0", fontSize: 30 }}>
          Full stack software developer
        </div>
        <div style={{ display: "flex", marginTop: 42, color: "#9aa49c", fontSize: 20, letterSpacing: 2 }}>
          saleke.is-a.dev
        </div>
      </div>

      <div style={{ position: "relative", width: 500, height: 630, display: "flex", background: "#111513" }}>
        <img
          src={portraitUrl}
          alt=""
          width="500"
          height="630"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 42%" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            border: "2px solid #29312b",
            background: "linear-gradient(135deg, transparent 64%, rgba(196,242,105,.16))",
          }}
        />
      </div>
    </div>,
    size,
  );
}
