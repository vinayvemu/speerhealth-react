import { useState } from 'react'
import './App.css'

function App() {
  const [doctor, setDoctor] = useState({
    id: 123,
    name: "Dr. Sarah Johnson",
    specialty: "Cardiologist",
    hospital: "New York Presbyterian Hospital and Medical Research Center",
    favorite: false,
    lastInteraction: "2026-06-12",
    tags: ["Cardiology", "Speaker", "KOL"],
  });

  const makeFavorite = () => {
    setDoctor(prev => ({ ...prev, favorite: !prev.favorite }));
  };

  const ProviderCard = () => {
    const initials = doctor.name
      .replace("Dr. ", "")
      .split(" ")
      .map(n => n[0])
      .join("");

    const formattedDate = new Date(doctor.lastInteraction).toLocaleDateString("en-US", {
      day: "2-digit", month: "short", year: "numeric",
    });

    return (
      <article className="doctor-card">

        {/* ── Blue right section ── */}
        <div className="accent-tr" />
        <div className="accent-tr-dark" />
        <div className="accent-bl" />

        {/* ── Intersecting circles decoration ── */}
        <div className="circle c1" />
        <div className="circle c2" />
        <div className="circle c3" />
        <div className="circle c4" />
        <div className="circle c5" />
        <div className="circle c6" />

        {/* ── Left content ── */}
        <div className="card-content">

          {/* Header row */}
          <div className="card-header">
            <div className="avatar">{initials}</div>
            <div className="header-text">
              <h2 className="doctor-name">{doctor.name}</h2>
              <p className="doctor-spec">{doctor.specialty}</p>
              <div className="spec-line" />
            </div>
            <button
              className={`fav-btn${doctor.favorite ? " active" : ""}`}
              onClick={makeFavorite}
              aria-label={doctor.favorite ? "Remove from favourites" : "Add to favourites"}
            >
              {doctor.favorite ? "★" : "☆"}
            </button>
          </div>

          {/* Info rows */}
          <div className="info-section">
            <div className="info-row">
              <div className="info-badge">🏥</div>
              <span className="info-text hospital-text" title={doctor.hospital}>
                {doctor.hospital}
              </span>
            </div>
            <div className="info-row">
              <div className="info-badge">📅</div>
              <span className="info-text">Last seen · {formattedDate}</span>
            </div>
          </div>

          {/* Footer: tags + CTA */}
          <div className="card-footer">
            <div className="tags">
              {doctor.tags.map((tag, i) => (
                <span key={i} className="tag">{tag}</span>
              ))}
            </div>
            <button
              className="view-btn"
              onClick={() => console.log(`View Profile of doctor id: ${doctor.id}`)}
            >
              View Profile →
            </button>
          </div>

        </div>
      </article>
    );
  };

  return (
    <section id="center">
      <ProviderCard />
    </section>
  );
}

export default App
