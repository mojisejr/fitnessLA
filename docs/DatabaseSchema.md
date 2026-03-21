# Database Schema: Gym Management System (Phase 1)
**Focus:** Accounting Foundation, POS, Shift Management, Tax Document Control, and Audit Trail  
**Version:** 1.0  
**Date:** 2026-03-07

## Current Prisma Reality Delta (2026-03-21)

เอกสารนี้ยังเก็บภาพ conceptual schema ชุดแรกของ Phase 1 อยู่ แต่ source of truth ฝั่ง runtime ปัจจุบันคือ `prisma/schema.prisma`

ความจริงสำคัญที่เพิ่มเข้ามาแล้วใน Prisma schema ปัจจุบัน:

- primary keys ใน runtime implementation ปัจจุบันเป็น `string`/`cuid()` ไม่ใช่ `INT` auto increment
- `products` มี metadata เพิ่ม:
	- `trackStock`
	- `stockOnHand`
	- `membershipPeriod`
	- `membershipDurationDays`
	- `revenueAccountId`
- มีตาราง `member_subscriptions` สำหรับสมาชิกที่เกิดจาก membership checkout จริงแล้ว
- `orders` และ `order_items` ใช้ชื่อฟิลด์และ relation ตาม Prisma models ปัจจุบัน ไม่ได้ตรงกับ naming ชุดแรกทุกจุด

ดังนั้น:

- ใช้เอกสารนี้เป็น conceptual design/reference ได้
- ถ้าต้องการ field-level truth สำหรับ implementation ปัจจุบัน ให้ยึด `prisma/schema.prisma` ก่อนเสมอ

---

## 1. Design Principles (หลักการออกแบบฐานข้อมูล)
* ทุกธุรกรรมที่กระทบเงินหรือเอกสารต้อง audit ย้อนหลังได้
* ทุก flow หลักต้องรองรับ ACID transaction และ rollback ได้ทั้งชุด
* หลีกเลี่ยงการลบข้อมูลธุรกรรมจริง ให้ใช้สถานะ เช่น ACTIVE, VOIDED, CLOSED แทน
* ทุก Journal Entry ต้อง balance เสมอ
* เลขที่เอกสารต้องถูกควบคุมด้วย sequence table ที่ lock ได้เมื่อมี concurrent transactions

---

## 2. Global Column Policy (มาตรฐานคอลัมน์ร่วม)
ตาราง master และ transaction หลักใน Phase 1 ควรมีคอลัมน์เหล่านี้เป็นอย่างน้อย

* `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
* `created_by` INT NULL FK ไป `users.user_id` สำหรับข้อมูลที่ผู้ใช้เป็นผู้สร้าง
* `updated_at` TIMESTAMP NULL
* `updated_by` INT NULL FK ไป `users.user_id`

ตารางที่มีการเปลี่ยนสถานะควรมีเพิ่ม

* `status` ENUM หรือ VARCHAR ตามโดเมน
* `status_changed_at` TIMESTAMP NULL
* `status_changed_by` INT NULL FK ไป `users.user_id`

---

## 3. Core Users (ระบบผู้ใช้งาน)
เก็บข้อมูลพนักงานและเจ้าของที่เข้าใช้งานระบบ เพื่อระบุผู้ทำธุรกรรมและผู้แก้ไขข้อมูล

### Table: `users`
| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | INT | PK, Auto Increment | รหัสผู้ใช้งาน |
| `username` | VARCHAR(50) | Unique, Not Null | ชื่อผู้ใช้งานสำหรับ Login |
| `password_hash` | VARCHAR(255) | Not Null | รหัสผ่านแบบเข้ารหัส |
| `full_name` | VARCHAR(100) | Not Null | ชื่อ-นามสกุลจริง |
| `role` | ENUM | Not Null | สิทธิ์ใช้งาน ('OWNER', 'ADMIN', 'CASHIER') |
| `is_active` | BOOLEAN | Default TRUE | สถานะการใช้งาน |
| `last_login_at` | TIMESTAMP | Nullable | เวลา login ล่าสุด |
| `created_at` | TIMESTAMP | Not Null, Default CURRENT | เวลาสร้างข้อมูล |
| `updated_at` | TIMESTAMP | Nullable | เวลาแก้ไขล่าสุด |

---

## 4. Accounting Core (ระบบบัญชีแกนกลาง)
หัวใจของระบบ ทุกการรับ-จ่ายเงินต้องวิ่งมาลงบัญชีแบบคู่ภายใต้ transaction เดียวกับธุรกรรมต้นทาง

### Table: `chart_of_accounts`
| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `account_id` | INT | PK, Auto Increment | รหัสบัญชีในระบบ |
| `account_code` | VARCHAR(20) | Unique, Not Null | รหัสบัญชี เช่น 1111, 4101 |
| `account_name` | VARCHAR(100) | Not Null | ชื่อบัญชี |
| `account_type` | ENUM | Not Null | ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE') |
| `is_active` | BOOLEAN | Default TRUE | เปิด/ปิดการใช้งานบัญชี |
| `description` | VARCHAR(255) | Nullable | คำอธิบายเพิ่มเติม |
| `created_at` | TIMESTAMP | Not Null, Default CURRENT | เวลาสร้าง |
| `created_by` | INT | FK (`users.user_id`) | ผู้สร้าง |
| `updated_at` | TIMESTAMP | Nullable | เวลาแก้ไขล่าสุด |
| `updated_by` | INT | FK (`users.user_id`) | ผู้แก้ไขล่าสุด |

### Table: `journal_entries`
บันทึกเหตุการณ์ทางบัญชีระดับหัวรายการ เช่น การขาย, รายจ่ายย่อย, เงินขาด/เกินจากการปิดกะ

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `entry_id` | INT | PK, Auto Increment | รหัสรายการสมุดรายวัน |
| `entry_date` | TIMESTAMP | Not Null, Default CURRENT | วันเวลาของรายการ |
| `description` | TEXT | Not Null | คำอธิบายรายการ |
| `source_type` | VARCHAR(50) | Not Null | แหล่งที่มา เช่น 'ORDER', 'EXPENSE', 'SHIFT_CLOSE' |
| `source_id` | INT | Not Null | รหัสอ้างอิงไปตารางต้นทาง |
| `status` | ENUM | Default 'POSTED' | ('POSTED', 'REVERSED') |
| `status_changed_at` | TIMESTAMP | Nullable | เวลาเปลี่ยนสถานะ |
| `status_changed_by` | INT | FK (`users.user_id`) | ผู้เปลี่ยนสถานะ |
| `created_at` | TIMESTAMP | Not Null, Default CURRENT | เวลาสร้าง |
| `created_by` | INT | FK (`users.user_id`) | ผู้สร้างรายการ |
| `updated_at` | TIMESTAMP | Nullable | เวลาแก้ไขล่าสุด |
| `updated_by` | INT | FK (`users.user_id`) | ผู้แก้ไขล่าสุด |

### Table: `journal_lines`
รายละเอียดเดบิต/เครดิตของแต่ละ journal entry

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `line_id` | INT | PK, Auto Increment | รหัสบรรทัด |
| `entry_id` | INT | FK (`journal_entries.entry_id`), Not Null | รหัสหัวรายการ |
| `account_id` | INT | FK (`chart_of_accounts.account_id`), Not Null | รหัสบัญชีที่กระทบ |
| `debit` | DECIMAL(12,2) | Not Null, Default 0.00 | ยอดเดบิต |
| `credit` | DECIMAL(12,2) | Not Null, Default 0.00 | ยอดเครดิต |
| `line_description` | VARCHAR(255) | Nullable | คำอธิบายระดับบรรทัด |
| `created_at` | TIMESTAMP | Not Null, Default CURRENT | เวลาสร้าง |
| `created_by` | INT | FK (`users.user_id`) | ผู้สร้าง |

**Recommended Constraints:**
* CHECK ว่า `debit >= 0` และ `credit >= 0`
* CHECK ว่าแต่ละบรรทัดห้ามเดบิตและเครดิตมากกว่า 0 พร้อมกัน
* Application หรือ DB validation ต้องตรวจว่าแต่ละ `entry_id` รวมเดบิต = รวมเครดิต

---

## 5. Document Sequence Control (ระบบคุมเลขที่เอกสาร)
รองรับ requirement เรื่อง running number ที่ห้ามซ้ำและห้ามหลุดจาก concurrency

### Table: `document_sequences`
| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `sequence_id` | INT | PK, Auto Increment | รหัส sequence |
| `doc_type` | ENUM | Unique, Not Null | ประเภทเอกสาร เช่น RECEIPT, TAX_INV_ABB, TAX_INV_FULL, CREDIT_NOTE |
| `prefix` | VARCHAR(20) | Not Null | prefix เช่น INV2603 |
| `current_no` | INT | Not Null, Default 0 | Running ล่าสุดที่ถูกใช้งาน |
| `padding_length` | INT | Not Null, Default 4 | จำนวนหลักของ running number |
| `is_active` | BOOLEAN | Default TRUE | สถานะการใช้งาน |
| `updated_at` | TIMESTAMP | Not Null, Default CURRENT | เวลาแก้ไขล่าสุด |
| `updated_by` | INT | FK (`users.user_id`) | ผู้แก้ไขล่าสุด |

**Usage Note:**
เวลาออกเอกสาร ระบบต้อง `SELECT ... FOR UPDATE` หรือใช้ locking mechanism ที่เทียบเท่าเพื่อล็อก row ตาม `doc_type` ก่อนเพิ่ม `current_no`

---

## 6. Shift Management (ระบบกะและการคุมเงินสด)
ใช้บันทึกการเปิดกะ ปิดกะ และผลต่างเงินจริงเมื่อเทียบกับ expected cash

### Table: `shifts`
| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `shift_id` | INT | PK, Auto Increment | รหัสกะ |
| `user_id` | INT | FK (`users.user_id`), Not Null | พนักงานที่เปิดกะ |
| `opened_at` | TIMESTAMP | Not Null | เวลาเปิดกะ |
| `closed_at` | TIMESTAMP | Nullable | เวลาปิดกะ |
| `starting_cash` | DECIMAL(10,2) | Not Null | เงินทอนตั้งต้น |
| `expected_cash` | DECIMAL(10,2) | Nullable | ยอดเงินสดที่ระบบคำนวณได้ตอนปิดกะ |
| `actual_cash` | DECIMAL(10,2) | Nullable | ยอดเงินจริงที่พนักงานนับได้ |
| `difference` | DECIMAL(10,2) | Nullable | actual_cash - expected_cash |
| `status` | ENUM | Not Null, Default 'OPEN' | ('OPEN', 'CLOSED') |
| `status_changed_at` | TIMESTAMP | Nullable | เวลาเปลี่ยนสถานะ |
| `status_changed_by` | INT | FK (`users.user_id`) | ผู้เปลี่ยนสถานะ |
| `closing_note` | VARCHAR(255) | Nullable | หมายเหตุปิดกะ |
| `created_at` | TIMESTAMP | Not Null, Default CURRENT | เวลาสร้าง |
| `created_by` | INT | FK (`users.user_id`) | ผู้สร้าง |
| `updated_at` | TIMESTAMP | Nullable | เวลาแก้ไขล่าสุด |
| `updated_by` | INT | FK (`users.user_id`) | ผู้แก้ไขล่าสุด |

**Recommended Constraints:**
* Partial unique index: หนึ่ง `user_id` มีกะ `OPEN` ได้สูงสุดหนึ่งกะ
* CHECK ว่า `starting_cash >= 0`, `expected_cash >= 0`, `actual_cash >= 0` เมื่อมีค่า

---

## 7. POS & Sales (ระบบขายหน้าร้าน)
รองรับการขายสินค้า เครื่องดื่ม และบริการ/แพ็กเกจ โดยผูกกับกะพนักงาน

### Table: `products`
| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `product_id` | INT | PK, Auto Increment | รหัสสินค้า/บริการ |
| `sku` | VARCHAR(50) | Unique, Nullable | รหัสสินค้า |
| `name` | VARCHAR(100) | Not Null | ชื่อสินค้า เช่น น้ำเปล่า, สมาชิกรายเดือน |
| `product_type` | ENUM | Not Null, Default 'SERVICE' | ('GOODS', 'SERVICE', 'MEMBERSHIP') |
| `price` | DECIMAL(10,2) | Not Null | ราคาขาย |
| `income_account_id` | INT | FK (`chart_of_accounts.account_id`), Not Null | บัญชีรายได้ที่ใช้โพสต์อัตโนมัติ |
| `is_active` | BOOLEAN | Default TRUE | เปิด/ปิดการขาย |
| `created_at` | TIMESTAMP | Not Null, Default CURRENT | เวลาสร้าง |
| `created_by` | INT | FK (`users.user_id`) | ผู้สร้าง |
| `updated_at` | TIMESTAMP | Nullable | เวลาแก้ไขล่าสุด |
| `updated_by` | INT | FK (`users.user_id`) | ผู้แก้ไขล่าสุด |

### Table: `orders`
| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `order_id` | INT | PK, Auto Increment | รหัสบิล |
| `shift_id` | INT | FK (`shifts.shift_id`), Not Null | กะที่ทำรายการขาย |
| `order_number` | VARCHAR(50) | Unique, Nullable | เลขอ้างอิงภายในบิล |
| `subtotal_amount` | DECIMAL(10,2) | Not Null | ยอดก่อน VAT/ส่วนเพิ่ม |
| `vat_amount` | DECIMAL(10,2) | Not Null, Default 0.00 | ยอด VAT |
| `discount_amount` | DECIMAL(10,2) | Not Null, Default 0.00 | ส่วนลด |
| `total_amount` | DECIMAL(10,2) | Not Null | ยอดรวมทั้งบิล |
| `payment_method` | ENUM | Not Null | ('CASH', 'PROMPTPAY', 'CREDIT_CARD') |
| `status` | ENUM | Not Null, Default 'COMPLETED' | ('COMPLETED', 'VOIDED', 'CREDIT_NOTED') |
| `status_changed_at` | TIMESTAMP | Nullable | เวลาเปลี่ยนสถานะ |
| `status_changed_by` | INT | FK (`users.user_id`) | ผู้เปลี่ยนสถานะ |
| `created_at` | TIMESTAMP | Not Null, Default CURRENT | เวลาที่ขาย |
| `created_by` | INT | FK (`users.user_id`) | ผู้ขาย |
| `updated_at` | TIMESTAMP | Nullable | เวลาแก้ไขล่าสุด |
| `updated_by` | INT | FK (`users.user_id`) | ผู้แก้ไขล่าสุด |

### Table: `order_items`
| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `order_item_id` | INT | PK, Auto Increment | รหัสรายการย่อย |
| `order_id` | INT | FK (`orders.order_id`), Not Null | รหัสบิล |
| `product_id` | INT | FK (`products.product_id`), Not Null | รหัสสินค้า/บริการ |
| `quantity` | INT | Not Null | จำนวนที่ซื้อ |
| `unit_price` | DECIMAL(10,2) | Not Null | ราคาต่อหน่วยขณะขาย |
| `subtotal` | DECIMAL(10,2) | Not Null | ราคารวมต่อรายการ |
| `created_at` | TIMESTAMP | Not Null, Default CURRENT | เวลาสร้าง |
| `created_by` | INT | FK (`users.user_id`) | ผู้สร้าง |

**Recommended Constraints:**
* CHECK ว่า `quantity > 0`
* CHECK ว่า `unit_price >= 0` และ `subtotal >= 0`

---

## 8. Tax & Documents (ระบบเอกสารภาษี)
จัดการใบเสร็จ ใบกำกับภาษี และใบลดหนี้ โดยผูกกับ running number และ order ต้นทาง

### Table: `tax_documents`
| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `doc_id` | INT | PK, Auto Increment | รหัสเอกสาร |
| `doc_type` | ENUM | Not Null | ('RECEIPT', 'TAX_INV_ABB', 'TAX_INV_FULL', 'CREDIT_NOTE') |
| `doc_number` | VARCHAR(50) | Unique, Not Null | เลขที่เอกสาร ห้ามซ้ำ |
| `sequence_id` | INT | FK (`document_sequences.sequence_id`) | sequence ที่ใช้รันเลข |
| `ref_order_id` | INT | FK (`orders.order_id`) | อ้างอิง order ที่เกี่ยวข้อง |
| `ref_doc_id` | INT | FK (`tax_documents.doc_id`) | อ้างอิงเอกสารต้นฉบับกรณี credit note |
| `customer_name` | VARCHAR(100) | Nullable | ชื่อลูกค้า |
| `customer_tax_id` | VARCHAR(13) | Nullable | เลขผู้เสียภาษี |
| `subtotal_amount` | DECIMAL(10,2) | Not Null, Default 0.00 | ยอดก่อน VAT |
| `vat_amount` | DECIMAL(10,2) | Not Null, Default 0.00 | ยอด VAT |
| `total_amount` | DECIMAL(10,2) | Not Null | ยอดรวมสุทธิ |
| `status` | ENUM | Not Null, Default 'ACTIVE' | ('ACTIVE', 'VOIDED') |
| `status_changed_at` | TIMESTAMP | Nullable | เวลาเปลี่ยนสถานะ |
| `status_changed_by` | INT | FK (`users.user_id`) | ผู้เปลี่ยนสถานะ |
| `created_at` | TIMESTAMP | Not Null, Default CURRENT | เวลาสร้างเอกสาร |
| `created_by` | INT | FK (`users.user_id`) | ผู้สร้างเอกสาร |
| `updated_at` | TIMESTAMP | Nullable | เวลาแก้ไขล่าสุด |
| `updated_by` | INT | FK (`users.user_id`) | ผู้แก้ไขล่าสุด |

**Business Rule Notes:**
* `CREDIT_NOTE` ต้องมี `ref_doc_id` ชี้กลับไปยังเอกสารต้นฉบับ
* การ void เอกสารต้องไม่ลบ record เดิม

---

## 9. Petty Cash (ระบบเงินสดย่อย/รายจ่าย)
ใช้สำหรับเบิกเงินสดย่อยพร้อมหลักฐาน เพื่อหักจาก expected cash ของกะและลงบัญชีอัตโนมัติ

### Table: `expenses`
| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `expense_id` | INT | PK, Auto Increment | รหัสรายจ่าย |
| `shift_id` | INT | FK (`shifts.shift_id`), Not Null | กะที่เบิกเงิน |
| `expense_date` | TIMESTAMP | Not Null, Default CURRENT | วันเวลาที่เกิดรายจ่าย |
| `expense_account_id` | INT | FK (`chart_of_accounts.account_id`), Not Null | หมวดบัญชีค่าใช้จ่าย |
| `amount` | DECIMAL(10,2) | Not Null | จำนวนเงินที่เบิก |
| `description` | TEXT | Not Null | คำอธิบายรายจ่าย |
| `receipt_image_path` | VARCHAR(255) | Not Null | path หรือ URL ของรูปใบเสร็จ |
| `receipt_file_size_kb` | INT | Nullable | ขนาดไฟล์เพื่อช่วย validate |
| `status` | ENUM | Not Null, Default 'POSTED' | ('POSTED', 'VOIDED') |
| `status_changed_at` | TIMESTAMP | Nullable | เวลาเปลี่ยนสถานะ |
| `status_changed_by` | INT | FK (`users.user_id`) | ผู้เปลี่ยนสถานะ |
| `created_at` | TIMESTAMP | Not Null, Default CURRENT | เวลาสร้าง |
| `created_by` | INT | FK (`users.user_id`) | ผู้เบิก/ผู้บันทึก |
| `updated_at` | TIMESTAMP | Nullable | เวลาแก้ไขล่าสุด |
| `updated_by` | INT | FK (`users.user_id`) | ผู้แก้ไขล่าสุด |

**Recommended Constraints:**
* CHECK ว่า `amount > 0`
* Application validation ต้อง reject ถ้าไฟล์เกิน 5MB

---

## 10. Recommended Logical Relationships (ความสัมพันธ์เชิงตรรกะสำคัญ)
* `users` 1:N `shifts`
* `users` 1:N `journal_entries`
* `users` 1:N `expenses`
* `chart_of_accounts` 1:N `products`
* `chart_of_accounts` 1:N `journal_lines`
* `chart_of_accounts` 1:N `expenses`
* `shifts` 1:N `orders`
* `shifts` 1:N `expenses`
* `orders` 1:N `order_items`
* `orders` 1:N `tax_documents`
* `journal_entries` 1:N `journal_lines`
* `document_sequences` 1:N `tax_documents`
* `tax_documents` 1:N `tax_documents` ผ่าน `ref_doc_id` สำหรับ credit note

---

## 11. Posting Logic Summary (สรุป logic การลงบัญชี)
### 11.1 POS Sale
1. สร้าง `orders`
2. สร้าง `order_items`
3. ล็อก `document_sequences` ตาม `doc_type` และสร้าง `tax_documents`
4. สร้าง `journal_entries`
5. สร้าง `journal_lines`
6. Commit ทั้งชุดพร้อมกัน

**Example Journal:**
* Debit เงินสด/เงินโอน/ลูกหนี้บัตรเครดิต
* Credit บัญชีรายได้ตามสินค้า/บริการ

### 11.2 Petty Cash Expense
1. สร้าง `expenses`
2. สร้าง `journal_entries`
3. สร้าง `journal_lines`
4. Commit ทั้งชุดพร้อมกัน

**Example Journal:**
* Debit บัญชีค่าใช้จ่าย
* Credit เงินสด

### 11.3 Shift Close Difference
1. คำนวณ `expected_cash`
2. บันทึก `actual_cash` และ `difference` ใน `shifts`
3. หาก `difference < 0` ให้สร้าง journal ไปบัญชีเงินขาดบัญชี
4. หาก `difference > 0` ให้สร้าง journal ไปบัญชีเงินเกินบัญชี

---

## 12. Implementation Notes (ข้อเสนอแนะตอนพัฒนา)
* ใช้ soft control ด้วย status แทนการ delete สำหรับ transaction tables
* เพิ่ม index ที่ `orders.shift_id`, `expenses.shift_id`, `journal_entries.source_type + source_id`, `tax_documents.doc_number`
* พิจารณา trigger หรือ service-layer validation เพื่อ enforce journal balance
* หาก DB รองรับ partial unique index ควรใช้กับ active shift ต่อ user