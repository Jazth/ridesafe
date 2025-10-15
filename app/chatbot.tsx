import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

export default function Chatbot() {
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const [input, setInput] = useState(prompt || "");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(process.env.EXPO_PUBLIC_OPENAI_API_URL || "https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: input }],
        }),
      });
      const data = await res.json();
      setResponse(data.choices?.[0]?.message?.content || "No response");
    } catch (error) {
      console.error(error);
      setResponse("Error fetching response.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.chatArea}>
        {prompt && <Text style={styles.promptText}>🧠 {prompt}</Text>}
        {response ? <Text style={styles.responseText}>{response}</Text> : null}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder="Ask Rider Cardo..."
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          {loading ? (
            <Ionicons name="hourglass" size={22} color="#fff" />
          ) : (
            <Ionicons name="send" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  chatArea: { flex: 1, padding: 16 },
  promptText: { color: "#FF5722", fontWeight: "600", fontSize: 16, marginBottom: 10 },
  responseText: { color: "#333", fontSize: 15, lineHeight: 22 },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    fontSize: 15,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#FF5722",
    borderRadius: 25,
    padding: 10,
  },
});
