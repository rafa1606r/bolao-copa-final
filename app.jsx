import { useState, useEffect, useCallback, useMemo } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAocYorgMDHSf2y8rCeaVyvT7DztI",
  authDomain: "bolao-copa-5750f.firebaseapp.com",
  projectId: "bolao-copa-5750f",
  storageBucket: "bolao-copa-5750f.firebasestorage.app",
  messagingSenderId: "195737276586",
  appId: "1:195737276586:web:f9e5787a879d9400534Od3"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ENTRADA = 50;
const SPLIT = { champion: 0.5, brazil: 0.5 };
const BRAZIL_PRIZE = { first: 0.7, second: 0.2, third: 0.1 };

const TEAMS = [
  { name: "Brasil", flag: "🇧🇷" },
  { name: "Argentina", flag: "🇦🇷" },
  { name: "França", flag: "🇫🇷" },
  { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Espanha", flag: "🇪🇸" },
  { name: "Alemanha", flag: "🇩🇪" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Países Baixos", flag: "🇳🇱" },
  { name: "Bélgica", flag: "🇧🇪" },
  { name: "Uruguai", flag: "🇺🇾" },
  { name: "Croácia", flag: "🇭🇷" },
  { name: "Marrocos", flag: "🇲🇦" },
  { name: "EUA", flag: "🇺🇸" },
  { name: "Japão", flag: "🇯🇵" },
  { name: "Colômbia", flag: "🇨🇴" },
  { name: "México", flag: "🇲🇽" },
  { name: "Outro", flag: "🌍" },
];

const BRAZIL_GAMES = [
  { id: "g1", phase: "Grupos", label: "Jogo 1", opponent: "Marrocos", flag: "🇲🇦" },
  { id: "g2", phase: "Grupos", label: "Jogo 2", opponent: "Haiti", flag: "🇭🇹" },
  { id: "g3", phase: "Grupos", label: "Jogo 3", opponent: "Escócia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { id: "r16", phase: "Oitavas", label: "Oitavas", opponent: "Adversário", flag: "🌐" },
  { id: "qf", phase: "Quartas", label: "Quartas", opponent: "Adversário", flag: "🌐" },
  { id: "sf", phase: "Semi", label: "Semifinal", opponent: "Adversário", flag: "🌐" },
  { id: "final", phase: "Final", label: "Final", opponent: "Adversário", flag: "🌐" },
];

const fmt = (v) => `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

export default function BolaoApp() {
  const [screen, setScreen] = useState("home");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const [name, setName] = useState("");
  const [champion, setChampion] = useState(null);
  const [customChampion, setCustomChampion] = useState("");
  const [scores, setScores] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "apostas"), orderBy("timestamp", "asc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEntries(data);
    } catch (err) {
      console.error("Erro ao carregar apostas:", err);
      setEntries([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => {
    if (screen === "board" || screen === "prize") loadEntries();
  }, [screen, loadEntries]);

  const handleSubmit = async () => {
    if (!name.trim()) return setError("Digite seu nome!");
    if (!champion) return setError("Escolha o campeão!");
    if (champion.name === "Outro" && !customChampion.trim()) return setError("Digite o nome do país campeão!");
    
    const allScoresFilled = BRAZIL_GAMES.every((g) => {
      const s = scores[g.id];
      return s && s.brazil !== "" && s.opponent !== "";
    });
    if (!allScoresFilled) return setError("Preencha os placares de todos os 7 jogos do Brasil!");

    setSaving(true);
    setError("");
    
    const entry = {
      name: name.trim(),
      champion: champion.name === "Outro" ? { name: customChampion.trim(), flag: "🌍" } : champion,
      scores,
      date: new Date().toLocaleDateString("pt-BR"),
      timestamp: Date.now()
    };
    
    try {
      await addDoc(collection(db, "apostas"), entry);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setName(""); setChampion(null); setCustomChampion(""); setScores({}); setError("");
        setScreen("board");
        loadEntries();
      }, 1800);
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setError("Erro ao salvar. Tente novamente.");
    }
    setSaving(false);
  };

  const updateScore = useCallback((gameId, team, value) => {
    const num = value === "" ? "" : Math.max(0, Math.min(20, parseInt(value) || 0));
    setScores((prev) => ({ ...prev, [gameId]: { ...prev[gameId], [team]: num } }));
  }, []);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    
    if (navigator.share) {
      navigator.share({
        title: "Bolão da Copa",
        text: "⚽ Participe do nosso Bolão da Copa! R$50 de entrada.",
        url: url
      }).catch(() => {
        setShowLinkModal(true);
      });
      return;
    }
    
    setShowLinkModal(true);
  }, []);

  const copyLink = useCallback(() => {
    const url = window.location.href;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setShareSuccess(true);
        setShowLinkModal(false);
        setTimeout(() => setShareSuccess(false), 2500);
      }).catch(() => {
        fallbackCopy(url);
      });
      return;
    }
    
    fallbackCopy(url);
  }, []);

  const fallbackCopy = (text) => {
    const input = document.createElement("input");
    input.value = text;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.focus();
    input.select();
    
    try {
      document.execCommand("copy");
      setShareSuccess(true);
      setShowLinkModal(false);
      setTimeout(() => setShareSuccess(false), 2500);
    } catch (err) {
      console.error("Erro ao copiar:", err);
    }
    
    document.body.removeChild(input);
  };

  const total = useMemo(() => entries.length * ENTRADA, [entries.length]);
  const pots = useMemo(() => ({
    champion: total * SPLIT.champion,
    brazil: total * SPLIT.brazil,
  }), [total]);

  const championCounts = useMemo(() => {
    const counts = entries.reduce((acc, e) => {
      const key = e.champion.name;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [entries]);

  const tabs = [
    { id: "home", label: "Início" },
    { id: "form", label: "Apostar" },
    { id: "board", label: `Placar (${entries.length})` },
    { id: "prize", label: "💰 Prêmios" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: "#fff",
      position: "relative",
    }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: `radial-gradient(circle at 15% 15%, rgba(255,193,7,0.08) 0%, transparent 40%),
          radial-gradient(circle at 85% 85%, rgba(33,150,243,0.06) 0%, transparent 40%)`,
      }} />

      {shareSuccess && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 1001,
          background: "linear-gradient(135deg, #4caf50, #66bb6a)",
          color: "#fff", padding: "14px 28px", borderRadius: 12,
          boxShadow: "0 4px 20px rgba(76,175,80,0.5)",
          fontWeight: 600, fontSize: 15,
        }}>
          ✓ Link copiado!
        </div>
      )}

      {showLinkModal && (
        <div onClick={() => setShowLinkModal(false)} style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#1e2a3a",
            borderRadius: 16,
            padding: "28px",
            maxWidth: 500,
            width: "100%",
            border: "1px solid rgba(255,193,7,0.3)",
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>📤 Compartilhar Bolão</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20 }}>
              Copie o link abaixo e envie no grupo do WhatsApp
            </p>
            
            <div style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 10,
              padding: "14px",
              marginBottom: 16,
              wordBreak: "break-all",
              fontSize: 13,
              color: "rgba(255,255,255,0.8)",
            }}>
              {window.location.href}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={copyLink} style={{
                flex: 1,
                background: "linear-gradient(135deg, #ffc107, #ff9800)",
                color: "#000", border: "none", borderRadius: 10,
                padding: "12px", fontSize: 15, fontWeight: 700,
                cursor: "pointer",
              }}>
                📋 Copiar Link
              </button>
              <button onClick={() => setShowLinkModal(false)} style={{
                background: "rgba(255,255,255,0.1)",
                color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 10, padding: "12px 20px",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <Header tabs={tabs} screen={screen} setScreen={setScreen} onShare={handleShare} />

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px 80px", position: "relative", zIndex: 10 }}>
        {screen === "home" && (
          <HomeScreen entries={entries} total={total} pots={pots} setScreen={setScreen} onShare={handleShare} />
        )}
        
        {screen === "form" && (
          <FormScreen
            submitted={submitted}
            name={name}
            setName={setName}
            champion={champion}
            setChampion={setChampion}
            customChampion={customChampion}
            setCustomChampion={setCustomChampion}
            scores={scores}
            updateScore={updateScore}
            error={error}
            saving={saving}
            handleSubmit={handleSubmit}
          />
        )}

        {screen === "board" && (
          <BoardScreen loading={loading} entries={entries} total={total} loadEntries={loadEntries} setScreen={setScreen} />
        )}

        {screen === "prize" && (
          <PrizeScreen entries={entries} total={total} pots={pots} championCounts={championCounts} loadEntries={loadEntries} />
        )}
      </main>
    </div>
  );
}

// Componentes auxiliares (mantidos iguais)
function Header({ tabs, screen, setScreen, onShare }) {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,193,7,0.2)",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: "linear-gradient(135deg, #ffc107, #ff9800)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, boxShadow: "0 4px 16px rgba(255,193,7,0.3)",
            }}>🏆</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" }}>Bolão da Copa</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>R$50/pessoa</div>
            </div>
          </div>
          <button onClick={onShare} style={{
            background: "linear-gradient(135deg, #25d366, #128c7e)",
            color: "#fff", border: "none", borderRadius: 10,
            padding: "8px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            boxShadow: "0 2px 12px rgba(37,211,102,0.3)",
          }}>
            <span style={{ fontSize: 16 }}>📤</span> Compartilhar
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setScreen(t.id)} style={{
              background: screen === t.id ? "linear-gradient(135deg, #ffc107, #ff9800)" : "rgba(255,255,255,0.08)",
              color: screen === t.id ? "#000" : "#fff",
              border: "none", borderRadius: 10, padding: "7px 16px",
              cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.2s",
            }}>{t.label}</button>
          ))}
        </div>
      </div>
    </header>
  );
}

function HomeScreen({ entries, total, pots, setScreen, onShare }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>⚽</div>
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8, letterSpacing: "-1px" }}>
        Bolão da Copa do Mundo
      </h1>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, marginBottom: 28, lineHeight: 1.6, maxWidth: 500, margin: "0 auto 28px" }}>
        Aposte no campeão e nos placares do Brasil até as finais!
      </p>

      {entries.length > 0 && (
        <div style={{
          background: "rgba(255,193,7,0.1)", border: "1px solid rgba(255,193,7,0.3)",
          borderRadius: 16, padding: "20px", marginBottom: 28, maxWidth: 380, margin: "0 auto 28px",
        }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>POTE TOTAL</div>
          <div style={{ fontSize: 44, fontWeight: 700, color: "#ffc107" }}>{fmt(total)}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
            {entries.length} participante{entries.length > 1 ? "s" : ""}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32, maxWidth: 560, margin: "0 auto 32px" }}>
        <CategoryCard emoji="🏆" title="Campeão" desc="Divide entre acertos" value={fmt(pots.champion)} pct="50%" />
        <CategoryCard emoji="🇧🇷" title="Placares Brasil" desc="Top 3 por pontos" value={fmt(pots.brazil)} pct="50%" />
      </div>

      <ScoringRules />

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
        <button onClick={() => setScreen("form")} style={{
          background: "linear-gradient(135deg, #ffc107, #ff9800)",
          color: "#000", border: "none", borderRadius: 12,
          padding: "14px 40px", fontSize: 16, fontWeight: 700,
          cursor: "pointer", boxShadow: "0 6px 24px rgba(255,193,7,0.4)",
        }}>
          Fazer Aposta →
        </button>
        <button onClick={onShare} style={{
          background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
          color: "#fff", borderRadius: 12, padding: "14px 32px",
          fontSize: 16, fontWeight: 600, cursor: "pointer",
        }}>
          📤 Compartilhar
        </button>
      </div>
    </div>
  );
}

function CategoryCard({ emoji, title, desc, value, pct }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14, padding: "24px 18px",
    }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{emoji}</div>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 10 }}>{desc}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#ffc107" }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{pct} do pote</div>
    </div>
  );
}

function ScoringRules() {
  return (
    <div style={{
      background: "rgba(33,150,243,0.1)", border: "1px solid rgba(33,150,243,0.3)",
      borderRadius: 14, padding: "18px", marginBottom: 28, maxWidth: 480, margin: "0 auto 28px",
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#42a5f5" }}>📊 Pontuação dos Jogos do Brasil</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "left", fontSize: 13 }}>
        <RuleRow label="✅ Placar exato" points="3 pontos" color="#4caf50" />
        <RuleRow label="🤝 Brasil empatou" points="2 pontos" color="#ff9800" />
        <RuleRow label="❌ Brasil perdeu" points="1 ponto" color="#f44336" />
      </div>
    </div>
  );
}

function RuleRow({ label, points, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span>
      <strong style={{ color }}>{points}</strong>
    </div>
  );
}

// Continua com os outros componentes (FormScreen, BoardScreen, etc) - código igual ao anterior
// Por brevidade, vou incluir só as assinaturas aqui

function FormScreen({ submitted, name, setName, champion, setChampion, customChampion, setCustomChampion, scores, updateScore, error, saving, handleSubmit }) {
  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Aposta registrada!</h2>
        <p style={{ color: "rgba(255,255,255,0.6)" }}>Boa sorte no bolão!</p>
      </div>
    );
  }

  return (
    <>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Sua Aposta</h2>
      <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 24, fontSize: 13 }}>
        Entrada: <strong style={{ color: "#ffc107" }}>R$50</strong> · Preencha as 2 categorias
      </p>

      <Section title="👤 Seu Nome">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João Silva"
          style={inputStyle} />
      </Section>

      <Section title="🏆 Campeão da Copa">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
          {TEAMS.map((t) => (
            <TeamButton key={t.name} team={t} selected={champion?.name === t.name} onClick={() => { setChampion(t); setCustomChampion(""); }} />
          ))}
        </div>
        {champion?.name === "Outro" && (
          <input value={customChampion} onChange={(e) => setCustomChampion(e.target.value)} placeholder="Nome do país..."
            style={{ ...inputStyle, marginTop: 10 }} />
        )}
      </Section>

      <Section title="🇧🇷 Placares dos Jogos do Brasil (7 jogos)">
        <InfoBox text="💡 Preencha os placares de TODOS os 7 jogos. Isso garante que todos apostem na mesma quantidade." />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {BRAZIL_GAMES.map((game) => (
            <GameScoreInput key={game.id} game={game} scores={scores} updateScore={updateScore} />
          ))}
        </div>
      </Section>

      {error && <ErrorBox message={error} />}

      <button onClick={handleSubmit} disabled={saving} style={{
        width: "100%", background: saving ? "rgba(255,193,7,0.3)" : "linear-gradient(135deg, #ffc107, #ff9800)",
        color: "#000", border: "none", borderRadius: 12, padding: "15px", fontSize: 16, fontWeight: 700,
        cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 20px rgba(255,193,7,0.3)",
      }}>
        {saving ? "Salvando..." : "⚽ Confirmar Aposta!"}
      </button>
    </>
  );
}

function TeamButton({ team, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: selected ? "linear-gradient(135deg, #ffc107, #ff9800)" : "rgba(255,255,255,0.06)",
      color: selected ? "#000" : "#fff",
      border: selected ? "2px solid #ffc107" : team.name === "Outro" ? "1px dashed rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10, padding: team.name === "Outro" ? "10px" : "10px 6px",
      cursor: "pointer", fontSize: 11, fontWeight: 600,
      transition: "all 0.15s", textAlign: "center",
      gridColumn: team.name === "Outro" ? "1 / -1" : "auto",
    }}>
      {team.name === "Outro" ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span style={{ fontSize: 18 }}>{team.flag}</span><span>Outro país...</span>
        </div>
      ) : (
        <><div style={{ fontSize: 22, marginBottom: 4 }}>{team.flag}</div><div>{team.name}</div></>
      )}
    </button>
  );
}

function GameScoreInput({ game, scores, updateScore }) {
  const s = scores[game.id] || { brazil: "", opponent: "" };
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10, padding: "14px 16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 1, textTransform: "uppercase" }}>{game.phase}</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{game.label}</div>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{game.flag} {game.opponent}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
        <ScoreInput label="🇧🇷" value={s.brazil} onChange={(e) => updateScore(game.id, "brazil", e.target.value)} />
        <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>×</div>
        <ScoreInput label={game.flag} value={s.opponent} onChange={(e) => updateScore(game.id, "opponent", e.target.value)} />
      </div>
    </div>
  );
}

function ScoreInput({ label, value, onChange }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>{label}</div>
      <input type="number" min="0" max="20" value={value} onChange={onChange}
        style={{
          width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "10px",
          color: "#fff", fontSize: 18, fontWeight: 700, textAlign: "center", outline: "none",
        }} />
    </div>
  );
}

function BoardScreen({ loading, entries, total, loadEntries, setScreen }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>📋 Apostas</h2>
        <button onClick={loadEntries} style={refreshButtonStyle}>🔄</button>
      </div>
      <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 20, fontSize: 13 }}>
        {loading ? "Carregando..." : `${entries.length} aposta${entries.length !== 1 ? "s" : ""} · Pote: ${fmt(total)}`}
      </p>

      {loading ? (
        <LoadingState />
      ) : entries.length === 0 ? (
        <EmptyState setScreen={setScreen} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {entries.map((e, i) => <EntryCard key={e.id} entry={e} index={i} />)}
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry, index }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, padding: "18px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: "linear-gradient(135deg, #ffc107, #ff9800)", borderRadius: "50%",
            width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#000",
          }}>{index + 1}</div>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{entry.name}</span>
        </div>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{entry.date}</span>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>🏆 Campeão</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{entry.champion.flag} {entry.champion.name}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>🇧🇷 Placares do Brasil</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 6 }}>
          {BRAZIL_GAMES.map((g) => {
            const s = entry.scores[g.id];
            return (
              <div key={g.id} style={{
                background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px", textAlign: "center",
              }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>{g.phase}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{s.brazil} × {s.opponent}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PrizeScreen({ entries, total, pots, championCounts, loadEntries }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>💰 Premiação</h2>
        <button onClick={loadEntries} style={refreshButtonStyle}>🔄</button>
      </div>
      <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 24, fontSize: 13 }}>
        {entries.length} participante{entries.length !== 1 ? "s" : ""} × R$50 = <strong style={{ color: "#ffc107" }}>{fmt(total)}</strong>
      </p>

      <TotalPot total={total} />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <ChampionCategory pot={pots.champion} counts={championCounts} />
        <BrazilCategory pot={pots.brazil} />
      </div>

      <InfoBox text="💡 Se houver empate em alguma posição, o prêmio é dividido igualmente entre os empatados." style={{ marginTop: 20 }} />
    </div>
  );
}

function TotalPot({ total }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(255,193,7,0.15), rgba(255,152,0,0.1))",
      border: "2px solid rgba(255,193,7,0.4)",
      borderRadius: 16, padding: "24px", textAlign: "center", marginBottom: 20,
    }}>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>POTE TOTAL</div>
      <div style={{ fontSize: 48, fontWeight: 700, color: "#ffc107" }}>{fmt(total)}</div>
    </div>
  );
}

function ChampionCategory({ pot, counts }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,193,7,0.3)",
      borderRadius: 14, padding: "20px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 3 }}>🏆 Campeão da Copa</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Divide entre quem acertar</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#ffc107" }}>{fmt(pot)}</div>
      </div>
      <div style={{
        background: "rgba(255,193,7,0.1)", border: "1px solid rgba(255,193,7,0.2)",
        borderRadius: 10, padding: "14px", fontSize: 12,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: "#ffc107" }}>Como funciona:</div>
        <div style={{ color: "rgba(255,255,255,0.7)" }}>
          Quem acertar divide o pote igualmente. Ex: 3 acertos → {fmt(pot / 3)} cada
        </div>
      </div>
      {counts.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>APOSTAS MAIS POPULARES</div>
          {counts.slice(0, 3).map(([team, count]) => (
            <div key={team} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
              <span>{team}</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BrazilCategory({ pot }) {
  const prizes = [
    { place: "1º lugar", pct: BRAZIL_PRIZE.first, emoji: "🥇", color: "#ffc107" },
    { place: "2º lugar", pct: BRAZIL_PRIZE.second, emoji: "🥈", color: "#c0c0c0" },
    { place: "3º lugar", pct: BRAZIL_PRIZE.third, emoji: "🥉", color: "#cd7f32" },
  ];

  return (
    <div style={{
      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(76,175,80,0.3)",
      borderRadius: 14, padding: "20px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 3 }}>🇧🇷 Placares do Brasil</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Ranking por pontuação</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#4caf50" }}>{fmt(pot)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {prizes.map((p) => (
          <div key={p.place} style={{
            background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "12px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{p.emoji} {p.place}</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: p.color }}>{fmt(pot * p.pct)}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{(p.pct * 100).toFixed(0)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  );
}

function InfoBox({ text, style = {} }) {
  return (
    <div style={{
      fontSize: 12, color: "rgba(255,255,255,0.6)",
      padding: "12px 14px", background: "rgba(33,150,243,0.1)",
      borderRadius: 8, border: "1px solid rgba(33,150,243,0.2)",
      ...style,
    }}>
      {text}
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div style={{
      background: "rgba(244,67,54,0.2)", border: "1px solid rgba(244,67,54,0.5)",
      borderRadius: 10, padding: "12px 16px", marginBottom: 14,
      color: "#ff8a80", fontSize: 13, textAlign: "center",
    }}>
      ⚠️ {message}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.5)" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
      Carregando...
    </div>
  );
}

function EmptyState({ setScreen }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
      <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>Nenhuma aposta ainda.<br />Seja o primeiro!</p>
      <button onClick={() => setScreen("form")} style={{
        background: "linear-gradient(135deg, #ffc107, #ff9800)",
        color: "#000", border: "none", borderRadius: 10,
        padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer",
      }}>Fazer Aposta</button>
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 10, padding: "13px 16px",
  color: "#fff", fontSize: 15, outline: "none",
};

const refreshButtonStyle = {
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 10, padding: "7px 14px",
  color: "#fff", cursor: "pointer",
  fontSize: 12, fontWeight: 600,
};
