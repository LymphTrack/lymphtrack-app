import { View, Text } from "react-native";
import { LineChart, Line, XAxis, YAxis, Legend, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { COLORS } from "@/constants/colors";
import { commonStyles } from "@/constants/styles";

interface GraphProps {
  graphData: any[];
  lines?: string[];
  labels?: Record<string, string>;
  height?: number;
  title?: string;
  exportRef?: React.RefObject<HTMLDivElement>;
  showLegend?: boolean;
}

export const GraphView = ({
  graphData,
  lines = [],
  labels = {},
  height = 500,
  title,
  exportRef,
  showLegend = true,
}: GraphProps) => {
  if (!graphData || graphData.length === 0) {
    return (
      <View style={[commonStyles.card, { alignItems: "center", justifyContent: "center", height: 300 }]}>
        <Text style={commonStyles.subtitle}>No data available.</Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 40, maxWidth: 1120, width: "100%", alignSelf: "center" }}>
        <View style={commonStyles.card}>
        {title && (
            <Text style={[commonStyles.sectionTitle, { fontSize: 16, marginBottom: 10, marginTop : 0 }]}>{title}</Text>
        )}

        <div ref={exportRef} style={{ height, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData} margin={{ top: 40, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid stroke={COLORS.grayLight} />
                <XAxis
                dataKey="freq"
                tickFormatter={(value) => Number(value).toFixed(3)}
                label={{
                    value: "Frequency (GHz)",
                    position: "top",
                    fill: COLORS.subtitle,
                    fontSize: 14,
                    fontWeight: "500",
                    dy: 40,
                }}
                />
                <YAxis
                label={{
                    value: "Return Loss (dB)",
                    angle: -90,
                    position: "insideLeft",
                    fill: COLORS.subtitle,
                    fontSize: 14,
                    fontWeight: "500",
                }}
                />
                <Tooltip />

                {lines.map((key, i) => (
                <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[`color${(i % 6) + 1}`] || COLORS.primary}
                    strokeWidth={2}
                    dot={false}
                    name={labels[key] || key}
                />
                ))}

                {showLegend && (
                <Legend
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ paddingTop: 40, fontSize: 14, color: COLORS.subtitle }}
                />
                )}
            </LineChart>
            </ResponsiveContainer>
        </div>
        </View>
    </View>
  );
};


export const MultiPositionGraphs = ({
  allGraphData,
  visitNames,
}: {
  allGraphData: Record<number, any[]>;
  visitNames: Record<string, string>;
}) => {
  const orderedKeys = Object.keys(visitNames);

  return (
    <View style={{ marginBottom: 40, maxWidth: 1120, width: "100%", alignSelf: "center" }}>
            <Text
                style={[
                commonStyles.sectionTitle,
                { fontSize: 16, marginTop: 0, marginBottom: 12 },
                ]}
            >
                All positions (1 to 6) across visits
            </Text>

            <View
                style={{
                marginBottom: 10,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                }}
            >
                {orderedKeys.map((key, i) => (
                <View
                    key={key}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                    <View
                    style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        backgroundColor:
                        COLORS[`color${(i % 6) + 1}`] || COLORS.primary,
                    }}
                    />
                    <Text style={{ color: COLORS.subtitle, fontSize: 14 }}>
                    {visitNames[key] || `Visit ${i + 1}`}
                    </Text>
                </View>
                ))}
            </View>

            <View
                style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                rowGap: 16,
                }}
            >
                {[1, 2, 3, 4, 5, 6].map((pos) => {
                const data = allGraphData[pos] || [];

                return (
                    <View
                    key={pos}
                    style={{
                        width: "48%",
                        backgroundColor: "white",
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: COLORS.grayLight,
                        padding: 10,
                    }}
                    >
                    <Text
                        style={[commonStyles.subtitle, { marginBottom: 8, fontWeight: "600" }]}
                    >
                        Position {pos}
                    </Text>

                    {data.length === 0 ? (
                        <View
                        style={{
                            height: 240,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        >
                        <Text style={commonStyles.subtitle}>No data.</Text>
                        </View>
                    ) : (
                        <div style={{ height: 240, width: "100%" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                            data={data}
                            margin={{ top: 16, right: 10, left: 10, bottom: 10 }}
                            >
                            <CartesianGrid stroke={COLORS.grayLight} />
                            <XAxis
                                dataKey="freq"
                                tickFormatter={(v) => Number(v).toFixed(2)}
                            />
                            <YAxis />
                            <Tooltip />
                            {orderedKeys
                                .filter((k) => k in data[0])
                                .map((key, i) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={
                                    COLORS[`color${(i % 6) + 1}`] || COLORS.primary
                                    }
                                    strokeWidth={1.8}
                                    dot={false}
                                    name={visitNames[key] || `Visit ${i + 1}`}
                                />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                        </div>
                    )}
                    </View>
                );
                })}
            </View>
    </View>
  );
};

