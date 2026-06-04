import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper, Video, BarChart3, Clock } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-background-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">News Queue</CardTitle>
            <Newspaper className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-gray-400">Pending stories</p>
          </CardContent>
        </Card>

        <Card className="bg-background-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Videos Generated</CardTitle>
            <Video className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-gray-400">Today</p>
          </CardContent>
        </Card>

        <Card className="bg-background-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Watch Time</CardTitle>
            <BarChart3 className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,240h</div>
            <p className="text-xs text-gray-400">This month</p>
          </CardContent>
        </Card>

        <Card className="bg-background-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Last Upload</CardTitle>
            <Clock className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15m ago</div>
            <p className="text-xs text-gray-400">Auto-uploaded</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
