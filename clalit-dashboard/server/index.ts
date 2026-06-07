import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
const httpServer = createServer(app);
const isProduction = process.env.NODE_ENV === "production";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ─── Security Headers (Helmet) ───────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // allow embedding in Perplexity iframe
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// ─── CORS ────────────────────────────────────────────────────────────
const allowedOrigins = [
  /^https:\/\/.*\.perplexity\.ai$/,
  /^https:\/\/.*\.pplx\.app$/,
];
if (!isProduction) {
  allowedOrigins.push(/^http:\/\/localhost:\d+$/);
}
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((pattern) => pattern.test(origin))) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ["GET"],
    allowedHeaders: ["Content-Type"],
    maxAge: 86400,
  }),
);

// ─── Rate Limiting ───────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120,                 // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "יותר מדי בקשות. נסה שוב בעוד דקה." },
  keyGenerator: (req) => {
    return req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
  },
});
app.use("/api/", apiLimiter);

// ─── Body parsing with size limits ───────────────────────────────────
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// ─── Disable X-Powered-By ────────────────────────────────────────────
app.disable("x-powered-by");

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// ─── Request logging with IP ─────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms [${clientIp}]`;
      // Don't log full response bodies in production (data leak risk)
      if (!isProduction && capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse).slice(0, 200)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;

    // Always log full error server-side
    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    // In production, never expose internal error details to the client
    const message = isProduction && status >= 500
      ? "שגיאת שרת פנימית"
      : err.message || "Internal Server Error";

    return res.status(status).json({ error: message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
