import Image from "next/image";
import { cn } from "@/lib/utils";

export function LogoSlot({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-22 w-22 overflow-hidden rounded-[30px] border border-[#f6d94a]/55 bg-[#f6d94a] shadow-[0_0_0_1px_rgba(255,214,10,0.24)]", className)}>
        <Image src="/logo.jpg" alt="fitnessLA logo" fill className="object-cover scale-[1.04]" priority />
    </div>
  );
}