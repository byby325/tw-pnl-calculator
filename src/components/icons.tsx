/**
 * 內嵌 SVG 圖示（Lucide 的線條規格：24 格、stroke 2、圓端點）。
 * 不用 emoji 當圖示，也不外掛圖示套件 —— APK 要離線，少一個相依就少一個變數。
 */
interface IconProps {
    className?: string
}

const base = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
}

export function SearchIcon({ className }: IconProps) {
    return (
        <svg {...base} className={className}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
    )
}

export function PlusIcon({ className }: IconProps) {
    return (
        <svg {...base} className={className}>
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    )
}

export function TrashIcon({ className }: IconProps) {
    return (
        <svg {...base} className={className}>
            <path d="M3 6h18" />
            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
    )
}

export function ChevronDownIcon({ className }: IconProps) {
    return (
        <svg {...base} className={className}>
            <path d="m6 9 6 6 6-6" />
        </svg>
    )
}
