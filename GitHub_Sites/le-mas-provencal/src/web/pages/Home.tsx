import { useEffect, useRef, useState } from "react";

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

const MENU = {
  Entrées: [
    { name: "Tapenade maison & crostini", desc: "Olives noires, câpres, anchois, huile d'olive AOP", price: "9€" },
    { name: "Soupe au pistou", desc: "Légumes du jardin, basilic frais, parmesan", price: "11€" },
    { name: "Salade niçoise du Mas", desc: "Thon mi-cuit, œuf mollet, tomates cerises, haricots", price: "14€" },
  ],
  "Plats principaux": [
    { name: "Daube provençale", desc: "Bœuf mijoté au vin rouge, olives, zestes d'orange", price: "24€" },
    { name: "Rouget à la plancha", desc: "Poisson de Méditerranée, tian de légumes, rouille maison", price: "28€" },
    { name: "Poulet fermier rôti aux herbes", desc: "Thym, romarin, ail confit, pommes de terre sarladaises", price: "22€" },
    { name: "Risotto aux truffes noires", desc: "Truffe du Vaucluse, parmesan affiné 24 mois", price: "32€" },
  ],
  Desserts: [
    { name: "Tarte Tatin à la lavande", desc: "Pommes caramélisées, miel de Provence, glace vanille", price: "9€" },
    { name: "Pêches rôties au thym", desc: "Pêches du verger, thym citronné, amandes effilées", price: "8€" },
    { name: "Crème brûlée à la fleur d'oranger", desc: "Recette du Mas depuis 1987", price: "8€" },
  ],
};

export default function Home() {
  useReveal();
  const [menuTab, setMenuTab] = useState("Entrées");
  const [form, setForm] = useState({ name: "", email: "", date: "", time: "", guests: "2", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div style={{ background: "#F5EFE4", minHeight: "100vh" }}>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(245,239,228,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #D4C4B0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 5vw", height: "64px"
      }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", fontWeight: 700, color: "#2C1A0E", letterSpacing: "0.02em" }}>
          Le Mas Provençal
        </span>
        {/* Desktop links */}
        <div style={{ display: "flex", gap: "2.5rem", alignItems: "center" }} className="desktop-nav">
          {["Histoire", "Menu", "Réservation", "Contact"].map(item => (
            <a key={item} href={`#${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}`}
              style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#7A6050", textDecoration: "none", fontWeight: 700 }}
              onMouseEnter={e => (e.currentTarget.style.color = "#9B3E1A")}
              onMouseLeave={e => (e.currentTarget.style.color = "#7A6050")}
            >{item}</a>
          ))}
          <a href="#reservation" style={{
            background: "#9B3E1A", color: "#F5EFE4",
            padding: "0.5rem 1.4rem", fontFamily: "'Lato',sans-serif",
            fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase",
            fontWeight: 700, textDecoration: "none"
          }}>Réserver</a>
        </div>
        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", flexDirection: "column", gap: "5px", padding: "4px" }} className="hamburger">
          {[0,1,2].map(i => <span key={i} style={{ display: "block", width: "24px", height: "2px", background: "#2C1A0E" }} />)}
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div style={{ position: "fixed", top: 64, left: 0, right: 0, bottom: 0, background: "#F5EFE4", zIndex: 99, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2.5rem" }}>
          {["Histoire", "Menu", "Réservation", "Contact"].map(item => (
            <a key={item} href={`#${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}`}
              onClick={() => setMenuOpen(false)}
              style={{ fontFamily: "'Playfair Display',serif", fontSize: "2rem", color: "#2C1A0E", textDecoration: "none" }}
            >{item}</a>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>

      {/* HERO */}
      <section style={{ position: "relative", height: "100vh", minHeight: "600px", overflow: "hidden" }}>
        <img src="/hero.jpg" alt="Provence" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(28,16,8,0.35) 0%, rgba(28,16,8,0.55) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 6vw 6vh" }}>
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#EDE4D3", marginBottom: "1rem", fontWeight: 700 }}>
            Luberon · Provence · Depuis 1987
          </p>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(3rem,8vw,7rem)", fontWeight: 700, color: "#F5EFE4", lineHeight: 1.05, marginBottom: "1.5rem", maxWidth: "14ch" }}>
            Le Mas<br /><em style={{ fontStyle: "italic", fontWeight: 400 }}>Provençal</em>
          </h1>
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "1.1rem", color: "#EDE4D3", maxWidth: "480px", lineHeight: 1.7, marginBottom: "2.5rem" }}>
            Cuisine du terroir, produits du jardin, table dressée sous les oliviers.
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <a href="#reservation" style={{ background: "#9B3E1A", color: "#F5EFE4", padding: "0.9rem 2.2rem", fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, textDecoration: "none" }}>
              Réserver une table
            </a>
            <a href="#menu" style={{ border: "1px solid rgba(245,239,228,0.6)", color: "#F5EFE4", padding: "0.9rem 2.2rem", fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, textDecoration: "none" }}>
              Voir le menu
            </a>
          </div>
        </div>
      </section>

      {/* TAGLINE BAND */}
      <div style={{ background: "#2C1A0E", padding: "1.2rem 6vw", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        {["Ouvert mar–dim · 12h–14h30 & 19h–22h", "Terrasse & salle intérieure", "Parking gratuit"].map((t, i) => (
          <span key={i} style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#EDE4D3", fontWeight: 700 }}>{t}</span>
        ))}
      </div>

      {/* HISTOIRE */}
      <section id="histoire" style={{ padding: "8rem 6vw", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6rem", alignItems: "center", maxWidth: "1300px", margin: "0 auto" }}
        className="histoire-grid">
        <style>{`
          @media (max-width: 900px) {
            .histoire-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
            .histoire-img { order: -1; }
          }
        `}</style>
        <div className="reveal">
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#9B3E1A", fontWeight: 700, marginBottom: "1.2rem" }}>Notre histoire</p>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(2.2rem,4vw,3.5rem)", fontWeight: 700, color: "#2C1A0E", lineHeight: 1.15, marginBottom: "1.8rem" }}>
            Une table ancrée<br /><em>dans la terre</em>
          </h2>
          <p style={{ color: "#7A6050", lineHeight: 1.9, marginBottom: "1.2rem", fontSize: "1rem" }}>
            En 1987, Marie et Henri Cassagne ont ouvert les portes de leur mas familial pour partager ce qu'ils aimaient le plus : cuisiner avec ce que la terre provençale offre de meilleur.
          </p>
          <p style={{ color: "#7A6050", lineHeight: 1.9, marginBottom: "2.5rem", fontSize: "1rem" }}>
            Aujourd'hui, leur fils Thomas perpétue la tradition — légumes du potager, herbes cueillies le matin, viandes des producteurs voisins. Pas de chichis, juste l'essentiel bien fait.
          </p>
          <div style={{ display: "flex", gap: "3rem" }}>
            {[["35+", "années d'histoire"], ["12", "producteurs locaux"], ["4", "générations de recettes"]].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "2.2rem", fontWeight: 700, color: "#9B3E1A" }}>{n}</div>
                <div style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#7A6050" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="reveal histoire-img" style={{ position: "relative" }}>
          <img src="/interior.jpg" alt="Intérieur du Mas" style={{ width: "100%", height: "520px", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", bottom: "-2rem", right: "-2rem", background: "#9B3E1A", padding: "1.5rem 2rem" }}>
            <p style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", color: "#F5EFE4", fontSize: "1.1rem", lineHeight: 1.5 }}>"La cuisine, c'est<br />la mémoire d'un lieu."</p>
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", color: "#EDE4D3", marginTop: "0.5rem", letterSpacing: "0.08em" }}>— Marie Cassagne</p>
          </div>
        </div>
      </section>

      {/* LANDSCAPE BAND */}
      <div style={{ margin: "0 6vw", overflow: "hidden" }} className="reveal">
        <img src="/landscape.jpg" alt="Lavande en Provence" style={{ width: "100%", height: "380px", objectFit: "cover", objectPosition: "center 60%", display: "block" }} />
      </div>

      {/* MENU */}
      <section id="menu" style={{ padding: "8rem 6vw", maxWidth: "1100px", margin: "0 auto" }}>
        <div className="reveal" style={{ marginBottom: "4rem" }}>
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#9B3E1A", fontWeight: 700, marginBottom: "1rem" }}>La carte</p>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(2.2rem,4vw,3.5rem)", fontWeight: 700, color: "#2C1A0E", lineHeight: 1.15 }}>
            Cuisine du terroir,<br /><em>saison après saison</em>
          </h2>
        </div>

        {/* Tabs */}
        <div className="reveal" style={{ display: "flex", gap: 0, borderBottom: "1px solid #D4C4B0", marginBottom: "3rem", flexWrap: "wrap" }}>
          {Object.keys(MENU).map(tab => (
            <button key={tab} onClick={() => setMenuTab(tab)} style={{
              fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", letterSpacing: "0.14em",
              textTransform: "uppercase", fontWeight: 700, padding: "0.9rem 2rem",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: menuTab === tab ? "2px solid #9B3E1A" : "2px solid transparent",
              color: menuTab === tab ? "#9B3E1A" : "#7A6050",
              transition: "color 0.2s"
            }}>{tab}</button>
          ))}
        </div>

        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {MENU[menuTab as keyof typeof MENU].map((item, i) => (
            <div key={item.name} className="reveal" style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              padding: "1.8rem 0", borderBottom: "1px solid #D4C4B0", gap: "2rem"
            }}>
              <div>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.25rem", fontWeight: 600, color: "#2C1A0E", marginBottom: "0.4rem" }}>{item.name}</h3>
                <p style={{ color: "#7A6050", fontSize: "0.9rem", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", fontWeight: 600, color: "#9B3E1A", whiteSpace: "nowrap", flexShrink: 0 }}>{item.price}</span>
            </div>
          ))}
        </div>

        <div className="reveal" style={{ marginTop: "3rem", padding: "1.5rem 2rem", background: "#EDE4D3", borderLeft: "3px solid #9B3E1A" }}>
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "#7A6050", lineHeight: 1.7 }}>
            Menu du jour <strong style={{ color: "#2C1A0E" }}>29€</strong> (entrée + plat + dessert) · Disponible le midi du mardi au vendredi · Vins au verre dès 5€
          </p>
        </div>
      </section>

      {/* DISHES GRID */}
      <section style={{ padding: "0 6vw 8rem", maxWidth: "1300px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }} className="dishes-grid">
          <style>{`
            @media (max-width: 700px) {
              .dishes-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
          <img className="reveal" src="/dish1.jpg" alt="Plat provençal" style={{ width: "100%", height: "420px", objectFit: "cover", display: "block" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <img className="reveal" src="/dish2.jpg" alt="Cuisine du terroir" style={{ width: "100%", height: "200px", objectFit: "cover", display: "block" }} />
            <img className="reveal" src="/dish3.jpg" alt="Dessert provençal" style={{ width: "100%", height: "200px", objectFit: "cover", display: "block" }} />
          </div>
        </div>
      </section>

      {/* RÉSERVATION */}
      <section id="reservation" style={{ background: "#2C1A0E", padding: "8rem 6vw" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6rem", alignItems: "start" }} className="resa-grid">
          <style>{`
            @media (max-width: 900px) {
              .resa-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
            }
          `}</style>
          <div className="reveal">
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#9B3E1A", fontWeight: 700, marginBottom: "1.2rem" }}>Réservation</p>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(2rem,4vw,3.2rem)", fontWeight: 700, color: "#F5EFE4", lineHeight: 1.15, marginBottom: "2rem" }}>
              Réservez votre<br /><em>table au Mas</em>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {[
                ["Adresse", "Route des Lavandes, 84220 Gordes"],
                ["Téléphone", "+33 4 90 72 12 34"],
                ["Email", "contact@lemasprovenvcal.fr"],
                ["Horaires", "Mar–Dim : 12h–14h30 & 19h–22h"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#9B3E1A", marginBottom: "0.3rem" }}>{k}</p>
                  <p style={{ color: "#EDE4D3", fontSize: "0.95rem" }}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal">
            {submitted ? (
              <div style={{ background: "#3D2510", padding: "3rem", textAlign: "center" }}>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", color: "#F5EFE4", marginBottom: "1rem" }}>Merci !</p>
                <p style={{ color: "#EDE4D3", lineHeight: 1.7 }}>Votre demande de réservation a été reçue. Nous vous confirmons votre table dans les plus brefs délais.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                {[
                  { id: "name", label: "Nom & Prénom", type: "text", placeholder: "Jean Dupont" },
                  { id: "email", label: "Email", type: "email", placeholder: "jean@email.com" },
                ].map(f => (
                  <div key={f.id}>
                    <label style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#9B3E1A", display: "block", marginBottom: "0.4rem" }}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} required
                      value={form[f.id as keyof typeof form]}
                      onChange={e => setForm({ ...form, [f.id]: e.target.value })}
                      style={{ width: "100%", background: "#3D2510", border: "1px solid #5C3A20", color: "#F5EFE4", padding: "0.8rem 1rem", fontFamily: "'Lato',sans-serif", fontSize: "0.95rem", outline: "none" }} />
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#9B3E1A", display: "block", marginBottom: "0.4rem" }}>Date</label>
                    <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                      style={{ width: "100%", background: "#3D2510", border: "1px solid #5C3A20", color: "#F5EFE4", padding: "0.8rem 1rem", fontFamily: "'Lato',sans-serif", fontSize: "0.95rem", outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#9B3E1A", display: "block", marginBottom: "0.4rem" }}>Heure</label>
                    <select value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                      style={{ width: "100%", background: "#3D2510", border: "1px solid #5C3A20", color: "#F5EFE4", padding: "0.8rem 1rem", fontFamily: "'Lato',sans-serif", fontSize: "0.95rem", outline: "none" }}>
                      {["12:00", "12:30", "13:00", "13:30", "14:00", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#9B3E1A", display: "block", marginBottom: "0.4rem" }}>Nombre de couverts</label>
                  <select value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })}
                    style={{ width: "100%", background: "#3D2510", border: "1px solid #5C3A20", color: "#F5EFE4", padding: "0.8rem 1rem", fontFamily: "'Lato',sans-serif", fontSize: "0.95rem", outline: "none" }}>
                    {["1","2","3","4","5","6","7","8+"].map(n => <option key={n} value={n}>{n} personne{n !== "1" ? "s" : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#9B3E1A", display: "block", marginBottom: "0.4rem" }}>Message (optionnel)</label>
                  <textarea rows={3} placeholder="Allergies, occasion spéciale..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                    style={{ width: "100%", background: "#3D2510", border: "1px solid #5C3A20", color: "#F5EFE4", padding: "0.8rem 1rem", fontFamily: "'Lato',sans-serif", fontSize: "0.95rem", outline: "none", resize: "vertical" }} />
                </div>
                <button type="submit" style={{ background: "#9B3E1A", color: "#F5EFE4", padding: "1rem 2.5rem", fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer", marginTop: "0.5rem", transition: "background 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#7A3015")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#9B3E1A")}>
                  Envoyer la demande
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" style={{ background: "#1A0F07", padding: "4rem 6vw 2rem", borderTop: "1px solid #3D2510" }}>
        <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "3rem", marginBottom: "3rem" }}>
            <div>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", fontWeight: 700, color: "#F5EFE4", marginBottom: "0.5rem" }}>Le Mas Provençal</p>
              <p style={{ color: "#7A6050", fontSize: "0.9rem" }}>Route des Lavandes · 84220 Gordes</p>
            </div>
            <div style={{ display: "flex", gap: "4rem", flexWrap: "wrap" }}>
              <div>
                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#9B3E1A", marginBottom: "1rem" }}>Navigation</p>
                {["Histoire", "Menu", "Réservation"].map(l => (
                  <a key={l} href={`#${l.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}`}
                    style={{ display: "block", color: "#7A6050", textDecoration: "none", fontSize: "0.9rem", marginBottom: "0.5rem" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#EDE4D3")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#7A6050")}>{l}</a>
                ))}
              </div>
              <div>
                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#9B3E1A", marginBottom: "1rem" }}>Contact</p>
                <p style={{ color: "#7A6050", fontSize: "0.9rem", marginBottom: "0.5rem" }}>+33 4 90 72 12 34</p>
                <p style={{ color: "#7A6050", fontSize: "0.9rem" }}>contact@lemasprovenvcal.fr</p>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #3D2510", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <p style={{ color: "#5C3A20", fontSize: "0.8rem" }}>© 2024 Le Mas Provençal. Tous droits réservés.</p>
            <p style={{ color: "#5C3A20", fontSize: "0.8rem" }}>Site réalisé par <span style={{ color: "#9B3E1A" }}>votre nom freelance</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
