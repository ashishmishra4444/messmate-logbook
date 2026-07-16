import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useManualOverride } from "@/lib/api-attendance";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ManualOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSessionId?: string | null;
}

export function ManualOverrideDialog({ open, onOpenChange, activeSessionId }: ManualOverrideDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const { mutate: overrideAttendance, isPending } = useManualOverride();

  // Basic search query (Assuming members table exists)
  const { data: members, isLoading } = useQuery({
    queryKey: ["members_search", search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const { data, error } = await supabase
        .from("members")
        .select("id, name, room_number")
        .ilike("name", `%${search}%`)
        .limit(5);
      
      if (error) {
        console.error("Search error", error);
        return [];
      }
      return data || [];
    },
    enabled: search.length >= 2
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !activeSessionId || !reason) return;
    
    overrideAttendance(
      { memberId: selectedMemberId, mealSessionId: activeSessionId, reason },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSearch("");
          setSelectedMemberId(null);
          setReason("");
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Manual Attendance Override</DialogTitle>
            <DialogDescription>
              Mark a member present manually. This action will be audited.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="member">Search Member</Label>
              <Input
                id="member"
                placeholder="Name or Room..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
              {isLoading && <span className="text-xs text-muted-foreground">Searching...</span>}
              {!isLoading && members && members.length > 0 && (
                <div className="border rounded-md mt-1 divide-y max-h-[150px] overflow-y-auto">
                  {members.map((m) => (
                    <div 
                      key={m.id} 
                      className={`p-2 text-sm cursor-pointer hover:bg-muted ${selectedMemberId === m.id ? 'bg-primary/10' : ''}`}
                      onClick={() => setSelectedMemberId(m.id)}
                    >
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">Room: {m.room_number}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for Override</Label>
              <Select value={reason} onValueChange={setReason} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Forgot Phone">Forgot Phone</SelectItem>
                  <SelectItem value="Phone Dead">Phone Dead</SelectItem>
                  <SelectItem value="Scanner Error">Scanner Error</SelectItem>
                  <SelectItem value="Network Issue">Network Issue</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedMemberId || !reason || isPending || !activeSessionId}>
              {isPending ? "Saving..." : "Mark Present"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
