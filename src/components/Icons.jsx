const iconClass = 'w-6 h-6 shrink-0'

/** Logo: hoja + señal Wi-Fi (identidad ALISAGRO) */
export function IconLogo({ className = 'w-10 h-10' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M24 8C16 16 10 20 10 28a14 14 0 1028 0c0-8-6-12-14-20z"
        fill="currentColor"
        className="text-lime"
      />
      <path
        d="M24 6c0 0-6 4-6 10"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M24 4c-3 0-5 2-5 5M24 4c3 0 5 2 5 5M24 2c-5 0-8 3-8 8M24 2c5 0 8 3 8 8"
        stroke="white"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  )
}

export function IconLeaf({ className = iconClass }) {
  return <IconLogo className={className} />
}

export function IconDroplet({ className = iconClass }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2.69l5.66 5.66a8 8 0 11-11.32 0L12 2.69z"
        fill="currentColor"
        fillOpacity="0.2"
      />
    </svg>
  )
}

export function IconThermometer({ className = iconClass }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
      <circle cx="11.5" cy="17.5" r="1.5" fill="currentColor" />
    </svg>
  )
}

export function IconSun({ className = iconClass }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

export function IconCloud({ className = iconClass }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 10h-1.26A8 8 0 109 16h9a3 3 0 100-6z" />
    </svg>
  )
}

export function IconChart({ className = iconClass }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16l4-6 4 3 5-8" />
    </svg>
  )
}

export function IconCamera({ className = iconClass }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

export function IconRefresh({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M20 9A8 8 0 006.34 6.34M4 15a8 8 0 0013.66 2.66" />
    </svg>
  )
}

export function IconSignal({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2a10 10 0 0110 10" fill="none" stroke="currentColor" strokeWidth="2" opacity=".4" />
      <path d="M12 6a6 6 0 016 6" fill="none" stroke="currentColor" strokeWidth="2" opacity=".65" />
    </svg>
  )
}

export function IconUpload({ className = iconClass }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12l-4 4m4-4l4 4" />
    </svg>
  )
}

export function IconCheck({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function IconMapPin({ className = iconClass }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" fill="currentColor" fillOpacity="0.25" />
    </svg>
  )
}

export function IconMic({ className = iconClass }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0M12 18v3" />
    </svg>
  )
}

export function IconField({ className = iconClass }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V9l7-4 7 4v12M9 21v-6h6v6" />
    </svg>
  )
}

export function IconReport({ className = iconClass }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6M12 17V7M15 17v-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12a2 2 0 012 2v14l-3-2-3 2-3-2-3 2V5a2 2 0 012-2z" />
    </svg>
  )
}

export function IconDownload({ className = iconClass }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4l-4-4M4 21h16" />
    </svg>
  )
}

export function IconPdf({ className = iconClass }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M8 13h1v4H8v-4zm4 0h1.5a1.5 1.5 0 010 3H12v-3zm5 0h1v4h-1v-1.5h-1v1.5h-1v-4h1v1.5h1V13z" />
    </svg>
  )
}
