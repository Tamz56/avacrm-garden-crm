export interface TreeSizeOption {
    value: string; // เก็บลง DB (เช่น '1-2"' หรือ '3"')
    label: string; // แสดงบน UI
    note?: string; // optional เช่น ระบุช่วงความสูง
}

// **ปรับ/เพิ่มได้ตามที่ Ava Farm ใช้จริง**
export const TREE_SIZE_OPTIONS: TreeSizeOption[] = [
    { value: '1-2"', label: '1–2 นิ้ว / 5–6 ฟุต' },
    { value: '3"', label: '3 นิ้ว / 6–8 ฟุต' },
    { value: '4"', label: '4 นิ้ว / 8–10 ฟุต' },
    { value: '5"', label: '5 นิ้ว +' },
    { value: '6"', label: '6 นิ้ว +' },
    { value: '8-10"', label: '8–10 นิ้ว' },
    { value: '10-12"', label: '10–12 นิ้ว' },
];

export const TRUNK_SIZE_OPTIONS: TreeSizeOption[] = [
    ...Array.from({ length: 19 }, (_, idx) => {
        const inch = idx + 2; // 2..20
        return {
            value: `${inch}"`,
            label: `${inch} นิ้ว`,
        };
    }),
    {
        value: "custom",
        label: "กำหนดเอง (พิมพ์ตัวเลข)",
    },
];
