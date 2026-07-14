import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // API endpoint for appending customer feedback securely to Google Sheets using a Service Account
  app.post('/api/feedback', async (req, res) => {
    const { name, email, rating, comments } = req.body;

    const sheetId = process.env.GOOGLE_SHEET_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!sheetId || !clientEmail || !privateKey) {
      console.error('[FEEDBACK ERROR] Missing Google Service Account credentials or Sheet ID.');
      return res.status(500).json({ error: 'Server is not configured for Google Sheets integration.' });
    }

    try {
      const { google } = await import('googleapis');
      const auth = new google.auth.JWT(
        clientEmail,
        undefined,
        privateKey,
        ['https://www.googleapis.com/auth/spreadsheets']
      );

      const sheets = google.sheets({ version: 'v4', auth });
      const timestamp = new Date().toLocaleString();
      const ratingText = `${rating} Star${rating > 1 ? 's' : ''}`;

      const rangesToTry = [
        "'Form Responses 1'!A:E",
        "Sheet1!A:E",
        "A:E"
      ];

      let lastError: any = null;
      let success = false;

      for (const range of rangesToTry) {
        try {
          await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[timestamp, name, email, ratingText, comments]]
            }
          });
          success = true;
          break;
        } catch (err: any) {
          lastError = err;
          if (err.code !== 400 && err.status !== 400) {
            break;
          }
        }
      }

      if (success) {
        return res.json({ success: true });
      } else {
        throw lastError || new Error('Failed to append to all attempted ranges');
      }
    } catch (error: any) {
      console.error('[FEEDBACK ERROR] Failed writing to sheet:', error);
      return res.status(500).json({ error: error.message || 'Failed writing to Google Sheet.' });
    }
  });

  // API endpoint for generating or improving customer reviews using Gemini with robust offline fallbacks
  app.post('/api/suggest-seo-review', async (req, res) => {
    const { rating, currentComments } = req.body;
    const targetRating = rating || 5;
    const inputComments = currentComments ? currentComments.trim() : "";

    const getOfflineImprovedText = (text: string): string => {
      const cleanComments = text ? text.replace(/["']/g, "").trim() : "";
      if (!cleanComments) {
        return "Great experience with M&K Used Auto Parts. Their team provided fast auto repair and quality auto parts at very competitive pricing.";
      }

      const lower = cleanComments.toLowerCase();

      // Check specific service keywords to stay strictly on subject
      if (lower.includes("sell") || lower.includes("junk") || lower.includes("scrap") || lower.includes("old car") || lower.includes("tow")) {
        return `${cleanComments}. We got competitive pricing for our junk car removal with fast, hassle-free towing from M&K.`;
      }

      if (lower.includes("tire") || lower.includes("align") || lower.includes("wheel") || lower.includes("mechanic") || lower.includes("brake") || lower.includes("oil")) {
        return `${cleanComments}. The shop provided quick tire installation and dependable auto repair service.`;
      }

      if (lower.includes("battery") || lower.includes("part") || lower.includes("engine") || lower.includes("transmission") || lower.includes("alternator") || lower.includes("mirror") || lower.includes("light") || lower.includes("door")) {
        return `${cleanComments}. M&K supplied exactly the quality used auto parts we needed at a great price.`;
      }

      // Default concise fallback staying close to subject
      return `${cleanComments}. M&K Used Auto Parts provided excellent customer service and reliable auto repair.`;
    };

    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.warn('[GEMINI WARNING] GEMINI_API_KEY is missing. Using contextual M&K backup suggestions.');
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

      const prompt = `When enriching customer reviews for M&K Used Auto Parts, keep them to 1-3 sentences. Identify the relevant service or product mentioned in the original feedback. Incorporate keywords naturally—such as 'used auto parts,' 'junk car removal,' 'tire installation,' or 'auto repair.' 

For example, if someone mentions selling a car, enrich it by adding that they got competitive pricing for their junk car. If the client got a battery replaced, stay strictly close to the subject—you don't have to mention ASE certified mechanics or junk cars, it is just a battery. Stay strictly close to the subject and don't get too imaginative. Keep it concise, relevant, and tied directly to the key service the customer actually used.

Original Customer Draft Input: "${inputComments || "Great auto repair and used auto parts service."}"

CRITICAL CONSTRAINTS:
- Keep the exact first-person perspective ("I", "my", "we").
- Length MUST be 1 to 3 concise sentences.
- Do NOT mention star ratings or phrases like "5 stars" in the review text.
- Do NOT invent or hallucinate unrelated services (e.g., do not talk about junk cars or engine overhauls if they only bought a battery, tire, or simple part).
- Return ONLY the final polished review text without quotes, markdown, bullet points, or introductory commentary.`;

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
              systemInstruction: 'You are a concise AI review assistant. You enrich customer reviews in 1-3 sentences by staying strictly close to the subject mentioned, naturally incorporating relevant keywords without inventing unrelated services.',
              temperature: 0.7,
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

      // If all models failed, fallback to contextual offline template
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
