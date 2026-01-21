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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 shadow-inner ring-1 ring-emerald-200">
                        <KeyRound size={32} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">ปลดล็อกด้วย PIN</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium text-center">
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                    />

                    {err && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-medium text-center">
                            {err}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Unlock"}
                    </button>

                    <p className="text-xs text-slate-400 text-center">
                        หากลืม PIN ให้ Logout แล้ว Login ใหม่ (แล้วตั้ง PIN ใหม่ได้)
                    </p>
                </form>
            </div>
        </div>
    );
};
