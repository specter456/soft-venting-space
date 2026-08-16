import React from "react";
import { PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { Screen } from "../components/Screen";
import { ClayButton, ClayChip, hexWithAlpha } from "../components/Clay";
import { createVaultItem } from "../db";
import { palette, radius } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../nav";

type Props = NativeStackScreenProps<RootStackParamList, "Scribble">;

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  opacity: number;
}

const TOOLS = [
  { id: "pencil", label: "✏️", width: 3, opacity: 1 },
  { id: "crayon", label: "🖍️", width: 9, opacity: 0.85 },
  { id: "brush", label: "🖌️", width: 14, opacity: 0.5 },
  { id: "marker", label: "🖊️", width: 6, opacity: 0.75 },
  { id: "eraser", label: "🧽", width: 18, opacity: 1 },
] as const;

const COLORS = ["#8d7bb0", "#c96a7c", "#5b86a8", "#5f8f77", "#b08a52", "#a08a4f", "#4a4458"];

const BG_COLORS = [
  { id: "paper", hex: "#fdfbf7", emoji: "📄" },
  { id: "lav", hex: "#e6dcf7", emoji: "💜" },
  { id: "sky", hex: "#dcebf5", emoji: "☁️" },
  { id: "mint", hex: "#ddf0e4", emoji: "🌿" },
  { id: "blush", hex: "#f9e0e6", emoji: "🌸" },
  { id: "peach", hex: "#faead2", emoji: "🌙" },
];

/** Free emotional scribbling canvas — no pressure, just let it out. */
export default function ScribbleScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const canvasSize = width - 48;
  const [strokes, setStrokes] = React.useState<Stroke[]>([]);
  const [tool, setTool] = React.useState<(typeof TOOLS)[number]>(TOOLS[0]);
  const [color, setColor] = React.useState(COLORS[0]);
  const [bg, setBg] = React.useState(BG_COLORS[0]);
  const [saved, setSaved] = React.useState(false);

  const current = React.useRef<Stroke | null>(null);

  const pan = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        current.current = {
          points: [{ x: locationX, y: locationY }],
          color: tool.id === "eraser" ? bg.hex : color,
          width: tool.width,
          opacity: tool.opacity,
        };
      },
      onPanResponderMove: (evt) => {
        if (!current.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        current.current.points.push({ x: locationX, y: locationY });
        setStrokes((prev) => {
          const next = [...prev];
          if (current.current) {
            if (next.length > 0 && next[next.length - 1] === current.current) {
              next[next.length - 1] = { ...current.current, points: [...current.current.points] };
            } else {
              next.push({ ...current.current, points: [...current.current.points] });
            }
          }
          return next;
        });
      },
      onPanResponderRelease: () => {
        if (current.current) {
          setStrokes((prev) => {
            const has = prev.includes(current.current as Stroke);
            return has ? prev : [...prev, current.current as Stroke];
          });
        }
        current.current = null;
      },
    }),
  ).current;

  const undo = () => setStrokes((prev) => prev.slice(0, -1));
  const clear = () => setStrokes([]);

  const save = () => {
    createVaultItem({
      kind: "doodle",
      art: "🎨",
      bg: BG_TILE[bg.id],
      caption: "scribbled feeling",
      data: JSON.stringify({ bg: bg.id, strokes }),
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      navigation.goBack();
    }, 900);
  };

  return (
    <Screen title="Scribble" subtitle="Draw how it feels — no one will judge">
      <View style={styles.canvasWrap}>
        <View
          {...pan.panHandlers}
          style={[styles.canvas, { width: canvasSize, height: canvasSize, backgroundColor: bg.hex }]}
        >
          <Text style={[styles.watermark, { fontSize: canvasSize * 0.28 }]}>{bg.emoji}</Text>
          <Svg width={canvasSize} height={canvasSize} style={StyleSheet.absoluteFill}>
            {strokes.map((stroke, si) => (
              <Polyline
                key={si}
                points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={stroke.opacity}
              />
            ))}
          </Svg>
        </View>
      </View>

      <View style={styles.toolRow}>
        {TOOLS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTool(t)}
            style={[
              styles.toolBtn,
              { backgroundColor: tool.id === t.id ? palette.lavender : palette.surface },
            ]}
          >
            <Text style={{ fontSize: 20 }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.colorRow}>
        {COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorSelected]}
          />
        ))}
      </View>

      <View style={styles.bgRow}>
        {BG_COLORS.map((b) => (
          <ClayChip key={b.id} label={b.emoji} selected={bg.id === b.id} onPress={() => setBg(b)} bg={b.hex} />
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <ClayButton label="↩️ Undo" color="cream" onPress={undo} style={{ flex: 1 }} />
        <ClayButton label="🧽 Clear" color="cream" onPress={clear} style={{ flex: 1 }} />
        <ClayButton label={saved ? "💾 Saved!" : "🔒 Save to vault"} color="primary" onPress={save} style={{ flex: 1.4 }} />
      </View>
    </Screen>
  );
}

const BG_TILE: Record<string, string> = {
  paper: "tile-cream",
  lav: "tile-lavender",
  sky: "tile-mist",
  mint: "tile-mint",
  blush: "tile-blush",
  peach: "tile-peach",
};

const styles = StyleSheet.create({
  canvasWrap: { alignItems: "center", marginTop: 6 },
  canvas: {
    borderRadius: radius.lg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: hexWithAlpha(palette.lavender, 0.7),
  },
  watermark: { opacity: 0.35 },
  toolRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 14 },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  colorRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 14 },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorSelected: { borderWidth: 3, borderColor: palette.ink },
  bgRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 14, flexWrap: "wrap" },
});
