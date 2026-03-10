import Image from "next/image";
import { cn } from "@/lib/utils";

export function LogoSlot({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-[#f6d94a]/40 bg-[#f6d94a] shadow-[0_0_0_1px_rgba(255,214,10,0.18)]">
        <Image src="/logo.jpg" alt="fitnessLA logo" fill className="object-cover" priority />
      </div>
      <div>
        <p className="text-xs font-semibold text-[#f6d94a]/80">fitnessLA</p>
        <p className="mt-1 text-sm font-medium text-white/82">ระบบหน้าร้านและบัญชีรายวัน</p>
      </div>
    </div>
  );
}