import { IconCar } from './icons.jsx'

/** Shown while a stored token is being checked against /api/auth/me. */
export default function SplashScreen() {
  return (
    <div className="splash">
      <span className="splash-mark"><IconCar width={26} height={26} /></span>
      <span className="splash-brand">Singha<strong>Parking</strong></span>
      <span className="spinner" aria-label="Loading" />
    </div>
  )
}
