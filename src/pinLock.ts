// src/pinLock.ts
const KEY_PIN = "avafarm888-pin"; // (เริ่มแบบง่าย) เก็บ PIN ใน localStorage ของเครื่องนี้
const KEY_LOCKED = "avafarm888-pin-locked";
const KEY_LAST_ACTIVE = "avafarm888-pin-lastActive";

export const DEFAULT_IDLE_MINUTES = 30;

export function hasPin(): boolean {
    return !!localStorage.getItem(KEY_PIN);
}

export function setPin(pin: string) {
    localStorage.setItem(KEY_PIN, pin);
    unlock(); // ตั้งเสร็จถือว่า unlocked
}

export function clearPin() {
    localStorage.removeItem(KEY_PIN);
    localStorage.removeItem(KEY_LOCKED);
    localStorage.removeItem(KEY_LAST_ACTIVE);
    window.dispatchEvent(new Event("ava:pinunlock"));
}

export function isLocked(): boolean {
    return localStorage.getItem(KEY_LOCKED) === "1";
}

export function lockNow() {
    localStorage.setItem(KEY_LOCKED, "1");
    window.dispatchEvent(new Event("ava:pinlock"));
}

export function unlock() {
    localStorage.setItem(KEY_LOCKED, "0");
    touchActivity(true);
    window.dispatchEvent(new Event("ava:pinunlock"));
}

export function verifyPin(pin: string): boolean {
    const saved = localStorage.getItem(KEY_PIN);
    return !!saved && saved === pin;
}

/**
 * touchActivity จะอัปเดต lastActive ก็ต่อเมื่อ "ไม่ได้ locked"
 * @param force ถ้า true จะอัปเดตเสมอ (ใช้ตอน unlock)
 */
export function touchActivity(force = false) {
    if (!force && isLocked()) return;
    localStorage.setItem(KEY_LAST_ACTIVE, String(Date.now()));
}

export function shouldAutoLock(idleMinutes = DEFAULT_IDLE_MINUTES): boolean {
    if (!hasPin()) return false;
    if (isLocked()) return true;

    const last = Number(localStorage.getItem(KEY_LAST_ACTIVE) || "0");
    if (!last) return false;

    const idleMs = idleMinutes * 60 * 1000;
    return Date.now() - last > idleMs;
}
