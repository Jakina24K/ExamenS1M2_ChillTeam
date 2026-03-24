/**
 * Chatbot Component - AI Assistant for Editor
 * Provides real-time assistance, suggestions, and explanations in Malagasy
 */
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEditorStore } from "@/store/editorStore";
import { Loader2, Send, X, MessageSquare, Sparkles } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  suggestions?: string[];
}

interface ChatbotProps {
  onClose?: () => void;
  isMinimized?: boolean;
}

export function Chatbot({ onClose, isMinimized = false }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Salama! 👋 Izaho dia mpanampy AI. Afaka manampy anao hanatsara ny lahatsoratrao, manitsy ny hadisoana, manolotra fanatsarana, na mamaly ny fanontanianao momba ny teny malagasy aho.",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(!isMinimized);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { plainText, aiFeatures } = useEditorStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Simulate AI response - In production, this would call your backend API
      const botResponse = await generateBotResponse(inputMessage, plainText);
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Error generating response:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "Miala tsiny fa nisy hadisoana nitranga. Andramo indray azafady.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate AI response based on context
  const generateBotResponse = async (
    userInput: string,
    currentText: string,
  ): Promise<Message> => {
    const input = userInput.toLowerCase();
    const suggestions: string[] = [];

    // Simple rule-based responses - In production, this would be an LLM API call
    if (
      input.includes("corrige") ||
      input.includes("erreur") ||
      input.includes("fautes") ||
      input.includes("hadisoana") ||
      input.includes("fanitsiana")
    ) {
      return {
        id: Date.now().toString(),
        text: "Afaka manampy anao hanitsy ny hadisoana aho! Ireto misy soso-kevitra:\n\n• Jereo ny fifanarahàn'ny matoanteny\n• Ataovy azo antoka fa tsara ny fanoratana ny teny\n• Ampiasao ny fiasa fanitsiana tsipelina ao amin'ny menio",
        sender: "bot",
        timestamp: new Date(),
        suggestions: [
          "Hanitsy ny lahatsoratra",
          "Hanolotra fanatsarana",
          "Hamakafaka ny hadisoana",
        ],
      };
    }

    if (
      input.includes("améliore") ||
      input.includes("améliorer") ||
      input.includes("mieux") ||
      input.includes("fanatsarana") ||
      input.includes("hatsara") ||
      input.includes("tsara kokoa")
    ) {
      return {
        id: Date.now().toString(),
        text: "Mba hanatsarana ny lahatsoratrao:\n\n• Ampio antsipirihany bebe kokoa\n• Ovay ny firafitry ny fehezanteny\n• Mampiasà teny marina kokoa\n• Jereo ny firindran'ny hafatra",
        sender: "bot",
        timestamp: new Date(),
        suggestions: [
          "Hanova ny lahatsoratra",
          "Hampiana antsipirihany",
          "Hanatsotra",
        ],
      };
    }

    if (
      input.includes("statistiques") ||
      input.includes("stats") ||
      input.includes("statistika") ||
      input.includes("antontan'isa")
    ) {
      const wordCount = currentText
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
      const charCount = currentText.length;
      return {
        id: Date.now().toString(),
        text: `📊 Statistika ankehitriny:\n\n• Teny: ${wordCount}\n• Litera: ${charCount}\n• Halavan'ny teny antonony: ${(charCount / wordCount).toFixed(1)} litera\n\nTe hahazo soso-kevitra mifototra amin'ireo statistika ireo ve ianao?`,
        sender: "bot",
        timestamp: new Date(),
        suggestions: [
          "Soso-kevitra",
          "Tanjon'ny halavany",
          "Hanatsara ny famakiana",
        ],
      };
    }

    if (
      input.includes("salut") ||
      input.includes("bonjour") ||
      input.includes("hello") ||
      input.includes("manao ahoana") ||
      input.includes("salama")
    ) {
      return {
        id: Date.now().toString(),
        text: "Salama! Ahoana no ahafahako manampy anao amin'ny lahatsoratrao anio?",
        sender: "bot",
        timestamp: new Date(),
        suggestions: ["Hanitsy", "Hanatsara", "Hamakafaka"],
      };
    }

    if (
      input.includes("merci") ||
      input.includes("misaotra") ||
      input.includes("misaotra betsaka")
    ) {
      return {
        id: Date.now().toString(),
        text: "Misaotra indrindra! Aza misalasala manontany raha misy fanontaniana hafa.",
        sender: "bot",
        timestamp: new Date(),
      };
    }

    // Default response
    return {
      id: Date.now().toString(),
      text: `Azoko fa manontany ianao hoe: "${userInput}". Mba hanampiana anao tsara indrindra, afaka:\n\n• Manitsy ny hadisoana tsipelina\n• Manolotra fanatsarana fomba fiteny\n• Mamakafaka ny firafitry ny lahatsoratrao\n• Mamaly fanontaniana momba ny teny malagasy\n\nInona no tianao hatao?`,
      sender: "bot",
      timestamp: new Date(),
      suggestions: ["Hanitsy", "Hanatsara", "Hamakafaka", "Fanontaniana"],
    };
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 rounded-full w-12 h-12 shadow-lg bg-primary hover:bg-primary/90"
        size="icon"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[600px] shadow-xl flex flex-col z-50">
      {/* Header */}
      <CardHeader className="px-4 py-3 border-b flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-full">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-sm font-medium">Mpanampy AI</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      {/* Messages Area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.sender === "bot" && (
                    <Avatar className="h-6 w-6 mt-0.5">
                      <AvatarFallback className="text-xs">AI</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.text}
                    </p>
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {message.suggestions.map((suggestion, idx) => (
                          <Button
                            key={idx}
                            variant="secondary"
                            size="sm"
                            className="text-xs h-7 px-2.5"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                    <span className="text-xs opacity-70 mt-1.5 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t space-y-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Mametraha fanontaniana eto..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={isLoading}
            className="flex-1 h-9"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
            className="h-9 w-9"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          💡 Mametraha fanontaniana momba ny tsipelina, ny fitsipi-pitenenana,
          na angataho aho hanatsara ny lahatsoratrao
        </p>
      </div>
    </Card>
  );
}
