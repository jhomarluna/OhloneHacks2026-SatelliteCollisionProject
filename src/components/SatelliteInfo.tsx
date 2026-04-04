import { useMemo } from 'react'
import { useSimStore } from '../store/simStore'

export function SatelliteInfo() {
  const realSatellites = useSimStore((s) => s.realSatellites)
  const selectedSatId = useSimStore((s) => s.selectedSatId)
  const selectSatellite = useSimStore((s) => s.selectSatellite)
  const explodeRealSatellite = useSimStore((s) => s.explodeRealSatellite)

  const sat = useMemo(
    () => realSatellites.find((s) => s.id === selectedSatId),
    [realSatellites, selectedSatId]
  )

  if (!sat) return null

  return (
    <div className="sat-info-panel">
      <div className="sat-info-header">
        <span className="sat-info-dot" />
        <h3>{sat.name}</h3>
        <button className="sat-info-close" onClick={() => selectSatellite(null)}>
          ✕
        </button>
      </div>

      <div className="sat-info-grid">
        <span>NORAD ID</span>
        <span>{sat.noradId}</span>

        <span>Altitude</span>
        <span>{Math.round(sat.altitudeKm)} km</span>

        <span>Period</span>
        <span>{sat.period.toFixed(1)} min</span>

        <span>Inclination</span>
        <span>{sat.inclination.toFixed(2)}°</span>

        <span>RAAN</span>
        <span>{sat.raan.toFixed(1)}°</span>

        <span>Eccentricity</span>
        <span>{sat.eccentricity.toFixed(4)}</span>

        <span>Status</span>
        <span style={{ color: sat.active ? '#4ade80' : '#f87171' }}>
          {sat.active ? 'Active' : 'Destroyed'}
        </span>
      </div>

      {sat.active && (
        <button
          className="btn-explode"
          onClick={() => explodeRealSatellite(sat.id)}
        >
          💥 Detonate Satellite
        </button>
      )}
    </div>
  )
}
