import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // No server-side routes needed for this application
  // All data is stored in client-side localStorage
  
  const httpServer = createServer(app);

  return httpServer;
}
