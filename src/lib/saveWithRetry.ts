import { toast } from "@/hooks/use-toast";

interface SaveOptions {
  retries?: number;
  timeoutMs?: number;
  context?: string;
}

/**
 * Wraps an async save operation with retry logic, timeout, and user-friendly error handling.
 * Detects network offline, provides clear error messages, and prevents silent failures.
 */
export async function saveWithRetry<T>(
  asyncFn: () => Promise<T>,
  options: SaveOptions = {}
): Promise<T> {
  const { retries = 2, timeoutMs = 15000, context = "save" } = options;

  // Check network status first
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const offlineError = new Error("You appear to be offline. Please check your internet connection and try again.");
    toast({
      title: "No Internet Connection",
      description: "Please check your connection and try again.",
      variant: "destructive",
    });
    throw offlineError;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        asyncFn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out. Please try again.")), timeoutMs)
        ),
      ]);
      return result;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on auth errors
      const message = lastError.message.toLowerCase();
      if (message.includes("401") || message.includes("403") || message.includes("not authorized") || message.includes("jwt")) {
        break;
      }

      // If offline mid-retry, stop
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        lastError = new Error("Connection lost during " + context + ". Please check your internet and try again.");
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  // All retries exhausted
  const finalMessage = lastError?.message || "An unexpected error occurred.";
  
  console.error(`[saveWithRetry] ${context} failed after ${retries + 1} attempts:`, finalMessage);

  // Show user-friendly toast
  if (finalMessage.includes("fetch") || finalMessage.includes("network") || finalMessage.includes("timed out")) {
    toast({
      title: "Network Issue",
      description: "Unable to save. Please check your connection and try again.",
      variant: "destructive",
    });
  } else {
    toast({
      title: "Save Failed",
      description: finalMessage,
      variant: "destructive",
    });
  }

  throw lastError!;
}
