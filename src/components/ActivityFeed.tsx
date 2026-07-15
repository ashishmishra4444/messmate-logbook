import * as React from "react";
import { User, CheckCircle2, FileText, ShoppingCart, Truck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ActivityFeed() {
  const [activities] = React.useState([
    {
      id: 1,
      user: "Admin",
      action: "Member Added",
      description: "Added John Doe (Room 101)",
      time: new Date(Date.now() - 1000 * 60 * 5),
      icon: User,
      color: "text-blue-500",
    },
    {
      id: 2,
      user: "System",
      action: "PO Approved",
      description: "PO-771357 was approved.",
      time: new Date(Date.now() - 1000 * 60 * 45),
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      id: 3,
      user: "Manager",
      action: "Goods Received",
      description: "GRN-257286 processed (Tomatoes).",
      time: new Date(Date.now() - 1000 * 60 * 120),
      icon: Truck,
      color: "text-orange-500",
    },
    {
      id: 4,
      user: "Admin",
      action: "Bill Generated",
      description: "Generated July invoices for 120 members.",
      time: new Date(Date.now() - 1000 * 60 * 60 * 24),
      icon: FileText,
      color: "text-purple-500",
    }
  ]);

  return (
    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
      {activities.map((activity) => (
        <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
            <activity.icon className={`w-4 h-4 ${activity.color}`} />
          </div>
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between space-x-2 mb-1">
              <div className="font-bold text-foreground text-sm">{activity.action}</div>
              <time className="text-xs font-medium text-muted-foreground">{formatDistanceToNow(activity.time, { addSuffix: true })}</time>
            </div>
            <div className="text-muted-foreground text-sm">{activity.description}</div>
            <div className="text-xs text-muted-foreground mt-2 font-medium">By {activity.user}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
