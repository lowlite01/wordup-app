import { useMemo, useState } from "react";
import {
  Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { Colors, useTheme } from "./theme";
import { parseWords } from "./customLists";

interface Props {
  visible: boolean;
  onClose: () => void;
  onImport: (name: string, text: string) => number; // returns words imported
}

// Paste (or share into) a word list and save it as a studyable custom list.
export default function ImportListModal({ visible, onClose, onImport }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  const count = useMemo(() => parseWords(text).length, [text]);

  const reset = () => { setName(""); setText(""); setError(false); };
  const close = () => { reset(); onClose(); };
  const doImport = () => {
    const n = onImport(name, text);
    if (!n) { setError(true); return; }
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>Import a word list</Text>
            <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.name}
              placeholder="List name (e.g. Words from chat)"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.area}
              placeholder={"Paste words — one per line:\nword — translation\nor  word | translation | example"}
              placeholderTextColor={colors.muted}
              value={text}
              onChangeText={v => { setText(v); setError(false); }}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.hint}>One word per line (word — translation — example), or a JSON array.</Text>
            <Text style={[styles.status, count > 0 && styles.ok, error && styles.err]}>
              {error ? "No words found — check the format."
                : count > 0 ? `${count} words ready to import` : "No words detected yet"}
            </Text>
            <TouchableOpacity
              style={[styles.btn, !count && styles.btnDisabled]}
              disabled={!count}
              onPress={doImport}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Import</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: "88%", borderTopWidth: 1, borderColor: c.border,
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title: { fontSize: 18, fontWeight: "700", color: c.text },
  close: { fontSize: 18, color: c.muted },
  name: {
    backgroundColor: c.card2, color: c.text, borderColor: c.border, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 10,
  },
  area: {
    backgroundColor: c.card2, color: c.text, borderColor: c.border, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    minHeight: 150, lineHeight: 21,
  },
  hint: { color: c.muted, fontSize: 12, marginTop: 8, marginBottom: 10, lineHeight: 17 },
  status: { color: c.muted, fontSize: 13, fontWeight: "600", marginBottom: 12 },
  ok: { color: c.accentStrong },
  err: { color: c.danger },
  btn: { backgroundColor: c.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: c.onAccent, fontWeight: "700", fontSize: 15 },
});
