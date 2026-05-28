import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { aiApi } from '../../api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

// 轻量 Markdown 渲染：支持 # 标题、**加粗**、- / * 列表、--- 分隔线、`code`、空行段落
const renderInline = (line: string, baseStyle: any) => {
  // 拆分 **bold** 与 `code`
  const parts: Array<{ text: string; bold?: boolean; code?: boolean }> = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ text: line.slice(lastIndex, m.index) });
    }
    const token = m[0];
    if (token.startsWith('**')) {
      parts.push({ text: token.slice(2, -2), bold: true });
    } else {
      parts.push({ text: token.slice(1, -1), code: true });
    }
    lastIndex = m.index + token.length;
  }
  if (lastIndex < line.length) {
    parts.push({ text: line.slice(lastIndex) });
  }
  if (parts.length === 0) parts.push({ text: line });
  return parts.map((p, i) => (
    <Text
      key={i}
      style={[
        baseStyle,
        p.bold && { fontWeight: 'bold' },
        p.code && {
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          backgroundColor: '#eef0f3',
          color: '#c7254e',
        },
      ]}
    >
      {p.text}
    </Text>
  ));
};

const MarkdownText: React.FC<{ text: string; isUser: boolean }> = ({
  text,
  isUser,
}) => {
  const baseStyle = isUser ? styles.userText : styles.botText;
  const lines = text.split('\n');
  return (
    <View>
      {lines.map((raw, idx) => {
        const line = raw.replace(/\s+$/, '');
        if (line === '') {
          return <View key={idx} style={{ height: 6 }} />;
        }
        if (/^---+$/.test(line.trim())) {
          return <View key={idx} style={styles.mdDivider} />;
        }
        const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const sizeMap: Record<number, number> = { 1: 19, 2: 17, 3: 16 };
          return (
            <Text
              key={idx}
              style={[
                baseStyle,
                {
                  fontSize: sizeMap[level],
                  fontWeight: 'bold',
                  marginTop: idx === 0 ? 0 : 6,
                  marginBottom: 4,
                },
              ]}
            >
              {renderInline(headingMatch[2], baseStyle)}
            </Text>
          );
        }
        const listMatch = line.match(/^\s*[-*]\s+(.*)$/);
        if (listMatch) {
          return (
            <View key={idx} style={styles.mdListItem}>
              <Text style={[baseStyle, styles.mdBullet]}>•</Text>
              <Text style={[baseStyle, { flex: 1 }]}>
                {renderInline(listMatch[1], baseStyle)}
              </Text>
            </View>
          );
        }
        return (
          <Text key={idx} style={baseStyle}>
            {renderInline(line, baseStyle)}
          </Text>
        );
      })}
    </View>
  );
};

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
  const listRef = useRef<FlatList<Message>>(null);
  const headerHeight = useHeaderHeight();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    scrollToEnd();
  }, [messages]);

  const sendMessage = async () => {
    const inputText = text.trim();
    if (!inputText || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
    };
    setMessages(prev => [...prev, userMsg]);
    setText('');
    setIsTyping(true);

    const fallbackAnswer = 'AI 服务暂时不可用，请稍后重试。';

    const botMsgId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      { id: botMsgId, text: '', sender: 'bot' },
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

    let i = 0;
    let currentText = '';
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
    }, 20);
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    const isPending = !isUser && item.text === '' && isTyping;
    return (
      <View
        style={[
          styles.msgRow,
          isUser ? styles.msgRowUser : styles.msgRowBot,
        ]}
      >
        <View
          style={[
            styles.msgBubble,
            isUser ? styles.userBubble : styles.botBubble,
          ]}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#888" />
          ) : isUser ? (
            <Text style={[styles.msgText, styles.userText]}>{item.text}</Text>
          ) : (
            <MarkdownText text={item.text} isUser={false} />
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      style={styles.container}
    >
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={scrollToEnd}
        keyboardShouldPersistTaps="handled"
      />

      <View style={[styles.inputArea, { marginBottom: keyboardHeight }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="请输入您的问题..."
          placeholderTextColor="#9aa0a6"
          editable={!isTyping}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!text.trim() || isTyping) && styles.disabledBtn,
          ]}
          onPress={sendMessage}
          disabled={!text.trim() || isTyping}
          activeOpacity={0.7}
        >
          {isTyping ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendText}>发送</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  list: { padding: 15, paddingBottom: 16 },
  msgRow: { width: '100%', marginBottom: 10, flexDirection: 'row' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot: { justifyContent: 'flex-start' },
  msgBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  msgText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  botText: { color: '#222', fontSize: 15, lineHeight: 22 },
  mdDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d6d8db',
    marginVertical: 8,
  },
  mdListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 1,
  },
  mdBullet: { marginRight: 6, marginTop: 1 },
  inputArea: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e3e6ea',
  },
  input: {
    flex: 1,
    backgroundColor: '#f4f5f7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    minHeight: 40,
    maxHeight: 120,
    marginRight: 8,
    fontSize: 15,
    color: '#222',
  },
  sendBtn: {
    backgroundColor: '#2196F3',
    height: 40,
    minWidth: 60,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: { backgroundColor: '#bcd6ee' },
  sendText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
