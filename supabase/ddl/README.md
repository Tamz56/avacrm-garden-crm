# AvaCRM - Supabase DDL Scripts

This directory contains the database schema definitions (DDL) for AvaCRM.

## 📁 File Structure

> **หมายเหตุ**: ชื่อไฟล์ด้านล่างเป็นตัวอย่างที่แนะนำ  
> ปรับให้ตรงกับไฟล์จริงในโปรเจกต์ของคุณ

### Current Structure

```
supabase/ddl/
├── README.md                      # This file
├── 010_deals_schema_master.sql   # Deals table schema (master)
└── 020_seed_deals_sample.sql     # Sample data for testing
```

### Recommended Full Structure

```
supabase/ddl/
├── README.md                      # คู่มือการใช้งาน
├── 000_enums_base.sql            # สร้าง ENUM ต่าง ๆ (deal_status_enum, deal_stage_enum)
├── 001_customers_schema.sql      # สร้างตาราง customers
├── 005_common_functions.sql      # Functions: set_updated_at, generate_deal_code, etc.
├── 010_deals_schema_master.sql   # สร้างตาราง deals (master)
└── 020_seed_deals_sample.sql     # ข้อมูลตัวอย่าง deals สำหรับ Sales Report
```

## 🎯 Purpose

These SQL files serve as the **source of truth** for the database schema. They should be:
- Version controlled in Git
- Updated whenever schema changes are made
- Used to recreate the database in new environments

## 📝 File Naming Convention

Files are numbered to indicate execution order:
- `000-004`: Base setup (ENUMs, base functions)
- `005-009`: Common functions and utilities
- `010-019`: Core tables (deals, customers, etc.)
- `020-029`: Seed data
- `030-039`: Additional features
- `100+`: Migrations

**ตัวอย่าง:**
- `000_enums_base.sql` - ต้องรันก่อนเพราะ deals ใช้ enum
- `001_customers_schema.sql` - ต้องรันก่อน deals (foreign key)
- `010_deals_schema_master.sql` - รันหลังจาก customers และ enums
- `020_seed_deals_sample.sql` - รันสุดท้าย (ข้อมูลตัวอย่าง)

## 🔢 Execution Order (ลำดับการรัน)

เมื่อสร้าง DB ใหม่ ให้รันไฟล์ตามลำดับเลขนำหน้า:

1. **000_enums_base.sql** - สร้าง ENUM types
2. **001_customers_schema.sql** - สร้างตาราง customers (ถ้ามี)
3. **005_common_functions.sql** - สร้าง functions ที่ใช้ร่วมกัน
4. **010_deals_schema_master.sql** - สร้างตาราง deals
5. **020_seed_deals_sample.sql** - เพิ่มข้อมูลตัวอย่าง (optional)

### วิธีรันใน Supabase SQL Editor

```sql
-- 1. เปิด Supabase Dashboard → SQL Editor
-- 2. สร้าง query ใหม่
-- 3. Copy เนื้อหาจากไฟล์ตามลำดับ (000 → 001 → 005 → 010 → 020)
-- 4. Run แต่ละไฟล์ทีละไฟล์
-- 5. ตรวจสอบว่าไม่มี error
```

## 🚀 Usage

### Creating a New Database

1. Open Supabase SQL Editor
2. Run files in order:
   ```sql
   -- Run 010_deals_schema_master.sql first
   -- Then run 020_seed_deals_sample.sql (optional, for testing)
   ```

### Updating Schema

1. Make changes in Supabase SQL Editor
2. Update the corresponding `.sql` file in this directory
3. Commit changes to Git:
   ```bash
   git add supabase/ddl/010_deals_schema_master.sql
   git commit -m "Update deals schema: add new column"
   ```

## 📋 File Descriptions

### 010_deals_schema_master.sql
Complete schema for the `deals` table including:
- Enum types (deal_status_enum, deal_stage_enum)
- Table definition with all columns
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for auto-updating timestamps
- Column comments for documentation

**Key columns for Sales Report:**
- `special_note` → mapped to `title`
- `total_amount` → mapped to `amount`
- `deal_date` → mapped to `closing_date`

### 020_seed_deals_sample.sql
Sample data for testing:
- 3 sample deals (2 Won, 1 Lost)
- Used for testing Sales Report functionality
- Safe to run multiple times (uses unique deal_code)

## ⚠️ Important Notes

1. **Always backup** before running DDL scripts in production
2. **Test in development** environment first
3. **Update this README** when adding new files
4. **Keep files in sync** with actual database schema

## 🔄 Migration Strategy

When making schema changes:
1. Create a new migration file (e.g., `030_add_deal_priority.sql`)
2. Update the master file (`010_deals_schema_master.sql`)
3. Document changes in Git commit message
4. Test thoroughly before applying to production

### Workflow สำหรับการเปลี่ยน Schema

เมื่อต้องการเปลี่ยนแปลง schema ของ deals:

#### 1️⃣ สร้างไฟล์ Migration ใหม่
```bash
# ตัวอย่าง: เพิ่ม column priority
supabase/ddl/030_deals_add_priority.sql
```

#### 2️⃣ รันไฟล์ Migration ใน Supabase
- เปิด Supabase SQL Editor
- Copy เนื้อหาจาก `030_deals_add_priority.sql`
- Run และตรวจสอบว่าทำงานถูกต้อง

#### 3️⃣ อัปเดต Master File
- เปิดไฟล์ `010_deals_schema_master.sql`
- เพิ่มโค้ดเดียวกันเข้าไปใน master
- **Master ต้องเป็นเวอร์ชันรวมล่าสุดเสมอ**

#### 4️⃣ Commit ทั้งสองไฟล์
```bash
git add supabase/ddl/030_deals_add_priority.sql
git add supabase/ddl/010_deals_schema_master.sql
git commit -m "Add priority column to deals table"
```

## ✅ Checklist: ตรวจสอบโครงสร้าง Deals

หลังจาก apply DDL แล้ว ให้ตรวจสอบใน Supabase:

### Table Editor → deals

**Columns ที่ต้องมี:**
- ✅ `id` (uuid, primary key)
- ✅ `deal_code` (text, unique)
- ✅ `title` (text) - สำหรับ Sales Report
- ✅ `amount` (numeric) - สำหรับ Sales Report
- ✅ `closing_date` (date) - สำหรับ Sales Report
- ✅ `special_note` (text) - ใช้เป็น title ใน Sales Report
- ✅ `total_amount` (numeric)
- ✅ `customer_name` (text)
- ✅ `status` (deal_status_enum)
- ✅ `stage` (deal_stage_enum)
- ✅ `created_at`, `updated_at` (timestamp)

### Tab: Policies (RLS)

ควรมี 4 policies:
- ✅ Allow authenticated users to read deals
- ✅ Allow authenticated users to insert deals
- ✅ Allow authenticated users to update deals
- ✅ Allow authenticated users to delete deals

### Tab: Triggers

ควรมี trigger:
- ✅ `update_deals_updated_at` - auto-update `updated_at` column

### Tab: Indexes

ควรมี indexes:
- ✅ `deals_customer_id_idx`
- ✅ `deals_deal_date_idx`
- ✅ `deals_stage_idx`
- ✅ `deals_status_idx`
- ✅ `deals_closing_date_idx`
- ✅ `deals_created_at_idx`

## 🎯 Master File คืออะไร?

**`010_deals_schema_master.sql`** = **Source of Truth**

- ✅ เป็นเวอร์ชันรวมล่าสุดของ deals schema
- ✅ ใช้สร้าง DB ใหม่ได้ทันที (ไม่ต้องรัน migration ทีละไฟล์)
- ✅ ต้องอัปเดตทุกครั้งที่มีการเปลี่ยน schema
- ✅ ใช้ `if not exists` เพื่อป้องกัน error เมื่อรันซ้ำ

## 📚 Related Documentation

- [AvaCRM Structure](../../src/docs/ava-crm-structure.md)
- [Supabase Documentation](https://supabase.com/docs)

---

Last updated: 2025-11-23
