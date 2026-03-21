import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as trainersGET, POST as trainersPOST } from "../../src/app/api/v1/trainers/route";
import { PATCH as trainerToggleActivePATCH } from "../../src/app/api/v1/trainers/[trainerId]/toggle-active/route";

const mockResolveSessionFromRequest = vi.fn();
const mockListTrainers = vi.fn();
const mockCreateTrainer = vi.fn();
const mockToggleTrainerActive = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/operations/services", () => ({
  listTrainers: (...args: unknown[]) => mockListTrainers(...args),
  createTrainer: (...args: unknown[]) => mockCreateTrainer(...args),
  toggleTrainerActive: (...args: unknown[]) => mockToggleTrainerActive(...args),
}));

describe("trainers routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /trainers returns list with 200", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockListTrainers.mockResolvedValue([
      {
        trainer_id: "t1",
        trainer_code: "TR001",
        full_name: "สมชาย ยิมเนส",
        nickname: "ชาย",
        phone: "0891234567",
        is_active: true,
        active_customer_count: 3,
        assignments: [
          {
            enrollment_id: "e1",
            trainer_id: "t1",
            trainer_name: "สมชาย ยิมเนส",
            customer_name: "ลูกค้าทดสอบ",
            member_id: "m1",
            package_name: "เทรนเดี่ยว 1 ครั้ง",
            package_sku: "PT-01",
            started_at: "2026-03-21T00:00:00.000Z",
            expires_at: null,
            session_limit: 1,
            sessions_remaining: 1,
            price: 500,
            status: "ACTIVE",
            closed_at: null,
            close_reason: null,
            updated_at: "2026-03-21T00:00:00.000Z",
          },
        ],
      },
    ]);

    const response = await trainersGET(new Request("http://localhost/api/v1/trainers"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      trainer_code: "TR001",
      full_name: "สมชาย ยิมเนส",
      is_active: true,
      active_customer_count: 3,
    });
    expect(body[0].assignments).toHaveLength(1);
    expect(body[0].assignments[0]).toMatchObject({
      customer_name: "ลูกค้าทดสอบ",
      status: "ACTIVE",
    });
  });

  it("GET /trainers returns 401 for unauthenticated request", async () => {
    mockResolveSessionFromRequest.mockResolvedValue(null);

    const response = await trainersGET(new Request("http://localhost/api/v1/trainers"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("GET /trainers returns empty array when no trainers exist", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "STAFF" });
    mockListTrainers.mockResolvedValue([]);

    const response = await trainersGET(new Request("http://localhost/api/v1/trainers"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  it("POST /trainers creates trainer with 201", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockCreateTrainer.mockResolvedValue({
      trainer_id: "t9",
      trainer_code: "TR009",
      full_name: "Trainer New",
      nickname: "Neo",
      phone: "0800000000",
      is_active: true,
      active_customer_count: 0,
    });

    const response = await trainersPOST(
      new Request("http://localhost/api/v1/trainers", {
        method: "POST",
        body: JSON.stringify({ full_name: "Trainer New", nickname: "Neo", phone: "0800000000" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockCreateTrainer).toHaveBeenCalledWith({
      full_name: "Trainer New",
      nickname: "Neo",
      phone: "0800000000",
    });
    expect(body.trainer_code).toBe("TR009");
  });

  it("POST /trainers returns 403 for admin", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });

    const response = await trainersPOST(
      new Request("http://localhost/api/v1/trainers", {
        method: "POST",
        body: JSON.stringify({ full_name: "Trainer New" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
    expect(mockCreateTrainer).not.toHaveBeenCalled();
  });

  it("POST /trainers returns 403 for cashier", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });

    const response = await trainersPOST(
      new Request("http://localhost/api/v1/trainers", {
        method: "POST",
        body: JSON.stringify({ full_name: "Trainer New" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
    expect(mockCreateTrainer).not.toHaveBeenCalled();
  });

  it("PATCH /trainers/:trainerId/toggle-active returns toggled trainer for owner", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockToggleTrainerActive.mockResolvedValue({
      trainer_id: "t1",
      trainer_code: "TR001",
      full_name: "สมชาย ยิมเนส",
      nickname: "ชาย",
      phone: "0891234567",
      is_active: false,
      active_customer_count: 0,
    });

    const response = await trainerToggleActivePATCH(
      new Request("http://localhost/api/v1/trainers/t1/toggle-active", { method: "PATCH" }),
      { params: Promise.resolve({ trainerId: "t1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ trainer_id: "t1", is_active: false });
    expect(mockToggleTrainerActive).toHaveBeenCalledWith("t1");
  });

  it("PATCH /trainers/:trainerId/toggle-active returns 403 for admin", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });

    const response = await trainerToggleActivePATCH(
      new Request("http://localhost/api/v1/trainers/t1/toggle-active", { method: "PATCH" }),
      { params: Promise.resolve({ trainerId: "t1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      code: "FORBIDDEN",
      message: "สิทธิ์ไม่เพียงพอสำหรับปรับสถานะเทรนเนอร์",
    });
    expect(mockToggleTrainerActive).not.toHaveBeenCalled();
  });

  it("PATCH /trainers/:trainerId/toggle-active returns 409 when trainer still has active assignments", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockToggleTrainerActive.mockRejectedValue(new Error("TRAINER_HAS_ACTIVE_ASSIGNMENTS"));

    const response = await trainerToggleActivePATCH(
      new Request("http://localhost/api/v1/trainers/t1/toggle-active", { method: "PATCH" }),
      { params: Promise.resolve({ trainerId: "t1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      code: "TRAINER_HAS_ACTIVE_ASSIGNMENTS",
      message: "ยังมีลูกเทรนที่ใช้งานอยู่ จึงยังปิดใช้งานเทรนเนอร์ไม่ได้",
    });
  });
});
