declare global {
  namespace Express {
    interface Request {
      dbUser?: {
        id: string;
        clerkId: string;
      };
    }
  }
}

export {};
