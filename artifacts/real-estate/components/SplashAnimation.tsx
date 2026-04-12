import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";

const { width, height } = Dimensions.get("window");
const GOLD  = "#C9A022";
const GREEN = "#0d2318";

interface Props {
  onFinish: () => void;
}

// 8 property images flying in all 8 directions
const EXPLODE_ITEMS = [
  { src: require("@/assets/images/apt1.jpg"),   dx:  0,      dy: -1,      dist: 0.44, size: 0.28, delay: 50,  rotate: 12  },
  { src: require("@/assets/images/apt2.jpg"),   dx:  0.707,  dy: -0.707,  dist: 0.50, size: 0.24, delay: 80,  rotate: -18 },
  { src: require("@/assets/images/villa1.jpg"), dx:  1,      dy:  0,      dist: 0.46, size: 0.26, delay: 60,  rotate: 15  },
  { src: require("@/assets/images/apt3.jpg"),   dx:  0.707,  dy:  0.707,  dist: 0.48, size: 0.24, delay: 100, rotate: -22 },
  { src: require("@/assets/images/villa2.jpg"), dx:  0,      dy:  1,      dist: 0.44, size: 0.28, delay: 40,  rotate: 10  },
  { src: require("@/assets/images/villa3.jpg"), dx: -0.707,  dy:  0.707,  dist: 0.50, size: 0.24, delay: 90,  rotate: -14 },
  { src: require("@/assets/images/apt1.jpg"),   dx: -1,      dy:  0,      dist: 0.46, size: 0.26, delay: 70,  rotate: 20  },
  { src: require("@/assets/images/villa1.jpg"), dx: -0.707,  dy: -0.707,  dist: 0.48, size: 0.24, delay: 55,  rotate: -16 },
];

function ExplodeItem({
  src, dx, dy, dist, size, delay, rotate, startAnim,
}: {
  src: any; dx: number; dy: number; dist: number;
  size: number; delay: number; rotate: number; startAnim: boolean;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(1)).current;
  const rotation   = useRef(new Animated.Value(0)).current;

  const imgW = width * size;
  const imgH = imgW * 0.65;

  useEffect(() => {
    if (!startAnim) return;
    const targetX = dx * width * dist;
    const targetY = dy * height * dist;

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(scale,      { toValue: 1,      duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(translateX, { toValue: targetX, duration: 950, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: targetY, duration: 950, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(rotation,   { toValue: rotate,  duration: 950, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, [startAnim]);

  const rot = rotation.interpolate({ inputRange: [-360, 360], outputRange: ["-360deg", "360deg"] });

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: imgW,
        height: imgH,
        left: width / 2 - imgW / 2,
        top: height / 2 - imgH / 2,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "rgba(201,160,34,0.5)",
        transform: [{ translateX }, { translateY }, { scale }, { rotate: rot }],
        opacity,
      }}
    >
      <Image source={src} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
    </Animated.View>
  );
}

export default function SplashAnimation({ onFinish }: Props) {
  // Flash burst
  const flashScale   = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(1)).current;

  // 3 shockwave rings
  const ring0Scale = useRef(new Animated.Value(0)).current; const ring0Opacity = useRef(new Animated.Value(0.85)).current;
  const ring1Scale = useRef(new Animated.Value(0)).current; const ring1Opacity = useRef(new Animated.Value(0.70)).current;
  const ring2Scale = useRef(new Animated.Value(0)).current; const ring2Opacity = useRef(new Animated.Value(0.55)).current;

  // Gold center orb
  const orbScale   = useRef(new Animated.Value(0)).current;
  const orbOpacity = useRef(new Animated.Value(0)).current;

  // Logo + text
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.5)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY       = useRef(new Animated.Value(18)).current;
  const lineScale    = useRef(new Animated.Value(0)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;
  const tagY         = useRef(new Animated.Value(10)).current;

  // Overall fade-out
  const exitOpacity = useRef(new Animated.Value(1)).current;

  // Controls when property images start flying
  const [explode, setExplode] = React.useState(false);

  const RING_BASE = Math.min(width, height) * 0.18;

  useEffect(() => {
    // Trigger explosion immediately
    setTimeout(() => setExplode(true), 30);

    Animated.sequence([
      // 1 — Flash burst + rings + orb + property explosion (0–1.2s)
      Animated.parallel([
        // White flash
        Animated.parallel([
          Animated.timing(flashScale,   { toValue: 10,  duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0,   duration: 700, useNativeDriver: true }),
        ]),
        // Rings
        Animated.parallel([
          Animated.timing(ring0Scale,   { toValue: 5.5, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(ring0Opacity, { toValue: 0,   duration: 1100, useNativeDriver: true }),
        ]),
        Animated.sequence([Animated.delay(100), Animated.parallel([
          Animated.timing(ring1Scale,   { toValue: 7,   duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(ring1Opacity, { toValue: 0,   duration: 1100, useNativeDriver: true }),
        ])]),
        Animated.sequence([Animated.delay(200), Animated.parallel([
          Animated.timing(ring2Scale,   { toValue: 9,   duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(ring2Opacity, { toValue: 0,   duration: 1100, useNativeDriver: true }),
        ])]),
        // Gold orb
        Animated.parallel([
          Animated.timing(orbScale,   { toValue: 1, duration: 550, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
          Animated.timing(orbOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]),
      ]),

      // 2 — Logo appears (1.2–2s)
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 650, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoScale,   { toValue: 1, duration: 750, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
        // Hide orb as logo appears
        Animated.timing(orbOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),

      // 3 — Title reveals (2–2.8s)
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(titleY,       { toValue: 0, duration: 550, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(lineScale,    { toValue: 1, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),

      // 4 — Tagline (2.8–3.4s)
      Animated.parallel([
        Animated.timing(tagOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(tagY,       { toValue: 0, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),

      // 5 — Hold (3.4–4.3s)
      Animated.delay(900),

      // 6 — Fade out (4.3–5s)
      Animated.timing(exitOpacity, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: exitOpacity }]}>
      {/* Subtle bg glow */}
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />

      {/* White flash burst */}
      <Animated.View style={[
        styles.flash,
        { transform: [{ scale: flashScale }], opacity: flashOpacity }
      ]} />

      {/* 3 shockwave rings */}
      {[
        [ring0Scale, ring0Opacity],
        [ring1Scale, ring1Opacity],
        [ring2Scale, ring2Opacity],
      ].map(([sc, op], i) => (
        <Animated.View
          key={i}
          style={[styles.ring, {
            width: RING_BASE, height: RING_BASE, borderRadius: RING_BASE / 2,
            transform: [{ scale: sc as Animated.Value }],
            opacity: op as Animated.Value,
          }]}
        />
      ))}

      {/* Flying property images */}
      {EXPLODE_ITEMS.map((item, i) => (
        <ExplodeItem key={i} {...item} startAnim={explode} />
      ))}

      {/* Gold center orb */}
      <Animated.View style={[styles.orb, { transform: [{ scale: orbScale }], opacity: orbOpacity }]} />

      {/* Main content — logo + text */}
      <View style={styles.content}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }], marginBottom: 20 }}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text style={[styles.title, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
          شقق وأراضي المستقبل
        </Animated.Text>

        <Animated.View style={[styles.line, { transform: [{ scaleX: lineScale }] }]} />

        <Animated.Text style={[styles.tagline, { opacity: tagOpacity, transform: [{ translateY: tagY }] }]}>
          مستقبلك يبدأ من هنا 🌟
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  bgGlow1: {
    position: "absolute",
    width: width * 1.3,
    height: width * 1.3,
    borderRadius: width * 0.65,
    backgroundColor: "rgba(201,160,34,0.045)",
    top: -width * 0.35,
    left: -width * 0.15,
  },
  bgGlow2: {
    position: "absolute",
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    backgroundColor: "rgba(192,57,43,0.035)",
    bottom: -width * 0.2,
    right: -width * 0.1,
  },
  flash: {
    position: "absolute",
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: width * 0.06,
    backgroundColor: "#ffffff",
  },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  orb: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 12,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: width * 0.36,
    height: width * 0.36,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
    textShadowColor: "rgba(201,160,34,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    writingDirection: "rtl",
  },
  line: {
    width: width * 0.58,
    height: 2.5,
    backgroundColor: GOLD,
    borderRadius: 2,
    marginVertical: 13,
  },
  tagline: {
    color: GOLD,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3,
    writingDirection: "rtl",
  },
});
