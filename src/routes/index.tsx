import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, AlertTriangle, Package, Settings2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const DEFAULT_WIDGETS = [
  { id: "kpis", title: "Key Metrics", visible: true },
  { id: "activity", title: "Activity Center", visible: true },
  { id: "pending_tasks", title: "Pending Tasks", visible: true },
];

function Dashboard() {
  const [widgets, setWidgets] = React.useState(DEFAULT_WIDGETS);

  // Load from local storage
  React.useEffect(() => {
    const saved = localStorage.getItem("messmate_dashboard_prefs");
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const toggleWidget = (id: string) => {
    const newWidgets = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
    setWidgets(newWidgets);
    localStorage.setItem("messmate_dashboard_prefs", JSON.stringify(newWidgets));
  };

  const isVisible = (id: string) => widgets.find((w) => w.id === id)?.visible !== false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground">Unified overview of all operations.</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Customize
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Dashboard Widgets</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {widgets.map((widget) => (
              <DropdownMenuCheckboxItem
                key={widget.id}
                checked={widget.visible}
                onCheckedChange={() => toggleWidget(widget.id)}
              >
                {widget.title}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isVisible("kpis") && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">120</div>
              <p className="text-xs text-muted-foreground">+2 from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active POs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
              <p className="text-xs text-muted-foreground">₹45,000 pending value</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹2,45,000</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">3</div>
              <p className="text-xs text-muted-foreground">Items need reordering</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {isVisible("activity") && (
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Activity Center</CardTitle>
              <CardDescription>Chronological timeline of system actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed />
            </CardContent>
          </Card>
        )}
        
        {isVisible("pending_tasks") && (
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Pending Tasks</CardTitle>
              <CardDescription>Actionable items requiring your attention.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center p-3 rounded-lg border bg-card">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Approve PO-771357</p>
                    <p className="text-xs text-muted-foreground">Fresh Farms Dairy - ₹1,250</p>
                  </div>
                  <Button variant="outline" size="sm">Review</Button>
                </div>
                <div className="flex items-center p-3 rounded-lg border bg-card">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Low Stock: Rice (Basmati)</p>
                    <p className="text-xs text-muted-foreground">Available: 15 Kg | Min: 50 Kg</p>
                  </div>
                  <Button variant="outline" size="sm">Reorder</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
