import { cn } from "@/lib/utils";

export function LogoSlot({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#f6d94a]/40 bg-[#f6d94a] text-sm font-black text-black shadow-[0_0_0_1px_rgba(255,214,10,0.18)]">
        LOGO
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-[#f6d94a]/70">ช่องโลโก้</p>
        <p className="mt-1 text-sm font-medium text-white/80">วางโลโก้แบรนด์ของคุณที่นี่</p>
      </div>
    </div>
  );
}