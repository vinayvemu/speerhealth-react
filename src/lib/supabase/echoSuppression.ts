/**
 * Prevents double-processing your own mutations when Supabase Realtime
 * fires a Postgres Changes event for writes you just made.
 */
class EchoSuppressor {
  private readonly pending = new Set<string>();
  private readonly TTL = 3000; // ms

  tag(id: string): void {
    this.pending.add(id);
    setTimeout(() => this.pending.delete(id), this.TTL);
  }

  isMine(id: string): boolean {
    return this.pending.has(id);
  }
}

export const echoSuppressor = new EchoSuppressor();
