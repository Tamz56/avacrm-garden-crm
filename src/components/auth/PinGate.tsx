// src/components/auth/PinGate.tsx
import React, { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { unlock, verifyPin, lockNow } from "../../pinLock";

type Props = {
    onUnlocked?: () => void;
};

export const PinGate: React.FC<Props> = ({ onUnlocked }) => {
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);

        if (!/^\d{4,6}$/.test(pin)) {
            setErr("กรุณาใส่ PIN เป็นตัวเลข 4–6 หลัก");
            return;
        }

        setLoading(true);
        try {
            if (!verifyPin(pin)) {
                setErr("PIN ไม่ถูกต้อง");
                setPin("");
                lockNow(); // ย้ำสถานะ locked
                return;
            }
            unlock();
            onUnlocked?.();
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#07111f] transition-colors duration-200">
            <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8 bg-white text-slate-900 border border-slate-200/70 dark:bg-[#0b1220]/60 dark:text-slate-100 dark:border-white/10 backdrop-blur-sm">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-inner ring-1 ring-inset transition-colors bg-emerald-100 text-emerald-600 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                        <KeyRound size={32} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">ปลดล็อกด้วย PIN</h1>
                    <p className="text-sm mt-1 font-medium text-center text-slate-500 dark:text-slate-400">
                        เพื่อความปลอดภัยของข้อมูลฟาร์ม
                    </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <input
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="PIN 4–6 หลัก"
                        className="w-full px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-black/40 dark:border-white/10 dark:text-white dark:placeholder-slate-600"
                        autoFocus
                    />

                    {err && (
                        <div className="p-3 rounded-xl text-xs font-medium text-center bg-rose-50 border border-rose-100 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300">
                            {err}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Unlock"}
                    </button>

                    <p className="text-xs text-center text-slate-400 dark:text-slate-500">
                        หากลืม PIN ให้ Logout แล้ว Login ใหม่ (แล้วตั้ง PIN ใหม่ได้)
                    </p>
                </form>
            </div>
        </div>
    );
};
