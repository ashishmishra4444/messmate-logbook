import { useState } from "react";
import { useMealSessions, useCreateMealSession, useUpdateMealSession } from "@/lib/api-meal-sessions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Plus, Save, Clock, Users, ArrowRightCircle } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type MealSessionStatus = Database["public"]["Enums"]["meal_session_status"];
type MealType = Database["public"]["Enums"]["meal_type"];

export function MealSessionsAdmin() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const { data: sessions, isLoading } = useMealSessions({ date });
  const createSession = useCreateMealSession();
  const updateSession = useUpdateMealSession();

  const [newSession, setNewSession] = useState({
    name: "",
    meal_type: "breakfast" as MealType,
    start_time: "08:00",
    end_time: "10:00",
    expected_count: 0,
    max_capacity: 100
  });

  const handleCreate = () => {
    if (!newSession.name) return;
    
    // Convert times to UTC Timestamps for the selected date
    const startObj = new Date(`${date}T${newSession.start_time}:00`);
    const endObj = new Date(`${date}T${newSession.end_time}:00`);
    
    createSession.mutate({
      name: newSession.name,
      meal_type: newSession.meal_type,
      session_date: date,
      start_time: startObj.toISOString(),
      end_time: endObj.toISOString(),
      expected_count: newSession.expected_count,
      max_capacity: newSession.max_capacity
    });
  };

  const handleStatusChange = (id: string, newStatus: MealSessionStatus) => {
    updateSession.mutate({ id, updates: { status: newStatus } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-foreground">Manage Meal Sessions</h2>
        <Input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
          className="w-40"
        />
      </div>

      <div className="grid gap-5 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="text-sm font-semibold">Create New Session</h3>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">Name</Label>
            <Input 
              placeholder="e.g. Morning Breakfast" 
              value={newSession.name} 
              onChange={e => setNewSession({...newSession, name: e.target.value})} 
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Meal Type</Label>
            <Select 
              value={newSession.meal_type} 
              onValueChange={(val: MealType) => setNewSession({...newSession, meal_type: val})}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Start Time</Label>
            <Input 
              type="time" 
              value={newSession.start_time} 
              onChange={e => setNewSession({...newSession, start_time: e.target.value})} 
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">End Time</Label>
            <Input 
              type="time" 
              value={newSession.end_time} 
              onChange={e => setNewSession({...newSession, end_time: e.target.value})} 
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Expected Count</Label>
            <Input 
              type="number" 
              value={newSession.expected_count} 
              onChange={e => setNewSession({...newSession, expected_count: parseInt(e.target.value) || 0})} 
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Max Capacity</Label>
            <Input 
              type="number" 
              value={newSession.max_capacity} 
              onChange={e => setNewSession({...newSession, max_capacity: parseInt(e.target.value) || 0})} 
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleCreate} disabled={createSession.isPending} className="gap-2">
            <Plus className="h-4 w-4" /> Create Session
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground p-4 text-center">Loading sessions...</div>
        ) : sessions?.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center border rounded-xl bg-secondary/20">
            No sessions found for {date}
          </div>
        ) : (
          sessions?.map(session => (
            <div key={session.id} className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-xl bg-card shadow-sm gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-primary/10 text-primary rounded-lg">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    {session.name}
                    <span className="text-[10px] uppercase bg-secondary px-2 py-0.5 rounded-full">
                      {session.meal_type}
                    </span>
                  </h4>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                    <span>{format(new Date(session.start_time), 'HH:mm')} - {format(new Date(session.end_time), 'HH:mm')}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3"/> {session.current_attendance} / {session.max_capacity}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Select 
                  value={session.status} 
                  onValueChange={(val: MealSessionStatus) => handleStatusChange(session.id, val)}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Upcoming">Upcoming</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Closing">Closing</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                {session.status === 'Upcoming' && (
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleStatusChange(session.id, 'Active')}>
                    <ArrowRightCircle className="h-3.5 w-3.5 mr-1" /> Start
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
