/** Staff PIN helpers. PINs are stored only as SHA-256 hashes salted with the staff id. */

export const PIN_LENGTH_MIN = 4;
export const PIN_LENGTH_MAX = 6;

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH_MIN},${PIN_LENGTH_MAX}}$`).test(pin);
}

export async function hashPin(staffId: string, pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${staffId}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPin(staff: { id: string; pinHash: string }, pin: string): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  return (await hashPin(staff.id, pin)) === staff.pinHash;
}
