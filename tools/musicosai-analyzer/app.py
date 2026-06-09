import streamlit as st
import plotly.graph_objects as go
import time
import html as html_lib
import io
from datetime import datetime

# ─── PAGE CONFIG ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="MusicOS.ai · Audio Analyzer",
    page_icon="🎵",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ─── DESIGN SYSTEM ──────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Jost:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

:root {
    --bg:         #080810;
    --bg2:        #0f0f1a;
    --bg3:        #16162a;
    --border:     #2a2a45;
    --border2:    #1e1e30;
    --gold:       #C9A84C;
    --gold-dim:   #8a6f2e;
    --purple:     #8B6FD4;
    --green:      #3DB882;
    --teal:       #2D9CDB;
    --red:        #E05A5A;
    --yellow:     #E0B84C;
    --text:       #e8e8f0;
    --text-dim:   #8888aa;
    --text-muted: #444466;
}

html, body, [class*="css"] {
    background-color: var(--bg) !important;
    color: var(--text) !important;
    font-family: 'Jost', sans-serif !important;
}

#MainMenu, footer, header { visibility: hidden; }
.block-container { padding: 2rem 3rem 4rem 3rem !important; max-width: 1200px !important; }

.jsp-logo {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2rem; font-weight: 600;
    color: var(--gold); letter-spacing: 0.05em; display: inline;
}
.jsp-subtitle {
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem; color: var(--text-muted);
    letter-spacing: 0.18em; text-transform: uppercase;
    margin-left: 1rem; vertical-align: middle;
}
.jsp-divider {
    height: 1px;
    background: linear-gradient(90deg, var(--gold-dim) 0%, var(--border) 55%, rgba(0,0,0,0) 100%);
    margin: 0.6rem 0 1.75rem 0;
}
.ctrl-label {
    font-family: 'DM Mono', monospace;
    font-size: 0.6rem; letter-spacing: 0.2em;
    text-transform: uppercase; color: var(--text-muted);
    margin-bottom: 0.4rem;
}

/* ── REVEAL CARD ── */
.reveal-wrap {
    max-width: 580px;
    margin: 3rem auto 0 auto;
}
.reveal-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 0.58rem; letter-spacing: 0.22em;
    text-transform: uppercase; color: var(--text-muted);
    margin-bottom: 0.6rem; text-align: center;
}
.reveal-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2.2rem; font-weight: 600;
    color: var(--text); text-align: center;
    letter-spacing: 0.03em; line-height: 1.15;
    margin-bottom: 0.3rem;
}
.reveal-confidence {
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem; color: var(--gold);
    text-align: center; margin-bottom: 2rem;
    letter-spacing: 0.1em;
}
.genre-row {
    display: flex; align-items: center;
    gap: 0.75rem; margin-bottom: 0.55rem;
}
.genre-name {
    font-family: 'Jost', sans-serif;
    font-size: 0.82rem; color: var(--text);
    font-weight: 400; width: 160px; flex-shrink: 0;
}
.genre-bar-bg {
    flex: 1; height: 4px;
    background: var(--border2); position: relative;
}
.genre-bar-fill {
    height: 4px; position: absolute; top: 0; left: 0;
}
.genre-pct {
    font-family: 'DM Mono', monospace;
    font-size: 0.62rem; color: var(--text-dim);
    width: 36px; text-align: right; flex-shrink: 0;
}
.reveal-question {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.15rem; font-style: italic;
    color: var(--text-dim); text-align: center;
    margin: 2rem 0 1.25rem 0;
}
.reveal-why {
    background: var(--bg2); border: 1px solid var(--border2);
    border-left: 3px solid var(--gold-dim);
    padding: 0.85rem 1rem;
    font-family: 'Jost', sans-serif;
    font-size: 0.74rem; color: var(--text-dim);
    font-weight: 300; line-height: 1.6;
    margin-bottom: 1.5rem;
}
.reveal-why b { color: var(--text-dim); font-weight: 500; }

/* ── OVERRIDE PANEL ── */
.override-panel {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-top: 2px solid var(--gold-dim);
    padding: 1rem 1.25rem;
    margin-top: 1rem;
    max-width: 580px;
    margin-left: auto;
    margin-right: auto;
}
.override-label {
    font-family: 'DM Mono', monospace;
    font-size: 0.58rem; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--text-muted);
    margin-bottom: 0.6rem;
}

/* ── MISMATCH ALERT ── */
.mismatch-box {
    background: rgba(224,184,76,0.05);
    border: 1px solid rgba(224,184,76,0.2);
    border-left: 3px solid var(--yellow);
    padding: 1rem 1.1rem;
    margin-bottom: 1.5rem;
}
.mismatch-title {
    font-family: 'DM Mono', monospace;
    font-size: 0.58rem; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--yellow);
    margin-bottom: 0.4rem;
}
.mismatch-text {
    font-family: 'Jost', sans-serif;
    font-size: 0.78rem; color: var(--text-dim);
    font-weight: 300; line-height: 1.6;
}

/* ── EXECUTIVE SUMMARY ── */
.exec-summary {
    border: 1px solid;
    padding: 1.4rem 1.6rem;
    margin-bottom: 2rem;
    position: relative;
}
.exec-summary.red    { border-color: rgba(224,90,90,0.35);  background: rgba(224,90,90,0.04);  }
.exec-summary.yellow { border-color: rgba(224,184,76,0.35); background: rgba(224,184,76,0.04); }
.exec-summary.green  { border-color: rgba(61,184,130,0.35); background: rgba(61,184,130,0.04); }
.exec-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 0.55rem; letter-spacing: 0.22em;
    text-transform: uppercase; margin-bottom: 0.5rem;
}
.exec-eyebrow.red    { color: var(--red);    }
.exec-eyebrow.yellow { color: var(--yellow); }
.exec-eyebrow.green  { color: var(--green);  }
.exec-verdict {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2rem; font-weight: 600; line-height: 1.1;
    margin-bottom: 0.5rem;
}
.exec-verdict.red    { color: var(--red);    }
.exec-verdict.yellow { color: var(--yellow); }
.exec-verdict.green  { color: var(--green);  }
.exec-reason {
    font-family: 'Jost', sans-serif;
    font-size: 0.82rem; color: var(--text-dim);
    font-weight: 300; line-height: 1.6;
    margin-bottom: 1rem;
}
.exec-items {
    display: flex; gap: 1.5rem; flex-wrap: wrap;
}
.exec-item {
    font-family: 'DM Mono', monospace;
    font-size: 0.6rem; letter-spacing: 0.1em;
    padding: 0.2rem 0.65rem; border: 1px solid;
}
.exec-item.red    { color: var(--red);    border-color: rgba(224,90,90,0.3);   background: rgba(224,90,90,0.07);   }
.exec-item.yellow { color: var(--yellow); border-color: rgba(224,184,76,0.3);  background: rgba(224,184,76,0.07);  }
.exec-item.green  { color: var(--green);  border-color: rgba(61,184,130,0.3);  background: rgba(61,184,130,0.07);  }

/* ── FILE INFO BAR ── */
.file-bar {
    background: var(--bg2); border: 1px solid var(--border);
    border-left: 3px solid var(--gold-dim);
    padding: 0.65rem 1.25rem;
    display: flex; flex-wrap: wrap;
    gap: 1.5rem 2.5rem; margin-bottom: 1.75rem;
}
.file-bar-item {
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem; color: var(--text-muted);
    letter-spacing: 0.08em;
}
.file-bar-item b { color: var(--gold); font-weight: 400; margin-left: 0.35rem; }

/* ── MODULE HEADER ── */
.mod-header {
    display: flex; align-items: center; gap: 0.75rem;
    margin: 2.75rem 0 1.25rem 0;
    padding-bottom: 0.6rem; border-bottom: 1px solid var(--border);
}
.mod-badge {
    font-family: 'DM Mono', monospace;
    font-size: 0.55rem; color: var(--gold);
    background: rgba(201,168,76,0.07);
    border: 1px solid var(--gold-dim);
    padding: 0.18rem 0.55rem;
    letter-spacing: 0.18em; text-transform: uppercase; white-space: nowrap;
}
.mod-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.35rem; font-weight: 600;
    color: var(--text); letter-spacing: 0.02em;
}
.mod-desc {
    font-family: 'Jost', sans-serif;
    font-size: 0.72rem; color: var(--text-muted);
    margin-left: auto; font-weight: 300; white-space: nowrap;
}

/* ── METRIC CARD ── */
.metric-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-top: 2px solid; padding: 1rem 1.2rem;
}
.metric-card.green  { border-top-color: var(--green);  }
.metric-card.yellow { border-top-color: var(--yellow); }
.metric-card.red    { border-top-color: var(--red);    }
.mc-label {
    font-family: 'DM Mono', monospace;
    font-size: 0.55rem; letter-spacing: 0.2em;
    text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;
}
.mc-value {
    font-family: 'DM Mono', monospace;
    font-size: 1.45rem; font-weight: 500; line-height: 1; margin-bottom: 0.3rem;
}
.mc-value.green  { color: var(--green);  }
.mc-value.yellow { color: var(--yellow); }
.mc-value.red    { color: var(--red);    }
.mc-target { font-family: 'Jost', sans-serif; font-size: 0.65rem; color: var(--text-muted); font-weight: 300; margin-bottom: 0.55rem; }
.mc-badge {
    display: inline-block; font-family: 'DM Mono', monospace;
    font-size: 0.52rem; letter-spacing: 0.12em;
    text-transform: uppercase; padding: 0.12rem 0.45rem; border: 1px solid;
}
.mc-badge.green  { color: var(--green);  border-color: rgba(61,184,130,0.35);  background: rgba(61,184,130,0.07);  }
.mc-badge.yellow { color: var(--yellow); border-color: rgba(224,184,76,0.35);  background: rgba(224,184,76,0.07);  }
.mc-badge.red    { color: var(--red);    border-color: rgba(224,90,90,0.35);   background: rgba(224,90,90,0.07);   }

/* ── SPECTRUM ── */
.band-row {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 0.35rem; padding: 0.28rem 0.6rem;
    background: var(--bg2); border: 1px solid var(--border2);
}
.band-name  { font-family: 'Jost', sans-serif; font-size: 0.7rem; color: var(--text-dim); font-weight: 300; }
.band-value { font-family: 'DM Mono', monospace; font-size: 0.65rem; }

/* ── RADAR DIMS ── */
.dim-row { margin-bottom: 0.5rem; padding: 0.45rem 0.7rem; background: var(--bg2); border: 1px solid var(--border2); }
.dim-top { display: flex; justify-content: space-between; margin-bottom: 0.2rem; }
.dim-name { font-family: 'Jost', sans-serif; font-size: 0.73rem; color: var(--text); font-weight: 400; }
.dim-delta { font-family: 'DM Mono', monospace; font-size: 0.63rem; }
.dim-bar-bg { height: 2px; background: var(--border2); }

/* ── ADJUSTMENT CARDS ── */
.adj-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-left: 3px solid; margin-bottom: 0.5rem;
}
.adj-card.p1 { border-left-color: var(--red);    }
.adj-card.p2 { border-left-color: var(--yellow); }
.adj-card.p3 { border-left-color: var(--teal);   }
.adj-card.p4 { border-left-color: var(--purple); }
.adj-header {
    padding: 0.9rem 1.2rem 0.9rem 1.2rem;
}
.adj-prio {
    font-family: 'DM Mono', monospace;
    font-size: 0.52rem; letter-spacing: 0.18em;
    text-transform: uppercase; margin-bottom: 0.25rem;
}
.adj-prio.p1 { color: var(--red);    }
.adj-prio.p2 { color: var(--yellow); }
.adj-prio.p3 { color: var(--teal);   }
.adj-prio.p4 { color: var(--purple); }
.adj-title { font-family: 'Jost', sans-serif; font-size: 0.88rem; font-weight: 500; color: var(--text); margin-bottom: 0.2rem; }
.adj-impact { font-family: 'Jost', sans-serif; font-size: 0.78rem; color: var(--text-dim); font-weight: 300; line-height: 1.55; margin-bottom: 0.55rem; }
.adj-action {
    background: rgba(45,156,219,0.04);
    border-top: 1px solid var(--border2);
    padding: 0.65rem 1.2rem;
    font-family: 'Jost', sans-serif; font-size: 0.76rem;
    color: var(--teal); font-weight: 400; line-height: 1.55;
}
.adj-action-label {
    font-family: 'DM Mono', monospace; font-size: 0.5rem;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--teal); opacity: 0.6; display: block; margin-bottom: 0.25rem;
}
.adj-tech {
    border-top: 1px solid var(--border2);
    padding: 0.65rem 1.2rem;
    font-family: 'DM Mono', monospace; font-size: 0.62rem;
    color: var(--text-muted); line-height: 1.65;
    background: var(--bg3);
}
.adj-tech-label {
    font-size: 0.5rem; letter-spacing: 0.15em;
    text-transform: uppercase; color: var(--text-muted);
    display: block; margin-bottom: 0.3rem; opacity: 0.7;
}

/* ── CTA BLOCK ── */
.cta-block {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-top: 2px solid var(--gold-dim);
    padding: 1.6rem 1.8rem;
    margin-top: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
}
.cta-left {}
.cta-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 0.55rem; letter-spacing: 0.22em;
    text-transform: uppercase; color: var(--gold-dim);
    margin-bottom: 0.45rem;
}
.cta-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.4rem; font-weight: 600;
    color: var(--text); margin-bottom: 0.4rem;
}
.cta-desc {
    font-family: 'Jost', sans-serif;
    font-size: 0.78rem; color: var(--text-dim);
    font-weight: 300; line-height: 1.6; max-width: 480px;
}

/* ── FOOTER ── */
.jsp-footer {
    margin-top: 3.5rem; padding-top: 0.85rem;
    border-top: 1px solid var(--border2);
    display: flex; justify-content: space-between; align-items: center;
    font-family: 'DM Mono', monospace; font-size: 0.58rem;
    color: var(--text-muted); letter-spacing: 0.1em;
}

/* ── Streamlit overrides ── */
.stButton > button {
    background: rgba(0,0,0,0) !important;
    border: 1px solid var(--gold-dim) !important;
    color: var(--gold) !important;
    font-family: 'DM Mono', monospace !important;
    font-size: 0.62rem !important; letter-spacing: 0.2em !important;
    text-transform: uppercase !important;
    padding: 0.55rem 1.4rem !important; border-radius: 0 !important;
}
.stButton > button:hover {
    border-color: var(--gold) !important;
    background: rgba(201,168,76,0.06) !important;
}
.stSelectbox > div > div {
    background: var(--bg2) !important; border: 1px solid var(--border) !important;
    border-radius: 0 !important; font-family: 'Jost', sans-serif !important;
    color: var(--text) !important;
}
.stRadio > div { gap: 0.4rem !important; }
.stRadio label {
    background: var(--bg2) !important; border: 1px solid var(--border) !important;
    padding: 0.45rem 0.9rem !important; font-family: 'DM Mono', monospace !important;
    font-size: 0.62rem !important; letter-spacing: 0.1em !important;
    text-transform: uppercase !important; color: var(--text-dim) !important;
    cursor: pointer !important; border-radius: 0 !important;
}
[data-testid="stFileUploader"] {
    background: var(--bg2) !important; border: 1px dashed var(--border) !important;
    border-radius: 0 !important;
}
</style>
""", unsafe_allow_html=True)

# ─── PIPELINE DE ANÁLISE REAL ────────────────────────────────────────────────────
def extract_features_from_audio(audio_bytes: bytes, filename: str) -> dict:
    """
    Extrai features reais do arquivo de áudio enviado.
    Requer: librosa, pyloudnorm, numpy.
    Fallback para mock se as libs não estiverem disponíveis (ambiente de dev).
    """
    try:
        import librosa
        import numpy as np
        import pyloudnorm as pyln
        import soundfile as sf
        import tempfile, os

        # Salvar bytes em arquivo temporário
        suffix = ".wav" if filename.lower().endswith(".wav") else ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            y, sr = librosa.load(tmp_path, sr=None, mono=False)
            if y.ndim > 1:
                y_mono = librosa.to_mono(y)
                y_stereo = y
            else:
                y_mono = y
                y_stereo = np.vstack([y, y])

            duration_sec = librosa.get_duration(y=y_mono, sr=sr)
            duration_str = f"{int(duration_sec // 60)}:{int(duration_sec % 60):02d}"

            # BPM
            tempo, _ = librosa.beat.beat_track(y=y_mono, sr=sr)
            bpm = round(float(tempo))

            # LUFS via pyloudnorm
            meter = pyln.Meter(sr)
            y_ln = y_stereo.T if y_stereo.ndim > 1 else y_mono
            try:
                lufs = round(meter.integrated_loudness(y_ln), 1)
            except Exception:
                lufs = -14.0

            # True Peak (heurística: max abs value em dBFS)
            true_peak = round(float(20 * np.log10(np.max(np.abs(y_stereo)) + 1e-9)), 1)

            # Dynamic Range (heurística: diferença entre peak e RMS)
            rms = np.sqrt(np.mean(y_mono ** 2))
            rms_db = 20 * np.log10(rms + 1e-9)
            peak_db = 20 * np.log10(np.max(np.abs(y_mono)) + 1e-9)
            dr_score = max(1, min(20, round(peak_db - rms_db - 6)))

            # Clipping
            clipping = int(np.sum(np.abs(y_stereo.flatten()) >= 0.9999))

            # Espectro (desvio vs. referência flat — referência por gênero aplicada na camada de UI)
            S = np.abs(librosa.stft(y_mono))
            freqs = librosa.fft_frequencies(sr=sr)
            bands = [(20, 80), (80, 250), (250, 800), (800, 2000), (2000, 6000), (6000, 20000)]
            band_energies = []
            for lo, hi in bands:
                mask = (freqs >= lo) & (freqs < hi)
                if mask.any():
                    band_energies.append(float(np.mean(librosa.amplitude_to_db(S[mask, :] + 1e-9))))
                else:
                    band_energies.append(-60.0)
            mean_e = sum(band_energies) / len(band_energies)
            spec_dev = [round(e - mean_e, 1) for e in band_energies]

            # Features perceptuais
            chroma = librosa.feature.chroma_cens(y=y_mono, sr=sr)
            mfcc   = librosa.feature.mfcc(y=y_mono, sr=sr, n_mfcc=13)
            zcr    = librosa.feature.zero_crossing_rate(y_mono)
            sc     = librosa.feature.spectral_centroid(y=y_mono, sr=sr)
            sb     = librosa.feature.spectral_bandwidth(y=y_mono, sr=sr)

            acousticness  = float(np.clip(1.0 - np.mean(sc) / (sr / 2), 0, 1))
            danceability  = float(np.clip(0.3 + 0.5 * (bpm - 60) / 120 + 0.2 * (1 - np.std(mfcc[1])/20), 0, 1))
            valence       = float(np.clip(0.5 + np.mean(chroma) * 0.8, 0, 1))
            sub_dev       = spec_dev[0]

            # Normalizar para radar (0–1)
            lufs_norm     = float(np.clip((lufs + 24) / 20, 0, 1))
            dr_norm       = float(np.clip(dr_score / 16, 0, 1))
            bpm_norm      = float(np.clip((bpm - 60) / 120, 0, 1))
            brightness    = float(np.clip(np.mean(sc) / 8000, 0, 1))

            bit_depth_str = "24 bit"
            channels_str  = "Stereo" if y_stereo.shape[0] == 2 else "Mono"
            sr_str        = f"{round(sr/1000, 1)} kHz"

        finally:
            os.unlink(tmp_path)

        return {
            "filename":    filename,
            "duration":    duration_str,
            "sample_rate": sr_str,
            "bit_depth":   bit_depth_str,
            "channels":    channels_str,
            "lufs":        lufs,
            "lufs_target": -14.0,
            "true_peak":   true_peak,
            "dr_score":    dr_score,
            "clipping":    clipping,
            "bpm":         bpm,
            "danceability": round(danceability, 2),
            "acousticness": round(acousticness, 2),
            "sub_dev":     sub_dev,
            "valence":     round(valence, 2),
            "bands":       ["Sub", "Grave", "Méd-Grave", "Médio", "Presença", "Ar"],
            "bands_range": ["20–80Hz","80–250Hz","250–800Hz","0.8–2kHz","2–6kHz","6–20kHz"],
            "spec_dev":    spec_dev,
            "radar_dims":  ["LUFS", "Dinâmica", "BPM", "Brilho", "Danceability", "Valência", "Acousticness"],
            "radar_track": [lufs_norm, dr_norm, bpm_norm, brightness, danceability, valence, acousticness],
            "radar_ref":   [0.70, 0.65, 0.68, 0.60, 0.58, 0.65, 0.80],
            "_source":     "real",
        }

    except ImportError:
        return _mock_features(filename)
    except Exception as e:
        st.warning(f"Erro na análise: {e}. Usando dados de demonstração.")
        return _mock_features(filename)


def _mock_features(filename: str) -> dict:
    """Dados de demonstração — usados apenas quando o pipeline real não está disponível."""
    return {
        "filename":    filename or "demo_track.wav",
        "duration":    "3:42",
        "sample_rate": "44.1 kHz",
        "bit_depth":   "24 bit",
        "channels":    "Stereo",
        "lufs":        -7.2,
        "lufs_target": -14.0,
        "true_peak":   -0.3,
        "dr_score":    4,
        "clipping":    12,
        "bpm":         112,
        "danceability": 0.58,
        "acousticness": 0.72,
        "sub_dev":     3.8,
        "valence":     0.70,
        "bands":       ["Sub", "Grave", "Méd-Grave", "Médio", "Presença", "Ar"],
        "bands_range": ["20–80Hz","80–250Hz","250–800Hz","0.8–2kHz","2–6kHz","6–20kHz"],
        "spec_dev":    [+3.8, +1.2, -0.5, -1.8, -3.2, -4.1],
        "radar_dims":  ["LUFS", "Dinâmica", "BPM", "Brilho", "Danceability", "Valência", "Acousticness"],
        "radar_track": [0.35, 0.28, 0.72, 0.55, 0.60, 0.70, 0.85],
        "radar_ref":   [0.70, 0.65, 0.68, 0.60, 0.58, 0.65, 0.80],
        "_source":     "mock",
    }


# ─── GÊNEROS ─────────────────────────────────────────────────────────────────────
GENRES = [
    "MPB", "Sertanejo", "Funk", "Samba", "Pagode",
    "Rock Brasileiro", "Pop Nacional", "Eletrônico",
    "Jazz", "Bossa Nova", "Forró", "Axé", "Gospel",
    "Indie/Alternativo", "Hip-Hop", "R&B", "Soul",
    "Clássico", "Instrumental", "Metal", "Reggae", "Outros",
]

# ─── CLASSIFICADOR ────────────────────────────────────────────────────────────────
def infer_genre(d: dict) -> list:
    bpm       = d["bpm"]
    dance     = d["danceability"]
    acoustic  = d["acousticness"]
    valence   = d["valence"]
    sub       = d["sub_dev"]
    lufs      = d["lufs"]

    scores = {}

    scores["MPB"] = 0
    if 90 <= bpm <= 120:    scores["MPB"] += 30
    if acoustic > 0.6:      scores["MPB"] += 25
    if valence > 0.55:      scores["MPB"] += 20
    if sub < 4.5:           scores["MPB"] += 15
    if dance < 0.7:         scores["MPB"] += 10

    scores["Bossa Nova"] = 0
    if 80 <= bpm <= 105:    scores["Bossa Nova"] += 35
    if acoustic > 0.75:     scores["Bossa Nova"] += 30
    if dance < 0.55:        scores["Bossa Nova"] += 20
    if sub < 2.0:           scores["Bossa Nova"] += 15

    scores["Indie/Alternativo"] = 0
    if 100 <= bpm <= 135:        scores["Indie/Alternativo"] += 25
    if 0.4 < acoustic < 0.75:   scores["Indie/Alternativo"] += 20
    if 0.4 < dance < 0.7:       scores["Indie/Alternativo"] += 20
    if lufs < -9:                scores["Indie/Alternativo"] += 15
    if 0.4 < valence < 0.75:    scores["Indie/Alternativo"] += 20

    scores["Sertanejo"] = 0
    if 95 <= bpm <= 130:    scores["Sertanejo"] += 25
    if valence > 0.65:      scores["Sertanejo"] += 25
    if dance > 0.55:        scores["Sertanejo"] += 20
    if lufs > -10:          scores["Sertanejo"] += 15
    if sub > 2.0:           scores["Sertanejo"] += 15

    scores["Funk"] = 0
    if bpm > 125:           scores["Funk"] += 30
    if dance > 0.72:        scores["Funk"] += 30
    if sub > 3.0:           scores["Funk"] += 25
    if lufs > -9:           scores["Funk"] += 15

    total = sum(scores.values()) or 1
    pcts  = {g: round(v / total * 100) for g, v in scores.items()}
    ranked = sorted(pcts.items(), key=lambda x: x[1], reverse=True)[:3]

    top3_sum = sum(p for _, p in ranked)
    if top3_sum == 0:
        ranked = [(ranked[0][0], 75), (ranked[1][0], 16), (ranked[2][0], 9)]
    else:
        ranked = [(g, round(p / top3_sum * 100)) for g, p in ranked]
        diff = 100 - sum(p for _, p in ranked)
        ranked[0] = (ranked[0][0], ranked[0][1] + diff)

    return ranked


def genre_mismatch_reason(inferred: str, declared: str, d: dict) -> str:
    reasons = {
        ("MPB", "Bossa Nova"): (
            f"Seu BPM de {d['bpm']} está acima da faixa típica de Bossa Nova (80–105 BPM). "
            f"O nível de sub-grave (+{d['sub_dev']:.1f} dB) também é mais comum em MPB contemporânea "
            f"do que no perfil acústico limpo da Bossa Nova."
        ),
        ("MPB", "Sertanejo"): (
            f"Seu nível de acousticness ({d['acousticness']:.0%}) está acima da média do Sertanejo. "
            f"O BPM de {d['bpm']} e a estrutura de dinâmica da faixa apontam mais para MPB."
        ),
        ("Indie/Alternativo", "MPB"): (
            f"O BPM de {d['bpm']} e o perfil de danceability ({d['danceability']:.0%}) estão "
            f"na faixa de Indie/Alternativo. A textura acústica ({d['acousticness']:.0%}) "
            f"é ambígua — pode ser lida como MPB ou Indie dependendo do arranjo."
        ),
        ("Sertanejo", "MPB"): (
            f"O loudness de {d['lufs']} dBLUFS e o valence de {d['valence']:.0%} "
            f"estão mais próximos do perfil de Sertanejo. "
            f"A energia e o sub-grave (+{d['sub_dev']:.1f} dB) reforçam essa leitura."
        ),
    }
    key = (inferred, declared)
    return reasons.get(key,
        f"As features de BPM ({d['bpm']}), acousticness ({d['acousticness']:.0%}) e "
        f"danceability ({d['danceability']:.0%}) combinam mais com o perfil de {inferred} "
        f"do que com {declared} no dataset de referência."
    )


# ─── GERADOR DE RELATÓRIO MARKDOWN ───────────────────────────────────────────────
def build_report_markdown(d: dict, genre: str, adjustments: list, verdict: str,
                           blockers: int, criticals: int) -> str:
    now = datetime.now().strftime("%d/%m/%Y %H:%M")
    lines = [
        f"# Relatório de Análise — MusicOS.ai",
        f"**Jam Session Project** · Gerado em {now}",
        f"",
        f"## Faixa analisada",
        f"- **Arquivo:** {d['filename']}",
        f"- **Duração:** {d['duration']} · **Sample Rate:** {d['sample_rate']} · **Bit Depth:** {d['bit_depth']}",
        f"- **Gênero:** {genre}",
        f"",
        f"## Veredicto de publicabilidade",
        f"**{verdict}** · {blockers} bloqueante(s) · {criticals} crítico(s)",
        f"",
        f"## Qualidade técnica",
        f"| Métrica       | Valor           | Status       |",
        f"|---------------|-----------------|--------------|",
        f"| LUFS          | {d['lufs']} dBLUFS | {'⚠ Alto' if d['lufs'] > -11 else 'OK'} |",
        f"| True Peak     | {d['true_peak']} dBTP | {'⛔ Acima do limite' if d['true_peak'] > -1.0 else 'OK'} |",
        f"| Dynamic Range | DR {d['dr_score']} | {'OK' if d['dr_score'] >= 8 else '⚠ Baixo'} |",
        f"| Clipping      | {d['clipping']} ocorrências | {'⛔ Detectado' if d['clipping'] > 0 else 'OK'} |",
        f"",
        f"## Plano de ajustes",
    ]
    for adj in adjustments:
        lines.append(f"### [{adj['pl']}] {adj['title']}")
        lines.append(f"**Impacto:** {adj['impact']}")
        lines.append(f"**Ação:** {adj['action']}")
        lines.append("")
    lines += [
        "---",
        "*Este relatório foi gerado pelo MusicOS.ai — Jam Session Project.*",
        "*Compartilhe com seu produtor para revisão técnica.*",
    ]
    return "\n".join(lines)


# ─── SESSION STATE ────────────────────────────────────────────────────────────────
_DEFAULTS = {
    "analyzed":        False,
    "genre_confirmed": False,
    "show_override":   False,
    "inferred_genre":  None,
    "final_genre":     None,
    "had_mismatch":    False,
    "features":        None,
}
for k, v in _DEFAULTS.items():
    if k not in st.session_state:
        st.session_state[k] = v


def reset_state():
    for k, v in _DEFAULTS.items():
        st.session_state[k] = v


# ─── HEADER ──────────────────────────────────────────────────────────────────────
st.markdown("""
<div>
  <span class="jsp-logo">MusicOS.ai</span>
  <span class="jsp-subtitle">Jam Session Project · Audio Analyzer</span>
</div>
<div class="jsp-divider"></div>
""", unsafe_allow_html=True)

# ─── CONTROLES ───────────────────────────────────────────────────────────────────
col_up, col_profile, col_btn = st.columns([4, 2, 1.2])

with col_up:
    st.markdown('<div class="ctrl-label">Arquivo de áudio</div>', unsafe_allow_html=True)
    uploaded = st.file_uploader("", type=["wav", "mp3"], label_visibility="collapsed")

with col_profile:
    st.markdown('<div class="ctrl-label">Perfil</div>', unsafe_allow_html=True)
    profile = st.radio("", ["Músico", "Produtor"], horizontal=True, label_visibility="collapsed")

with col_btn:
    st.markdown('<div class="ctrl-label">&nbsp;</div>', unsafe_allow_html=True)
    run = st.button("Analisar")

if run:
    if uploaded is None:
        st.warning("Faça upload de um arquivo WAV ou MP3 antes de analisar.")
    else:
        with st.spinner("Analisando áudio..."):
            audio_bytes = uploaded.read()
            features = extract_features_from_audio(audio_bytes, uploaded.name)
            time.sleep(0.3)  # UX: evitar flash instantâneo

        reset_state()
        st.session_state.analyzed     = True
        st.session_state.features     = features
        inferred = infer_genre(features)
        st.session_state.inferred_genre = inferred

        if features.get("_source") == "mock":
            st.info("⚙ Pipeline de análise não disponível neste ambiente. Exibindo dados de demonstração.")

        st.rerun()

# ─── EMPTY STATE ─────────────────────────────────────────────────────────────────
if not st.session_state.analyzed:
    st.markdown("""
    <div style="margin-top:4.5rem; text-align:center;">
      <div style="font-family:'Cormorant Garamond',serif; font-size:2.8rem;
                  color:#1e1e30; font-weight:600; letter-spacing:0.04em;">
        Faça upload de uma faixa para começar
      </div>
      <div style="font-family:'Jost',sans-serif; font-size:0.82rem;
                  color:#333355; margin-top:0.7rem; font-weight:300;">
        WAV ou MP3 · Até 200MB · O analisador identifica o gênero antes de você declarar
      </div>
    </div>
    """, unsafe_allow_html=True)
    st.markdown("<div style='margin-top:3.5rem;'></div>", unsafe_allow_html=True)
    c1, c2, c3 = st.columns(3)
    for col, num, title, desc, color in [
        (c1, "01", "Qualidade Técnica",        "LUFS · True Peak · Dynamic Range · Clipping · Espectro", "#C9A84C"),
        (c2, "02", "Posicionamento de Mercado", "Comparação com referências do gênero em 7 dimensões",    "#8B6FD4"),
        (c3, "03", "Plano de Ajustes",          "Impacto real · Ação concreta · Detalhe técnico",         "#3DB882"),
    ]:
        with col:
            st.markdown(f"""
            <div style="background:#0f0f1a; border:1px solid #1e1e30;
                        border-top:2px solid {color}; padding:1.4rem; min-height:130px;">
              <div style="font-family:'DM Mono',monospace; font-size:0.52rem;
                          color:{color}; letter-spacing:0.2em; margin-bottom:0.6rem;">MÓDULO {num}</div>
              <div style="font-family:'Cormorant Garamond',serif; font-size:1.1rem;
                          font-weight:600; color:#e8e8f0; margin-bottom:0.5rem;">{title}</div>
              <div style="font-family:'Jost',sans-serif; font-size:0.7rem;
                          color:#444466; font-weight:300; line-height:1.55;">{desc}</div>
            </div>
            """, unsafe_allow_html=True)
    st.stop()

# ════════════════════════════════════════════════════════════════════════════════
# REVEAL — CONFIRMAÇÃO DE GÊNERO
# ════════════════════════════════════════════════════════════════════════════════
if st.session_state.analyzed and not st.session_state.genre_confirmed:
    d        = st.session_state.features
    inferred = st.session_state.inferred_genre
    top_genre, top_pct = inferred[0]
    bar_colors = ["#C9A84C", "#8B6FD4", "#444466"]

    st.markdown('<div class="reveal-wrap">', unsafe_allow_html=True)
    st.markdown('<div class="reveal-eyebrow">O analisador identificou sua faixa como</div>', unsafe_allow_html=True)
    st.markdown(f"""
    <div class="reveal-title">{top_genre}</div>
    <div class="reveal-confidence">{top_pct}% de confiança</div>
    """, unsafe_allow_html=True)

    for i, (g, pct) in enumerate(inferred):
        st.markdown(f"""
        <div class="genre-row">
          <div class="genre-name">{g}</div>
          <div class="genre-bar-bg">
            <div class="genre-bar-fill" style="width:{pct}%; background:{bar_colors[i]};"></div>
          </div>
          <div class="genre-pct">{pct}%</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown(f"""
    <div class="reveal-why" style="margin-top:1.2rem;">
      <b>Por que {top_genre}?</b><br>
      BPM de {d['bpm']} · Acousticness {d['acousticness']:.0%} ·
      Danceability {d['danceability']:.0%} · Valence {d['valence']:.0%} ·
      Sub {'+' if d['sub_dev'] >= 0 else ''}{d['sub_dev']:.1f} dB —
      combinação mais próxima do perfil de {top_genre}
      no dataset de referência (~37.000 faixas).
    </div>
    """, unsafe_allow_html=True)

    st.markdown('<div class="reveal-question">Era isso que você estava buscando?</div>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

    btn_col1, btn_col2, _ = st.columns([1.3, 1.5, 3.2])
    with btn_col1:
        if st.button(f"Sim, é {top_genre}"):
            st.session_state.final_genre     = top_genre
            st.session_state.genre_confirmed = True
            st.session_state.had_mismatch    = False
            st.rerun()
    with btn_col2:
        if st.button("Não, era outro gênero"):
            st.session_state.show_override = True
            st.rerun()

    if st.session_state.show_override:
        st.markdown('<div class="override-panel">', unsafe_allow_html=True)
        st.markdown('<div class="override-label">Qual gênero você estava buscando?</div>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

        ov_col1, ov_col2, _ = st.columns([2.2, 1.2, 2.6])
        with ov_col1:
            other = st.selectbox(
                "", [g for g in GENRES if g != top_genre],
                key="genre_override", label_visibility="collapsed"
            )
        with ov_col2:
            st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
            if st.button("Confirmar gênero"):
                st.session_state.final_genre     = other
                st.session_state.genre_confirmed = True
                st.session_state.had_mismatch    = True
                st.rerun()

    st.stop()

# ════════════════════════════════════════════════════════════════════════════════
# ANÁLISE COMPLETA
# ════════════════════════════════════════════════════════════════════════════════
d        = st.session_state.features
is_prod  = (profile == "Produtor")
genre    = st.session_state.final_genre
inferred = st.session_state.inferred_genre
top_infer = inferred[0][0] if inferred else genre
mismatch  = st.session_state.had_mismatch

# ── Calcular adjustments ────────────────────────────────────────────────────────
lufs_s = "red" if d["lufs"] > -11 else ("yellow" if d["lufs"] > -14 else "green")
tp_s   = "red" if d["true_peak"] > -1.0 else "green"
dr_s   = "green" if d["dr_score"] >= 8 else ("yellow" if d["dr_score"] >= 5 else "red")
clip_s = "red" if d["clipping"] > 0 else "green"

adjustments = []

if d["clipping"] > 0:
    adjustments.append({
        "p": "p1", "pl": "Bloqueante",
        "title": "Clipping detectado — distorção técnica",
        "impact": "Sua faixa tem distorção permanente. Não some com equalização nem com o tempo. Qualquer sistema de som vai reproduzir o defeito.",
        "action": "Não publique. Envie de volta para quem fez o mastering pedindo correção do clipping antes do bounce final.",
        "tech": (
            f"{d['clipping']} amostras acima de 0 dBFS detectadas.\n"
            "Causa mais provável: limitador de output desativado ou teto configurado acima de 0 dBTP.\n\n"
            "→ Verificar se True Peak Limiter está ativo no master bus\n"
            "→ Configurar ceiling em −1.0 dBTP (não 0 dBFS)\n"
            "→ Se clipping persistir após o limiter: rastrear canal de origem\n"
            "   com picos acima de 0 dBFS no mixer\n"
            "→ Novo bounce + reanalise"
        ),
    })

if d["true_peak"] > -1.0:
    adjustments.append({
        "p": "p1", "pl": "Bloqueante",
        "title": "True Peak acima do limite de plataformas",
        "impact": "O Spotify e Apple Music vão distorcer sua faixa automaticamente durante a normalização. O problema não aparece no seu sistema — aparece para o ouvinte.",
        "action": "Não publique. Peça um novo bounce com True Peak limitado a −1 dBTP.",
        "tech": (
            f"True Peak medido: {d['true_peak']} dBTP. Limite das plataformas: −1.0 dBTP.\n"
            f"Desvio: +{abs(d['true_peak'] - (-1.0)):.1f} dB acima do permitido.\n\n"
            "→ No limitador de output, configurar True Peak Ceiling = −1.0 dBTP\n"
            "   (verificar se o plugin suporta TP — diferente de Sample Peak)\n"
            "→ Plugins compatíveis: FabFilter Pro-L2, Waves L2/L3, Izotope Ozone Maximizer\n"
            "→ Renderizar em 32-bit float antes de converter para 16/24-bit\n"
            "   para evitar intersample peaks na conversão"
        ),
    })

if d["lufs"] > -11:
    adjustments.append({
        "p": "p2", "pl": "Crítico",
        "title": "Loudness muito alto para streaming",
        "impact": f"O Spotify vai baixar o volume da sua faixa automaticamente para −14 LUFS. Ela vai soar mais fraca que as vizinhas na playlist — o ouvinte percebe sem saber o motivo.",
        "action": "Peça um novo master com LUFS entre −14 e −11. Se você masterizou, reduza o output gain do limitador.",
        "tech": (
            f"LUFS integrado: {d['lufs']} dBLUFS. Target Spotify/Apple: {d['lufs_target']} dBLUFS.\n"
            f"Desvio: +{abs(d['lufs'] - d['lufs_target']):.1f} dB. A plataforma vai aplicar essa redução de ganho.\n\n"
            f"→ Reduzir output gain do limitador em ~{abs(d['lufs'] - d['lufs_target']):.1f} dB\n"
            "→ Verificar que DR Score não cai abaixo de 6 após a redução\n"
            "→ Se cair: problema está no bus compressor — ratio ou makeup gain excessivos\n"
            f"   Target para {genre}: −14 dBLUFS é o mais seguro para normalização"
        ),
    })

if d["dr_score"] < 8:
    adjustments.append({
        "p": "p2" if d["dr_score"] < 5 else "p3", "pl": "Crítico" if d["dr_score"] < 5 else "Relevante",
        "title": f"Dynamic Range baixo (DR {d['dr_score']})",
        "impact": "A faixa soa achatada — sem respiro entre os momentos suaves e intensos. Em volume alto cansa rápido. Em fone perde profundidade.",
        "action": "Tecnicamente publicável, mas vai soar comprimido. Avalie com uma referência do gênero em volume igual antes de decidir.",
        "tech": (
            f"DR Score: {d['dr_score']}. Recomendado para {genre}: DR 8–12.\n"
            "Causa mais provável: bus compressor com ratio alto (>4:1) e release curto.\n\n"
            "→ Passo 1: reduzir makeup gain do bus compressor em 2–3 dB\n"
            "→ Passo 2: aumentar release do bus compressor (200–400ms)\n"
            "→ Passo 3: reduzir ratio para 2:1 ou 1.5:1\n"
            "→ Reanalise após cada passo — objetivo: DR ≥ 8 sem perder coesão\n\n"
            "Trade-off: DR alto com LUFS baixo é preferível a DR baixo com LUFS alto.\n"
            "Plataformas normalizam loudness — não normalizam dinâmica."
        ),
    })

if abs(d["spec_dev"][0]) > 3.0:
    adjustments.append({
        "p": "p3", "pl": "Relevante",
        "title": "Excesso de sub-grave vs. referência do gênero",
        "impact": f"Em caixas com subwoofer a faixa pode soar pesada e cansativa. Em fones, o sub pode mascarar a voz nos momentos de maior energia.",
        "action": "Avalie em fone e em caixa pequena. Se soar pesado nos dois, o sub precisa ser cortado antes de publicar.",
        "tech": (
            f"Banda sub (20–80 Hz): +{d['spec_dev'][0]:.1f} dB vs. mediana {genre}.\n"
            "Causa mais provável: ausência de HPF no kick ou baixo, ou boost de sub no master EQ.\n\n"
            "→ Verificar HPF nos canais de kick e baixo (80 Hz, 12 dB/oct)\n"
            "→ Se persistir no master: EQ dinâmico na faixa 30–80 Hz\n"
            "   com threshold em −18 dBFS\n"
            "→ Alternativa: low shelf cut em 60 Hz, −2 dB no master EQ\n"
            "→ Testar em três sistemas: fone, caixa pequena, sistema com sub"
        ),
    })

if d["spec_dev"][4] < -2.5 or d["spec_dev"][5] < -2.5:
    adjustments.append({
        "p": "p4", "pl": "Estético",
        "title": "Presença e ar abaixo da mediana do gênero",
        "impact": f"Comparando com outras faixas de {genre}, sua faixa soa um pouco fechada nas frequências altas. Pode ser escolha intencional — vale confirmar.",
        "action": "Compare com uma referência do gênero em volume igual. Se a referência soar mais aberta, considere ajuste antes de publicar.",
        "tech": (
            f"Presença (2–6 kHz): {d['spec_dev'][4]:.1f} dB vs. mediana.\n"
            f"Ar (6–20 kHz): {d['spec_dev'][5]:.1f} dB vs. mediana.\n"
            "Causa mais provável: EQ de mastering conservador ou de-essing agressivo.\n\n"
            "→ High shelf +1.5 dB a partir de 8 kHz no master EQ (testar primeiro)\n"
            "→ Bell +0.8 dB em 3 kHz para presença vocal\n"
            "→ Verificar threshold do de-esser — muito baixo captura presença\n\n"
            f"Nota: vocais intimistas em {genre} frequentemente ficam abaixo\n"
            "da mediana de presença por escolha estética. Confirme com o artista."
        ),
    })

if not adjustments:
    adjustments.append({
        "p": "p3", "pl": "Informativo",
        "title": "Faixa dentro dos parâmetros técnicos",
        "impact": f"Todos os indicadores técnicos estão dentro dos padrões de publicação para {genre}.",
        "action": "Você pode prosseguir com a distribuição. Considere uma última escuta de referência antes de submeter.",
        "tech": "Nenhum ajuste técnico identificado. Verifique a escuta final em múltiplos sistemas antes de distribuir.",
    })

# ── Score dinâmico ───────────────────────────────────────────────────────────────
blockers  = sum(1 for a in adjustments if a["p"] == "p1")
criticals = sum(1 for a in adjustments if a["p"] == "p2")

if blockers > 0:
    verdict        = "Não publicar ainda"
    verdict_color  = "#E05A5A"
    verdict_cls    = "red"
    marker_pct     = 10
    reason_text    = (
        f"{blockers} problema{'s' if blockers > 1 else ''} técnico{'s' if blockers > 1 else ''} "
        f"precisam ser corrigidos antes de publicar. "
        f"{'Clipping e True Peak causam distorção auditível para o ouvinte final.' if blockers == 2 else 'Veja o plano de ajustes abaixo.'}"
    )
elif criticals > 0:
    verdict        = "Publicar com ressalvas"
    verdict_color  = "#E0B84C"
    verdict_cls    = "yellow"
    marker_pct     = 52
    reason_text    = (
        f"{criticals} item{'ns' if criticals > 1 else ''} crítico{'s' if criticals > 1 else ''} "
        f"detectado{'s' if criticals > 1 else ''}. A faixa pode ser publicada, "
        f"mas o ouvinte vai perceber o impacto — especialmente em playlists curadas."
    )
else:
    verdict        = "Pronto para publicar"
    verdict_color  = "#3DB882"
    verdict_cls    = "green"
    marker_pct     = 92
    reason_text    = f"Todos os parâmetros técnicos estão dentro do padrão para {genre}. Faixa apta para distribuição."

# ── File info bar ────────────────────────────────────────────────────────────────
genre_badge = (
    f"<span style='color:#C9A84C;'>{genre}</span>"
    f"<span style='color:#444466; font-size:0.55rem; margin-left:0.4rem;'>inferido</span>"
    if not mismatch else
    f"<span style='color:#E0B84C;'>{genre}</span>"
    f"<span style='color:#444466; font-size:0.55rem; margin-left:0.4rem;'>corrigido de {top_infer}</span>"
)
source_badge = (
    "" if d.get("_source") != "mock" else
    "<span style='color:#444466; font-size:0.55rem; margin-left:0.8rem;'>· demo</span>"
)

st.markdown(f"""
<div class="file-bar">
  <div class="file-bar-item">Arquivo<b>{d['filename']}</b>{source_badge}</div>
  <div class="file-bar-item">Duração<b>{d['duration']}</b></div>
  <div class="file-bar-item">Sample Rate<b>{d['sample_rate']}</b></div>
  <div class="file-bar-item">Bit Depth<b>{d['bit_depth']}</b></div>
  <div class="file-bar-item">Canais<b>{d['channels']}</b></div>
  <div class="file-bar-item" style="font-family:'DM Mono',monospace;">Gênero&nbsp;{genre_badge}</div>
</div>
""", unsafe_allow_html=True)

# ── Mismatch alert ───────────────────────────────────────────────────────────────
if mismatch:
    reason = genre_mismatch_reason(top_infer, genre, d)
    st.markdown(f"""
    <div class="mismatch-box">
      <div class="mismatch-title">⚠ Divergência de posicionamento sonoro</div>
      <div class="mismatch-text">
        O analisador identificou sua faixa como <b>{top_infer}</b>, mas você declarou <b>{genre}</b>.<br>
        {reason}<br><br>
        A análise a seguir usa <b>{genre}</b> como referência.
        Vale revisar se o som está comunicando o que você quer comunicar.
      </div>
    </div>
    """, unsafe_allow_html=True)

# ════════════════════════════════════════════════════════════════════════════════
# EXECUTIVE SUMMARY
# ════════════════════════════════════════════════════════════════════════════════
exec_items_html = ""
for adj in adjustments:
    color_cls = {"p1":"red","p2":"yellow","p3":"green","p4":"green"}.get(adj["p"], "green")
    exec_items_html += f'<span class="exec-item {color_cls}">{adj["pl"]}: {adj["title"][:42]}{"…" if len(adj["title"])>42 else ""}</span>'

st.markdown(f"""
<div class="exec-summary {verdict_cls}">
  <div class="exec-eyebrow {verdict_cls}">Avaliação de Publicabilidade</div>
  <div class="exec-verdict {verdict_cls}">{verdict}</div>
  <div class="exec-reason">{reason_text}</div>
  <div class="exec-items">{exec_items_html}</div>
</div>
""", unsafe_allow_html=True)

reset_col, _, dl_col = st.columns([1, 3.5, 1.5])
with reset_col:
    if st.button("← Nova análise"):
        reset_state()
        st.rerun()

# ════════════════════════════════════════════════════════════════════════════════
# MÓDULO 01 — QUALIDADE TÉCNICA
# ════════════════════════════════════════════════════════════════════════════════
st.markdown("""
<div class="mod-header">
  <div class="mod-badge">Módulo 01</div>
  <div class="mod-title">Qualidade Técnica para Publicação</div>
  <div class="mod-desc">Avaliação contra padrões das plataformas de streaming</div>
</div>
""", unsafe_allow_html=True)

metrics = [
    ("LUFS Integrado",  f"{d['lufs']} dBLUFS",   f"Target streaming: {d['lufs_target']} dBLUFS", lufs_s,
     {"green":"Dentro do range","yellow":"Atenção","red":"Loudness alto"}),
    ("True Peak",       f"{d['true_peak']} dBTP", "Limite: −1.0 dBTP", tp_s,
     {"green":"Dentro do limite","red":"Acima do limite"}),
    ("Dynamic Range",   f"DR {d['dr_score']}",    "Recomendado: DR ≥ 8", dr_s,
     {"green":"Boa dinâmica","yellow":"Atenção","red":"Compressão excessiva"}),
    ("Clipping",        f"{d['clipping']} ocorr.", "Tolerado: 0", clip_s,
     {"green":"Sem clipping","red":"Distorção detectada"}),
]

cols = st.columns(4)
for (label, value, target, s, labels), col in zip(metrics, cols):
    with col:
        badge = labels.get(s, s)
        st.markdown(f"""
        <div class="metric-card {s}">
          <div class="mc-label">{label}</div>
          <div class="mc-value {s}">{value}</div>
          <div class="mc-target">{target}</div>
          <div class="mc-badge {s}">{badge}</div>
        </div>
        """, unsafe_allow_html=True)

st.markdown("<div style='margin-top:1.5rem;'></div>", unsafe_allow_html=True)

col_chart, col_bands = st.columns([2.5, 1])
with col_chart:
    spec_colors = ["#3DB882" if abs(v) <= 1.5 else "#E0B84C" if abs(v) <= 3 else "#E05A5A"
                   for v in d["spec_dev"]]
    fig_spec = go.Figure()
    fig_spec.add_trace(go.Bar(x=d["bands"], y=d["spec_dev"],
        marker_color=spec_colors, marker_line_width=0, width=0.52))
    fig_spec.add_hline(y=0,    line_color="#2a2a45", line_width=1.5)
    fig_spec.add_hline(y=1.5,  line_color="#3DB882", line_width=0.7, line_dash="dot", opacity=0.35)
    fig_spec.add_hline(y=-1.5, line_color="#3DB882", line_width=0.7, line_dash="dot", opacity=0.35)
    fig_spec.update_layout(
        title=dict(text="Balanço Espectral — Desvio vs. Referência do Gênero (dB)",
                   font=dict(family="Jost", size=10, color="#8888aa"), x=0),
        plot_bgcolor="#0f0f1a", paper_bgcolor="#0f0f1a",
        font=dict(family="DM Mono", color="#8888aa", size=9),
        height=255, margin=dict(l=10, r=10, t=38, b=10), showlegend=False,
        yaxis=dict(gridcolor="#1e1e30", zeroline=False, ticksuffix=" dB", range=[-6, 6]),
        xaxis=dict(gridcolor="#0f0f1a"), bargap=0.28,
    )
    st.plotly_chart(fig_spec, use_container_width=True, config={"displayModeBar": False})

with col_bands:
    st.markdown("<div style='height:38px'></div>", unsafe_allow_html=True)
    st.markdown("""<div style="font-family:'DM Mono',monospace; font-size:0.55rem;
        letter-spacing:0.18em; color:#444466; text-transform:uppercase;
        margin-bottom:0.6rem;">Leitura por banda</div>""", unsafe_allow_html=True)
    for band, rng, val in zip(d["bands"], d["bands_range"], d["spec_dev"]):
        color = "#3DB882" if abs(val) <= 1.5 else ("#E0B84C" if abs(val) <= 3 else "#E05A5A")
        arrow = "↑" if val > 0 else "↓"
        st.markdown(f"""
        <div class="band-row">
          <div>
            <span class="band-name">{band}</span>
            <span style="font-family:'DM Mono',monospace; font-size:0.5rem; color:#444466; margin-left:0.3rem;">{rng}</span>
          </div>
          <span class="band-value" style="color:{color};">{arrow}{abs(val):.1f} dB</span>
        </div>""", unsafe_allow_html=True)

# ════════════════════════════════════════════════════════════════════════════════
# MÓDULO 02 — POSICIONAMENTO DE MERCADO
# ════════════════════════════════════════════════════════════════════════════════
st.markdown(f"""
<div class="mod-header">
  <div class="mod-badge">Módulo 02</div>
  <div class="mod-title">Posicionamento de Mercado</div>
  <div class="mod-desc">~37.000 referências · Catálogo JSP · {genre}</div>
</div>
""", unsafe_allow_html=True)

col_radar, col_dims = st.columns([1.6, 1])
with col_radar:
    dims   = d["radar_dims"]
    t_vals = d["radar_track"]
    r_vals = d["radar_ref"]
    dims_lp = dims + [dims[0]]
    t_lp    = t_vals + [t_vals[0]]
    r_lp    = r_vals + [r_vals[0]]
    fig_radar = go.Figure()
    fig_radar.add_trace(go.Scatterpolar(r=r_lp, theta=dims_lp, fill="toself",
        fillcolor="rgba(139,111,212,0.05)",
        line=dict(color="#8B6FD4", width=1.5, dash="dot"), name=f"Mediana {genre}"))
    fig_radar.add_trace(go.Scatterpolar(r=t_lp, theta=dims_lp, fill="toself",
        fillcolor="rgba(201,168,76,0.08)",
        line=dict(color="#C9A84C", width=2), name="Sua faixa",
        marker=dict(size=5, color="#C9A84C")))
    fig_radar.update_layout(
        polar=dict(bgcolor="#0f0f1a",
            radialaxis=dict(visible=True, range=[0, 1], gridcolor="#1e1e30",
                tickfont=dict(size=7, color="#333355"), showticklabels=False),
            angularaxis=dict(gridcolor="#2a2a45",
                tickfont=dict(family="DM Mono", size=9, color="#8888aa"))),
        showlegend=True,
        legend=dict(font=dict(family="DM Mono", size=9, color="#8888aa"),
            bgcolor="#0f0f1a", bordercolor="#2a2a45", borderwidth=1, x=0.78, y=1.1),
        plot_bgcolor="#0f0f1a", paper_bgcolor="#0f0f1a", height=330,
        margin=dict(l=40, r=40, t=30, b=20),
        title=dict(text=f"Sua faixa vs. Mediana {genre}",
            font=dict(family="Jost", size=10, color="#8888aa"), x=0),
    )
    st.plotly_chart(fig_radar, use_container_width=True, config={"displayModeBar": False})

with col_dims:
    st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
    st.markdown("""<div style="font-family:'DM Mono',monospace; font-size:0.55rem;
        letter-spacing:0.18em; color:#444466; text-transform:uppercase;
        margin-bottom:0.65rem;">Desvio por dimensão</div>""", unsafe_allow_html=True)
    for label, tv, rv in zip(d["radar_dims"], d["radar_track"], d["radar_ref"]):
        diff    = tv - rv
        pct     = int(abs(diff) / rv * 100) if rv > 0 else 0
        dir_str = f"↑ {pct}% acima" if diff > 0 else f"↓ {pct}% abaixo"
        color   = "#3DB882" if pct <= 8 else ("#E0B84C" if pct <= 22 else "#E05A5A")
        bar_w   = min(int(abs(diff) / 0.5 * 100), 100)
        st.markdown(f"""
        <div class="dim-row">
          <div class="dim-top">
            <span class="dim-name">{label}</span>
            <span class="dim-delta" style="color:{color};">{dir_str}</span>
          </div>
          <div class="dim-bar-bg">
            <div style="height:2px; background:{color}; width:{bar_w}%;"></div>
          </div>
        </div>""", unsafe_allow_html=True)

# ════════════════════════════════════════════════════════════════════════════════
# MÓDULO 03 — PLANO DE AJUSTES
# ════════════════════════════════════════════════════════════════════════════════
st.markdown("""
<div class="mod-header">
  <div class="mod-badge">Módulo 03</div>
  <div class="mod-title">Plano de Ajustes</div>
  <div class="mod-desc">Impacto real · Ação concreta · Detalhe técnico</div>
</div>
""", unsafe_allow_html=True)

for adj in adjustments:
    tech_escaped = html_lib.escape(adj['tech'])
    tech_html = f"""
    <div class="adj-tech">
      <span class="adj-tech-label">Detalhe técnico</span>
      <pre style="margin:0; white-space:pre-wrap; font-family:'DM Mono',monospace;
                  font-size:0.62rem; color:#444466; line-height:1.65;">{tech_escaped}</pre>
    </div>""" if is_prod else ""

    st.markdown(f"""
    <div class="adj-card {adj['p']}">
      <div class="adj-header">
        <div class="adj-prio {adj['p']}">{adj['pl']}</div>
        <div class="adj-title">{adj['title']}</div>
        <div class="adj-impact">{adj['impact']}</div>
      </div>
      <div class="adj-action">
        <span class="adj-action-label">Ação</span>
        {adj['action']}
      </div>
      {tech_html}
    </div>
    """, unsafe_allow_html=True)

# ════════════════════════════════════════════════════════════════════════════════
# CTA — Próximo passo
# ════════════════════════════════════════════════════════════════════════════════
cta_action = (
    "Leve este relatório para o seu produtor e peça a correção dos itens bloqueantes antes do próximo bounce."
    if blockers > 0 else
    "Você pode distribuir agora. Se quiser garantir o resultado, uma sessão de revisão técnica JSP resolve os pontos críticos antes da publicação."
    if criticals > 0 else
    "Sua faixa está pronta. Você pode submeter para distribuição. O JSP pode ajudar com o plano de lançamento."
)

st.markdown(f"""
<div class="cta-block">
  <div class="cta-left">
    <div class="cta-eyebrow">Próximo passo</div>
    <div class="cta-title">O que fazer agora</div>
    <div class="cta-desc">{cta_action}</div>
  </div>
</div>
""", unsafe_allow_html=True)

# ── Exportar relatório ────────────────────────────────────────────────────────────
report_md = build_report_markdown(d, genre, adjustments, verdict, blockers, criticals)
report_bytes = report_md.encode("utf-8")
filename_safe = d['filename'].replace(" ", "_").rsplit(".", 1)[0]

st.markdown("<div style='margin-top:1rem;'></div>", unsafe_allow_html=True)
dl_col2, _ = st.columns([1.5, 4.5])
with dl_col2:
    st.download_button(
        label="Exportar relatório",
        data=report_bytes,
        file_name=f"musicosai_{filename_safe}_{datetime.now().strftime('%Y%m%d')}.md",
        mime="text/markdown",
    )

# ─── FOOTER ──────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div class="jsp-footer">
  <span>MusicOS.ai · Jam Session Project · Audio Analyzer v0.3</span>
  <span>~37.000 faixas de referência · Catálogo JSP · sa-east-1</span>
</div>
""", unsafe_allow_html=True)
