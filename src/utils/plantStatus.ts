export function getPlantStatusLabel(plantStatus?: string | null): string {
    switch (plantStatus) {
        case "planted":
            return "ปลูกลงแปลง";
        case "balled":
            return "ไม้ล้อม";
        case "potted":
            return "ไม้กระถาง";
        default:
            return "-";
    }
}
