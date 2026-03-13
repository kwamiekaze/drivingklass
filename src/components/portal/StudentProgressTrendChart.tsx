import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendDataPoint } from "@/lib/reportCardGraphData";

interface Props {
  data: TrendDataPoint[];
  className?: string;
}

export function StudentProgressTrendChart({ data, className }: Props) {
  if (data.length < 2) return null;

  return (
    <div className={className}>
      <h4 className="text-sm font-medium mb-3 text-foreground">Overall Score Trend</h4>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(40 80% 55%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(40 80% 55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(0 0% 20%)"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 11 }}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 11 }}
            tickCount={6}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0 0% 8%)",
              border: "1px solid hsl(40 30% 25%)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "hsl(40 30% 80%)", fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="overall"
            stroke="hsl(40 80% 55%)"
            strokeWidth={2}
            fill="url(#trendGradient)"
            dot={{ fill: "hsl(40 80% 55%)", r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "hsl(40 80% 65%)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
