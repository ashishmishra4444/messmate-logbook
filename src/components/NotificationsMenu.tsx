import * as React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function NotificationsMenu() {
  // In a real app, this would use a React Query hook to fetch from system_notifications
  const [notifications] = React.useState([
    { id: 1, title: "Low Stock Alert", message: "Tomatoes are running low.", type: "low_stock", isRead: false },
    { id: 2, title: "Pending PO", message: "PO-771357 needs approval.", type: "pending_po", isRead: false },
    { id: 3, title: "Bill Due", message: "Room 101 bill is due tomorrow.", type: "bill_due", isRead: true },
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive"></span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <Badge variant="secondary" className="text-xs">{unreadCount} unread</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          notifications.map((notif) => (
            <DropdownMenuItem key={notif.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
              <div className="flex w-full justify-between items-center">
                <span className={`text-sm font-medium ${!notif.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                  {notif.title}
                </span>
                {!notif.isRead && <span className="h-2 w-2 rounded-full bg-primary"></span>}
              </div>
              <span className="text-xs text-muted-foreground">{notif.message}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
