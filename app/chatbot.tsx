import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Chatbot() {
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const [input, setInput] = useState(prompt || "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const apiUrl = Constants.expoConfig.extra.OPENAI_API_URL;
console.log("API KEY:", process.env.EXPO_PUBLIC_OPENAI_API_KEY);

      const apiKey = Constants.expoConfig.extra.OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error(
          "Missing API key. Please add EXPO_PUBLIC_OPENAI_API_KEY in your .env"
        );
      }
      
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are Rider Cardo, an AI motorcycle expert who gives friendly, accurate, and practical riding advice.",
            },
            ...messages.map((m): Message => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content: input },
          ],
        }),
      });

      const data = await res.json();
      console.log("Response from OpenAI:", data);

      if (data.error) {
        const errorMsg = `⚠️ OpenAI Error: ${data.error.message}`;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errorMsg },
        ]);
      } else if (data.choices && data.choices[0]?.message?.content) {
        const aiResponse = data.choices[0].message.content.trim();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: aiResponse },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⚠️ No valid response received." },
        ]);
      }
    } catch (error) {
      console.error("Error fetching response:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Error: Unable to contact AI server." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Rider Cardo</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Chat Body */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.length === 0 && !loading && (
            <Text style={styles.placeholderText}>
              Ask Rider Cardo anything about your post or get riding advice.
            </Text>
          )}

          {messages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.messageBubble,
                msg.role === "user"
                  ? styles.userBubble
                  : styles.aiBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.role === "user"
                    ? styles.userText
                    : styles.aiText,
                ]}
              >
                {msg.content}
              </Text>
            </View>
          ))}

          {loading && (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Rider Cardo is thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Ask Rider Cardo..."
            placeholderTextColor="#999"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, loading && { opacity: 0.7 }]}
            onPress={handleSend}
            disabled={loading}
          >
            <Ionicons
              name={loading ? "hourglass" : "send"}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  backButton: {
    padding: 6,
  },
  chatArea: {
    flex: 1,
    padding: 16,
  },
  placeholderText: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
    fontSize: 15,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
    borderTopRightRadius: 0,
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#E5E5EA",
    borderTopLeftRadius: 0,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: "#fff",
  },
  aiText: {
    color: "#000",
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E5EA",
    alignSelf: "flex-start",
    borderRadius: 12,
    padding: 10,
  },
  loadingText: {
    marginLeft: 8,
    color: "#555",
    fontSize: 14,
  },
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
    color: "#000",
    maxHeight: 120,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#007AFF",
    borderRadius: 25,
    padding: 10,
  },
});
