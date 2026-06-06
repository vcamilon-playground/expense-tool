import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// iOS home-screen icon (Add to Home Screen). iOS ignores the manifest icons
// and SVG, so this PNG is generated at build time via next/og.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #5b8def, #3b6fd4)',
          fontSize: 104,
        }}
      >
        💸
      </div>
    ),
    size,
  );
}
