import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AI_KNOWLEDGE_BASE } from '../../data/mockData';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

export default function PatientAIChat() {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: '您好，我是您的眼科AI助手。您可以问我关于青光眼、白内障等眼疾的护理建议。',
      sender: 'bot',
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = () => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
    };
    setMessages(prev => [...prev, userMsg]);
    const inputText = text; // 缓存输入
    setText('');
    setIsTyping(true);

    // 模拟AI匹配回答
    const matched = AI_KNOWLEDGE_BASE.find(k => inputText.includes(k.question));
    const fullAnswer = matched
      ? matched.answer
      : '抱歉，我的知识库目前主要涵盖常见眼病护理，您可以尝试问 "青光眼如何治疗" 或 "眼部日常护理"。';

    // 模拟流式输出效果
    let currentText = '';
    let i = 0;

    // 先添加一个空的bot消息占位
    const botMsgId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      { id: botMsgId, text: '...', sender: 'bot' },
    ]);

    // 定时器逐字显示
    const interval = setInterval(() => {
      currentText += fullAnswer.charAt(i);
      i++;

      setMessages(prev =>
        prev.map(msg =>
          msg.id === botMsgId ? { ...msg, text: currentText } : msg,
        ),
      );

      if (i >= fullAnswer.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 50); // 每50ms出一个字
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.msgBubble,
        item.sender === 'user' ? styles.userBubble : styles.botBubble,
      ]}
    >
      <Text
        style={[
          styles.msgText,
          item.sender === 'user' ? styles.userText : styles.botText,
        ]}
      >
        {item.text}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="请输入您的问题..."
          editable={!isTyping}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!text.trim() || isTyping) && styles.disabledBtn,
          ]}
          onPress={sendMessage}
          disabled={!text.trim() || isTyping}
        >
          <Text style={styles.sendText}>发送</Text>
        </TouchableOpacity>
      </View>
      {/* 快捷提问提示 */}
      <View style={styles.chips}>
        {AI_KNOWLEDGE_BASE.map((k, i) => (
          <TouchableOpacity
            key={i}
            style={styles.chip}
            onPress={() => setText(k.question)}
          >
            <Text style={{ fontSize: 12, color: '#555' }}>{k.question}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  list: { padding: 15, paddingBottom: 20 },
  msgBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 2,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderBottomLeftRadius: 2,
  },
  msgText: { fontSize: 15, lineHeight: 22 },
  userText: { color: 'white' },
  botText: { color: '#333' },
  inputArea: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  disabledBtn: { backgroundColor: '#ccc' },
  sendText: { color: 'white', fontWeight: 'bold' },
  chips: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
    backgroundColor: '#f0f2f5',
  },
  chip: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
});
