// src/constants/treeOptions.ts

// ขนาดลำต้น (นิ้ว) ที่ AvaFarm ใช้จริง
export const TRUNK_SIZES_INCH = [
    3, 4, 5, 6, 7, 8, 9,
    10, 12, 14, 16, 18, 20,
];

// ขนาดกระถาง (นิ้ว) เพิ่มทีละ 2 นิ้ว จนถึง 26 นิ้ว
export const POT_SIZES_INCH = [
    8, 10, 12, 14, 16, 18, 20, 22, 24, 26,
];

// แปลงเป็น option สำหรับ <select>
export const trunkSizeOptions = TRUNK_SIZES_INCH.map((value) => ({
    value: String(value),          // เก็บใน DB เป็น string เช่น "5"
    label: `${value} นิ้ว`,
}));

export const potSizeOptions = POT_SIZES_INCH.map((value) => ({
    value: String(value),
    label: `${value} นิ้ว`,
}));

// helper สำหรับ sort ตามลำดับมาตรฐาน (ใช้ตรงไหนก็ได้)
export const trunkSizeOrder: Record<string, number> = {};
TRUNK_SIZES_INCH.forEach((v, idx) => {
    trunkSizeOrder[String(v)] = idx;
});
