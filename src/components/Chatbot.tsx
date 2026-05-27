import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
}

const FAQS = [
  {
    question: "What is the TIP Voice?",
    answer: "The TIP Voice is a safe space to share your thoughts, feelings, or secrets. You can choose to post publicly with your name, or completely anonymously."
  },
  {
    question: "Is it really anonymous?",
    answer: "Yes! If you toggle 'Post Anonymously', your name and photo are not saved to the database for that post. Only your user ID is kept securely so you can still delete your own posts."
  },
  {
    question: "Can anyone delete my posts?",
    answer: "No, only you can delete your own posts. Our database security rules ensure that only the original author can modify or remove their content."
  },
  {
    question: "Who can see my posts?",
    answer: "All posts on the TIP Voice are public and can be seen by anyone visiting the site."
  }
];

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "Hi there! I'm the TIP Voice assistant. How can I help you today?", isBot: true }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleFAQClick = (faq: typeof FAQS[0]) => {
    // Add user question
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, text: faq.question, isBot: false }]);
    
    // Simulate bot typing delay
    setTimeout(() => {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: faq.answer, isBot: true }]);
    }, 600);
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-yellow-400 text-gray-900 rounded-full shadow-lg flex items-center justify-center hover:bg-yellow-500 transition-colors z-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col"
            style={{ height: '500px', maxHeight: 'calc(100vh - 48px)' }}
          >
            {/* Header */}
            <div className="bg-yellow-400 dark:bg-yellow-500 p-4 text-gray-900 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Bot className="w-6 h-6" />
                <h3 className="font-medium">FAQ Assistant</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-700 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.isBot 
                        ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none' 
                        : 'bg-yellow-400 dark:bg-yellow-500 text-gray-900 rounded-tr-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* FAQ Options */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase tracking-wider">Suggested Questions</p>
              <div className="space-y-2">
                {FAQS.map((faq, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleFAQClick(faq)}
                    className="w-full text-left px-3 py-2 text-sm text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 rounded-lg transition-colors border border-yellow-200 dark:border-yellow-800/50"
                  >
                    {faq.question}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
