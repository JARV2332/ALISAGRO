export default function VoiceVisualizer({ activo, etiqueta = 'Escuchando…' }) {
  return (
    <div
      className={`voice-visualizer-panel ${activo ? 'voice-visualizer-panel--activo' : ''}`}
      aria-live="polite"
    >
      <div className="voice-visualizer" aria-hidden={!activo}>
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className="voice-visualizer__bar"
            style={{ animationDelay: `${i * 0.09}s` }}
          />
        ))}
      </div>
      <div className="voice-visualizer__rings" aria-hidden={!activo}>
        <span className="voice-visualizer__ring" />
        <span className="voice-visualizer__ring voice-visualizer__ring--delay" />
      </div>
      <p className="voice-visualizer__label">{etiqueta}</p>
    </div>
  )
}
