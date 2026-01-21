// src/components/auth/PinSetup.tsx
import React, { useMemo, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { setPin } from "../../pinLock";

type Props = {
    isDarkMode?: boolean;
    onDone?: () => void;
};

export const PinSetup: React.FC<Props> = ({ onDone }) => {
    const [pin1, setPin1] = useState("");
    const [pin2, setPin2] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const valid = useMemo(() => {
        const re = /^\d{4,6}$/;
        return re.test(pin1) && pin1 === pin2;
    }, [pin1, pin2]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);

        if (!/^\d{4,6}$/.test(pin1)) {
            setErr("PIN ต้องเป็นตัวเลข 4–6 หลัก");
            return;
        }
        if (pin1 !== pin2) {
            setErr("PIN ไม่ตรงกัน");
            return;
        }

        setSaving(true);
        try {
            setPin(pin1);
            onDone?.();
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 shadow-inner ring-1 ring-emerald-200">
                        <KeyRound size={32} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">ตั้งค่า PIN สำหรับเครื่องนี้</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium text-center">
                        ครั้งต่อไปคุณเอจะปลดล็อกด้วย PIN แทนการพิมพ์รหัสผ่าน
                    </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <input
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={6}
                        value={pin1}
                        onChange={(e) => setPin1(e.target.value.replace(/\D/g, ""))}
                        placeholder="PIN 4–6 หลัก"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    <input
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={6}
                        value={pin2}
                        onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
                        placeholder="ยืนยัน PIN อีกครั้ง"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    {err && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-medium text-center">
                            {err}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!valid || saving}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : "บันทึก PIN"}
                    </button>

                    <p className="text-xs text-slate-400 text-center">
                        แนะนำ: ตั้ง PIN ของเครื่องนี้เฉพาะอุปกรณ์ส่วนตัว
                    </p>
                </form>
            </div>
        </div>
    );
};
