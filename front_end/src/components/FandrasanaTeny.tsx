import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Sparkles,
  Copy,
  Check,
  FileText,
  BarChart3,
  Languages,
  Volume2,
  TrendingUp,
  AlertCircle,
  Loader2,
  Minimize2,
  Maximize2,
  MessageSquare,
  Zap,
  Brain,
  Hash,
  Eye,
  PenTool,
  BookOpen,
  Star,
  Shield,
  Clock,
  Trash2,
  RefreshCw,
  Lightbulb,
} from "lucide-react";

interface AnalysisResult {
  wordCount: number;
  charCount: number;
  charCountNoSpaces: number;
  sentenceCount: number;
  syllableCount: number;
  readingTime: string;
  paragraphCount: number;
  uniqueWords: number;
  sentiment: {
    score: number;
    label: "positive" | "negative" | "neutral";
    emoji: string;
    description: string;
  };
  keywords: Array<{ word: string; count: number }>;
  suggestions: string[];
  errors: Array<{
    word: string;
    pattern: string;
    suggestion: string;
    description: string;
  }>;
  grammarIssues: Array<{
    text: string;
    suggestion: string;
    type: string;
  }>;
}

interface FandrasanaTenyProps {
  onClose?: () => void;
  initialText?: string;
  isOpen?: boolean;
}

export default function FandrasanaTeny({
  onClose,
  initialText = "",
  isOpen = true,
}: FandrasanaTenyProps) {
  const [text, setText] = useState(initialText);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState("stats");
  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fonction d'analyse de texte complète
  const analyzeText = async () => {
    if (!text.trim()) return;

    setIsAnalyzing(true);

    // Simulation d'analyse (à remplacer par votre API réelle)
    setTimeout(() => {
      const words = text
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const paragraphs = text
        .split(/\n\s*\n/)
        .filter((p) => p.trim().length > 0);
      const syllables = words.reduce((acc, w) => {
        const sylCount = Math.max(1, Math.ceil(w.length / 3));
        return acc + sylCount;
      }, 0);

      const readingTimeMinutes = Math.ceil(words.length / 200);
      const readingTime =
        readingTimeMinutes === 0
          ? "Latsaky ny 1 min"
          : `${readingTimeMinutes} min`;

      // Analyse de sentiment avancée
      const positiveWords = [
        "tsara",
        "mahafaly",
        "sambatra",
        "soa",
        "tiako",
        "finaritra",
        "faly",
        "sitrapony",
        "hafaliana",
        "sambatra",
        "tia",
        "ankafiziko",
        "mankasitraka",
      ];
      const negativeWords = [
        "ratsy",
        "mampalahelo",
        "tezitra",
        "loza",
        "matahotra",
        "alahelo",
        "orina",
        "mampijaly",
        "mahory",
        "mampanahy",
        "mampidi-doza",
      ];

      let sentimentScore = 0;
      words.forEach((word) => {
        const lowerWord = word.toLowerCase();
        if (positiveWords.some((pw) => lowerWord.includes(pw)))
          sentimentScore += 0.15;
        if (negativeWords.some((nw) => lowerWord.includes(nw)))
          sentimentScore -= 0.15;
      });
      sentimentScore = Math.max(-1, Math.min(1, sentimentScore));

      let sentimentLabel: "positive" | "negative" | "neutral" = "neutral";
      let sentimentEmoji = "😐";
      let sentimentDescription =
        "Tsy miandany ny fihetseham-pon'ny lahatsoratra";

      if (sentimentScore > 0.2) {
        sentimentLabel = "positive";
        sentimentEmoji = "😊";
        sentimentDescription =
          "Maneho fihetseham-po tsara sy mahafaly ny lahatsoratra";
      } else if (sentimentScore < -0.2) {
        sentimentLabel = "negative";
        sentimentEmoji = "😔";
        sentimentDescription = "Maneho alahelo na tezitra ny lahatsoratra";
      }

      // Extraction des mots-clés avec fréquence
      const wordFrequency: Map<string, number> = new Map();
      words.forEach((word) => {
        const lowerWord = word.toLowerCase();
        wordFrequency.set(lowerWord, (wordFrequency.get(lowerWord) || 0) + 1);
      });

      const keywords = Array.from(wordFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([word, count]) => ({ word, count }));

      // Suggestions d'amélioration
      const suggestions = [];
      if (words.length < 50) {
        suggestions.push(
          "Manampia antsipirihany bebe kokoa hanamafisana ny hevitra",
        );
      }
      if (sentences.length > 0 && words.length / sentences.length > 25) {
        suggestions.push(
          "Zarao ho fehezanteny fohy kokoa ny lahatsoratra mba ho moramora vakiana",
        );
      }
      if (paragraphs.length === 0 && words.length > 100) {
        suggestions.push(
          "Ampidiro fehezanteny vitsivitsy mba handaminana ny lahatsoratra",
        );
      }
      if (uniqueWords / words.length < 0.3 && words.length > 20) {
        suggestions.push(
          "Mampiasà teny hafa mba tsy hisian'ny famerimberenana",
        );
      }
      suggestions.push("Avereno jerena ny fanoratana sy ny fitsipi-pitenenana");
      suggestions.push(
        "Amporisihina ny fampiasana ohatra mazava mba hanazavana hevitra",
      );

      // Erreurs phonotaktiques simulées
      const errors: AnalysisResult["errors"] = [];
      const commonErrors = [
        {
          word: "fandrasana",
          pattern: "ndr",
          suggestion: "fan-dra-sa-na",
          desc: "Fizarana vaninteny tsy mety",
        },
        {
          word: "teny",
          pattern: "ny",
          suggestion: "te-ny",
          desc: "Fanagasiana ny vaninteny",
        },
      ];

      commonErrors.forEach((err) => {
        if (text.toLowerCase().includes(err.word)) {
          errors.push({
            word: err.word,
            pattern: err.pattern,
            suggestion: err.suggestion,
            description: err.desc,
          });
        }
      });

      // Problèmes de grammaire simulés
      const grammarIssues = [];
      if (text.includes("ny ny")) {
        grammarIssues.push({
          text: "ny ny",
          suggestion: "ny",
          type: "Famerimberenana",
        });
      }

      setAnalysis({
        wordCount: words.length,
        charCount: text.length,
        charCountNoSpaces: text.replace(/\s/g, "").length,
        sentenceCount: sentences.length,
        syllableCount: syllables,
        readingTime,
        paragraphCount: paragraphs.length,
        uniqueWords,
        sentiment: {
          score: sentimentScore,
          label: sentimentLabel,
          emoji: sentimentEmoji,
          description: sentimentDescription,
        },
        keywords,
        suggestions,
        errors,
        grammarIssues,
      });

      setIsAnalyzing(false);
    }, 1200);
  };

  const handleCopyAll = () => {
    if (analysis) {
      const result = `
📊 FANDASANA TENY - VALIN'NY FAMAKIAKA
═══════════════════════════════════════

📝 STATISTIKA:
• Teny: ${analysis.wordCount}
• Litera: ${analysis.charCount}
• Litera (tsy misy toerana): ${analysis.charCountNoSpaces}
• Fehezanteny: ${analysis.sentenceCount}
• Vaninteny: ${analysis.syllableCount}
• Fehintsoratra: ${analysis.paragraphCount}
• Teny tsy miverina: ${analysis.uniqueWords}
• Fotoana famakiana: ${analysis.readingTime}

🎭 FIhetseham-po:
• Sokajy: ${analysis.sentiment.label} ${analysis.sentiment.emoji}
• Isan-jato: ${(analysis.sentiment.score * 100).toFixed(0)}%
• Famakafakana: ${analysis.sentiment.description}

🏷️ FOTO-TENY:
${analysis.keywords.map((k) => `• ${k.word} (${k.count} x)`).join("\n")}

💡 SOSO-KEVITRA:
${analysis.suggestions.map((s) => `• ${s}`).join("\n")}

⚠️ OLANA HITA:
${analysis.errors.map((e) => `• ${e.word} → ${e.suggestion}`).join("\n")}
      `;
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopySection = (section: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleClear = () => {
    setText("");
    setAnalysis(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      analyzeText();
    }
  };

  // Auto-analyse si un texte initial est fourni
  useEffect(() => {
    if (initialText && initialText.trim()) {
      analyzeText();
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`
          relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl 
          transition-all duration-300 flex flex-col
          ${isMinimized ? "w-96 h-auto" : "w-[700px] max-w-[90vw] h-[85vh]"}
        `}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">
                  Fandrasana teny
                </h2>
                <p className="text-white/80 text-xs">
                  Famakafakana sy fanamarinana ny lahatsoratra
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-white hover:bg-white/20 transition-colors"
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Input Area */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <MessageSquare className="h-4 w-4" />
                    Lahatsoratra hodinihina
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClear}
                      className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Hamafa
                    </button>
                    <span className="text-xs text-gray-400">
                      {text.length} litera
                    </span>
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ampidiro eto ny lahatsoratra tianao hodinihina..."
                  className="w-full h-32 p-3 rounded-xl border border-gray-200 dark:border-gray-700 
                           bg-gray-50 dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 
                           focus:ring-emerald-500 focus:border-transparent transition-all
                           text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={analyzeText}
                    disabled={!text.trim() || isAnalyzing}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 
                             hover:from-emerald-600 hover:to-teal-700 text-white font-medium 
                             py-2.5 rounded-xl transition-all duration-200 flex items-center 
                             justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Famakiana...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Hanadihady
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCopyAll}
                    disabled={!analysis}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600
                             hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Adika ny valiny rehetra"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Results Area */}
              {analysis && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  {/* Tabs */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
                    {[
                      { id: "stats", label: "Statistika", icon: BarChart3 },
                      { id: "sentiment", label: "Fihetseham-po", icon: Brain },
                      { id: "keywords", label: "Foto-teny", icon: Hash },
                      {
                        id: "suggestions",
                        label: "Soso-kevitra",
                        icon: Lightbulb,
                      },
                      { id: "errors", label: "Olana", icon: AlertCircle },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all
                          border-b-2 -mb-px
                          ${
                            activeTab === tab.id
                              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          }
                        `}
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Statistika */}
                    {activeTab === "stats" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                              {analysis.wordCount}
                            </p>
                            <p className="text-xs text-gray-500">Teny</p>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {analysis.charCount}
                            </p>
                            <p className="text-xs text-gray-500">Litera</p>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              {analysis.sentenceCount}
                            </p>
                            <p className="text-xs text-gray-500">Fehezanteny</p>
                          </div>
                          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {analysis.syllableCount}
                            </p>
                            <p className="text-xs text-gray-500">Vaninteny</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Fehintsoratra
                              </span>
                              <span className="font-semibold">
                                {analysis.paragraphCount}
                              </span>
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Teny tsy miverina
                              </span>
                              <span className="font-semibold">
                                {analysis.uniqueWords}
                              </span>
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 col-span-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Fotoana famakiana
                              </span>
                              <span className="font-semibold flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {analysis.readingTime}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fihetseham-po */}
                    {activeTab === "sentiment" && (
                      <div className="space-y-4">
                        <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl">
                          <span className="text-6xl">
                            {analysis.sentiment.emoji}
                          </span>
                          <p
                            className={`text-xl font-bold mt-2 capitalize ${
                              analysis.sentiment.label === "positive"
                                ? "text-green-600"
                                : analysis.sentiment.label === "negative"
                                  ? "text-red-600"
                                  : "text-gray-600"
                            }`}
                          >
                            {analysis.sentiment.label === "positive"
                              ? "Tsara"
                              : analysis.sentiment.label === "negative"
                                ? "Ratsy"
                                : "Tsy miandany"}
                          </p>
                          <div className="mt-3">
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  analysis.sentiment.score > 0
                                    ? "bg-green-500"
                                    : analysis.sentiment.score < 0
                                      ? "bg-red-500"
                                      : "bg-gray-500"
                                }`}
                                style={{
                                  width: `${(analysis.sentiment.score + 1) * 50}%`,
                                }}
                              />
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                              {analysis.sentiment.score > 0 ? "+" : ""}
                              {Math.round(analysis.sentiment.score * 100)}%
                              fihetseham-po
                            </p>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                            {analysis.sentiment.description}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Teny fototra */}
                    {activeTab === "keywords" && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {analysis.keywords.map((kw, i) => (
                            <div
                              key={i}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 
                                       dark:from-emerald-950/30 dark:to-teal-950/30 rounded-lg"
                            >
                              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                {kw.word}
                              </span>
                              <span className="text-xs text-gray-500">
                                {kw.count} x
                              </span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() =>
                            handleCopySection(
                              "keywords",
                              analysis.keywords.map((k) => k.word).join(", "),
                            )
                          }
                          className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-2"
                        >
                          {copiedSection === "keywords" ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          Adika ny teny fototra
                        </button>
                      </div>
                    )}

                    {/* Soso-kevitra */}
                    {activeTab === "suggestions" && (
                      <div className="space-y-3">
                        <ul className="space-y-2">
                          {analysis.suggestions.map((s, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg"
                            >
                              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {s}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={() =>
                            handleCopySection(
                              "suggestions",
                              analysis.suggestions.join("\n"),
                            )
                          }
                          className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                        >
                          {copiedSection === "suggestions" ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          Adika ny soso-kevitra
                        </button>
                      </div>
                    )}

                    {/* Olana */}
                    {activeTab === "errors" && (
                      <div className="space-y-3">
                        {analysis.errors.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-amber-600 mb-2">
                              ⚠️ Olana fonotaktika
                            </p>
                            {analysis.errors.map((e, i) => (
                              <div
                                key={i}
                                className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg mb-2"
                              >
                                <p className="font-medium text-amber-800 dark:text-amber-400">
                                  {e.word}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {e.description}:{" "}
                                  <span className="font-mono">{e.pattern}</span>{" "}
                                  → {e.suggestion}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        {analysis.grammarIssues.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-red-600 mb-2">
                              📝 Olana amin'ny fitsipi-pitenenana
                            </p>
                            {analysis.grammarIssues.map((g, i) => (
                              <div
                                key={i}
                                className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg"
                              >
                                <p className="text-sm">{g.text}</p>
                                <p className="text-xs text-green-600 mt-1">
                                  → {g.suggestion}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {g.type}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        {analysis.errors.length === 0 &&
                          analysis.grammarIssues.length === 0 && (
                            <div className="text-center p-6">
                              <Shield className="h-12 w-12 text-green-500 mx-auto mb-2" />
                              <p className="text-gray-600 dark:text-gray-400">
                                Tsy misy olana hita !
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Tsara ny fanoratanao
                              </p>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                <BookOpen className="h-3 w-3" />
                Fanamarinana ny lahatsoratra • Fandikana ny teny • Famakafakana
                ny rafitra
                <Eye className="h-3 w-3 ml-1" />
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
