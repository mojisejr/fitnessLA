import type { ReactNode } from "react";

type ReportPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  waitingFor: string[];
  filters: string[];
  exportFormats?: string[];
  children?: ReactNode;
};

export function ReportPlaceholder({
  eyebrow,
  title,
  description,
  waitingFor,
  filters,
  exportFormats = ["CSV", "XLSX"],
  children,
}: ReportPlaceholderProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {exportFormats.map((format) => (
              <button
                key={format}
                type="button"
                className="rounded-full border border-line bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
              >
                ส่งออก {format}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="rounded-[28px] border border-line bg-surface-strong p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">ชุดตัวกรอง</p>
          <div className="mt-4 space-y-3">
            {filters.map((filter) => (
              <div key={filter} className="rounded-[20px] border border-dashed border-line bg-background px-4 py-4 text-sm text-muted">
                {filter}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-line bg-surface-strong p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">พื้นที่รายงาน</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {["ตัวชี้วัดหลัก", "ตัวชี้วัดผลต่าง", "ตัวชี้วัดสถานะ"].map((metric) => (
              <div key={metric} className="rounded-[22px] border border-line bg-white p-5">
                <p className="text-sm text-muted">{metric}</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">รอ API</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[24px] border border-dashed border-line bg-background p-6">
            <p className="text-sm font-semibold text-foreground">กำลังรอ backend contract</p>
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