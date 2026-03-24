import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import MembersPage from "@/app/(app)/members/page";
import PosPage from "@/app/(app)/pos/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

async function waitForPosReady() {
  await waitFor(() => {
    expect(screen.queryByText("กำลังโหลดสินค้า...")).not.toBeInTheDocument();
    expect(screen.queryByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).not.toBeInTheDocument();
  }, { timeout: 15000 });
}

describe("Members page", () => {
  beforeEach(() => {
    clearMockSession();
    seedMockSession({
      session: {
        user_id: 2,
        username: "admin",
        full_name: "Niran Ops Lead",
        role: "ADMIN",
        active_shift_id: 701,
      },
      activeShift: {
        shift_id: 701,
        opened_at: new Date().toISOString(),
        starting_cash: 500,
      },
      lastClosedShift: null,
    });
  });

  it("shows a newly purchased membership immediately after POS checkout", async () => {
    const posView = renderWithProviders(<PosPage />);

    await waitForPosReady();

    fireEvent.click(screen.getAllByRole("button", { name: "3-Month Membership" })[0]);

    const selectedProductPanel = screen.getByRole("heading", { name: "3-Month Membership", level: 2 }).closest("section");

    expect(selectedProductPanel).not.toBeNull();

    fireEvent.click(within(selectedProductPanel as HTMLElement).getByRole("button", { name: "เพิ่มลงบิล" }));
    fireEvent.change(screen.getByPlaceholderText("ชื่อลูกค้าสมาชิก"), {
      target: { value: "Somchai Member" },
    });
    fireEvent.click(screen.getByRole("button", { name: "คิดเงิน" }));
    fireEvent.click(screen.getByRole("button", { name: "ยืนยันการคิดเงิน" }));

    await waitFor(() => {
      expect(screen.getByText("คิดเงินสำเร็จ")).toBeInTheDocument();
    }, { timeout: 15000 });

    posView.unmount();
    renderWithProviders(<MembersPage />);

    await waitFor(() => {
      expect(screen.getByText("Somchai Member")).toBeInTheDocument();
    }, { timeout: 15000 });

    expect(screen.getAllByText("3-Month Membership").length).toBeGreaterThan(0);
  }, 20000);

  it("shows members in read-only mode for non-owner users", async () => {
    seedMockSession({
      session: {
        user_id: 3,
        username: "cashier",
        full_name: "Cashier Viewer",
        role: "ADMIN",
        active_shift_id: 701,
      },
      activeShift: {
        shift_id: 701,
        opened_at: new Date().toISOString(),
        starting_cash: 500,
      },
      lastClosedShift: null,
    });

    renderWithProviders(<MembersPage />);

    await waitFor(() => {
      expect(screen.getByText("สมาชิกและวันหมดอายุ")).toBeInTheDocument();
    });

    expect(screen.getByText("บัญชีนี้ดูข้อมูลสมาชิกได้อย่างเดียว การต่ออายุและเริ่มรอบใหม่สงวนสิทธิ์ไว้สำหรับ owner เท่านั้น")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ต่ออายุ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "เริ่มใหม่" })).not.toBeInTheDocument();
  });

  it("lets owner deactivate a member from the members page", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    seedMockSession({
      session: {
        user_id: 1,
        username: "owner",
        full_name: "Lalin Charoen",
        role: "OWNER",
        active_shift_id: 701,
      },
      activeShift: {
        shift_id: 701,
        opened_at: new Date().toISOString(),
        starting_cash: 500,
      },
      lastClosedShift: null,
    });

    const posView = renderWithProviders(<PosPage />);

    await waitForPosReady();

    fireEvent.click(screen.getAllByRole("button", { name: "3-Month Membership" })[0]);

    const selectedProductPanel = screen.getByRole("heading", { name: "3-Month Membership", level: 2 }).closest("section");
    expect(selectedProductPanel).not.toBeNull();

    fireEvent.click(within(selectedProductPanel as HTMLElement).getByRole("button", { name: "เพิ่มลงบิล" }));
    fireEvent.change(screen.getByPlaceholderText("ชื่อลูกค้าสมาชิก"), {
      target: { value: "Owner Toggle Member" },
    });
    fireEvent.click(screen.getByRole("button", { name: "คิดเงิน" }));
    fireEvent.click(screen.getByRole("button", { name: "ยืนยันการคิดเงิน" }));

    await waitFor(() => {
      expect(screen.getByText("คิดเงินสำเร็จ")).toBeInTheDocument();
    }, { timeout: 15000 });

    posView.unmount();
    renderWithProviders(<MembersPage />);

    const memberName = await screen.findByText("Owner Toggle Member", {}, { timeout: 15000 });
    const memberCard = memberName.closest("article");
    expect(memberCard).not.toBeNull();

    fireEvent.click(within(memberCard as HTMLElement).getByRole("button", { name: "ปิดใช้งาน" }));

    await waitFor(() => {
      const refreshedCard = screen.getByText("Owner Toggle Member").closest("article");
      expect(refreshedCard).not.toBeNull();
      expect(within(refreshedCard as HTMLElement).getByRole("button", { name: "เปิดใช้งาน" })).toBeInTheDocument();
    });

    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("lets owner add a member manually and edit membership datetimes", async () => {
    seedMockSession({
      session: {
        user_id: 1,
        username: "owner",
        full_name: "Lalin Charoen",
        role: "OWNER",
        active_shift_id: 701,
      },
      activeShift: {
        shift_id: 701,
        opened_at: new Date().toISOString(),
        starting_cash: 500,
      },
      lastClosedShift: null,
    });

    renderWithProviders(<MembersPage />);

    await waitFor(() => {
      expect(screen.getByText("สมาชิกและวันหมดอายุ")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "เพิ่มสมาชิกเอง" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("ชื่อสมาชิกใหม่"), {
      target: { value: "Manual Owner Member" },
    });
    fireEvent.change(screen.getByLabelText("เบอร์โทรสมาชิกใหม่"), {
      target: { value: "0890009999" },
    });
    fireEvent.change(screen.getByLabelText("ชื่อแพ็กเกจสมาชิกใหม่"), {
      target: { value: "VIP Owner Plan" },
    });
    fireEvent.change(screen.getByLabelText("รอบสมาชิกใหม่"), {
      target: { value: "MONTHLY" },
    });
    fireEvent.change(screen.getByLabelText("วันเวลาเริ่มสมาชิกใหม่"), {
      target: { value: "2026-03-21T09:00" },
    });
    fireEvent.change(screen.getByLabelText("วันเวลาหมดอายุสมาชิกใหม่"), {
      target: { value: "2026-04-20T18:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "เพิ่มสมาชิกเอง" }));

    const createdMemberCard = await screen.findByText("Manual Owner Member", {}, { timeout: 15000 });
    const memberCard = createdMemberCard.closest("article");
    expect(memberCard).not.toBeNull();

    expect(screen.getByText("เพิ่มสมาชิกเรียบร้อยแล้ว")).toBeInTheDocument();
    expect(within(memberCard as HTMLElement).getByText("VIP Owner Plan")).toBeInTheDocument();

    fireEvent.click(within(memberCard as HTMLElement).getByRole("button", { name: "แก้วันเวลา" }));

    fireEvent.change(screen.getByLabelText("วันเวลาเริ่ม-Manual Owner Member"), {
      target: { value: "2026-03-22T07:15" },
    });
    fireEvent.change(screen.getByLabelText("วันเวลาหมดอายุ-Manual Owner Member"), {
      target: { value: "2026-04-25T20:45" },
    });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกวันเวลา" }));

    await waitFor(() => {
      expect(screen.getByText("อัปเดตวันเวลาเริ่มและหมดอายุเรียบร้อยแล้ว")).toBeInTheDocument();
      expect(screen.queryByLabelText("วันเวลาเริ่ม-Manual Owner Member")).not.toBeInTheDocument();
    });
  });

  it("lets owner delete a member from the members page", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    seedMockSession({
      session: {
        user_id: 1,
        username: "owner",
        full_name: "Lalin Charoen",
        role: "OWNER",
        active_shift_id: 701,
      },
      activeShift: {
        shift_id: 701,
        opened_at: new Date().toISOString(),
        starting_cash: 500,
      },
      lastClosedShift: null,
    });

    renderWithProviders(<MembersPage />);

    await waitFor(() => {
      expect(screen.getByText("สมาชิกและวันหมดอายุ")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("ชื่อสมาชิกใหม่"), {
      target: { value: "Delete Owner Member" },
    });
    fireEvent.change(screen.getByLabelText("เบอร์โทรสมาชิกใหม่"), {
      target: { value: "0891112222" },
    });
    fireEvent.change(screen.getByLabelText("ชื่อแพ็กเกจสมาชิกใหม่"), {
      target: { value: "Delete Plan" },
    });
    fireEvent.change(screen.getByLabelText("วันเวลาเริ่มสมาชิกใหม่"), {
      target: { value: "2026-03-21T09:00" },
    });
    fireEvent.change(screen.getByLabelText("วันเวลาหมดอายุสมาชิกใหม่"), {
      target: { value: "2026-04-20T18:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "เพิ่มสมาชิกเอง" }));

    const createdMemberCard = await screen.findByText("Delete Owner Member", {}, { timeout: 15000 });
    const memberCard = createdMemberCard.closest("article");
    expect(memberCard).not.toBeNull();

    fireEvent.click(within(memberCard as HTMLElement).getByRole("button", { name: "ลบสมาชิก" }));

    await waitFor(() => {
      expect(screen.queryByText("Delete Owner Member")).not.toBeInTheDocument();
      expect(screen.getByText("ลบสมาชิก Delete Owner Member เรียบร้อยแล้ว")).toBeInTheDocument();
    });

    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("lets owner delete multiple selected members at once", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    seedMockSession({
      session: {
        user_id: 1,
        username: "owner",
        full_name: "Lalin Charoen",
        role: "OWNER",
        active_shift_id: 701,
      },
      activeShift: {
        shift_id: 701,
        opened_at: new Date().toISOString(),
        starting_cash: 500,
      },
      lastClosedShift: null,
    });

    renderWithProviders(<MembersPage />);

    await waitFor(() => {
      expect(screen.getByText("สมาชิกและวันหมดอายุ")).toBeInTheDocument();
    });

    for (const memberName of ["Bulk Delete 1", "Bulk Delete 2"]) {
      fireEvent.change(screen.getByLabelText("ชื่อสมาชิกใหม่"), {
        target: { value: memberName },
      });
      fireEvent.change(screen.getByLabelText("เบอร์โทรสมาชิกใหม่"), {
        target: { value: "0893334444" },
      });
      fireEvent.change(screen.getByLabelText("ชื่อแพ็กเกจสมาชิกใหม่"), {
        target: { value: "Bulk Delete Plan" },
      });
      fireEvent.change(screen.getByLabelText("วันเวลาเริ่มสมาชิกใหม่"), {
        target: { value: "2026-03-21T09:00" },
      });
      fireEvent.change(screen.getByLabelText("วันเวลาหมดอายุสมาชิกใหม่"), {
        target: { value: "2026-04-20T18:30" },
      });
      fireEvent.click(screen.getByRole("button", { name: "เพิ่มสมาชิกเอง" }));

      await screen.findByText(memberName, {}, { timeout: 15000 });
    }

    fireEvent.click(screen.getByLabelText("เลือกสมาชิก Bulk Delete 1"));
    fireEvent.click(screen.getByLabelText("เลือกสมาชิก Bulk Delete 2"));
    fireEvent.click(screen.getByRole("button", { name: "ลบสมาชิกที่เลือก" }));

    await waitFor(() => {
      expect(screen.queryByText("Bulk Delete 1")).not.toBeInTheDocument();
      expect(screen.queryByText("Bulk Delete 2")).not.toBeInTheDocument();
      expect(screen.getByText("ลบสมาชิก 2 คนเรียบร้อยแล้ว")).toBeInTheDocument();
    });

    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});