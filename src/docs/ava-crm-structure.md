# AvaCRM – Zones & Stock / Sales Console

> Snapshot โครงสร้างระบบ ณ วันที่เชื่อม Supabase แล้ว (Customer + Deal Detail)

## 1. ภาพรวมโครงสร้าง Frontend

รากโปรเจกต์ (Create React App)

- `src/App.js`
  - เก็บ layout หลัก (Sidebar, Topbar)
  - เก็บ state สำหรับเมนู:
    - `activeMenu` – เมนูที่เลือก (dashboard, zones, customers, orders ฯลฯ)
    - `selectedCustomerId` – ลูกค้าที่เลือกจากหน้า List
    - `selectedDealId` – ดีลที่เลือกจากหน้า Customer
  - ฟังก์ชันสำคัญ
    - `renderContent()` – switch ตาม `activeMenu` เพื่อเลือก component แสดงผล
    - `handleSelectCustomer(customerId)` – เลือกลูกค้า
    - `handleOpenDealFromCustomer(dealId)` – เลือกดีลจากหน้า Customer แล้วไปหน้า Deal Detail

- `src/supabaseClient.ts`
  - สร้าง Supabase client
  - ใช้ env:
    - `REACT_APP_SUPABASE_URL`
    - `REACT_APP_SUPABASE_ANON_KEY`

## 2. หน้าเกี่ยวกับลูกค้า

โฟลเดอร์หลัก:

- `src/components/customers/`
  - `CustomerListPage.tsx`  
    - ดึงลูกค้าทั้งหมดจากตาราง `customers` (Supabase)
    - มี search + แสดงในรูปแบบ list/card
    - `onSelectCustomer(customerId)` → บอก `App.js` ว่าผู้ใช้เลือกคนไหน

  - `CustomerDetailPage.tsx`
    - แสดง **ข้อมูลลูกค้า 1 ราย + ดีลล่าสุด** ของลูกค้าคนนั้น
    - ถ้ามี `customerId` จะดึงข้อมูลลูกค้าตาม id จาก Supabase  
      ถ้าไม่มี → fallback ไปใช้ลูกค้าล่าสุด 1 ราย
    - ดึงดีลล่าสุดของลูกค้าจากตาราง `deals`
    - มีปุ่มคลิกดีล → เรียก `onOpenDeal(dealId)` ไปที่ `App.js`

  - `deals/DealDetailPage.tsx`
    - แสดงรายละเอียดดีล 1 ดีล
    - รับ `dealId` จาก `App.js`
    - ดึงดีลจากตาราง `deals` (`.eq("id", dealId)`)
    - ถ้าดึงไม่ได้ → ใช้ mock กันตาย แต่หน้าไม่ล้ม

## 3. ตารางที่ใช้ใน Supabase

ปัจจุบัน (ตัวหลักที่เชื่อมแล้ว):

- `customers`
  - ใช้เก็บข้อมูลลูกค้า (ชื่อ, เบอร์, line, email, ที่อยู่, budget, interests, lead status ฯลฯ)

- `deals`
  - ใช้เก็บดีล (title, customer_id, stage, status, total_amount, transport_cost, net_amount, site_address, note, created_at, updated_at ฯลฯ)

แผนในอนาคต (จะเพิ่มทีหลัง):

- `deal_activities`
  - เก็บ activity ต่าง ๆ ของดีล เช่น โทรคุย, นัดดูหน้างาน

- `deal_documents`
  - เก็บ metadata ของเอกสาร เช่น ใบเสนอราคา, ใบสัญญา, ใบรับเงิน

- `payments`
  - เก็บข้อมูลการชำระเงินแต่ละงวดของดีล

## 4. Flow การทำงานสำคัญ

1. ผู้ใช้เปิดเมนู **ลูกค้า**
   - เห็นหน้า `CustomerListPage` (list ทั้งหมด)
   - เลือกลูกค้า 1 ราย → set `selectedCustomerId`

2. ด้านล่างจะแสดง `CustomerDetailPage`
   - ดึงลูกค้าตาม `selectedCustomerId` (ถ้ามี)
   - ดึงดีลล่าสุดของลูกค้าคนนั้น

3. เมื่อคลิกดีล
   - `App.js` จะตั้งค่า `selectedDealId` และเปลี่ยนเมนูเป็น `orders`
   - หน้า `DealDetailPage` ดึงดีลจาก Supabase ตาม `selectedDealId`

> เอกสารนี้ใช้เป็น “แผนที่” ของโปรเจกต์ เวลากลับมาทำงานต่อในอนาคตจะช่วยลดเวลาไล่หาไฟล์และ state
