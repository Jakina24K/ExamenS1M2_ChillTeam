import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Sparkles,
  Copy,
  Check,
  Loader2,
  Trash2,
  Shield,
  FileText,
  BarChart3,
} from "lucide-react";
import { apiClient } from "@/services/api";

/* ================= TYPES ================= */

interface MorphData {
  word: string;
  fototeny: string;
  morphemes: {
    texte: string;
    type: string;
    fonction: string;
    regle: string;
  }[];
  methode: string;
  confiance: number;
  found: boolean;
}

/* ================= COMPONENT ================= */

export default function FandrasanaTeny({
  onClose,
  initialText = "",
  isOpen = true,
}: any) {
  const [text, setText] = useState(initialText);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [analysis, setAnalysis] = useState<any>(null);
  const [morphData, setMorphData] = useState<MorphData | null>(null);

  const [activeTab, setActiveTab] = useState("stats");
  const [copied, setCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getAnalyzableWord = (value: string) => {
    const words = value
      .trim()
      .split(/\s+/)
      .map((word) => word.replace(/[^\p{L}'-]/gu, ""))
      .filter(Boolean);

    return words.at(-1) ?? "";
  };

  /* ================= ANALYSE ================= */

  const analyzeText = async () => {
    const analyzableWord = getAnalyzableWord(text);
    if (!analyzableWord) return;

    setIsAnalyzing(true);
    setMorphData(null);

    try {
      const data = await apiClient.detectRootWord(analyzableWord);
      setMorphData({
        word: data.sampanteny || analyzableWord,
        fototeny: data.fototeny,
        morphemes: [
          ...(data.tovona
            ? [{ texte: data.tovona, type: "Tovona", fonction: "Morpheme de debut", regle: "Avy amin'ny backend" }]
            : []),
          { texte: data.fototeny, type: "Fototeny", fonction: "Racine", regle: "Avy amin'ny backend" },
          ...(data.tovana
            ? [{ texte: data.tovana, type: "Tovana", fonction: "Morpheme de fin", regle: "Avy amin'ny backend" }]
            : []),
        ],
        methode: "Backend Django",
        confiance: 1,
        found: true,
      });
    } catch (err) {
      console.error("Erreur backend:", err);
      setMorphData({
        word: analyzableWord,
        fototeny: "",
        morphemes: [],
        methode: "Backend Django",
        confiance: 0,
        found: false,
      });
    }

    setTimeout(() => {
      const words = text.trim().split(/\s+/).filter(Boolean);
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
      const syllables = words.reduce(
        (acc, w) => acc + Math.max(1, Math.ceil(w.length / 3)),
        0,
      );

      setAnalysis({
        wordCount: words.length,
        charCount: text.length,
        sentenceCount: sentences.length,
        syllableCount: syllables,
        readingTime: `${Math.ceil(words.length / 200)} min`,
      });

      setIsAnalyzing(false);
    }, 800);
  };

  /* ================= ACTIONS ================= */

  const handleClear = () => {
    setText("");
    setAnalysis(null);
    setMorphData(null);
    textareaRef.current?.focus();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    if (initialText) analyzeText();
  }, []);

  if (!isOpen) return null;

  /* ================= UI ================= */

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white dark:bg-gray-900 w-[850px] h-[85vh] rounded-2xl shadow-xl flex flex-col">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-white font-bold text-lg">Fandrasana teny</h2>
          <div className="flex gap-2">
            <button onClick={handleClear}>
              <Trash2 className="text-white" />
            </button>
            <button onClick={onClose}>
              <X className="text-white" />
            </button>
          </div>
        </div>

        {/* INPUT + RESULTAT (HORIZONTAL LAYOUT) */}
        <div className="flex flex-1 overflow-hidden">

          {/* INPUT (GAUCHE) - un peu plus étroit */}
          <div className="w-[40%] p-4 border-r flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ampidiro eto ny teny na lahatsoratra..."
              className="w-full flex-1 p-3 border rounded-xl resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={analyzeText}
                disabled={isAnalyzing}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl flex justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="animate-spin" /> Analyse...
                  </>
                ) : (
                  <>
                    <Sparkles /> Hanadihady
                  </>
                )}
              </button>

              <button onClick={handleCopy}>
                {copied ? <Check /> : <Copy />}
              </button>
            </div>
          </div>

          {/* RESULTATS (DROITE) - plus large */}
          <div className="w-[60%] flex flex-col">

            {/* TABS */}
            <div className="flex border-b px-4">
              <button
                onClick={() => setActiveTab("morph")}
                className={`p-3 flex items-center gap-2 ${
                  activeTab === "morph"
                    ? "border-b-2 border-emerald-500 text-emerald-600 font-semibold"
                    : "text-gray-500"
                }`}
              >
                <FileText className="w-4 h-4" /> Fandrasana
              </button>

              <button
                onClick={() => setActiveTab("stats")}
                className={`p-3 flex items-center gap-2 ${
                  activeTab === "stats"
                    ? "border-b-2 border-emerald-500 text-emerald-600 font-semibold"
                    : "text-gray-500"
                }`}
              >
                <BarChart3 className="w-4 h-4" /> Statistika
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-4">

              {/* MORPH */}
              {activeTab === "morph" && morphData && (
                <div className="space-y-4">

                  {!morphData.found && (
                    <p className="text-red-500">
                      Tsy hita ny fandrasana teny
                    </p>
                  )}

                  {/* FOTOTENY */}
                  <div className="p-4 bg-emerald-50 rounded-xl">
                    <p className="text-xs text-gray-500">Fototeny</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {morphData.fototeny || "-"}
                    </p>
                  </div>

                  {/* WORD */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500">Teny</p>
                    <p className="font-semibold">{morphData.word}</p>
                  </div>

                  {/* VISUAL */}
                  <div className="flex gap-2 flex-wrap">
                    {morphData.morphemes?.map((m, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-emerald-100 rounded-full text-sm"
                      >
                        {m.texte}
                      </span>
                    ))}
                  </div>

                  {/* DETAILS */}
                  {morphData.morphemes?.map((m, i) => (
                    <div key={i} className="p-3 border rounded-xl">
                      <p className="font-semibold">{m.texte}</p>
                      <p className="text-xs text-gray-500">{m.type}</p>
                      <p className="text-sm">{m.fonction}</p>
                      <p className="text-xs text-emerald-600">
                        📘 {m.regle}
                      </p>
                    </div>
                  ))}

                  <div className="text-xs text-gray-500">
                    Méthode: {morphData.methode} • Confiance:{" "}
                    {morphData.confiance * 100}%
                  </div>
                </div>
              )}

              {/* STATS */}
              {activeTab === "stats" && analysis && (
                <div className="space-y-3">
                  <p>📝 {analysis.wordCount} teny</p>
                  <p>🔤 {analysis.charCount} litera</p>
                  <p>📖 {analysis.sentenceCount} fehezanteny</p>
                  <p>🔡 Vaninteny: {analysis.syllableCount}</p>
                  <p>⏱️ {analysis.readingTime}</p>
                </div>
              )}

              {/* EMPTY */}
              {!analysis && !morphData && !isAnalyzing && (
                <div className="text-center text-gray-400 mt-10">
                  <Shield className="mx-auto mb-2" />
                  Ampidiro teny iray
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t text-center text-xs text-gray-500">
          Fandrasana teny Malagasy • Analyse intelligente
        </div>
      </div>
    </div>
  );
}
