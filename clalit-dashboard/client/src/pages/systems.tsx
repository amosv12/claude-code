import { SystemsStatus } from "@/components/systems-status";

export default function Systems() {
  return (
    <div className="space-y-6">
      <SystemsStatus compact={false} />
    </div>
  );
}
