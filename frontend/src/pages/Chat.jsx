import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { io } from "socket.io-client";
import { useAuth } from "../context/useAuth";

const API_URL = "http://192.168.31.200:5000/api";
const SOCKET_URL = "http://192.168.31.200:5000";

function Chat() {
  const { rideId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const receiverId = Number(searchParams.get("receiver"));

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [chatAvailable, setChatAvailable] = useState(true);
  const [chatAvailableUntil, setChatAvailableUntil] = useState(null);
  const [chatClosedReason, setChatClosedReason] = useState("");

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const chatTimerRef = useRef(null);

  const getToken = () => {
    return localStorage.getItem("authToken");
  };

  // ============================================================
  // FETCH CHAT STATUS
  // ============================================================
  const fetchChatStatus = async () => {
    try {
      const token = getToken();

      if (!token) {
        navigate("/login");
        return;
      }

      if (!receiverId) {
        setChatAvailable(false);
        setChatClosedReason("Invalid chat participant.");
        return;
      }

      const response = await fetch(
        `${API_URL}/messages/status/${rideId}?receiver=${receiverId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to check chat status");
      }

      setChatAvailable(data.chatAvailable);
      setChatAvailableUntil(data.chatAvailableUntil);
      setChatClosedReason(data.reason || "");

      return data;
    } catch (error) {
      console.error("Error fetching chat status:", error);
      return null;
    }
  };

  // ============================================================
  // LOAD MESSAGES
  // ============================================================
  const fetchMessages = async () => {
    try {
      const token = getToken();

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/messages/${rideId}?receiver=${receiverId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load messages");
      }

      setMessages(data);
      setError("");
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError(error.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    const loadChat = async () => {
      try {
        const token = getToken();

        if (!token) {
          navigate("/login");
          return;
        }

        const [messagesResponse, statusResponse] = await Promise.all([
          fetch(`${API_URL}/messages/${rideId}?receiver=${receiverId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),

          fetch(`${API_URL}/messages/status/${rideId}?receiver=${receiverId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const messagesData = await messagesResponse.json();
        const statusData = await statusResponse.json();

        if (!messagesResponse.ok) {
          throw new Error(messagesData.message || "Failed to load messages");
        }

        if (!statusResponse.ok) {
          throw new Error(statusData.message || "Failed to check chat status");
        }

        if (!cancelled) {
          setMessages(messagesData);

          setChatAvailable(statusData.chatAvailable);
          setChatAvailableUntil(statusData.chatAvailableUntil);
          setChatClosedReason(statusData.reason || "");

          setError("");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading chat:", error);

        if (!cancelled) {
          setError(error.message || "Failed to load chat");
          setLoading(false);
        }
      }
    };

    loadChat();

    return () => {
      cancelled = true;
    };
  }, [rideId, receiverId, navigate]);

  // ============================================================
  // 10-MINUTE CHAT TIMER
  // ============================================================
  useEffect(() => {
    if (chatTimerRef.current) {
      clearTimeout(chatTimerRef.current);
      chatTimerRef.current = null;
    }

    if (!chatAvailable || !chatAvailableUntil) {
      return;
    }

    const remainingTime = new Date(chatAvailableUntil).getTime() - Date.now();

    chatTimerRef.current = setTimeout(
      () => {
        setChatAvailable(false);
        setMessageText("");
      },
      Math.max(remainingTime, 0),
    );

    return () => {
      if (chatTimerRef.current) {
        clearTimeout(chatTimerRef.current);
        chatTimerRef.current = null;
      }
    };
  }, [chatAvailable, chatAvailableUntil]);

  // ============================================================
  // REAL-TIME SOCKET
  // ============================================================
  useEffect(() => {
    if (!user?.id || !rideId) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Chat socket connected:", socket.id);

      socket.emit("join_user_room", {
        userId: user.id,
      });
    });

    // ----------------------------------------------------------
    // New message
    // ----------------------------------------------------------
    socket.on("new_message", (newMessage) => {
      if (Number(newMessage.ride_id) !== Number(rideId)) {
        return;
      }

      const belongsToCurrentChat =
        (Number(newMessage.sender_id) === Number(user.id) &&
          Number(newMessage.receiver_id) === Number(receiverId)) ||
        (Number(newMessage.sender_id) === Number(receiverId) &&
          Number(newMessage.receiver_id) === Number(user.id));

      if (!belongsToCurrentChat) {
        return;
      }

      setMessages((previousMessages) => {
        const alreadyExists = previousMessages.some(
          (message) => message.id === newMessage.id,
        );

        if (alreadyExists) {
          return previousMessages;
        }

        return [...previousMessages, newMessage];
      });
    });

    // ----------------------------------------------------------
    // Passenger left
    // ----------------------------------------------------------
    socket.on("ride_booking_cancelled", async (data) => {
      if (Number(data.rideId) !== Number(rideId)) {
        return;
      }

      const currentUserIsParticipant =
        Number(data.passengerId) === Number(user.id) ||
        Number(data.passengerId) === Number(receiverId);

      if (!currentUserIsParticipant) {
        return;
      }

      console.log("Chat detected passenger leave:", data);

      await fetchChatStatus();
    });

    // ----------------------------------------------------------
    // Driver cancelled
    // ----------------------------------------------------------
    socket.on("ride_cancelled", async (data) => {
      if (Number(data?.ride?.id) !== Number(rideId)) {
        return;
      }

      console.log("Chat detected ride cancellation:", data);

      await fetchChatStatus();
    });

    socket.on("disconnect", () => {
      console.log("Chat socket disconnected");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, rideId, receiverId]);

  // ============================================================
  // SCROLL TO LATEST MESSAGE
  // ============================================================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ============================================================
  // MARK RECEIVED MESSAGES AS READ
  // ============================================================
  useEffect(() => {
    const unreadMessages = messages.filter(
      (message) =>
        Number(message.receiver_id) === Number(user?.id) && !message.is_read,
    );

    if (unreadMessages.length === 0) {
      return;
    }

    const markMessagesAsRead = async () => {
      const token = getToken();

      if (!token) {
        return;
      }

      for (const message of unreadMessages) {
        try {
          const response = await fetch(
            `${API_URL}/messages/${message.id}/read`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (response.ok) {
            setMessages((previousMessages) =>
              previousMessages.map((item) =>
                item.id === message.id ? { ...item, is_read: true } : item,
              ),
            );
          }
        } catch (error) {
          console.error("Error marking message as read:", error);
        }
      }
    };

    markMessagesAsRead();
  }, [messages, user?.id]);

  // ============================================================
  // SEND MESSAGE
  // ============================================================
  const handleSendMessage = async (event) => {
    event.preventDefault();

    const trimmedMessage = messageText.trim();

    if (!chatAvailable) {
      return;
    }

    if (!trimmedMessage || sending) {
      return;
    }

    if (!receiverId) {
      setError("Invalid receiver.");
      return;
    }

    try {
      setSending(true);
      setError("");

      const token = getToken();

      const response = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ride_id: Number(rideId),
          receiver_id: receiverId,
          message: trimmedMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Backend can tell us that the 10-minute window has ended
        if (response.status === 403) {
          setChatAvailable(false);
          setMessageText("");
        }

        throw new Error(data.message || "Failed to send message");
      }

      setMessages((previousMessages) => {
        const alreadyExists = previousMessages.some(
          (message) => message.id === data.chatMessage.id,
        );

        if (alreadyExists) {
          return previousMessages;
        }

        return [...previousMessages, data.chatMessage];
      });

      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      setError(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // ============================================================
  // CLOSED MESSAGE
  // ============================================================
  const closedMessage =
    chatClosedReason === "Ride cancelled"
      ? "Ride cancelled. Chat is no longer available for new messages."
      : "Ride left. Chat is no longer available for new messages.";

  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="min-h-[100dvh] relative z-10">
      <main className="h-[100dvh] max-w-3xl mx-auto px-0 sm:px-6 py-0 md:py-6 pb-0 md:pb-8">
        <div className="glass-crystal h-full rounded-none md:rounded-3xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-5 py-4 flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-lg font-bold text-slate-900">Chat</h1>

              <p className="text-xs text-slate-500">Ride #{rideId}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6 space-y-3">
            {loading ? (
              <div className="flex justify-center items-center min-h-[40vh]">
                <p className="text-slate-500">Loading messages...</p>
              </div>
            ) : error && messages.length === 0 ? (
              <div className="flex flex-col justify-center items-center min-h-[40vh] text-center">
                <p className="text-red-600 font-medium">{error}</p>

                <button
                  onClick={() => {
                    setLoading(true);
                    fetchMessages();
                    fetchChatStatus();
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                >
                  Try Again
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center items-center min-h-[40vh]">
                <p className="text-slate-500 text-center">
                  No messages yet.
                  <br />
                  Start the conversation.
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const isMine = Number(message.sender_id) === Number(user?.id);

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                          isMine
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-white text-slate-900 border border-slate-200 rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm leading-relaxed break-words">
                          {message.message}
                        </p>

                        <p
                          className={`text-[10px] mt-1 ${
                            isMine ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {message.created_at
                            ? new Date(message.created_at).toLocaleTimeString(
                                "en-IN",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Error */}
          {error && messages.length > 0 && chatAvailable && (
            <p className="px-5 pb-2 text-sm text-red-600">{error}</p>
          )}

          {/* ======================================================
              CHAT COMPOSER
              Only visible while chat is available
          ====================================================== */}
          {chatAvailable ? (
            <form
              onSubmit={handleSendMessage}
              className="bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex-shrink-0 flex items-center gap-3"
            >
              <input
                type="text"
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Type a message..."
                maxLength={1000}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />

              <button
                type="submit"
                disabled={!messageText.trim() || sending}
                className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                aria-label="Send message"
              >
                <Send size={20} />
              </button>
            </form>
          ) : (
            <div className="bg-white/90 backdrop-blur-md border-t border-slate-200 px-5 py-5 text-center">
              <p className="text-sm font-semibold text-slate-600">
                {closedMessage}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Chat;
