import { useMemo, useState } from 'react'
import { useSimStore } from '../store/simStore'

const RAD2DEG = 180 / Math.PI

export function SimSatelliteInfo() {
  const satellites = useSimStore((s) => s.satellites)
  const bands = useSimStore((s) => s.bands)
  const selectedSimSatIds = useSimStore((s) => s.selectedSimSatIds)
  const toggleSimSatellite = useSimStore((s) => s.toggleSimSatellite)
  const clearSimSelection = useSimStore((s) => s.clearSimSelection)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const bandMap = useMemo(
    () => new Map(bands.map((b) => [b.id, b])),
    [bands]
  )

  const selectedSats = useMemo(
    () =>
      selectedSimSatIds
        .map((id) => satellites.find((s) => s.id === id))
        .filter(Boolean) as typeof satellites,
    [satellites, selectedSimSatIds]
  )

  if (selectedSats.length === 0) return null

  return (
    <div className="sim-select-panel">
      {/* Header */}
      <div className="sim-select-header">
        <span className="sim-select-title">
          Selected Satellites ({selectedSats.length})
        </span>
        <button
          className="sim-select-clear"
          onClick={clearSimSelection}
        >
          clear {selectedSats.length}
        </button>
      </div>

      {/* List */}
      <div className="sim-select-list">
        {selectedSats.map((sat) => {
          const band = bandMap.get(sat.bandId)
          const label = `SAT ${band?.altitudeKm ?? '?'}km #${sat.id.split('-').pop()}`
          const isExpanded = expandedId === sat.id

          return (
            <div key={sat.id} className="sim-select-item">
              <div className="sim-select-item-row">
                <button
                  className="sim-select-info-btn"
                  onClick={() => setExpandedId(isExpanded ? null : sat.id)}
                  title="Show details"
                >
                  i
                </button>
                <span
                  className="sim-select-item-name"
                  onClick={() => setExpandedId(isExpanded ? null : sat.id)}
                >
                  {label}
                </span>
                <button
                  className="sim-select-remove"
                  onClick={() => toggleSimSatellite(sat.id)}
                  title="Deselect"
                >
                  ×
                </button>
              </div>

              {isExpanded && (
                <div className="sim-select-detail">
                  <div className="sim-detail-grid">
                    <span>Altitude</span>
                    <span>{band?.altitudeKm ?? '?'} km</span>
                    <span>Inclination</span>
                    <span>{sat.inclination.toFixed(2)}°</span>
                    <span>RAAN</span>
                    <span>{(sat.raan * RAD2DEG).toFixed(1)}°</span>
                    <span>Ang. Vel.</span>
                    <span>{sat.angularVelocity.toFixed(6)} rad/s</span>
                    <span>Status</span>
                    <span style={{ color: sat.active ? '#4ade80' : '#f87171' }}>
                      {sat.active ? 'Active' : 'Destroyed'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="sim-select-hint">Ctrl+click to select multiple</p>
    </div>
  )
}
