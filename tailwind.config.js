/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: [
        "./public/index.html",
        // ต้องมี src/**/*.{ts,tsx} เพื่อให้ Tailwind scan ไฟล์ TypeScript ทั้งหมด
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
};
