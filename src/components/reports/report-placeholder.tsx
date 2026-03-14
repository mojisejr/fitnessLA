import type { ReactNode } from "react";

type ReportPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  waitingFor: string[];
  filters: string[];
  integrationStatus?: string;
  demoNote?: string;
  exportFormats?: string[];
  metrics?: Array<{ label: string; value: string; tone?: "neutral" | "warning" | "accent" | "success" | "danger" }>;
  previewColumns?: string[];
  previewRows?: string[][];
  children?: ReactNode;
};

export function ReportPlaceholder({
  eyebrow,
  title,
  description,
  waitingFor,
  filters,
  integrationStatus = "รอข้อมูลรายงาน",
  demoNote = "หน้านี้จัดวางโครงรายงาน, ตัวกรอง, สิทธิ์การเข้าถึง และตำแหน่งการส่งออกไฟล์ไว้แล้ว เพื่อให้ต่อข้อมูลจริงได้ต่อเนื่องเมื่อ backend พร้อม",
  exportFormats = ["CSV", "XLSX"],
  metrics = [
    { label: "ตัวชี้วัดหลัก", value: "รอข้อมูล" },
    { label: "ตัวชี้วัดผลต่าง", value: "รอข้อมูล", tone: "warning" },
    { label: "ตัวชี้วัดสถานะ", value: "รอข้อมูล", tone: "neutral" },
  ],
  previewColumns = ["คอลัมน์ตัวอย่าง", "สถานะ", "หมายเหตุ"],
  previewRows = [
    ["กำลังรอรายละเอียดข้อมูล", "รอดำเนินการ", "โครงตารางพร้อมแล้ว"],
    ["กำลังรอเงื่อนไขตัวกรอง", "รอดำเนินการ", "ตัวกรองพร้อมเชื่อมข้อมูล"],
    ["กำลังรอรูปแบบส่งออก", "รอดำเนินการ", "ปุ่มส่งออกอยู่ในตำแหน่งใช้งานจริง"],
  ],
  children,
}: ReportPlaceholderProps) {
  const metricTone = {
    neutral: "border-line bg-[#161510]",
    warning: "border-warning bg-warning-soft",
    accent: "border-accent bg-accent-soft",
    success: "border-[#2ea36a] bg-[rgba(46,163,106,0.16)]",
    danger: "border-[#d44949] bg-[rgba(212,73,73,0.16)]",
  } as const;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{description}</p>
            <div className="mt-4 inline-flex rounded-full border border-line bg-background px-4 py-2 text-xs font-semibold text-foreground">
              {integrationStatus}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {exportFormats.map((format) => (
              <button
                key={format}
                type="button"
                disabled
                className="rounded-full border border-line bg-background px-4 py-2 text-sm font-semibold text-muted opacity-80"
              >
                ส่งออก {format}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-line bg-surface-strong p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">สถานะหน้ารายงาน</p>
        <p className="mt-3 text-sm leading-7 text-foreground">{demoNote}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="rounded-[28px] border border-line bg-surface-strong p-6">
          <p className="text-xs font-semibold tracking-[0.08em] text-muted">ชุดตัวกรอง</p>
          <div className="mt-4 space-y-3">
            {filters.map((filter) => (
              <div key={filter} className="rounded-[20px] border border-dashed border-line bg-[#161510] px-4 py-4 text-sm text-foreground">
                {filter}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-line bg-surface-strong p-6">
          <p className="text-xs font-semibold tracking-[0.08em] text-muted">พื้นที่รายงาน</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className={`rounded-[22px] border p-5 ${metricTone[metric.tone ?? "neutral"]}`}>
                <p className="text-sm text-muted">{metric.label}</p>
                <p className={`mt-3 text-2xl font-semibold ${metric.tone === "success" ? "text-[#8dffbe]" : metric.tone === "danger" ? "text-[#ff9f9f]" : "text-foreground"}`}>{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-line bg-[#161510]">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-[#0d0d0a]">
                <tr>
                  {previewColumns.map((column) => (
                    <th key={column} className="px-4 py-3 text-left font-semibold text-muted">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {previewRows.map((row, index) => (
                  <tr key={`${row[0]}-${index}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${cell}-${cellIndex}`} className="px-4 py-4 text-[#f3e8ba]">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 rounded-3xl border border-dashed border-line bg-background p-6">
            <p className="text-sm font-semibold text-foreground">รายการที่ยังรอข้อมูลเพิ่ม</p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-muted">
              {waitingFor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          {children ? <div className="mt-5">{children}</div> : null}
        </div>
      </section>
    </div>
  );
}