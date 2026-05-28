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
import { aiApi } from '../../api';

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
      text: '您好，我是眼科 AI 助手，可以回答眼科疾病、检查和报告相关问题。',
      sender: 'bot',
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>();

  const sendMessage = async () => {
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

    const fallbackAnswer = 'AI 服务暂时不可用，请稍后重试。';

    // 模拟流式输出效果
    let currentText = '';
    let i = 0;

    // 先添加一个空的bot消息占位
    const botMsgId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      { id: botMsgId, text: '...', sender: 'bot' },
    ]);

    let fullAnswer = fallbackAnswer;
    try {
      const response = await aiApi.chat({
        question: inputText,
        threadId,
        enableWebSearch: false,
        allowBusinessToolCall: false,
      });
      if (response.threadId) {
        setThreadId(response.threadId);
      }
      fullAnswer = response.data || fallbackAnswer;
    } catch (error) {
      console.warn('AI chat failed:', error);
    }

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
      <View style={styles.chips}>
        <Text style={{ fontSize: 12, color: '#999' }}>
          {threadId ? `上下文会话已建立：${threadId.slice(0, 8)}...` : '首次提问后自动建立上下文会话'}
        </Text>
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
