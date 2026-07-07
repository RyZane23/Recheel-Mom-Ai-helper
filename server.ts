import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini API client
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })
    : null;

  // API endpoint to generate tasks
  app.post("/api/generate-tasks", async (req, res) => {
    try {
      const { availableTime, energyLevel, householdPriority, timeOfDay, isWorkingMom, toddlerMood, isEmergency, customPrompt } = req.body;

      if (!availableTime || !energyLevel || !householdPriority) {
        return res.status(400).json({ error: "Missing required inputs." });
      }

      if (!ai) {
        return res.status(500).json({
          error: "Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.",
        });
      }

      const defaultSystemInstruction = `You are a highly supportive, empathetic, and non-judgmental productivity architect for busy parents of toddlers. Your goal is to guide a parent (often a mother) through managing their limited time during different periods of the day.

You will receive the following inputs:
1. Available Time: ${availableTime}
2. Energy Level: ${energyLevel}
3. Household Priority: ${householdPriority}
4. Time of Day: ${timeOfDay || "Morning"}
5. Working Mom Mode: ${isWorkingMom ? "Enabled" : "Disabled"} (If Enabled, suggest chores that are easy to multitask or do quietly in the background while working or on calls)
6. Toddler Mood / Kids' Status: ${toddlerMood || "Independent playing"} (If "Independent playing", suggest tasks while the child is occupied. If "Needs Mommy", suggest safe chores that can be done while holding the toddler or keeping them directly involved. If "Just Me Today / No Kids Around", suggest focused adult tasks or deeper self-care without child-inclusion constraints, and use the inclusion tip to suggest a way to savor the personal time or practice self-compassion)
7. Emergency Mode: ${isEmergency ? "ACTIVE" : "INACTIVE"}

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

      // Use either the custom system prompt provided by the user (playground mode) or the default
      const systemInstruction = customPrompt || defaultSystemInstruction;

      const promptText = isEmergency
        ? `EMERGENCY IS ACTIVE! Quick 2-minute save task needed.
- Energy Level: ${energyLevel}
- Toddler Mood: ${toddlerMood || "Independent playing"}
- Time of Day: ${timeOfDay || "Morning"}`
        : `Generate the structured parent productivity response for the following inputs:
- Available Time: ${availableTime}
- Energy Level: ${energyLevel}
- Household Priority: ${householdPriority}
- Time of Day: ${timeOfDay || "Morning"}
- Working Mom Mode: ${isWorkingMom ? "Enabled" : "Disabled"}
- Toddler Mood: ${toddlerMood || "Independent playing"}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              supportiveMessage: {
                type: Type.STRING,
                description: "Warm, deeply empathetic, and validating opening message custom to the parent's current energy state and priority.",
              },
              tasks: {
                type: Type.ARRAY,
                description: "Exactly 3 actionable, realistic tasks that fit the criteria.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING, description: "A friendly, actionable task title." },
                    description: { type: Type.STRING, description: "Supportive description of what to do and how it helps." },
                    duration: { type: Type.STRING, description: "Approximate time needed (e.g., '5-10 mins')." },
                    toddlerInclusion: { type: Type.STRING, description: "A creative, safe, and actionable way to keep the toddler included, supervised, or engaged." },
                  },
                  required: ["id", "title", "description", "duration", "toddlerInclusion"],
                },
              },
              encouragingClosing: {
                type: Type.STRING,
                description: "A short, uplifting, and non-judgmental closing sentence.",
              },
            },
            required: ["supportiveMessage", "tasks", "encouragingClosing"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response text from Gemini API.");
      }

      const parsedData = JSON.parse(responseText);
      res.json(parsedData);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate tasks." });
    }
  });

  // Serve static files in production / Vite in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
