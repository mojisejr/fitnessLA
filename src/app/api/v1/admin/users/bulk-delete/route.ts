import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteManagedUsers } from "@/features/staff/services";
import { resolveSessionFromRequest } from "@/lib/session";

const bulkDeleteManagedUsersSchema = z.object({
  user_ids: z.array(z.string().trim().min(1)).min(1),
});

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "ต้องยืนยันตัวตนก่อนลบผู้ใช้" },
      { status: 401 },
    );
  }

  if (session.role !== "OWNER") {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "สิทธิ์ไม่เพียงพอสำหรับลบผู้ใช้" },
      { status: 403 },
    );
  }

  const parseResult = bulkDeleteManagedUsersSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "ข้อมูลการลบผู้ใช้ไม่ถูกต้อง", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteManagedUsers(parseResult.data.user_ids);
    return NextResponse.json(deleted, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "MANAGED_USER_IDS_REQUIRED") {
      return NextResponse.json(
        { code: "MANAGED_USER_IDS_REQUIRED", message: "ต้องเลือกรายชื่อพนักงานอย่างน้อย 1 รายการ" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "MANAGED_USER_NOT_FOUND") {
      return NextResponse.json(
        { code: "MANAGED_USER_NOT_FOUND", message: "ไม่พบผู้ใช้ที่ต้องการลบบางรายการ" },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "MANAGED_USER_DELETE_FORBIDDEN") {
      return NextResponse.json(
        { code: "MANAGED_USER_DELETE_FORBIDDEN", message: "ลบได้เฉพาะ admin และ cashier เท่านั้น" },
        { status: 400 },
      );
    }

    console.error("POST /api/v1/admin/users/bulk-delete failed", error);
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถลบผู้ใช้ที่เลือกได้" },
      { status: 500 },
    );
  }
}