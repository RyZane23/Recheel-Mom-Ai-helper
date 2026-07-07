import React, { useState, useEffect } from "react";
import { 
  Clock, 
  Zap, 
  Baby, 
  Sparkles, 
  Heart, 
  Copy, 
  Check, 
  History, 
  FileCode, 
  Coffee, 
  Info, 
  RefreshCw, 
  Flame, 
  CheckCircle2, 
  ChevronRight,
  Smile,
  Bookmark,
  Trash2,
  Lock,
  Calendar,
  Sunrise,
  Sun,
  Moon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Task {
  id: string;
  title: string;
  description: string;
  duration: string;
  toddlerInclusion: string;
}

interface PrioritizerResponse {
  supportiveMessage: string;
  tasks: Task[];
  encouragingClosing: string;
}

interface SavedSession {
  id: string;
  timestamp: string;
  availableTime: string;
  energyLevel: string;
  householdPriority: string;
  timeOfDay: string;
  isWorkingMom?: boolean;
  toddlerMood?: string;
  supportiveMessage: string;
  tasks: (Task & { completed: boolean })[];
  encouragingClosing: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are a highly supportive, empathetic, and non-judgmental productivity architect for busy parents of toddlers. Your goal is to guide a parent (often a mother) through managing their limited time during different periods of the day.

You will receive the following inputs:
1. Available Time: {availableTime}
2. Energy Level: {energyLevel}
3. Household Priority: {householdPriority}
4. Time of Day: {timeOfDay}
5. Working Mom Mode: {isWorkingMom}
6. Toddler Mood: {toddlerMood}
7. Emergency Mode: {isEmergency}

Your response must be structured, friendly, and empowering.

IF EMERGENCY MODE IS ACTIVE:
- Do NOT generate 3 tasks. Generate exactly 1 extremely fast 2-minute task to get a sudden mess under control.
- In the "supportiveMessage", provide a gentle, calming affirmation to help the mother breathe and calm down.
- In the "tasks" array, provide exactly 1 task with a 2-minute duration.
- Keep the encouraging closing brief and sweet.

IF EMERGENCY MODE IS INACTIVE:
- Generate exactly 3 actionable, specific tasks. Each task should have a clear Title, a supportive description fitting the requested energy, a realistic duration breakdown, and a practical 'Toddler Inclusion' tip explaining how the toddler can safely participate, watch, or play alongside.
- CRITICAL DIRECTIVES FOR TIME OF DAY:
  - If the Time of Day is "Morning", one of the 3 tasks MUST be "Preparing meals/lunchboxes for kids going to school". Make sure to write this custom to the requested Energy Level (e.g. if energy is low, keep it incredibly simple like pre-packaged foods or easy-assembly wraps, with a toddler inclusion strategy to make it fun).
  - If the Time of Day is "Afternoon", focus on midday calibration, simple post-school cleanup, folding small items, or organizing toy drawers with toddler helper ideas.
  - If the Time of Day is "Evening", focus on peaceful evening wind-down, simple kitchen sweep, bedside prep, or layout of school gears for tomorrow.
- CRITICAL DIRECTIVES FOR MOM CARE (Morning & Evening):
  - If the Time of Day is "Morning" or "Evening", one of the 3 tasks (or an additional, but keep total exactly 3, so replacing one or making one of them be) MUST be a simple 'Mom Care' task (like drinking water, taking 3 deep breaths, or stretching) custom to the current energy state.

Use a supportive, validating, and non-judgmental tone. Validating the parent's current energy state is critical.`;

const LOADING_MESSAGES = [
  "Pouring a virtual cup of hot coffee for you...",
  "Scouting out toddler-friendly, non-hazardous activities...",
  "Checking the household priority map...",
  "Calibrating gentle productivity tasks for your energy level...",
  "Drafting safe 'Toddler Inclusion' ideas...",
  "Assembling an artistic, judgment-free mom-centric blueprint..."
];

export default function App() {
  // Inputs
  const [timeOfDay, setTimeOfDay] = useState<string>("Morning");
  const [availableTime, setAvailableTime] = useState<string>("30 minutes");
  const [energyLevel, setEnergyLevel] = useState<string>("Taking it one step at a time");
  const [householdPriority, setHouseholdPriority] = useState<string>("Only the Essentials");
  const [isWorkingMom, setIsWorkingMom] = useState<boolean>(false);
  const [toddlerMood, setToddlerMood] = useState<string>("Independent playing");
  
  // Custom prompt edit
  const [customPrompt, setCustomPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);
  const [isEditingPrompt, setIsEditingPrompt] = useState<boolean>(false);
  const [showCopySuccess, setShowCopySuccess] = useState<boolean>(false);
  
  // App state
  const [activeTab, setActiveTab] = useState<"agenda" | "prompt" | "history">("agenda");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  // Results
  const [currentAgenda, setCurrentAgenda] = useState<PrioritizerResponse | null>(null);
  const [taskCompletion, setTaskCompletion] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<SavedSession[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Time formatter for the aesthetic header
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("naptime_wins_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load history from local storage", e);
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (agenda: PrioritizerResponse) => {
    try {
      const newSession: SavedSession = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        availableTime,
        energyLevel,
        householdPriority,
        timeOfDay,
        isWorkingMom,
        toddlerMood,
        supportiveMessage: agenda.supportiveMessage,
        tasks: agenda.tasks.map(t => ({ ...t, completed: false })),
        encouragingClosing: agenda.encouragingClosing
      };

      const updated = [newSession, ...history].slice(0, 20); // Keep last 20
      setHistory(updated);
      localStorage.setItem("naptime_wins_history", JSON.stringify(updated));
      showToast("🌸 Agenda saved to your Wins History!");
    } catch (e) {
      console.error("Failed to save history", e);
    }
  };

  // Toggle complete state on current agenda task
  const toggleTask = (taskId: string) => {
    setTaskCompletion(prev => {
      const updated = { ...prev, [taskId]: !prev[taskId] };
      // If all three completed, show a fun message
      const totalTasks = currentAgenda?.tasks.length || 0;
      const completedCount = Object.values(updated).filter(Boolean).length;
      if (completedCount === totalTasks && totalTasks > 0) {
        showToast("✨ Beautiful effort! You completed your agenda! ❤️");
      }
      return updated;
    });
  };

  // Toggle task on a historical session
  const toggleHistoryTask = (sessionId: string, taskId: string) => {
    const updatedHistory = history.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          tasks: session.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
        };
      }
      return session;
    });
    setHistory(updatedHistory);
    localStorage.setItem("naptime_wins_history", JSON.stringify(updatedHistory));
  };

  // Delete history item
  const deleteHistorySession = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem("naptime_wins_history", JSON.stringify(updated));
    showToast("🗑️ Session deleted.");
  };

  // Show quick toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Handle Loading Messages Interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Handle Form Submit (Gemini API Call)
  const handleGenerate = async (e?: React.FormEvent, isEmergencyMode: boolean = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setTaskCompletion({});
    setLoadingMessageIndex(0);

    const actualAvailableTime = isEmergencyMode ? "2 minutes" : availableTime;
    const actualPriority = isEmergencyMode ? "Emergency Overwhelm" : householdPriority;

    // Format the prompt with inputs
    const formattedPrompt = customPrompt
      .replace("{availableTime}", actualAvailableTime)
      .replace("{energyLevel}", energyLevel)
      .replace("{householdPriority}", actualPriority)
      .replace("{timeOfDay}", timeOfDay)
      .replace("{isWorkingMom}", isWorkingMom ? "Enabled" : "Disabled")
      .replace("{toddlerMood}", toddlerMood)
      .replace("{isEmergency}", isEmergencyMode ? "ACTIVE" : "INACTIVE");

    try {
      const response = await fetch("/api/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availableTime: actualAvailableTime,
          energyLevel,
          householdPriority: actualPriority,
          timeOfDay,
          isWorkingMom,
          toddlerMood,
          isEmergency: isEmergencyMode,
          customPrompt: formattedPrompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "An error occurred while generating your agenda.");
      }

      const data: PrioritizerResponse = await response.json();
      setCurrentAgenda(data);
      setActiveTab("agenda");
      saveToHistory(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Please check your API key config and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(customPrompt);
    setShowCopySuccess(true);
    setTimeout(() => setShowCopySuccess(false), 2000);
    showToast("📋 System prompt copied to clipboard!");
  };

  const handleResetPrompt = () => {
    setCustomPrompt(DEFAULT_SYSTEM_PROMPT);
    showToast("🔄 Prompt reset to default layout.");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#4a4a3a] font-serif antialiased selection:bg-[#5A5A40]/10 flex flex-col">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#5A5A40] text-[#f5f5f0] px-6 py-3 rounded-full shadow-lg flex items-center gap-3 text-sm font-sans font-semibold border border-[#4a4a3a]/15"
            id="toast-notification"
          >
            <Sparkles className="w-4 h-4 text-[#d4a373] animate-pulse" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative top border */}
      <div className="h-1.5 bg-[#5A5A40]"></div>

      {/* Header Section */}
      <header className="py-8 px-6 md:px-12 max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#e5e5df]">
        <div>
          <h1 className="text-4xl md:text-5xl font-light italic text-[#5A5A40] tracking-tight flex items-center gap-2">
            Recheel AI Helper for Moms
          </h1>
          <p className="text-xs uppercase tracking-widest text-[#7a7a6a] mt-2 font-sans font-bold flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#d4a373]"></span>
            Supportive Productivity for Parenthood
          </p>
        </div>
        
        <div className="flex flex-col md:items-end gap-3.5">
          <div className="text-left md:text-right font-sans">
            <div className="text-xs uppercase tracking-widest text-[#7a7a6a] font-bold">Status: Rest & Calibrate</div>
            <div className="text-lg text-[#5A5A40] font-light flex items-center gap-1.5 justify-end mt-0.5">
              <Clock className="w-4 h-4 text-[#d4a373]" />
              {currentTime || "02:14 PM"}
            </div>
          </div>

          {/* Navigation Tab buttons with Artistic Flair design */}
          <div className="flex bg-[#e5e5df]/60 p-1 rounded-full font-sans text-xs">
            <button
              onClick={() => setActiveTab("agenda")}
              className={`px-4 py-2 font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                activeTab === "agenda"
                  ? "bg-[#5A5A40] text-white shadow-xs"
                  : "text-[#4a4a3a] hover:text-[#5A5A40]"
              }`}
              id="tab-agenda"
            >
              <Smile className="w-3.5 h-3.5" />
              Mom Agenda
            </button>
            <button
              onClick={() => setActiveTab("prompt")}
              className={`px-4 py-2 font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                activeTab === "prompt"
                  ? "bg-[#5A5A40] text-white shadow-xs"
                  : "text-[#4a4a3a] hover:text-[#5A5A40]"
              }`}
              id="tab-prompt"
            >
              <FileCode className="w-3.5 h-3.5" />
              Prompt Architect
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-[#5A5A40] text-white shadow-xs"
                  : "text-[#4a4a3a] hover:text-[#5A5A40]"
              }`}
              id="tab-history"
            >
              <History className="w-3.5 h-3.5" />
              My Wins ({history.length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Sidebar Inputs */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Period of Day */}
          <div className="bg-white rounded-[32px] p-6 shadow-xs border border-[#e5e5df] flex flex-col">
            <label className="block text-xs uppercase tracking-wider mb-4 font-bold font-sans text-[#7a7a6a]">
              Period of Day
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "Morning", label: "Morning", icon: Sunrise, color: "text-amber-500" },
                { value: "Afternoon", label: "Afternoon", icon: Sun, color: "text-orange-500" },
                { value: "Evening", label: "Evening", icon: Moon, color: "text-indigo-500" },
              ].map((item) => {
                const IconComponent = item.icon;
                const isSelected = timeOfDay === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTimeOfDay(item.value)}
                    className={`py-3.5 px-1 rounded-2xl text-[11px] font-sans font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? "bg-[#5A5A40] text-white shadow-xs border border-[#5A5A40]"
                        : "border border-[#e5e5df] text-[#4a4a3a] bg-transparent hover:bg-[#5A5A40]/5"
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isSelected ? "text-white" : item.color}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            {timeOfDay === "Morning" && (
              <p className="mt-2.5 text-[10px] text-[#7a7a6a] italic leading-tight text-center">
                ✨ Includes school meal preparation for kids!
              </p>
            )}
          </div>

          {/* 1. Available Time */}
          <div className="bg-white rounded-[32px] p-6 shadow-xs border border-[#e5e5df] flex flex-col">
            <label className="block text-xs uppercase tracking-wider mb-4 font-bold font-sans text-[#7a7a6a]">
              Available Time
            </label>
            <div className="flex gap-2">
              {[
                { value: "15 minutes", label: "15m" },
                { value: "30 minutes", label: "30m" },
                { value: "1 hour", label: "60m" },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setAvailableTime(t.value)}
                  className={`flex-1 py-3 rounded-full text-xs font-sans font-bold transition-all ${
                    availableTime === t.value
                      ? "bg-[#5A5A40] text-white shadow-xs"
                      : "border border-[#5A5A40] text-[#5A5A40] bg-transparent hover:bg-[#5A5A40]/5"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Energy Level */}
          <div className="bg-white rounded-[32px] p-6 shadow-xs border border-[#e5e5df]">
            <label className="block text-xs uppercase tracking-wider mb-4 font-bold font-sans text-[#7a7a6a]">
              Energy Level
            </label>
            <div className="flex flex-col gap-2.5">
              {[
                { value: "I've got this!", label: "I've got this!", dotClass: "bg-green-400" },
                { value: "Taking it one step at a time", label: "Taking it one step at a time", dotClass: "bg-yellow-400" },
                { value: "Running on empty, need a soft landing", label: "Running on empty, need a soft landing", dotClass: "bg-red-400" },
              ].map((e) => {
                const isSelected = energyLevel === e.value;
                return (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEnergyLevel(e.value)}
                    className={`w-full py-3 px-4 rounded-xl text-left text-xs font-sans transition-all flex justify-between items-center ${
                      isSelected
                        ? "bg-[#f5f5f0] border-2 border-[#5A5A40] text-[#4a4a3a] font-bold"
                        : "border border-[#e5e5df] text-[#4a4a3a] opacity-80 hover:opacity-100 bg-white"
                    }`}
                  >
                    <span>{e.label}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${e.dotClass} shadow-xs`}></span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Working Mom Mode */}
          <div className="bg-white rounded-[32px] p-6 shadow-xs border border-[#e5e5df] flex flex-col gap-2">
            <label className="block text-xs uppercase tracking-wider font-bold font-sans text-[#7a7a6a]">
              Working Mom Mode
            </label>
            <div className="flex items-start gap-3 mt-1.5">
              <input
                type="checkbox"
                id="working-mom-mode"
                checked={isWorkingMom}
                onChange={(e) => setIsWorkingMom(e.target.checked)}
                className="w-4.5 h-4.5 text-[#5A5A40] border-[#e5e5df] rounded-sm focus:ring-[#5A5A40] shrink-0 mt-0.5"
              />
              <label htmlFor="working-mom-mode" className="text-xs font-sans text-[#6a6a5a] leading-tight cursor-pointer">
                Focus on chores that are easy to multitask or do quietly in the background while working or on calls.
              </label>
            </div>
          </div>

          {/* 5. Kids' Status Selector */}
          <div className="bg-white rounded-[32px] p-6 shadow-xs border border-[#e5e5df] flex flex-col">
            <label className="block text-xs uppercase tracking-wider mb-4 font-bold font-sans text-[#7a7a6a]">
              Kids' Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "Independent playing", label: "Independent", icon: Baby, description: "Child is occupied" },
                { value: "Needs Mommy", label: "Needs Mommy", icon: Heart, description: "Holding / involving" },
                { value: "Just Me Today / No Kids Around", label: "Just Me", icon: Coffee, description: "No kids around" },
              ].map((item) => {
                const IconComponent = item.icon;
                const isSelected = toddlerMood === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setToddlerMood(item.value)}
                    className={`py-3 px-1 rounded-2xl text-[10px] sm:text-[11px] font-sans font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? "bg-[#5A5A40] text-white shadow-xs border border-[#5A5A40]"
                        : "border border-[#e5e5df] text-[#4a4a3a] bg-transparent hover:bg-[#5A5A40]/5"
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isSelected ? "text-white" : "text-[#d4a373]"}`} />
                    <span>{item.label}</span>
                    <span className="text-[8px] opacity-70 font-normal leading-none text-center">{item.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Household Priority (Styled beautifully as the dark accent block from Artistic Flair) */}
          <div className="bg-[#5A5A40] text-white rounded-[32px] p-6 shadow-md flex flex-col justify-between">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-3 font-sans font-bold opacity-80">
                Household Priority
              </label>
              <div className="relative">
                <select
                  value={householdPriority}
                  onChange={(e) => setHouseholdPriority(e.target.value)}
                  className="w-full bg-transparent border-b border-white/30 py-3 focus:outline-none italic text-lg text-white font-serif appearance-none cursor-pointer"
                  style={{ backgroundImage: "none" }}
                >
                  <option value="Just Need Breathing Room" className="text-[#4a4a3a]">Just Need Breathing Room</option>
                  <option value="Only the Essentials" className="text-[#4a4a3a]">Only the Essentials</option>
                  <option value="Kid-Friendly Tidy" className="text-[#4a4a3a]">Kid-Friendly Tidy</option>
                  <option value="Quick Reset" className="text-[#4a4a3a]">Quick Reset</option>
                  <option value="Deep Dive" className="text-[#4a4a3a]">Deep Dive</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/70">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={loading}
              className="mt-8 w-full bg-white text-[#5A5A40] hover:bg-[#f5f5f0] py-4 rounded-full font-sans font-bold text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2"
              id="btn-generate-agenda"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#d4a373] fill-current" />
                  Generate My Plan
                </>
              )}
            </button>
          </div>

          {/* Emergency Section */}
          <div className="bg-rose-50/50 rounded-[32px] p-6 shadow-xs border border-rose-100 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500 animate-pulse shrink-0" />
              <div>
                <h4 className="text-xs font-bold font-sans text-rose-800 uppercase tracking-wider">Overwhelmed?</h4>
                <p className="text-[10px] font-sans text-rose-600 leading-tight">Get a quick, single 2-min task and calming affirmation.</p>
              </div>
            </div>
            <button
              onClick={() => handleGenerate(undefined, true)}
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-full font-sans font-bold text-xs uppercase tracking-widest shadow-sm transition-all flex items-center justify-center gap-2"
              id="btn-emergency-quick-save"
            >
              Emergency Quick Save
            </button>
          </div>

          {/* Quick architectural guidance tip */}
          <div className="p-5 border border-[#e5e5df] rounded-[24px] bg-[#f9f9f5] flex gap-3.5">
            <Info className="w-5 h-5 text-[#d4a373] shrink-0 mt-0.5" />
            <div className="font-sans text-[11px] text-[#7a7a6a] leading-relaxed">
              <h4 className="font-bold text-[#4a4a3a] mb-0.5">Product Architect Notice</h4>
              This interface serves as a visual playground and prompt compiler. View the exact structured response instructions being passed to Gemini 3.5 in the <strong className="text-[#5A5A40]">Prompt Architect</strong> tab.
            </div>
          </div>

        </aside>

        {/* Results & Main Content Area */}
        <section className="lg:col-span-8 flex flex-col">
          <div className="bg-white rounded-[40px] p-8 md:p-10 shadow-xs border border-[#e5e5df] flex-1 flex flex-col">
            
            <AnimatePresence mode="wait">

              {/* LOADING VIEW */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center py-16"
                  id="loading-container"
                >
                  <div className="w-16 h-16 rounded-full border-4 border-[#5A5A40] border-t-transparent animate-spin mb-6"></div>
                  <h3 className="text-xl italic font-light mb-2">Designing Your Gentle Workspace</h3>
                  
                  <div className="h-6 overflow-hidden max-w-md mx-auto">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={loadingMessageIndex}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="text-xs text-[#7a7a6a] italic font-serif"
                      >
                        {LOADING_MESSAGES[loadingMessageIndex]}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  
                  <div className="text-[10px] uppercase font-sans tracking-widest text-[#7a7a6a] bg-[#f5f5f0] py-1 px-3.5 rounded-full border border-[#e5e5df] mt-8">
                    {availableTime} • {energyLevel} Energy • {householdPriority}
                  </div>
                </motion.div>
              )}

              {/* ERROR VIEW */}
              {!loading && error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col items-center justify-center text-center py-12"
                >
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-xl font-bold mb-4 border border-red-200">
                    ⚠️
                  </div>
                  <h3 className="text-lg font-bold text-red-800 font-sans mb-1">Could not connect to Gemini</h3>
                  <p className="text-xs text-red-600 max-w-md mx-auto leading-relaxed font-sans px-4">
                    {error}
                  </p>
                  <p className="text-[11px] text-[#7a7a6a] mt-4 font-sans">
                    Please make sure your <code className="bg-[#f5f5f0] p-1 rounded font-mono">GEMINI_API_KEY</code> is correctly entered in Secrets.
                  </p>
                  <button
                    onClick={() => handleGenerate()}
                    className="mt-6 px-5 py-2.5 bg-[#5A5A40] hover:bg-[#4a4a3a] text-white text-xs font-sans font-bold uppercase tracking-wider rounded-full shadow-md transition-all"
                  >
                    Try Re-generating
                  </button>
                </motion.div>
              )}

              {/* AGENDA VIEW */}
              {!loading && !error && activeTab === "agenda" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col justify-between"
                >
                  {currentAgenda ? (
                    <div className="flex-1 flex flex-col" id="generated-agenda-container">
                      
                      {/* Header with supportive opening */}
                      <div className="mb-8 border-b border-[#f0f0eb] pb-6">
                        <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-[#d4a373] block mb-2">
                          Your Supportive Plan
                        </span>
                        <h2 className="text-3xl font-light italic mb-2 text-[#5A5A40]">
                          You've got this, Mama.
                        </h2>
                        <p className="text-sm text-[#7a7a6a] leading-relaxed italic">
                          "{currentAgenda.supportiveMessage}"
                        </p>
                      </div>

                      {/* 3 Actionable Tasks */}
                      <div className="space-y-8 flex-1 mb-8">
                        {currentAgenda.tasks.map((task, idx) => {
                          const isCompleted = taskCompletion[task.id] || false;
                          const formattedNum = String(idx + 1).padStart(2, '0');

                          return (
                            <div key={task.id || idx} className="flex gap-4 md:gap-6 group">
                              {/* Checkbox / Number circle */}
                              <button
                                type="button"
                                onClick={() => toggleTask(task.id)}
                                className={`w-10 h-10 rounded-full border flex items-center justify-center text-xs font-bold font-sans transition-all shrink-0 ${
                                  isCompleted
                                    ? "bg-[#5A5A40] border-[#5A5A40] text-white"
                                    : "border-[#5A5A40] text-[#5A5A40] bg-transparent hover:bg-[#5A5A40]/5"
                                }`}
                              >
                                {isCompleted ? <Check className="w-4 h-4 stroke-[2.5px]" /> : formattedNum}
                              </button>

                              {/* Task content */}
                              <div className="border-b border-[#f0f0eb] pb-6 flex-1">
                                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
                                  <h3 className={`text-base font-bold transition-all ${
                                    isCompleted ? "line-through text-[#7a7a6a] opacity-60" : "text-[#4a4a3a]"
                                  }`}>
                                    {task.title}
                                  </h3>
                                  <span className="text-[10px] font-sans font-bold bg-[#f5f5f0] text-[#7a7a6a] px-2.5 py-0.5 rounded-full border border-[#e5e5df]">
                                    {task.duration}
                                  </span>
                                </div>

                                <p className="text-xs md:text-sm text-[#6a6a5a] leading-relaxed mb-3.5 font-sans">
                                  {task.description}
                                </p>

                                {/* Toddler inclusion box with terracota color flair */}
                                <div className="bg-[#f9f9f5] p-3.5 rounded-2xl border-l-4 border-[#d4a373] flex items-start gap-3">
                                  <span className="text-xs font-sans font-black uppercase tracking-tighter text-[#d4a373] mt-0.5 whitespace-nowrap">
                                    Toddler Tip:
                                  </span>
                                  <p className="text-xs italic text-[#6a6a5a]">
                                    "{task.toddlerInclusion}"
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Encouraging Outro */}
                      <footer className="mt-auto pt-6 border-t border-[#f0f0eb] text-center">
                        <p className="text-xs italic opacity-80 text-[#5A5A40] font-medium">
                          "{currentAgenda.encouragingClosing}"
                        </p>
                      </footer>

                    </div>
                  ) : (
                    /* Initial Empty State styled like Artistic Flair template placeholder */
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                      <div className="w-16 h-16 rounded-full bg-[#f5f5f0] border border-[#e5e5df] flex items-center justify-center text-2xl mb-5 shadow-xs">
                        🧸
                      </div>
                      <h2 className="text-3xl font-light italic mb-2 text-[#5A5A40]">A Gentle Moment for You</h2>
                      <p className="text-sm text-[#7a7a6a] max-w-md mx-auto leading-relaxed italic mb-6">
                        Welcome, Mama. Take a breath. Choose how much time you have, your current physical energy, and what is pulling your focus right now. We will curate three gentle steps to fit your window.
                      </p>
                      
                      <div className="bg-[#f9f9f5] py-3.5 px-6 rounded-full border border-[#e5e5df] text-[11px] font-sans tracking-wide text-[#7a7a6a] max-w-lg mx-auto">
                        🌱 Matching real energy levels • Realistic household expectations • Built-in baby supervision play
                      </div>
                    </div>
                  )}

                </motion.div>
              )}

              {/* SYSTEM PROMPT ARCHITECT VIEW */}
              {!loading && !error && activeTab === "prompt" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col gap-6 font-sans text-xs"
                  id="prompt-architect-container"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f0f0eb] pb-4">
                    <div>
                      <h3 className="text-base font-bold text-[#5A5A40] flex items-center gap-1.5 font-serif italic">
                        App System Prompt Blueprint
                      </h3>
                      <p className="text-[11px] text-[#7a7a6a] mt-0.5">
                        Inspect, customize, and save the core generation engine prompt instructions.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleResetPrompt}
                        className="px-3 py-1.5 border border-[#e5e5df] hover:bg-[#f5f5f0] text-[11px] font-bold rounded-full flex items-center gap-1.5 transition-all text-[#7a7a6a]"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Reset Default
                      </button>
                      <button
                        onClick={handleCopyPrompt}
                        className="px-4 py-1.5 bg-[#5A5A40] hover:bg-[#4a4a3a] text-white text-[11px] font-bold rounded-full flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        {showCopySuccess ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy Prompt Code
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Feature description blocks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#f9f9f5] rounded-2xl p-4 border border-[#e5e5df]">
                      <h4 className="font-bold text-[#5A5A40] mb-1.5 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                        <span className="w-2 h-2 rounded-full bg-[#d4a373]"></span>
                        Architect Key Features:
                      </h4>
                      <ul className="text-[11px] text-[#7a7a6a] space-y-1.5 list-disc list-inside leading-relaxed">
                        <li><strong>Energy Level Matching:</strong> Avoids high-exertion tasks when energy is marked as Low.</li>
                        <li><strong>Structured Outputs:</strong> Uses strict client schema definitions on the server side to guarantee formatted bullet results.</li>
                      </ul>
                    </div>

                    <div className="bg-[#f9f9f5] rounded-2xl p-4 border border-[#e5e5df]">
                      <h4 className="font-bold text-[#5A5A40] mb-1.5 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        Supervised Play Focus:
                      </h4>
                      <p className="text-[11px] text-[#7a7a6a] leading-relaxed">
                        Rather than pretending the parent is isolated, we mandate toddler inclusion tips in our prompt engineering blueprint to maintain safety and ease cognitive load.
                      </p>
                    </div>
                  </div>

                  {/* System Prompt Code Box */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#7a7a6a]">
                        Prompt Instruction Code Template
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                        className="text-[11px] text-[#5A5A40] font-bold hover:underline"
                      >
                        {isEditingPrompt ? "Disable Edit Mode" : "Enable Manual Edit"}
                      </button>
                    </div>

                    <div className="relative">
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        readOnly={!isEditingPrompt}
                        rows={10}
                        className={`w-full p-4 rounded-2xl font-mono text-xs border leading-relaxed ${
                          isEditingPrompt
                            ? "bg-white border-2 border-[#5A5A40] focus:ring-0 outline-hidden"
                            : "bg-[#f5f5f0] border-[#e5e5df] text-[#6a6a5a] cursor-not-allowed"
                        }`}
                      />
                      {!isEditingPrompt && (
                        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded bg-[#e5e5df] border border-[#d2d2c8] text-[9px] font-bold text-[#6a6a5a] flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          Template Mode
                        </div>
                      )}
                    </div>
                    {isEditingPrompt && (
                      <p className="text-[10px] text-orange-600 mt-2 italic font-sans">
                        ⚠️ Playground Mode is on: Changes made here will instantly feed into the Gemini 3.5 request configuration. Keep <code>{"{availableTime}"}</code>, <code>{"{energyLevel}"}</code>, <code>{"{householdPriority}"}</code> and <code>{"{timeOfDay}"}</code> inside.
                      </p>
                    )}
                  </div>

                  {/* Structuring Response Schema Preview */}
                  <div className="border-t border-[#f0f0eb] pt-4">
                    <h4 className="font-bold text-[#4a4a3a] mb-2 font-serif italic text-sm">
                      Structured Schema Definition (Server-Side Schema)
                    </h4>
                    <p className="text-[11px] text-[#7a7a6a] mb-3 leading-relaxed">
                      We configure Gemini using the official <code className="bg-[#f5f5f0] p-0.5 rounded font-mono">Type.OBJECT</code> mapping structure to receive consistent schema objects:
                    </p>
                    <pre className="p-4 bg-[#4a4a3a] text-[#f5f5f0] rounded-2xl font-mono text-[10px] overflow-x-auto leading-relaxed shadow-sm">
{`{
  type: Type.OBJECT,
  properties: {
    supportiveMessage: { type: Type.STRING },
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          duration: { type: Type.STRING },
          toddlerInclusion: { type: Type.STRING }
        },
        required: ["id", "title", "description", "duration", "toddlerInclusion"]
      }
    },
    encouragingClosing: { type: Type.STRING }
  },
  required: ["supportiveMessage", "tasks", "encouragingClosing"]
}`}
                    </pre>
                  </div>
                </motion.div>
              )}

              {/* HISTORY / WINS VIEW */}
              {!loading && !error && activeTab === "history" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col gap-6 font-sans"
                  id="wins-history-container"
                >
                  <div className="flex items-center justify-between border-b border-[#f0f0eb] pb-4 mb-2">
                    <div>
                      <h3 className="text-base font-bold text-[#5A5A40] flex items-center gap-1.5 font-serif italic">
                        Your Parenting Wins History
                      </h3>
                      <p className="text-[11px] text-[#7a7a6a] mt-0.5">
                        Track past nap plans and celebrate completed moments.
                      </p>
                    </div>

                    {history.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to clear your entire history?")) {
                            setHistory([]);
                            localStorage.removeItem("naptime_wins_history");
                            showToast("🗑️ History cleared.");
                          }
                        }}
                        className="px-3 py-1.5 text-red-600 hover:bg-red-50 text-[10px] font-bold rounded-full border border-red-100 transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear All History
                      </button>
                    )}
                  </div>

                  {history.length === 0 ? (
                    <div className="text-center py-16 flex flex-col items-center justify-center">
                      <span className="text-3xl mb-3">🌸</span>
                      <h4 className="text-xs font-bold text-[#4a4a3a] mb-1 font-serif italic">No Past Plans Yet</h4>
                      <p className="text-[11px] text-[#7a7a6a] max-w-xs leading-relaxed">
                        Plans you build will automatically persist right here, letting you cross off tasks even if you close this browser window.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {history.map((session) => {
                        const total = session.tasks.length;
                        const completed = session.tasks.filter(t => t.completed).length;
                        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                        return (
                          <div key={session.id} className="border border-[#e5e5df] rounded-[24px] p-5 bg-[#f9f9f5] hover:bg-white transition-all shadow-xs">
                            
                            {/* History Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 pb-3 border-b border-[#e5e5df]">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold bg-[#5A5A40] text-white px-2.5 py-0.5 rounded-full">
                                  {session.timestamp}
                                </span>
                                <span className="text-[10px] text-[#7a7a6a]">
                                  ({session.timeOfDay || "Morning"} • {session.availableTime} • {session.energyLevel} Energy)
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-[#e5e5df] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#5A5A40]" style={{ width: `${pct}%` }}></div>
                                  </div>
                                  <span className="text-[10px] font-bold text-[#5A5A40]">{completed}/{total} Done</span>
                                </div>

                                <button
                                  onClick={() => deleteHistorySession(session.id)}
                                  className="text-[#7a7a6a] hover:text-red-500 transition-all p-1"
                                  title="Delete session"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <p className="text-[11px] text-[#6a6a5a] italic mb-4 font-serif">
                              "{session.supportiveMessage}"
                            </p>

                            {/* Task details within the history session card */}
                            <div className="space-y-2.5">
                              {session.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className={`flex items-start gap-3 p-3 rounded-xl text-xs border transition-all ${
                                    task.completed
                                      ? "bg-[#f5f5f0]/50 border-[#e5e5df] opacity-75"
                                      : "bg-white border-[#e5e5df]"
                                  }`}
                                >
                                  <button
                                    onClick={() => toggleHistoryTask(session.id, task.id)}
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                      task.completed
                                        ? "bg-[#5A5A40] border-[#5A5A40] text-white"
                                        : "bg-transparent border-[#5A5A40]"
                                    }`}
                                  >
                                    {task.completed && <Check className="w-3 h-3 stroke-[3px]" />}
                                  </button>
                                  
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className={`font-bold text-[#4a4a3a] ${task.completed ? "line-through opacity-60" : ""}`}>
                                        {task.title}
                                      </span>
                                      <span className="text-[9px] font-bold text-[#d4a373]">{task.duration}</span>
                                    </div>
                                    <p className="text-[11px] text-[#7a7a6a] mt-0.5 leading-relaxed font-serif">
                                      {task.description}
                                    </p>
                                    <p className="text-[11px] text-[#5A5A40] mt-1.5 italic border-l-2 border-[#d4a373] pl-2">
                                      🧸 "{task.toddlerInclusion}"
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e5df] bg-[#FAF7F2]/40 py-8 text-center text-xs text-[#7a7a6a] mt-12 font-sans">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-[#d4a373] fill-current animate-pulse" />
            <span className="font-bold text-[#5A5A40] uppercase tracking-widest text-[10px]">Recheel AI Helper for Moms</span>
          </div>
          <p className="max-w-md mx-auto leading-relaxed text-[11px]">
            Designed with non-judgmental structures to validate parents during the demanding journey of toddler raising.
          </p>
          <p className="text-[10px] opacity-60 mt-2">
            Recheel Olanio Mag-ili's Workspace • Port 3000 Ingress Host
          </p>
        </div>
      </footer>
    </div>
  );
}
