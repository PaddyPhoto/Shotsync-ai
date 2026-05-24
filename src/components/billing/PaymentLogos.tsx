export function PaymentLogos({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', ...style }}>
      {/* Visa */}
      <svg viewBox="0 0 44 28" width="44" height="28" style={{ display: 'block' }}>
        <rect width="44" height="28" rx="5" fill="white" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5"/>
        <text x="22" y="19" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="13" fontWeight="900" fontStyle="italic" fill="#1A1F71">VISA</text>
      </svg>
      {/* Mastercard */}
      <svg viewBox="0 0 44 28" width="44" height="28" style={{ display: 'block' }}>
        <rect width="44" height="28" rx="5" fill="white" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5"/>
        <circle cx="17" cy="14" r="8" fill="#EB001B"/>
        <circle cx="27" cy="14" r="8" fill="#F79E1B" fillOpacity="0.9"/>
      </svg>
      {/* Amex */}
      <svg viewBox="0 0 44 28" width="44" height="28" style={{ display: 'block' }}>
        <rect width="44" height="28" rx="5" fill="#016FD0"/>
        <text x="22" y="19" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="9" fontWeight="800" fill="white" letterSpacing="0.5">AMEX</text>
      </svg>
      {/* PayPal */}
      <svg viewBox="0 0 44 28" width="44" height="28" style={{ display: 'block' }}>
        <rect width="44" height="28" rx="5" fill="white" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5"/>
        <text x="22" y="18.5" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="10" fontWeight="700">
          <tspan fill="#003087">Pay</tspan><tspan fill="#009CDE">Pal</tspan>
        </text>
      </svg>
      {/* Apple Pay */}
      <svg viewBox="0 0 52 28" width="52" height="28" style={{ display: 'block' }}>
        <rect width="52" height="28" rx="5" fill="#000"/>
        {/* Apple logo (simplified) */}
        <path d="M17.5 9.5c.8-1 1.3-2.4 1.2-3.8-1.2.1-2.7.8-3.5 1.8-.8.9-1.4 2.3-1.2 3.6 1.3.1 2.6-.6 3.5-1.6z" fill="white"/>
        <path d="M19.7 11.2c-1.9-.1-3.6 1.1-4.5 1.1-.9 0-2.4-1-3.9-1-2 0-3.8 1.2-4.8 3-.2.4-.4.8-.5 1.3-1 3.1.2 7.7 2.8 10.4.8.9 1.8 1.9 3 1.9 1.2 0 1.6-.8 3.1-.8s1.9.8 3.1.8c1.2 0 2.1-.9 2.9-1.8.5-.5.9-1 1.2-1.5-3-.5-3.5-4.8-3.5-5.3 0-2.2 1.2-3.3 1.9-4-.5-.2-.8-.3-.8-.3z" fill="white"/>
        <text x="34" y="18.5" textAnchor="middle" fontFamily="-apple-system,sans-serif" fontSize="10" fontWeight="600" fill="white">Pay</text>
      </svg>
      {/* Google Pay */}
      <svg viewBox="0 0 52 28" width="52" height="28" style={{ display: 'block' }}>
        <rect width="52" height="28" rx="5" fill="white" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5"/>
        {/* G logo */}
        <text x="13" y="19" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="13" fontWeight="700">
          <tspan fill="#4285F4">G</tspan>
        </text>
        <text x="34" y="19" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="10" fontWeight="500" fill="#3c4043">Pay</text>
      </svg>
    </div>
  )
}
