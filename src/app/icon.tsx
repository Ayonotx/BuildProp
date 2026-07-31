import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#c2410c',
          borderRadius: 8,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 40C16 22 22 14 32 12C42 14 48 22 48 40Z"
            fill="#f97316"
          />
          <rect x="10" y="38" width="44" height="6" rx="3" fill="#f97316" />
          <path
            d="M16 40C16 22 22 14 32 12C42 14 48 22 48 40"
            stroke="#fb923c"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <rect x="29" y="10" width="6" height="5" rx="2.5" fill="#fb923c" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
