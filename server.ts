import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

  // Middlewares to parse JSON content
  app.use(express.json());

  // Google APIs CORS proxy endpoint
  app.all('/api/google-proxy', async (req, res) => {
    const targetUrl = req.headers['x-target-url'] as string;
    const method = req.method;
    console.log(`[PROXY START] ${method} -> ${targetUrl}`);

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.error('[PROXY ERROR] Missing Authorization header');
        return res.status(401).json({ error: 'Missing Authorization header.' });
      }

      if (!targetUrl) {
        console.error('[PROXY ERROR] Missing target URL');
        return res.status(400).json({ error: 'Missing target URL in X-Target-URL header.' });
      }

      // Enforce security by allowing only requests destined for Google APIs
      try {
        const parsedUrl = new URL(targetUrl);
        if (!parsedUrl.hostname.endsWith('.googleapis.com')) {
          console.error(`[PROXY ERROR] Restrict target host: ${parsedUrl.hostname}`);
          return res.status(400).json({ error: 'Proxying restricted to *.googleapis.com endpoints for security.' });
        }
      } catch (err) {
        console.error(`[PROXY ERROR] Invalid target URL: ${targetUrl}`);
        return res.status(400).json({ error: 'Invalid Google API target URL.' });
      }

      // Forward request to Google APIs
      const fetchHeaders: Record<string, string> = {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      };

      const fetchOptions: RequestInit = {
        method: req.method,
        headers: fetchHeaders,
        signal: AbortSignal.timeout(25000)
      };

      // Include body if not GET/HEAD
      if (method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      const responseStatus = response.status;
      const contentType = response.headers.get('content-type') || '';

      console.log(`[PROXY END] ${method} -> ${targetUrl} | Status: ${responseStatus} | Type: ${contentType}`);

      res.status(responseStatus);

      if (contentType.includes('application/json')) {
        const data = await response.json();
        return res.json(data);
      } else {
        const textData = await response.text();
        return res.send(textData);
      }
    } catch (error: any) {
      console.error(`[PROXY EXCEPTION] ${method} -> ${targetUrl}:`, error);
      return res.status(500).json({ error: error.message || 'Internal proxy routing exception.' });
    }
  });

  // API endpoint for generating or improving customer reviews using Gemini with robust offline fallbacks
  app.post('/api/suggest-seo-review', async (req, res) => {
    const { rating, currentComments } = req.body;
    const targetRating = rating || 5;
    const inputComments = currentComments ? currentComments.trim() : "";

    // Hardcoded high-quality offline fallbacks aligning perfectly with M&K content requirements
    const offlineFallbacks = [
      "M&K Used Auto Parts is absolute gold: they not only located a guaranteed, premium-quality used transmission for my car from their massive inventory of new and used parts, but their ASE-certified mechanics handled the tire installation and a perfect wheel alignment on-site. To top it off, I sold them my old junk vehicle through their seamless buy-back process, receiving an incredibly competitive cash offer, free towing, and zero hassle with the legal paperwork!",
      "I cannot recommend M&K Used Auto Parts enough! They have an unparalleled selection of premium new and used parts under strict guarantee for domestic and foreign vehicles, and their full-service shop with ASE-certified technicians did a flawless job installing my tires and performing a complex wheel alignment. Plus, their team made selling my unwanted junk car incredibly easy with convenient towing, high cash payout, and all legal paperwork fully managed.",
      "The service at M&K Used Auto Parts is truly top-tier; they provided an excellent guaranteed OEM engine for my truck and had their ASE-certified technician team handle the mechanical overhaul and tire installation flawlessly. They also offered me top cash with convenient towing and handled all legal paperwork to buy my old junk car, making M&K my absolute go-to for quality auto parts, expert mechanical services, and selling unwanted vehicles."
    ];

    const getOfflineImprovedText = (text: string): string => {
      if (!text) {
        return offlineFallbacks[Math.floor(Math.random() * offlineFallbacks.length)];
      }
      
      // Let's blend user comment with M&K services
      const cleanComments = text.replace(/["']/g, "");
      return `${cleanComments}. For our vehicle, M&K Used Auto Parts was perfect—their ASE-certified technicians completed an expert wheel alignment and tire installation on-site. We also got a premium guaranteed used part from their huge domestic and foreign inventory, and easily sold them our old junk car for competitive cash with convenient towing and all legal paperwork handled.`;
    };

    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.warn('[GEMINI WARNING] GEMINI_API_KEY is missing. Using pre-optimized M&K backup suggestions.');
        const backup = getOfflineImprovedText(inputComments);
        return res.json({ suggestion: backup, isOfflineFallback: true });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are an expert AI review assistant for M&K Used Auto Parts. Your goal is to automatically enhance customer feedback based on specific business keywords, actual services, and content strategy.

Original customer draft input comments: "${inputComments || "(No comments provided)"}"

Your task is to either IMPROVE their feedback or DRAFT a natural, high-performance customer review incorporating M&K's strategic business offerings.

You MUST perform the following actions:
1. Clarify Auto Parts: Enhance the review by mentioning M&K's wide selection of premium new and used parts for domestic and foreign vehicles. Emphasize premium quality and guaranteed parts.
2. Emphasize Junk Car Purchases: Incorporate M&K's seamless process for selling junk or unwanted cars, highlighting competitive cash offers, hassle-free legal paperwork, and convenient towing.
3. Highlight Mechanical Services: Showcase comprehensive service capabilities by mentioning ASE-certified technicians and services like tire installations, wheel alignments, and major mechanical overhauls.

CRITICAL CONSTRAINTS:
- Keep the first-person perspective ("I", "my", "we").
- Do NOT mention ratings, star counts, or phrases like "5 stars", "five stars", or "review" in the text of the review. It must sound like an authentic personal customer story.
- Keep the output extremely natural and organic. Maintain any specific mentions of customer experiences if already provided in their draft comments, but enrich it with the three strategic business areas above.
- Write a cohesive, enthusiastic paragraph (around 2 to 4 sentences).
- Do NOT include quotes, bullet points, introduction text, or extra commentary. Return ONLY the enhanced review text itself.`;

      // Array of allowed, non-deprecated modern models to try sequentially
      const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
      let lastError: any = null;
      let text = '';

      for (const model of modelsToTry) {
        try {
          console.log(`[GEMINI API] Attempting generation with model: ${model}`);
          const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
              systemInstruction: 'You are a warm, helpful, and strategic AI review assistant that crafts highly authentic, natural reviews incorporating specific core offerings of M&K Used Auto Parts.',
              temperature: 0.8,
            }
          });
          if (response.text) {
            text = response.text.trim();
            // strip surrounding quotes if the model outputted them
            if (text.startsWith('"') && text.endsWith('"')) {
              text = text.substring(1, text.length - 1);
            }
            if (text.startsWith("'") && text.endsWith("'")) {
              text = text.substring(1, text.length - 1);
            }
            console.log(`[GEMINI API] Successfully generated suggestion using ${model}`);
            break;
          }
        } catch (err: any) {
          console.warn(`[GEMINI API] Model ${model} failed:`, err.message || err);
          lastError = err;
        }
      }

      if (text) {
        return res.json({ suggestion: text });
      }

      // If all models failed, fallback to top-tier offline template
      console.warn('[GEMINI API] All Gemini models failed or returned empty content. Proceeding with offline M&K template.', lastError);
      const selectedFallback = getOfflineImprovedText(inputComments);
      return res.json({ suggestion: selectedFallback, isOfflineFallback: true });

    } catch (globalError: any) {
      console.error('[GEMINI GLOBAL CAPTURE]', globalError);
      const selectedFallback = getOfflineImprovedText(inputComments);
      return res.json({ suggestion: selectedFallback, isOfflineFallback: true });
    }
  });

  // Healthcheck endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite development or production serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await (Function('return import("vite")')() as Promise<typeof import('vite')>);
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OK] Server running in full-stack mode on http://localhost:${PORT}`);
  });
}

startServer();
