import { createFileRoute } from "@tanstack/react-router";
import { MemberPassCard } from "@/components/MemberPassCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/member-pass")({
  component: MemberPassPage,
});

function MemberPassPage() {
  // Fetch current user and profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["current_member_profile"],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Not authenticated");

      // In a real app we'd fetch from members table:
      // const { data } = await supabase.from('members').select('*').eq('id', authData.user.id).single();
      // For now, we return mock data combined with real user ID
      
      return {
        id: authData.user.id,
        member_id: "MM-" + authData.user.id.substring(0, 4).toUpperCase(),
        name: authData.user.user_metadata?.full_name || "Demo Member",
        room_number: "A-101",
        meal_plan: "both",
        today_eligibility: "Breakfast, Lunch, Dinner",
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return <div className="p-8 text-center text-muted-foreground">Unable to load profile.</div>;
  }

  // Generate unique device/session IDs (usually stored in local storage)
  const deviceId = "device-" + navigator.userAgent.substring(0, 10).replace(/\s/g, '');
  const sessionId = "sess-" + Date.now().toString().slice(-6);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Digital Pass</h2>
      </div>
      
      <div className="flex items-center justify-center py-10">
        <MemberPassCard 
          memberId={profile.member_id}
          memberName={profile.name}
          roomNumber={profile.room_number}
          mealPlan={profile.meal_plan}
          todayEligibility={profile.today_eligibility}
          deviceId={deviceId}
          sessionId={sessionId}
        />
      </div>
    </div>
  );
}
