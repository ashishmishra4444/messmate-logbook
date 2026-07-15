import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    
    // We use the admin client (ctx.supabaseAdmin) to bypass RLS since this is a system cron job
    const now = new Date().toISOString();

    // 1. Move 'Upcoming' to 'Active'
    // Condition: Current time is past start_time, and hasn't reached end_time yet.
    const { error: errActive } = await ctx.supabaseAdmin
      .from("meal_sessions")
      .update({ status: 'Active' })
      .eq('status', 'Upcoming')
      .lte('start_time', now)
      .gt('end_time', now);

    // 2. Move 'Active' or 'Closing' or 'Upcoming' (if skipped) to 'Closed'
    // Condition: Current time is past end_time
    const { error: errClosed } = await ctx.supabaseAdmin
      .from("meal_sessions")
      .update({ status: 'Closed' })
      .in('status', ['Upcoming', 'Active', 'Closing'])
      .lte('end_time', now);

    // 3. Move old 'Closed' sessions to 'Archived'
    // Condition: Session date is older than 7 days
    const archiveThreshold = new Date();
    archiveThreshold.setDate(archiveThreshold.getDate() - 7);
    const archiveDateStr = archiveThreshold.toISOString().split('T')[0];

    const { error: errArchive } = await ctx.supabaseAdmin
      .from("meal_sessions")
      .update({ status: 'Archived' })
      .eq('status', 'Closed')
      .lt('session_date', archiveDateStr);

    if (errActive || errClosed || errArchive) {
      console.error("Errors occurred during status transition:", { errActive, errClosed, errArchive });
      return Response.json({
        success: false,
        error: "Errors occurred during transition",
        details: { errActive, errClosed, errArchive }
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "Meal session statuses updated successfully.",
      timestamp: now,
    });
  }),
};
