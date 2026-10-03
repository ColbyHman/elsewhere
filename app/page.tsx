import { AppV2 } from "@/components/app-v2";
import { MemoryProvider } from "@/lib/store";

export default function Home() {
  return (
    <MemoryProvider>
      <AppV2 />
    </MemoryProvider>
  );
}
