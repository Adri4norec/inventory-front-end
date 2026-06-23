import { CustodyViewerRef } from './custody-owner.util';

const STORAGE_KEY = 'custodyViewerPinsByEquipment';

/** Visualizador fixo por equipamento — não muda após transferência de custódia. */
export function readCustodyViewerPins(): Map<string, string> {
  if (typeof localStorage === 'undefined') {
    return new Map();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();

    const parsed = JSON.parse(raw) as Record<string, string>;
    return new Map(
      Object.entries(parsed)
        .map(([equipmentId, userId]) => [String(equipmentId).trim(), String(userId).trim()] as const)
        .filter(([equipmentId, userId]) => !!equipmentId && !!userId)
    );
  } catch {
    return new Map();
  }
}

export function writeCustodyViewerPin(equipmentId: string, viewerUserId: string): void {
  const key = String(equipmentId ?? '').trim();
  const userId = String(viewerUserId ?? '').trim();
  if (!key || !userId || typeof localStorage === 'undefined') return;

  const pins = readCustodyViewerPins();
  pins.set(key, userId);

  const payload: Record<string, string> = {};
  pins.forEach((value, id) => {
    payload[id] = value;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function writeCustodyViewerPins(keys: string[], viewerUserId: string): void {
  keys.forEach((key) => writeCustodyViewerPin(key, viewerUserId));
}

export function custodyViewerPinsToIndex(pins: Map<string, string>): Map<string, CustodyViewerRef> {
  const index = new Map<string, CustodyViewerRef>();
  pins.forEach((userId, equipmentId) => {
    index.set(equipmentId, { userId, names: new Set() });
  });
  return index;
}
