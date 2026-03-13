import { useMemo } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, Legend, ResponsiveContainer, Tooltip,
} from "recharts";
import { RadarDataPoint } from "@/lib/reportCardGraphData";

interface Props {
  data: RadarDataPoint[];
  className?: string;
}

// Short labels for mobile
const SHORT_LABELS: Record<string, string> = {
  acceleration: "Accel",
  braking: "Brake",
  left_turns: "L Turn",
  right_turns: "R Turn",
  speed_maintenance: "Speed",
  lane_maintenance: "Lane",
  blind_spots: "Blind",
  signal_usage: "Signal",
  changing_lanes: "Chg Lane",
  following_distance: "Follow",
  road_sign_awareness: "Signs",
  distractions: "Distract",
  general_parking: "Park",
  reverse_parking: "Rev Park",
  parallel_parking: "Par Park",
  straight_line_backing: "Str Back",
  turn_about: "Turn",
  merging: "Merge",
  interstate: "Intrst",
};

export function StudentProgressRadarChart({ data, className }: Props) {
  const chartData = useMemo(() =>
    data.map(d => ({
      ...d,
      shortLabel: SHORT_LABELS[d.skill] || d.label,
    })),
    [data]
  );

  if (data.length === 0) return null;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={340}>
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid
            stroke="hsl(40 20% 30% / 0.3)"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis
            dataKey="shortLabel"
            tick={{ fill: "hsl(40 30% 70%)", fontSize: 9, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fill: "hsl(0 0% 50%)", fontSize: 8 }}
            tickCount={6}
          />
          {/* First lesson - blue */}
          <Radar
            name="First Lesson"
            dataKey="first"
            stroke="hsl(210 80% 55%)"
            fill="hsl(210 80% 55%)"
            fillOpacity={0.12}
            strokeWidth={1.5}
          />
          {/* Average - gold */}
          <Radar
            name="Average"
            dataKey="average"
            stroke="hsl(40 80% 55%)"
            fill="hsl(40 80% 55%)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          {/* Latest - green */}
          <Radar
            name="Latest"
            dataKey="latest"
            stroke="hsl(145 65% 45%)"
            fill="hsl(145 65% 45%)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0 0% 8%)",
              border: "1px solid hsl(40 30% 25%)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "hsl(40 30% 80%)", fontWeight: 600 }}
            itemStyle={{ color: "hsl(0 0% 85%)" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
