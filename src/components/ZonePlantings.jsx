// src/components/ZonePlantings.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function ZonePlantings({ activeZone }) {
  // activeZone = { id, name } ที่ส่งมาจากหน้าแปลงหลัก
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // ฟอร์มเพิ่มข้อมูลปลูก
  const [treeName, setTreeName] = useState("");
  const [areaType, setAreaType] = useState("แปลงปลูก");
  const [qty, setQty] = useState("");
  const [plantDate, setPlantDate] = useState("");
  const [note, setNote] = useState("");

  const canSubmit = useMemo(() => {
    return activeZone && treeName && areaType && qty && plantDate;
  }, [activeZone, treeName, areaType, qty, plantDate]);

  // โหลดข้อมูลของแปลงที่เลือก
  const loadRows = async (zone) => {
    if (!zone) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const colRef = collection(db, "zonePlantings");
      const q = query(
        colRef,
        where("zoneId", "==", zone.id),
        orderBy("plantDate", "desc")
      );
      const snap = await getDocs(q);
      const items = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setRows(items);
    } catch (err) {
      console.error("Error fetch zonePlantings:", err);
      alert("โหลดข้อมูลแปลงปลูกไม่ได้");
    } finally {
      setLoading(false);
    }
  };

  // โหลดเมื่อเปลี่ยนแปลง activeZone
  useEffect(() => {
    loadRows(activeZone);
  }, [activeZone]);

  // สรุปยอดปลูก / ส่งเข้า stock / คงเหลือ ในแปลงนี้ (ใช้โชว์บนหน้า)
  const stats = useMemo(() => {
    let totalPlanted = 0;
    let totalPushedToStock = 0;

    for (const r of rows) {
      const q = Number(r.qty) || 0;
      totalPlanted += q;
      if (r.pushedToCrm) {
        totalPushedToStock += q;
      }
    }

    const remainingInZone = totalPlanted - totalPushedToStock;

    return {
      totalPlanted,
      totalPushedToStock,
      remainingInZone,
    };
  }, [rows]);

  // คำนวณจาก zonePlantings แล้วอัปเดต summary ลงเอกสารของแปลง (ใช้สำหรับหน้ารวมทุกแปลง)
  const recomputeZoneStats = async (zoneId) => {
    if (!zoneId) return;

    const colRef = collection(db, "zonePlantings");
    const q = query(colRef, where("zoneId", "==", zoneId));
    const snap = await getDocs(q);

    let totalPlanted = 0;
    let totalPushedToStock = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const q = Number(data.qty) || 0;
      totalPlanted += q;
      if (data.pushedToCrm) {
        totalPushedToStock += q;
      }
    });

    const remainingInZone = totalPlanted - totalPushedToStock;

    // ปรับชื่อ collection "zones" ให้ตรงกับโปรเจกต์จริงถ้าใช้ชื่ออื่น
    await updateDoc(doc(db, "zones", zoneId), {
      statsTotalPlanted: totalPlanted,
      statsPushedToStock: totalPushedToStock,
      statsRemainingInZone: remainingInZone,
      statsUpdatedAt: serverTimestamp(),
    });
  };

  // บันทึกแถวใหม่ใน zonePlantings
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      const colRef = collection(db, "zonePlantings");
      await addDoc(colRef, {
        zoneId: activeZone.id,
        zoneName: activeZone.name || "",
        treeName,
        areaType, // แปลงปลูก / แปลงพัก
        qty: Number(qty) || 0,
        plantDate, // string "YYYY-MM-DD"
        note,
        pushedToCrm: false,
        createdAt: serverTimestamp(),
      });

      // เคลียร์ฟอร์ม
      setTreeName("");
      setAreaType("แปลงปลูก");
      setQty("");
      setPlantDate("");
      setNote("");

      // reload + update summary
      await loadRows(activeZone);
      await recomputeZoneStats(activeZone.id);
    } catch (err) {
      console.error("Error add zonePlanting:", err);
      alert("บันทึกข้อมูลแปลงปลูกไม่สำเร็จ");
    }
  };

  // ส่งข้อมูลจากแถวหนึ่งไปสร้าง doc ใหม่ใน crmStock (ต้นไม้พร้อมขาย)
  const handleSendToCrmStock = async (row) => {
    try {
      const crmRef = collection(db, "crmStock");

      // 1) สร้างเอกสารใหม่ใน crmStock
      const docRef = await addDoc(crmRef, {
        treename: row.treeName || "",
        zone: activeZone?.name || row.zoneName || "",
        zoneId: activeZone?.id || row.zoneId || null, // เผื่อเอาไปสรุปต่อฝั่ง Stock
        category: row.areaType === "แปลงพัก" ? "ไม้พัก" : "ไม้ปลูกจากแปลง",
        totalQty: Number(row.qty) || 0,
        sizeInch: null,
        heightM: null,
        status1: "พร้อมยก",
        status2: "พร้อมจำหน่าย", // ถือว่าเป็น "ต้นไม้พร้อมขาย"
        digDate: null,
        moveOutDate: null,
        yardInDate: null,
        plantDate: row.plantDate || null,
        fromZonePlantingId: row.id,
        createdAt: serverTimestamp(),
      });

      // 2) mark แถวนี้ว่าถูกส่งเข้า Stock แล้ว
      await updateDoc(doc(db, "zonePlantings", row.id), {
        pushedToCrm: true,
        pushedCrmStockId: docRef.id,
      });

      // 3) reload + update summary
      await loadRows(activeZone);
      await recomputeZoneStats(activeZone.id);

      alert("ส่งข้อมูลไปที่สต็อก CRM เรียบร้อยแล้ว");
    } catch (err) {
      console.error("Error send to crmStock:", err);
      alert("ส่งข้อมูลไปที่สต็อก CRM ไม่สำเร็จ");
    }
  };

  if (!activeZone) {
    return (
      <div className="mt-8 text-sm text-slate-400">
        เลือกแปลงปลูกจากตารางด้านบน เพื่อจัดการข้อมูลแปลงปลูก / แปลงพัก
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {/* หัวข้อย่อย */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            การจัดการแปลงปลูกของ {activeZone.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            บันทึกจำนวนปลูก วันที่ปลูก และชนิดไม้ของแต่ละแปลง / แปลงพัก
            และส่งเข้า CRM Stock ได้จากตรงนี้
          </p>
        </div>
      </div>

      {/* การ์ดสรุปยอดในแปลง (ใช้แทนบล็อก "สรุปยอดต้นไม้ในแปลง" ที่คุณตีกรอบแดง) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">จำนวนต้นไม้ที่ปลูกในแปลงนี้ (สะสม)</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {stats.totalPlanted.toLocaleString()}{" "}
            <span className="text-sm font-normal">ต้น</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">ส่งเข้า Stock (ต้นไม้พร้อมขาย) แล้ว</p>
          <p className="mt-1 text-xl font-semibold text-emerald-700">
            {stats.totalPushedToStock.toLocaleString()}{" "}
            <span className="text-sm font-normal">ต้น</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">ยังอยู่ในแปลง (คงเหลือ)</p>
          <p className="mt-1 text-xl font-semibold text-orange-600">
            {stats.remainingInZone.toLocaleString()}{" "}
            <span className="text-sm font-normal">ต้น</span>
          </p>
        </div>
      </div>

      {/* ฟอร์มเพิ่ม */}
      <form
        onSubmit={handleAdd}
        className="bg-white rounded-2xl border border-slate-100 px-5 py-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
      >
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">ชนิดไม้</p>
          <input
            type="text"
            value={treeName}
            onChange={(e) => setTreeName(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="เช่น Silver Oak AVAONE"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">ประเภทแปลง</p>
          <select
            value={areaType}
            onChange={(e) => setAreaType(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="แปลงปลูก">แปลงปลูก</option>
            <option value="แปลงพัก">แปลงพักต้นไม้</option>
          </select>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">จำนวนปลูก</p>
          <input
            type="number"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="เช่น 50"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">วันที่ปลูก</p>
          <input
            type="date"
            value={plantDate}
            onChange={(e) => setPlantDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="md:col-span-1">
          <p className="text-xs font-medium text-slate-500 mb-1">หมายเหตุ</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="เช่น ชุดสำหรับ CRM Batch 1"
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-4 py-2 rounded-xl text-sm font-medium text-white ${canSubmit
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-slate-300 cursor-not-allowed"
                }`}
            >
              เพิ่ม
            </button>
          </div>
        </div>
      </form>

      {/* ตารางรายการปลูก */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left">วันที่ปลูก</th>
                <th className="px-4 py-3 text-left">ชนิดไม้</th>
                <th className="px-4 py-3 text-left">ประเภทแปลง</th>
                <th className="px-4 py-3 text-right">จำนวนปลูก</th>
                <th className="px-4 py-3 text-left">หมายเหตุ</th>
                <th className="px-4 py-3 text-right">ส่งเข้า Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-4 text-center text-slate-400"
                  >
                    กำลังโหลดข้อมูลแปลงปลูก...
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-4 text-center text-slate-400"
                  >
                    ยังไม่มีข้อมูลแปลงปลูกสำหรับแปลงนี้
                  </td>
                </tr>
              )}

              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-slate-700">
                    {row.plantDate || "-"}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {row.treeName || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.areaType || "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {(Number(row.qty) || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {row.note || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        !row.pushedToCrm && handleSendToCrmStock(row)
                      }
                      disabled={row.pushedToCrm}
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${row.pushedToCrm
                          ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                        }`}
                    >
                      {row.pushedToCrm ? "ส่งแล้ว" : "ส่งเข้า Stock"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
