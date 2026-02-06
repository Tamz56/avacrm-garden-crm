/**
 * Utility to convert number to Thai Baht text
 * Adapted for Garden CRM
 */
export function bahtText(amount: number): string {
    if (isNaN(amount) || amount === null) return "ศูนย์บาทถ้วน";

    // Round to 2 decimals to handle precision issues
    amount = Math.round(amount * 100) / 100;

    if (amount === 0) return "ศูนย์บาทถ้วน";

    const [integerPart, fractionalPart] = amount.toString().split('.');

    let text = "";

    if (parseInt(integerPart) > 0) {
        text += convertSection(integerPart) + "บาท";
    }

    if (!fractionalPart || parseInt(fractionalPart) === 0) {
        text += "ถ้วน";
    } else {
        // Pad fractional part to 2 digits (e.g., .5 -> .50)
        const paddedFraction = fractionalPart.length === 1 ? fractionalPart + '0' : fractionalPart.slice(0, 2);
        text += convertSection(paddedFraction) + "สตางค์";
    }

    return text;
}

function convertSection(numStr: string): string {
    const thaiNumbers = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const thaiPositions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

    let result = "";
    const len = numStr.length;

    for (let i = 0; i < len; i++) {
        const digit = parseInt(numStr[i]);
        const pos = len - i - 1;

        if (digit !== 0) {
            // Special case for 'หนึ่ง' in 'สิบ' position
            if (pos % 6 === 1 && digit === 1) {
                result += "";
            }
            // Special case for 'สอง' in 'สิบ' position
            else if (pos % 6 === 1 && digit === 2) {
                result += "ยี่";
            }
            // Special case for 'หนึ่ง' in units position (when not single digit)
            else if (pos % 6 === 0 && digit === 1 && len > 1 && numStr[i - 1] !== '0') {
                result += "เอ็ด";
            }
            else {
                result += thaiNumbers[digit];
            }

            result += thaiPositions[pos % 6];
        }

        // Handle millions
        if (pos > 0 && pos % 6 === 0) {
            result += thaiPositions[6];
        }
    }

    return result;
}
